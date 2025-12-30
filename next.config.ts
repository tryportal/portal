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
      // Local Convex development
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3210",
      },
    ],
  },
};

export default nextConfig;
