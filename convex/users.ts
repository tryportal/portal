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
// Primary Workspace
// ============================================================================

/**
 * Get the current user's primary workspace
 */
export const getPrimaryWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user?.primaryWorkspaceId) return null;

    // Verify the user is still a member of this workspace
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", user.primaryWorkspaceId!).eq("userId", identity.subject)
      )
      .first();

    if (!membership) {
      // User is no longer a member, clear the primary workspace
      return null;
    }

    // Get the organization details
    const org = await ctx.db.get(user.primaryWorkspaceId);
    if (!org) return null;

    // Resolve logo URL
    let logoUrl: string | undefined = org.imageUrl;
    if (org.logoId) {
      const url = await ctx.storage.getUrl(org.logoId);
      logoUrl = url ?? undefined;
    }

    return { ...org, logoUrl };
  },
});

/**
 * Set the current user's primary workspace
 */
export const setPrimaryWorkspace = mutation({
  args: {
    workspaceId: v.union(v.id("organizations"), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // If setting a workspace, verify membership
    if (args.workspaceId) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", args.workspaceId!).eq("userId", identity.subject)
        )
        .first();

      if (!membership) {
        throw new Error("You are not a member of this workspace");
      }
    }

    await ctx.db.patch(user._id, {
      primaryWorkspaceId: args.workspaceId ?? undefined,
    });

    return { success: true };
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

    // If no firstName is provided, use email as the name
    const firstName = args.firstName || args.email;

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: firstName,
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
        firstName: firstName,
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

    // If no firstName is provided, use email as the name
    const firstName = args.firstName || args.email;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
      });
      return { action: "updated", id: existingUser._id };
    } else {
      const id = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        firstName: firstName,
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

// ============================================================================
// Handle Functions (for DM sharing links)
// ============================================================================

// Reserved handles that cannot be claimed
const RESERVED_HANDLES = [
  "admin", "administrator", "mod", "moderator", "system", "bot",
  "portal", "help", "support", "feedback", "api", "app",
  "dm", "messages", "settings", "home", "login", "logout",
  "signin", "signout", "signup", "register", "invite",
  "user", "users", "account", "profile", "null", "undefined",
  "true", "false", "test", "demo", "example", "www", "mail",
];

/**
 * Get a user by their handle (public profile data only)
 */
export const getUserByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const normalizedHandle = args.handle.toLowerCase();

    const user = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
      .first();

    if (!user) return null;

    return {
      clerkId: user.clerkId,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      handle: user.handle,
    };
  },
});

/**
 * Check if a handle is available and valid
 */
export const checkHandleAvailability = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const normalizedHandle = args.handle.toLowerCase();

    // Validate format: 3-12 characters, alphanumeric and underscore only
    const handleRegex = /^[a-zA-Z0-9_]{3,12}$/;
    if (!handleRegex.test(args.handle)) {
      return { available: false, reason: "invalid_format" as const };
    }

    // Check reserved words
    if (RESERVED_HANDLES.includes(normalizedHandle)) {
      return { available: false, reason: "reserved" as const };
    }

    // Check if already taken
    const existing = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
      .first();

    return existing
      ? { available: false, reason: "taken" as const }
      : { available: true, reason: null };
  },
});

/**
 * Get the current user's handle
 */
export const getCurrentUserHandle = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user?.handle ?? null;
  },
});

/**
 * Claim a handle for the current user
 */
export const claimHandle = mutation({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const normalizedHandle = args.handle.toLowerCase();

    // Validate format
    const handleRegex = /^[a-zA-Z0-9_]{3,12}$/;
    if (!handleRegex.test(args.handle)) {
      throw new Error("Handle must be 3-12 characters, using only letters, numbers, and underscores");
    }

    // Check reserved
    if (RESERVED_HANDLES.includes(normalizedHandle)) {
      throw new Error("This handle is reserved");
    }

    // Check if taken by another user
    const existing = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
      .first();

    if (existing && existing.clerkId !== identity.subject) {
      throw new Error("This handle is already taken");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update handle
    await ctx.db.patch(user._id, {
      handle: normalizedHandle,
      updatedAt: Date.now(),
    });

    return { success: true, handle: normalizedHandle };
  },
});
