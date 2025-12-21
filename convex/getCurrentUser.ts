import { query } from "./_generated/server";

/**
 * Get the current authenticated user's Clerk user ID
 * This can be used in Convex queries and mutations to identify the user
 * 
 * Usage in a component:
 * const userId = useQuery(api.getCurrentUser.getCurrentUserId);
 */
export const getCurrentUserId = query(async ({ auth }) => {
  const identity = await auth.getUserIdentity();
  return identity?.subject;
});

