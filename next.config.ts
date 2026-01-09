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
      {
        protocol: "https",
        hostname: "n3we3vefdx.ufs.sh",
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
};

export default nextConfig;
