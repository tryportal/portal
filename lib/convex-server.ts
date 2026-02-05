import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
}

/**
 * Create an authenticated ConvexHttpClient for server-side usage.
 * Used in API routes to query/mutate Convex with user auth context.
 */
export function createConvexServerClient(token: string): ConvexHttpClient {
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
}
