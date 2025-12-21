"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useMemo } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  const convex = useMemo(() => {
    return new ConvexReactClient(convexUrl, {
      // Pass Clerk token to Convex for authentication
      async fetchToken() {
        const token = await getToken({ template: "convex" });
        return token ?? undefined;
      },
    });
  }, [getToken]);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

