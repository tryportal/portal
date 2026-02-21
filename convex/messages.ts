import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get a channel by workspace slug, category name, and channel name.
 * Also returns the user's membership role and mute status.
 */
export const getChannelByName = query({
  args: {
    slug: v.string(),
    categoryName: v.string(),
    channelName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Find the workspace
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!org) return null;

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", org._id).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return null;

    // Find the category by name (case-insensitive compare)
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    const category = categories.find(
      (c) => c.name.toLowerCase().replace(/\s+/g, "-") === args.categoryName.toLowerCase()
    );
    if (!category) return null;

    // Find the channel by name within this category
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_category", (q) => q.eq("categoryId", category._id))
      .collect();

    const channel = channels.find(
      (c) => c.name.toLowerCase() === args.channelName.toLowerCase()
    );
    if (!channel) return null;

    // Check mute status
    const muted = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", identity.subject).eq("channelId", channel._id)
      )
      .unique();

    return {
      ...channel,
      categoryName: category.name,
      role: membership.role,
      isMuted: !!muted,
      organizationId: org._id,
    };
  },
});

/**
 * Get paginated messages for a channel.
 * Returns 50 messages per page, newest first. Client reverses for display.
 * Enriches each message with user profile data.
 */
export const getMessages = query({
  args: {
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };

    const results = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Collect unique user IDs from this page
    const userIds = new Set<string>();
    for (const msg of results.page) {
      userIds.add(msg.userId);
    }

    // Batch fetch user profiles
    const userMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string; clerkId: string }>();
    for (const userId of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .unique();
      if (user) {
        userMap.set(userId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          clerkId: user.clerkId,
        });
      }
    }

    // Fetch parent messages for replies (batch)
    const parentIds: Id<"messages">[] = [];
    for (const msg of results.page) {
      if (msg.parentMessageId) {
        parentIds.push(msg.parentMessageId);
      }
    }

    const parentMap = new Map<Id<"messages">, { content: string; userId: string; userName: string }>();
    for (const parentId of parentIds) {
      const parent = await ctx.db.get(parentId);
      if (parent) {
        const parentUser = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", parent.userId))
          .unique();
        parentMap.set(parentId, {
          content: parent.content,
          userId: parent.userId,
          userName: parentUser
            ? [parentUser.firstName, parentUser.lastName].filter(Boolean).join(" ") || "Unknown"
            : "Unknown",
        });
      }
    }

    // Check which messages are saved by current user
    const savedMessages = await ctx.db
      .query("savedMessages")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const savedMessageIds = new Set(savedMessages.map((s) => s.messageId));

    // Resolve attachment URLs
    const attachmentUrlMap = new Map<string, string>();
    for (const msg of results.page) {
      if (msg.attachments) {
        for (const att of msg.attachments) {
          if (!attachmentUrlMap.has(att.storageId)) {
            const url = await ctx.storage.getUrl(att.storageId);
            if (url) attachmentUrlMap.set(att.storageId, url);
          }
        }
      }
    }

    // Enrich messages
    const enrichedPage = results.page.map((msg) => {
      const user = userMap.get(msg.userId);
      const parentMessage = msg.parentMessageId
        ? parentMap.get(msg.parentMessageId) ?? null
        : null;

      return {
        ...msg,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
        parentMessage,
        isSaved: savedMessageIds.has(msg._id),
        isOwn: msg.userId === identity.subject,
        attachments: msg.attachments?.map((att) => ({
          ...att,
          url: attachmentUrlMap.get(att.storageId) ?? null,
        })),
      };
    });

    return {
      ...results,
      page: enrichedPage,
    };
  },
});

/**
 * Get all pinned messages for a channel.
 */
export const getPinnedMessages = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .collect();

    const pinned = messages.filter((m) => m.pinned === true);

    // Enrich with user data
    const userIds = new Set(pinned.map((m) => m.userId));
    const userMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string }>();
    for (const userId of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .unique();
      if (user) {
        userMap.set(userId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        });
      }
    }

    return pinned.map((msg) => {
      const user = userMap.get(msg.userId);
      return {
        ...msg,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
      };
    });
  },
});

/**
 * Search messages in a channel by content substring.
 */
export const searchMessages = query({
  args: {
    channelId: v.id("channels"),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (!args.searchQuery.trim()) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .collect();

    const query = args.searchQuery.toLowerCase();
    const filtered = messages
      .filter((m) => m.content.toLowerCase().includes(query))
      .slice(0, 20); // Limit results

    // Enrich with user data
    const userIds = new Set(filtered.map((m) => m.userId));
    const userMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string }>();
    for (const userId of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .unique();
      if (user) {
        userMap.set(userId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        });
      }
    }

    // Check saved status
    const savedMessages = await ctx.db
      .query("savedMessages")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const savedMessageIds = new Set(savedMessages.map((s) => s.messageId));

    // Resolve attachment URLs
    const attachmentUrlMap = new Map<string, string>();
    for (const msg of filtered) {
      if (msg.attachments) {
        for (const att of msg.attachments) {
          if (!attachmentUrlMap.has(att.storageId)) {
            const url = await ctx.storage.getUrl(att.storageId);
            if (url) attachmentUrlMap.set(att.storageId, url);
          }
        }
      }
    }

    return filtered.map((msg) => {
      const user = userMap.get(msg.userId);
      return {
        ...msg,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
        parentMessage: null as { content: string; userId: string; userName: string } | null,
        isSaved: savedMessageIds.has(msg._id),
        isOwn: msg.userId === identity.subject,
        attachments: msg.attachments?.map((att) => ({
          ...att,
          url: attachmentUrlMap.get(att.storageId) ?? null,
        })),
      };
    });
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Send a new message to a channel.
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          name: v.string(),
          size: v.number(),
          type: v.string(),
        })
      )
    ),
    parentMessageId: v.optional(v.id("messages")),
    mentions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify membership in the workspace
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", channel.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member of this workspace");

    // Check channel permissions
    if (channel.permissions === "readOnly" && membership.role !== "admin") {
      throw new Error("This channel is read-only");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId: identity.subject,
      content: args.content,
      attachments: args.attachments,
      parentMessageId: args.parentMessageId,
      mentions: args.mentions,
      createdAt: Date.now(),
    });

    // Update read status for sender
    const existingReadStatus = await ctx.db
      .query("channelReadStatus")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", identity.subject)
      )
      .unique();

    if (existingReadStatus) {
      await ctx.db.patch(existingReadStatus._id, { lastReadAt: Date.now() });
    } else {
      await ctx.db.insert("channelReadStatus", {
        channelId: args.channelId,
        userId: identity.subject,
        lastReadAt: Date.now(),
      });
    }

    return messageId;
  },
});

/**
 * Edit own message.
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.userId !== identity.subject) {
      throw new Error("You can only edit your own messages");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      editedAt: Date.now(),
    });
  },
});

/**
 * Delete own message.
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.userId !== identity.subject) {
      throw new Error("You can only delete your own messages");
    }

    // Delete associated saved messages
    const saved = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", identity.subject).eq("messageId", args.messageId)
      )
      .collect();
    for (const s of saved) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.delete(args.messageId);
  },
});

/**
 * Toggle emoji reaction on a message.
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions ?? [];
    const existingIdx = reactions.findIndex(
      (r) => r.userId === identity.subject && r.emoji === args.emoji
    );

    if (existingIdx !== -1) {
      // Remove reaction
      reactions.splice(existingIdx, 1);
    } else {
      // Add reaction
      reactions.push({ userId: identity.subject, emoji: args.emoji });
    }

    await ctx.db.patch(args.messageId, { reactions });
  },
});

/**
 * Toggle pin status on a message (admin only).
 */
export const pinMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Get channel to find workspace
    const channelId = message.channelId;
    if (!channelId) throw new Error("Not a channel message");

    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", channel.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can pin messages");
    }

    await ctx.db.patch(args.messageId, { pinned: !message.pinned });
  },
});

/**
 * Toggle saved status for a message.
 */
export const toggleSaveMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", identity.subject).eq("messageId", args.messageId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    } else {
      await ctx.db.insert("savedMessages", {
        userId: identity.subject,
        messageId: args.messageId,
        savedAt: Date.now(),
      });
      return { saved: true };
    }
  },
});

/**
 * Forward a message to another channel.
 */
export const forwardMessage = mutation({
  args: {
    messageId: v.id("messages"),
    targetChannelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const originalMessage = await ctx.db.get(args.messageId);
    if (!originalMessage) throw new Error("Message not found");

    const targetChannel = await ctx.db.get(args.targetChannelId);
    if (!targetChannel) throw new Error("Target channel not found");

    // Verify membership in target workspace
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", targetChannel.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member of the target workspace");

    // Get source channel name for display
    let channelName: string | undefined;
    if (originalMessage.channelId) {
      const sourceChannel = await ctx.db.get(originalMessage.channelId);
      channelName = sourceChannel?.name;
    }

    // Get original author name
    const originalUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", originalMessage.userId))
      .unique();

    await ctx.db.insert("messages", {
      channelId: args.targetChannelId,
      userId: identity.subject,
      content: originalMessage.content,
      attachments: originalMessage.attachments,
      createdAt: Date.now(),
      forwardedFrom: {
        messageId: args.messageId,
        channelId: originalMessage.channelId,
        channelName,
        userName: originalUser
          ? [originalUser.firstName, originalUser.lastName]
              .filter(Boolean)
              .join(" ")
          : undefined,
      },
    });
  },
});

/**
 * Mute a channel.
 */
export const muteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if already muted
    const existing = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", identity.subject).eq("channelId", args.channelId)
      )
      .unique();

    if (existing) return; // Already muted

    await ctx.db.insert("mutedChannels", {
      userId: identity.subject,
      channelId: args.channelId,
      mutedAt: Date.now(),
    });
  },
});

/**
 * Unmute a channel.
 */
export const unmuteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", identity.subject).eq("channelId", args.channelId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Mark a channel as read.
 */
export const markChannelRead = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("channelReadStatus")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", identity.subject)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadAt: Date.now() });
    } else {
      await ctx.db.insert("channelReadStatus", {
        channelId: args.channelId,
        userId: identity.subject,
        lastReadAt: Date.now(),
      });
    }
  },
});

/**
 * Generate an upload URL for file attachments.
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});
