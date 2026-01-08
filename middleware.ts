import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limiting (for development)
// In production, use Redis-backed counters (e.g., Upstash, Vercel KV)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up stale entries every 5 minutes

// Allowed path patterns for analytics proxies
const ALLOWED_INGEST_PATHS = [
  // PostHog endpoints
  /^\/ingest\/static\/.+/,
  /^\/ingest\/decide$/,
  /^\/ingest\/e$/,
  /^\/ingest\/batch$/,
  /^\/ingest\/capture$/,
  /^\/ingest\/engage$/,
  /^\/ingest\/track$/,
  /^\/ingest\/i\/v0\/e$/,
  
  // Databuddy endpoints
  /^\/db-ingest\/api\/.+/,
  /^\/db-ingest\/.+\.js$/,
  /^\/db-ingest\/.+\.json$/,
];

// Cleanup stale entries periodically
let lastCleanup = Date.now();
function cleanupRateLimitStore() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

function getRateLimitKey(request: NextRequest): string {
  // Use IP address or fallback to a default key
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";
  return `ratelimit:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupRateLimitStore();
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime };
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  // Increment counter
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetTime: entry.resetTime };
}

function isPathAllowed(pathname: string): boolean {
  return ALLOWED_INGEST_PATHS.some(pattern => pattern.test(pathname));
}

function logRequest(request: NextRequest, status: string, details?: string) {
  const timestamp = new Date().toISOString();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
             request.headers.get("x-real-ip") || 
             "unknown";
  const method = request.method;
  const url = request.url;
  
  // Structured logging for production monitoring
  console.log(JSON.stringify({
    timestamp,
    type: "analytics_proxy",
    status,
    method,
    url,
    ip,
    userAgent: request.headers.get("user-agent"),
    details,
  }));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only process analytics proxy routes
  if (!pathname.startsWith("/ingest") && !pathname.startsWith("/db-ingest")) {
    return NextResponse.next();
  }
  
  // Path validation - block arbitrary paths
  if (!isPathAllowed(pathname)) {
    logRequest(request, "blocked_invalid_path", pathname);
    return new NextResponse(
      JSON.stringify({ error: "Invalid path" }),
      { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  
  // Rate limiting
  const rateLimitKey = getRateLimitKey(request);
  const { allowed, remaining, resetTime } = checkRateLimit(rateLimitKey);
  
  if (!allowed) {
    logRequest(request, "rate_limited", `key: ${rateLimitKey}`);
    return new NextResponse(
      JSON.stringify({ 
        error: "Too many requests",
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      }),
      { 
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(resetTime / 1000)),
        }
      }
    );
  }
  
  // Log successful request
  logRequest(request, "allowed", `remaining: ${remaining}`);
  
  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(resetTime / 1000)));
  
  return response;
}

export const config = {
  matcher: [
    "/ingest/:path*",
    "/db-ingest/:path*",
  ],
};
