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

    const userId = identity.subject;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    const isAdmin = membership.role === "admin";

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

    // Get user's channel memberships for private channels
    const channelMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const memberChannelIds = new Set(channelMemberships.map((m) => m.channelId));

    // Filter channels based on privacy and membership
    const accessibleChannels = channels.filter((channel) => {
      // Public channels are accessible to all org members
      if (!channel.isPrivate) return true;
      // Admins can see all private channels
      if (isAdmin) return true;
      // For private channels, check if user is a member
      return memberChannelIds.has(channel._id);
    });

    // Group channels by category and sort by order
    const result = categories.map((category) => {
      const categoryChannels = accessibleChannels
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

    const userId = identity.subject;
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return null;

    // Check private channel access
    if (channel.isPrivate && membership.role !== "admin") {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", userId)
        )
        .first();

      if (!channelMember) return null;
    }

    return channel;
  },
});

/**
 * Get channel members for a private channel
 */
export const getChannelMembers = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return [];

    // Check org membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get channel members
    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    return members.map((m) => m.userId);
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

    const userId = identity.subject;

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
        q.eq("organizationId", org._id).eq("userId", userId)
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

    // Check private channel access
    if (channel.isPrivate && membership.role !== "admin") {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", channel._id).eq("userId", userId)
        )
        .first();

      if (!channelMember) return null;
    }

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
 * Delete a category and all its channels
 */
export const deleteCategory = mutation({
  args: { categoryId: v.id("channelCategories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    await requireAdmin(ctx, category.organizationId);

    // Get all channels in this category and delete them
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    // Delete all channels in this category
    for (const channel of channels) {
      await ctx.db.delete(channel._id);
    }

    // Delete the category
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
    isPrivate: v.optional(v.boolean()),
    memberIds: v.optional(v.array(v.string())), // Clerk user IDs for private channel members
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx, args.organizationId);

    // Check if there are any categories in the workspace
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    if (categories.length === 0) {
      throw new Error("Cannot create a channel: there are no categories in this workspace. Please create a category first.");
    }

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
      isPrivate: args.isPrivate || false,
      order: maxOrder + 1,
      createdAt: Date.now(),
      createdBy: userId,
    });

    // If this is a private channel, add the selected members
    if (args.isPrivate && args.memberIds) {
      const now = Date.now();
      // Always add the creator as a member
      const membersToAdd = new Set([userId, ...args.memberIds]);

      for (const memberId of membersToAdd) {
        await ctx.db.insert("channelMembers", {
          channelId,
          userId: memberId,
          addedAt: now,
          addedBy: userId,
        });
      }
    }

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
    isPrivate: v.optional(v.boolean()),
    memberIds: v.optional(v.array(v.string())), // Clerk user IDs for private channel members
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const userId = await requireAdmin(ctx, channel.organizationId);

    const updates: Partial<Doc<"channels">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.permissions !== undefined) updates.permissions = args.permissions;
    if (args.isPrivate !== undefined) updates.isPrivate = args.isPrivate;

    await ctx.db.patch(args.channelId, updates);

    // If memberIds is provided and channel is/will be private, update the member list
    if (args.memberIds !== undefined) {
      const isPrivate = args.isPrivate !== undefined ? args.isPrivate : channel.isPrivate;

      if (isPrivate) {
        // Get current channel members
        const currentMembers = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
          .collect();

        const currentMemberIds = new Set(currentMembers.map((m) => m.userId));
        const newMemberIds = new Set([userId, ...args.memberIds]); // Always include the admin making the change

        // Remove members that are no longer in the list
        for (const member of currentMembers) {
          if (!newMemberIds.has(member.userId)) {
            await ctx.db.delete(member._id);
          }
        }

        // Add new members
        const now = Date.now();
        for (const memberId of newMemberIds) {
          if (!currentMemberIds.has(memberId)) {
            await ctx.db.insert("channelMembers", {
              channelId: args.channelId,
              userId: memberId,
              addedAt: now,
              addedBy: userId,
            });
          }
        }
      } else {
        // If channel is no longer private, remove all channel members
        const members = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
          .collect();

        for (const member of members) {
          await ctx.db.delete(member._id);
        }
      }
    }

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

    // Delete channel members if any
    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

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

// ============================================================================
// Channel Muting
// ============================================================================

/**
 * Get all muted channel IDs for the current user in an organization
 */
export const getMutedChannels = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get all channels in this organization
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const channelIds = new Set(channels.map((c) => c._id));

    // Get user's muted channels
    const mutes = await ctx.db
      .query("channelMutes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter to only include mutes for channels in this organization
    return mutes
      .filter((m) => channelIds.has(m.channelId))
      .map((m) => m.channelId);
  },
});

/**
 * Check if a specific channel is muted by the current user
 */
export const isChannelMuted = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const userId = identity.subject;

    const mute = await ctx.db
      .query("channelMutes")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", userId).eq("channelId", args.channelId)
      )
      .first();

    return !!mute;
  },
});

/**
 * Mute a channel for the current user
 */
export const muteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const channel = await ctx.db.get(args.channelId);

    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check org membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Check private channel access
    if (channel.isPrivate && membership.role !== "admin") {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", userId)
        )
        .first();

      if (!channelMember) {
        throw new Error("You don't have access to this channel");
      }
    }

    // Check if already muted
    const existingMute = await ctx.db
      .query("channelMutes")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", userId).eq("channelId", args.channelId)
      )
      .first();

    if (existingMute) {
      return { success: true, alreadyMuted: true };
    }

    // Create mute
    await ctx.db.insert("channelMutes", {
      userId,
      channelId: args.channelId,
      mutedAt: Date.now(),
    });

    return { success: true, alreadyMuted: false };
  },
});

/**
 * Unmute a channel for the current user
 */
export const unmuteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Find and delete the mute
    const existingMute = await ctx.db
      .query("channelMutes")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", userId).eq("channelId", args.channelId)
      )
      .first();

    if (!existingMute) {
      return { success: true, wasNotMuted: true };
    }

    await ctx.db.delete(existingMute._id);

    return { success: true, wasNotMuted: false };
  },
});

/**
 * Toggle mute status for a channel
 */
export const toggleChannelMute = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const channel = await ctx.db.get(args.channelId);

    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check org membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Check private channel access
    if (channel.isPrivate && membership.role !== "admin") {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", userId)
        )
        .first();

      if (!channelMember) {
        throw new Error("You don't have access to this channel");
      }
    }

    // Check if currently muted
    const existingMute = await ctx.db
      .query("channelMutes")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", userId).eq("channelId", args.channelId)
      )
      .first();

    if (existingMute) {
      // Unmute
      await ctx.db.delete(existingMute._id);
      return { success: true, isMuted: false };
    } else {
      // Mute
      await ctx.db.insert("channelMutes", {
        userId,
        channelId: args.channelId,
        mutedAt: Date.now(),
      });
      return { success: true, isMuted: true };
    }
  },
});
