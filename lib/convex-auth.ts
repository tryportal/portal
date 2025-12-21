import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";

/**
 * Hook to get the current authenticated user and auth state
 * Combines Clerk and Convex auth states
 */
export function useAuthState() {
  const { userId, isLoaded: clerkLoaded } = useAuth();
  const { isLoading: convexLoading } = useConvexAuth();

  return {
    userId,
    isAuthenticated: !!userId,
    isLoading: !clerkLoaded || convexLoading,
  };
}

/**
 * Get auth token for Convex API calls
 * Use this in server components or API routes
 */
export async function getConvexToken() {
  const { getToken } = await import("@clerk/nextjs/server");
  return await getToken({ template: "convex" });
}

