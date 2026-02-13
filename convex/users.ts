import { mutation, query } from "./_generated/server";

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
