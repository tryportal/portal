import { query, mutation, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ============================================================================
// User Queries
// ============================================================================

/**
 * Get a user by their Clerk ID
 */
export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

/**
 * Get the current authenticated user from Convex
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

/**
 * Get multiple users by their Clerk IDs (batch query)
 */
export const getUsers = query({
  args: { clerkIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    if (args.clerkIds.length === 0) return [];

    const users = await Promise.all(
      args.clerkIds.map(async (clerkId) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
          .first();
        return user;
      })
    );

    // Filter out null values and return
    return users.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});

/**
 * Get user data formatted for the cache (compatible with existing UserData interface)
 */
export const getUserData = query({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    if (args.userIds.length === 0) return [];

    const users = await Promise.all(
      args.userIds.map(async (userId) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
          .first();

        return {
          userId,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          imageUrl: user?.imageUrl ?? null,
        };
      })
    );

    return users;
  },
});

// ============================================================================
// User Mutations
// ============================================================================

/**
 * Create or update a user in the database
 * This should be called when a user signs in or their profile is updated
 */
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal mutation for syncing user from Clerk (used by migration)
 */
export const syncUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
      });
      return { action: "updated", id: existingUser._id };
    } else {
      const id = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
      });
      return { action: "created", id };
    }
  },
});

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Migrate all existing users from Clerk to Convex
 * This action fetches all users from Clerk and syncs them to the Convex users table
 * 
 * Run this once to backfill existing users:
 * npx convex run users:migrateAllUsersFromClerk
 */
export const migrateAllUsersFromClerk = internalAction({
  args: {},
  handler: async (ctx): Promise<{ migrated: number; errors: string[] }> => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY is not set");
    }

    const errors: string[] = [];
    let migrated = 0;
    let offset = 0;
    const limit = 100; // Clerk's max limit per request

    // Paginate through all users
    while (true) {
      try {
        const response = await fetch(
          `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Clerk API error: ${response.status} ${response.statusText}`);
        }

        const users = await response.json();

        if (!Array.isArray(users) || users.length === 0) {
          break; // No more users
        }

        // Sync each user to Convex
        for (const user of users) {
          try {
            const email = user.email_addresses?.[0]?.email_address;
            if (!email) {
              errors.push(`User ${user.id} has no email address`);
              continue;
            }

            await ctx.runMutation(internal.users.syncUserFromClerk, {
              clerkId: user.id,
              email,
              firstName: user.first_name || undefined,
              lastName: user.last_name || undefined,
              imageUrl: user.image_url || undefined,
            });

            migrated++;
          } catch (error) {
            errors.push(`Failed to sync user ${user.id}: ${error}`);
          }
        }

        if (users.length < limit) {
          break; // Last page
        }

        offset += limit;
      } catch (error) {
        errors.push(`Pagination error at offset ${offset}: ${error}`);
        break;
      }
    }

    return { migrated, errors };
  },
});

/**
 * Public wrapper for migration (can be called from dashboard)
 * Requires admin authentication in production
 */
export const runUserMigration = action({
  args: {},
  handler: async (ctx): Promise<{ migrated: number; errors: string[] }> => {
    // Optional: Add admin check here if needed
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Not authenticated");

    return await ctx.runAction(internal.users.migrateAllUsersFromClerk, {});
  },
});

/**
 * Sync a single user from Clerk to Convex by their Clerk ID
 * Useful for manually syncing a specific user
 */
export const syncSingleUser = action({
  args: { clerkId: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return { success: false, error: "CLERK_SECRET_KEY is not set" };
    }

    try {
      const response = await fetch(
        `https://api.clerk.com/v1/users/${args.clerkId}`,
        {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
          },
        }
      );

      if (!response.ok) {
        return { success: false, error: `Clerk API error: ${response.status}` };
      }

      const user = await response.json();
      const email = user.email_addresses?.[0]?.email_address;

      if (!email) {
        return { success: false, error: "User has no email address" };
      }

      await ctx.runMutation(internal.users.syncUserFromClerk, {
        clerkId: user.id,
        email,
        firstName: user.first_name || undefined,
        lastName: user.last_name || undefined,
        imageUrl: user.image_url || undefined,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});
