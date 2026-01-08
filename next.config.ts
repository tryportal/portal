import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
      // Local Convex development - only in development mode
      ...(process.env.NODE_ENV === "development"
        ? [
          {
            protocol: "http" as const,
            hostname: "127.0.0.1",
            port: "3210",
          },
        ]
        : []),
    ],
  },
  // Rewrites to proxy analytics requests and avoid adblockers
  async rewrites() {
    return [
      // PostHog proxy - static assets and API
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      // Databuddy proxy - API and CDN
      {
        source: "/db-ingest/api/:path*",
        destination: "https://basket.databuddy.cc/:path*",
      },
      {
        source: "/db-ingest/:path*",
        destination: "https://cdn.databuddy.cc/:path*",
      },
    ];
  },
  // Required for PostHog to work with the proxy
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
