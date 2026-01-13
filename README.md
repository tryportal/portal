# Portal

Team chat, reimagined. Built with Next.js 15, Convex, and Clerk.

## Features

- Real-time messaging with channels and direct messages
- File attachments and image uploads
- Reactions, replies, and message pinning
- Workspace management with role-based access
- Typing indicators and read receipts

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Clerk account for authentication
- A Convex account for the backend

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/portal.git
   cd portal
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the environment file and configure it:
   ```bash
   cp .env.example .env.local
   ```
   
   Optional environment variables:
   - `NEXT_PUBLIC_DATABUDDY_CLIENT_ID` - Your Databuddy client ID (for analytics)
   - `NEXT_PUBLIC_POSTHOG_KEY` - Your PostHog key (for event tracking)

4. Start Convex (in a separate terminal):
   ```bash
   bun run dev:convex
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Backend**: Convex
- **Auth**: Clerk
- **Styling**: Tailwind CSS
- **Analytics**: PostHog (optional), Databuddy (optional)

### Rate Limiting

- **Default limit**: 100 requests per minute per IP address
- **No-IP fallback limit**: 10 requests per minute (development only)
- **Window**: Rolling 1-minute window
- **Headers**: Standard rate limit headers (`X-RateLimit-*`) included in responses
- **Response**: `429 Too Many Requests` when quota exceeded, with `Retry-After` header
- **Storage**: 
  - **Development**: In-memory store (resets on server restart)
  - **Production**: Recommended to use Redis-backed counters (e.g., Upstash, Vercel KV)

**Missing IP Headers:**
- **Production**: Requests without valid IP headers (`x-forwarded-for` or `x-real-ip`) are rejected with `400 Bad Request` to prevent shared bucket exhaustion
- **Development**: A stricter shared rate limit bucket (10 req/min) is used to allow local testing while preventing abuse
- This prevents malicious clients from stripping IP headers to exhaust a shared "unknown" quota

### Path Validation

The middleware implements an allowlist for known analytics endpoints:

**PostHog endpoints** (`/ingest/*`):
- `/ingest/static/*` - Static assets
- `/ingest/decide`, `/ingest/e`, `/ingest/batch`, `/ingest/capture`, `/ingest/engage`, `/ingest/track` - Event endpoints
- `/ingest/i/v0/e` - V0 event endpoint

**Databuddy endpoints** (`/db-ingest/*`):
- `/db-ingest/api/*` - API endpoints
- `/db-ingest/*.js` - JavaScript assets
- `/db-ingest/*.json` - JSON config files

Requests to non-allowlisted paths return `403 Forbidden`.

### Logging & Monitoring

All proxy requests are logged in structured JSON format with:
- Timestamp, IP address (or "unknown" if missing), user agent
- Request method and full URL
- Status (`allowed`, `rate_limited`, `blocked_invalid_path`, `blocked_missing_ip`, `rate_limited_no_ip`, `allowed_no_ip`)
- Additional details (rate limit remaining, blocked path, etc.)

**Operational Trade-offs:**

1. **In-memory rate limiting**: Fast and simple for development, but doesn't scale horizontally and loses state on restart. For production, migrate to Redis-backed storage (example below).

2. **Path allowlist maintenance**: Adding new analytics endpoints requires updating the `ALLOWED_INGEST_PATHS` patterns in `proxy.ts`. This prevents arbitrary proxy usage but adds maintenance overhead.

3. **Performance impact**: The proxy handler runs on analytics routes (`/ingest/*` and `/db-ingest/*`). The overhead is minimal (<1ms per request) for allowlist checks and in-memory rate limiting.

4. **DDoS protection**: The rate limit provides basic protection but may need tuning based on legitimate traffic patterns. Monitor `rate_limited` logs to identify if limits are too restrictive.

### Production Recommendations

For production deployments, replace in-memory storage with Redis:

```typescript
// Example using Vercel KV (or Upstash Redis)
import { kv } from "@vercel/kv";

async function checkRateLimit(key: string) {
  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / RATE_LIMIT_WINDOW_MS)}`;
  
  const count = await kv.incr(windowKey);
  if (count === 1) {
    await kv.expire(windowKey, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
  }
  
  return {
    allowed: count <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - count),
    resetTime: (Math.floor(now / RATE_LIMIT_WINDOW_MS) + 1) * RATE_LIMIT_WINDOW_MS,
  };
}
```

**Monitoring setup:**
- Set up alerts for high `rate_limited`, `blocked_invalid_path`, or `blocked_missing_ip` counts
- Track P99 latency for `/ingest/*` and `/db-ingest/*` routes
- Monitor rate limit effectiveness with analytics on blocked requests
- Watch for `allowed_no_ip` logs in production (should not occur with proper deployment)

## License

MIT
