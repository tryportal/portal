import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const clerkId = identity.subject;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    const userData = {
      clerkId,
      email: identity.email ?? "",
      firstName: identity.given_name ?? undefined,
      lastName: identity.family_name ?? undefined,
      imageUrl: identity.picture ?? undefined,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, userData);
    } else {
      await ctx.db.insert("users", userData);
    }
  },
});

export const currentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const setPrimaryWorkspace = mutation({
  args: { workspaceId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify user is a member of the workspace
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.workspaceId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member of this workspace");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { primaryWorkspaceId: args.workspaceId });
  },
});
