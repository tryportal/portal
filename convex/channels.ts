import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getChannelsAndCategories = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return null;

    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization_and_order", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Group channels by category and sort by order
    const grouped = categories
      .sort((a, b) => a.order - b.order)
      .map((category) => ({
        ...category,
        channels: channels
          .filter((ch) => ch.categoryId === category._id)
          .sort((a, b) => a.order - b.order),
      }));

    return grouped;
  },
});

export const createCategory = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Get next order
    const existing = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const maxOrder = existing.reduce((max, c) => Math.max(max, c.order), -1);

    return ctx.db.insert("channelCategories", {
      organizationId: args.organizationId,
      name: args.name,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

export const createChannel = mutation({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.id("channelCategories"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Get next order within category
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    const maxOrder = existing.reduce((max, c) => Math.max(max, c.order), -1);

    return ctx.db.insert("channels", {
      organizationId: args.organizationId,
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      icon: "Hash",
      permissions: "open",
      order: maxOrder + 1,
      createdAt: Date.now(),
      createdBy: identity.subject,
    });
  },
});
