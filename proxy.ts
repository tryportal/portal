import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/preview(.*)",
  "/api/webhooks(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/home(.*)",
  "/privacy(.*)",
]);

const isSetupRoute = createRouteMatcher(["/setup(.*)"]);

// ============================================================================
// Analytics Proxy Security: Rate Limiting & Path Validation
// ============================================================================

// In-memory rate limiting (for development)
// In production, use Redis-backed counters (e.g., Upstash, Vercel KV)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP
const RATE_LIMIT_MAX_REQUESTS_NO_IP = 10; // Much stricter limit for requests without valid IP
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
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

function getRateLimitKey(request: NextRequest): string | null {
  // Extract IP from headers
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip");
  
  // Return null if no valid IP is available
  // This prevents all requests without IP headers from sharing one rate-limit bucket
  if (!ip) {
    return null;
  }
  
  return `ratelimit:${ip}`;
}

function checkRateLimit(key: string, maxRequests: number = RATE_LIMIT_MAX_REQUESTS): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupRateLimitStore();
  
  const now = Date.now();
  
  // Atomic read-modify-write loop to prevent race conditions
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry - atomically
      const resetTime = now + RATE_LIMIT_WINDOW_MS;
      const newEntry = { count: 1, resetTime };
      
      // Only set if no concurrent modification occurred (simple compare-and-set)
      // In Node.js single-threaded async model, this is safe because:
      // - The map access is synchronous and non-blocking
      // - No other code can execute between this read and the following set
      // - All async operations are scheduled on the event loop
      if (!rateLimitStore.has(key) || rateLimitStore.get(key)!.resetTime <= now) {
        rateLimitStore.set(key, newEntry);
        return { allowed: true, remaining: maxRequests - 1, resetTime };
      }
      // Retry if entry was just created by another concurrent request
      continue;
    }
    
    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }
    
    // Compute new count and attempt atomic update
    const newCount = entry.count + 1;
    const newEntry = { count: newCount, resetTime: entry.resetTime };
    
    // Verify the entry hasn't changed and atomically update it
    if (rateLimitStore.get(key) === entry) {
      rateLimitStore.set(key, newEntry);
      return { allowed: true, remaining: maxRequests - newCount, resetTime: entry.resetTime };
    }
    // Retry if entry was modified concurrently
  }
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

function handleAnalyticsProxy(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  
  // Only process analytics proxy routes
  if (!pathname.startsWith("/ingest") && !pathname.startsWith("/db-ingest")) {
    return null;
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
  
  // Handle missing IP headers - reject in production or apply stricter rate limit
  if (rateLimitKey === null) {
    const isProduction = process.env.NODE_ENV === "production";
    
    if (isProduction) {
      // In production, reject requests without valid IP headers
      logRequest(request, "blocked_missing_ip", "No valid IP header found");
      return new NextResponse(
        JSON.stringify({ error: "Invalid request headers" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    } else {
      // In development, use a much stricter shared rate limit bucket
      // This allows local testing but prevents abuse if deployed without proper IP headers
      const fallbackKey = "ratelimit:no-ip-fallback";
      const { allowed, remaining, resetTime } = checkRateLimit(fallbackKey, RATE_LIMIT_MAX_REQUESTS_NO_IP);
      
      if (!allowed) {
        logRequest(request, "rate_limited_no_ip", `fallback bucket exhausted`);
        return new NextResponse(
          JSON.stringify({ 
            error: "Too many requests (no IP header)",
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
          }),
          { 
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)),
              "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS_NO_IP),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.floor(resetTime / 1000)),
            }
          }
        );
      }
      
      logRequest(request, "allowed_no_ip", `remaining: ${remaining} (fallback bucket)`);
      
      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS_NO_IP));
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      response.headers.set("X-RateLimit-Reset", String(Math.floor(resetTime / 1000)));
      return response;
    }
  }
  
  // Normal rate limiting with valid IP
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

// ============================================================================
// Main Proxy Handler
// ============================================================================

export const proxy = clerkMiddleware(async (auth, request) => {
  // Handle analytics proxy routes first (before auth check)
  const analyticsResponse = handleAnalyticsProxy(request);
  if (analyticsResponse) {
    return analyticsResponse;
  }

  const { userId } = await auth();

  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // If user is not signed in, redirect to landing page
  if (!userId) {
    const homeUrl = new URL("/home", request.url);
    return NextResponse.redirect(homeUrl);
  }

  // Allow setup route for authenticated users
  if (isSetupRoute(request)) {
    return NextResponse.next();
  }

  // Protect all other routes
  await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

