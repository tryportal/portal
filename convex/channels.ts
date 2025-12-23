import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";

// ============================================================================
// Helper Functions
// ============================================================================

async function checkAdminAccess(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: { query: Function } },
  organizationId: Id<"organizations">
): Promise<{ userId: string; isAdmin: boolean }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userId = identity.subject;
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_and_user", (q: { eq: Function }) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  return { userId, isAdmin: membership.role === "admin" };
}

async function requireAdmin(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: { query: Function } },
  organizationId: Id<"organizations">
): Promise<string> {
  const { userId, isAdmin } = await checkAdminAccess(ctx, organizationId);
  if (!isAdmin) {
    throw new Error("Only organization admins can perform this action");
  }
  return userId;
}

// ============================================================================
// Category Queries
// ============================================================================

/**
 * Get all categories and their channels for an organization
 */
export const getCategoriesAndChannels = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return [];

    // Get all categories ordered by order
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Sort by order
    categories.sort((a, b) => a.order - b.order);

    // Get all channels for this organization
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Group channels by category and sort by order
    const result = categories.map((category) => {
      const categoryChannels = channels
        .filter((c) => c.categoryId === category._id)
        .sort((a, b) => a.order - b.order);
      return {
        ...category,
        channels: categoryChannels,
      };
    });

    return result;
  },
});

/**
 * Get a single category
 */
export const getCategory = query({
  args: { categoryId: v.id("channelCategories") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const category = await ctx.db.get(args.categoryId);
    if (!category) return null;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", category.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return null;

    return category;
  },
});

// ============================================================================
// Channel Queries
// ============================================================================

/**
 * Get a single channel
 */
export const getChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return null;

    return channel;
  },
});

/**
 * Get channel by organization slug, category name, and channel name (for routing)
 */
export const getChannelByRoute = query({
  args: {
    orgSlug: v.string(),
    categoryName: v.string(),
    channelName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Get organization by slug
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) return null;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", org._id).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return null;

    // Find category by name (case-insensitive)
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    const category = categories.find(
      (c) => c.name.toLowerCase() === args.categoryName.toLowerCase()
    );

    if (!category) return null;

    // Find channel by name in this category (case-insensitive)
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_category", (q) => q.eq("categoryId", category._id))
      .collect();

    const channel = channels.find(
      (c) => c.name.toLowerCase() === args.channelName.toLowerCase()
    );

    if (!channel) return null;

    return {
      channel,
      category,
      organization: org,
      membership,
    };
  },
});

// ============================================================================
// Category Mutations
// ============================================================================

/**
 * Create a new category
 */
export const createCategory = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.organizationId);

    // Get the highest order value
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const maxOrder = categories.reduce((max, c) => Math.max(max, c.order), -1);

    const categoryId = await ctx.db.insert("channelCategories", {
      organizationId: args.organizationId,
      name: args.name,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    return categoryId;
  },
});

/**
 * Update category name
 */
export const updateCategory = mutation({
  args: {
    categoryId: v.id("channelCategories"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    await requireAdmin(ctx, category.organizationId);

    await ctx.db.patch(args.categoryId, { name: args.name });
    return args.categoryId;
  },
});

/**
 * Delete a category (must have no channels)
 */
export const deleteCategory = mutation({
  args: { categoryId: v.id("channelCategories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    await requireAdmin(ctx, category.organizationId);

    // Check if category has channels
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .first();

    if (channels) {
      throw new Error("Cannot delete category with channels. Move or delete channels first.");
    }

    await ctx.db.delete(args.categoryId);
    return { success: true };
  },
});

/**
 * Reorder categories
 */
export const reorderCategories = mutation({
  args: {
    organizationId: v.id("organizations"),
    categoryIds: v.array(v.id("channelCategories")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.organizationId);

    // Update order for each category
    for (let i = 0; i < args.categoryIds.length; i++) {
      const category = await ctx.db.get(args.categoryIds[i]);
      if (category && category.organizationId === args.organizationId) {
        await ctx.db.patch(args.categoryIds[i], { order: i });
      }
    }

    return { success: true };
  },
});

// ============================================================================
// Channel Mutations
// ============================================================================

/**
 * Create a new channel
 */
export const createChannel = mutation({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.id("channelCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.string(),
    permissions: v.union(v.literal("open"), v.literal("readOnly")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx, args.organizationId);

    // Verify category exists and belongs to organization
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.organizationId !== args.organizationId) {
      throw new Error("Category not found");
    }

    // Get the highest order value in this category
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    const maxOrder = channels.reduce((max, c) => Math.max(max, c.order), -1);

    const channelId = await ctx.db.insert("channels", {
      organizationId: args.organizationId,
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      icon: args.icon,
      permissions: args.permissions,
      order: maxOrder + 1,
      createdAt: Date.now(),
      createdBy: userId,
    });

    return channelId;
  },
});

/**
 * Update a channel
 */
export const updateChannel = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    permissions: v.optional(v.union(v.literal("open"), v.literal("readOnly"))),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    await requireAdmin(ctx, channel.organizationId);

    const updates: Partial<Doc<"channels">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.permissions !== undefined) updates.permissions = args.permissions;

    await ctx.db.patch(args.channelId, updates);
    return args.channelId;
  },
});

/**
 * Delete a channel
 */
export const deleteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    await requireAdmin(ctx, channel.organizationId);

    await ctx.db.delete(args.channelId);
    return { success: true };
  },
});

/**
 * Reorder channels within a category
 */
export const reorderChannels = mutation({
  args: {
    categoryId: v.id("channelCategories"),
    channelIds: v.array(v.id("channels")),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    await requireAdmin(ctx, category.organizationId);

    // Update order for each channel
    for (let i = 0; i < args.channelIds.length; i++) {
      const channel = await ctx.db.get(args.channelIds[i]);
      if (channel && channel.categoryId === args.categoryId) {
        await ctx.db.patch(args.channelIds[i], { order: i });
      }
    }

    return { success: true };
  },
});

/**
 * Move a channel to a different category
 */
export const moveChannel = mutation({
  args: {
    channelId: v.id("channels"),
    targetCategoryId: v.id("channelCategories"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    await requireAdmin(ctx, channel.organizationId);

    const targetCategory = await ctx.db.get(args.targetCategoryId);
    if (!targetCategory || targetCategory.organizationId !== channel.organizationId) {
      throw new Error("Target category not found");
    }

    // Update channel with new category and order
    await ctx.db.patch(args.channelId, {
      categoryId: args.targetCategoryId,
      order: args.newOrder,
    });

    // Reorder other channels in the target category
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_category", (q) => q.eq("categoryId", args.targetCategoryId))
      .collect();

    const sortedChannels = channels
      .filter((c) => c._id !== args.channelId)
      .sort((a, b) => a.order - b.order);

    // Insert the moved channel at the right position
    for (let i = 0; i < sortedChannels.length; i++) {
      const newOrder = i >= args.newOrder ? i + 1 : i;
      if (sortedChannels[i].order !== newOrder) {
        await ctx.db.patch(sortedChannels[i]._id, { order: newOrder });
      }
    }

    return { success: true };
  },
});

// ============================================================================
// Internal Functions (used by organizations.ts)
// ============================================================================

/**
 * Create default category and channel for a new organization
 * This is called from the createOrganization mutation
 */
export const createDefaultCategoryAndChannel = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Create default "General" category
    const categoryId = await ctx.db.insert("channelCategories", {
      organizationId: args.organizationId,
      name: "General",
      order: 0,
      createdAt: Date.now(),
    });

    // Create default "general" channel
    const channelId = await ctx.db.insert("channels", {
      organizationId: args.organizationId,
      categoryId,
      name: "general",
      description: "General discussion for the workspace",
      icon: "Hash",
      permissions: "open",
      order: 0,
      createdAt: Date.now(),
      createdBy: args.userId,
    });

    return { categoryId, channelId };
  },
});
