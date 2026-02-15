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

export const updateChannel = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.channelId, updates);
  },
});

export const deleteChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Cascade delete all related data
    const channelMembers = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const m of channelMembers) await ctx.db.delete(m._id);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);

    const typing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const t of typing) await ctx.db.delete(t._id);

    const muted = await ctx.db
      .query("mutedChannels")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const m of muted) await ctx.db.delete(m._id);

    const readStatus = await ctx.db
      .query("channelReadStatus")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const r of readStatus) await ctx.db.delete(r._id);

    const sharedInvites = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const i of sharedInvites) await ctx.db.delete(i._id);

    const sharedMembers = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const m of sharedMembers) await ctx.db.delete(m._id);

    const forumPosts = await ctx.db
      .query("forumPosts")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const p of forumPosts) await ctx.db.delete(p._id);

    // Delete the channel itself
    await ctx.db.delete(args.channelId);
  },
});

export const reorderCategories = mutation({
  args: {
    organizationId: v.id("organizations"),
    categoryIds: v.array(v.id("channelCategories")),
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

    // Update order for each category
    for (let i = 0; i < args.categoryIds.length; i++) {
      await ctx.db.patch(args.categoryIds[i], { order: i });
    }
  },
});

export const reorderChannels = mutation({
  args: {
    categoryId: v.id("channelCategories"),
    channelIds: v.array(v.id("channels")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get category to find organization
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", category.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Update order and category for each channel
    for (let i = 0; i < args.channelIds.length; i++) {
      await ctx.db.patch(args.channelIds[i], {
        categoryId: args.categoryId,
        order: i,
      });
    }
  },
});
