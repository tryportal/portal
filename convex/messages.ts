import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// Typing indicator expiry time in milliseconds (3 seconds)
const TYPING_EXPIRY_MS = 3000;

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ============================================================================
// Helper Functions
// ============================================================================

async function checkChannelAccess(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: { get: Function; query: Function } },
  channelId: Id<"channels">
): Promise<{
  userId: string;
  channel: Doc<"channels">;
  membership: Doc<"organizationMembers">;
  isAdmin: boolean;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userId = identity.subject;
  const channel = await ctx.db.get(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_and_user", (q: { eq: Function }) =>
      q.eq("organizationId", channel.organizationId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  return { userId, channel, membership, isAdmin: membership.role === "admin" };
}

// ============================================================================
// Message Queries
// ============================================================================

/**
 * Get messages for a channel with pagination, ordered by creation time (newest first for initial load)
 */
export const getMessages = query({
  args: { 
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp for cursor-based pagination
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { messages: [], nextCursor: null, hasMore: false };

    // Get channel and verify membership
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return { messages: [], nextCursor: null, hasMore: false };

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return { messages: [], nextCursor: null, hasMore: false };

    const limit = args.limit ?? 50; // Default to 50 messages

    // Get messages ordered by creation time
    let messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) => q.eq("channelId", args.channelId));

    // If we have a cursor, filter to get older messages
    if (args.cursor) {
      messagesQuery = messagesQuery.filter((q) => 
        q.lt(q.field("createdAt"), args.cursor!)
      );
    }

    // Get one extra to check if there are more
    const messages = await messagesQuery
      .order("desc")
      .take(limit + 1);

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;
    
    // Reverse to get chronological order for display
    const chronologicalMessages = resultMessages.reverse();
    
    // Next cursor is the oldest message's createdAt
    const nextCursor = hasMore && resultMessages.length > 0 
      ? resultMessages[resultMessages.length - 1].createdAt 
      : null;

    return { 
      messages: chronologicalMessages, 
      nextCursor, 
      hasMore 
    };
  },
});

/**
 * Get a single message by ID
 */
export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Verify membership through channel
    const channel = await ctx.db.get(message.channelId);
    if (!channel) return null;

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return null;

    return message;
  },
});

/**
 * Get recent messages for the current user (last 5)
 */
export const getRecentMessages = query({
  args: { organizationId: v.id("organizations"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 5;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get all channels in the organization
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const channelIds = channels.map((c) => c._id);

    // Get all messages from user in these channels
    const allMessages = await Promise.all(
      channelIds.map(async (channelId) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_channel_and_created", (q) => q.eq("channelId", channelId))
          .collect();
        
        return messages.filter((m) => m.userId === userId);
      })
    );

    // Flatten and sort by createdAt descending
    const flatMessages = allMessages.flat().sort((a, b) => b.createdAt - a.createdAt);

    // Return the most recent messages
    return flatMessages.slice(0, limit).map((m) => ({
      ...m,
      channelId: m.channelId,
    }));
  },
});

/**
 * Get messages where the current user was mentioned (last 5)
 * Mentions are detected by searching for @ symbol in message content
 * Note: This is a simple implementation. In production, you'd want to parse
 * actual @username mentions and match them against the user's name/handle
 */
export const getMentions = query({
  args: { organizationId: v.id("organizations"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 5;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get all channels in the organization
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const channelIds = channels.map((c) => c._id);

    // Build possible display name variants for fallback detection
    const displayNameParts = [
      identity.name,
      identity.givenName && identity.familyName
        ? `${identity.givenName} ${identity.familyName}`
        : undefined,
      identity.givenName,
    ]
      .filter(Boolean)
      .map((name) => name!.toLowerCase());

    // Get all messages from these channels that mention the current user
    const allMessages = await Promise.all(
      channelIds.map(async (channelId) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_channel_and_created", (q) => q.eq("channelId", channelId))
          .collect();
        
        return messages.filter((m) => {
          // Structured mentions stored in the message document
          const hasStructuredMention = Array.isArray(m.mentions) && m.mentions.includes(userId);
          // Fallback for any legacy messages without the mentions array
          const hasLegacyMention = !m.mentions && m.content.includes(`@${userId}`);
          // Fallback for manual @name mentions (case-insensitive)
          const contentLower = m.content.toLowerCase();
          const hasNameMention = displayNameParts.some((name) =>
            contentLower.includes(`@${name}`)
          );

          return hasStructuredMention || hasLegacyMention || hasNameMention;
        });
      })
    );

    // Flatten and sort by createdAt descending
    const flatMessages = allMessages.flat().sort((a, b) => b.createdAt - a.createdAt);

    // Return the most recent mentions
    return flatMessages.slice(0, limit).map((m) => ({
      ...m,
      channelId: m.channelId,
    }));
  },
});

// ============================================================================
// Message Mutations
// ============================================================================

/**
 * Helper function to parse mentions from message content
 * Mentions are in the format @userId
 */
function parseMentions(content: string): string[] {
  const mentionRegex = /@(user_[a-zA-Z0-9]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }
  return mentions;
}

/**
 * Send a new message to a channel
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      size: v.number(),
      type: v.string(),
    }))),
    parentMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const { userId, channel, isAdmin } = await checkChannelAccess(ctx, args.channelId);

    // Check if channel is read-only and user is not admin
    if (channel.permissions === "readOnly" && !isAdmin) {
      throw new Error("Only admins can post in this read-only channel");
    }

    // Validate content
    if (!args.content.trim() && (!args.attachments || args.attachments.length === 0)) {
      throw new Error("Message must have content or attachments");
    }

    // Validate attachment sizes
    if (args.attachments) {
      for (const attachment of args.attachments) {
        if (attachment.size > MAX_FILE_SIZE) {
          throw new Error(`File "${attachment.name}" exceeds the 5MB limit`);
        }
      }
    }

    // If replying, verify parent message exists and is in the same channel
    if (args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);
      if (!parentMessage) {
        throw new Error("Parent message not found");
      }
      if (parentMessage.channelId !== args.channelId) {
        throw new Error("Cannot reply to a message in a different channel");
      }
    }

    // Parse mentions from content
    const mentions = parseMentions(args.content);

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId,
      content: args.content.trim(),
      attachments: args.attachments,
      createdAt: Date.now(),
      parentMessageId: args.parentMessageId,
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    // Clear typing indicator for this user in this channel
    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .first();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return messageId;
  },
});

/**
 * Edit a message
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check ownership or admin status
    const channel = await ctx.db.get(message.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const isOwner = message.userId === userId;
    const isAdmin = membership.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new Error("Only message owner or admins can edit messages");
    }

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Message content cannot be empty");
    }

    // Parse mentions from content
    const mentions = parseMentions(args.content);

    await ctx.db.patch(args.messageId, {
      content: args.content.trim(),
      editedAt: Date.now(),
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    return args.messageId;
  },
});

/**
 * Delete a message (only owner can delete)
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check ownership - only message owner can delete
    const channel = await ctx.db.get(message.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const isOwner = message.userId === userId;

    if (!isOwner) {
      throw new Error("Only the message owner can delete messages");
    }

    // Delete attachments from storage
    if (message.attachments) {
      for (const attachment of message.attachments) {
        try {
          await ctx.storage.delete(attachment.storageId);
        } catch {
          // Ignore deletion errors for attachments
        }
      }
    }

    // Delete any saved message references
    const savedRefs = await ctx.db
      .query("savedMessages")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .collect();
    
    for (const savedRef of savedRefs) {
      await ctx.db.delete(savedRef._id);
    }

    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

// ============================================================================
// File Upload Functions
// ============================================================================

/**
 * Generate an upload URL for file attachments
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get the URL for a stored file
 */
export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get URLs for multiple stored files in a single batch query
 * This prevents N+1 query patterns when loading multiple attachments
 */
export const getBatchStorageUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map(async (storageId) => {
        const url = await ctx.storage.getUrl(storageId);
        return { storageId, url };
      })
    );
    // Return as a map for easy lookup
    return Object.fromEntries(urls.map(({ storageId, url }) => [storageId, url]));
  },
});

// ============================================================================
// Typing Indicator Functions
// ============================================================================

/**
 * Set typing status for a user in a channel
 */
export const setTyping = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify channel access
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Upsert typing indicator
    const existingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .first();

    if (existingIndicator) {
      await ctx.db.patch(existingIndicator._id, {
        lastTypingAt: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        channelId: args.channelId,
        userId,
        lastTypingAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Clear typing status for a user in a channel
 */
export const clearTyping = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .first();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return { success: true };
  },
});

/**
 * Get users currently typing in a channel (query for internal use)
 */
export const getTypingUsersQuery = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { typingUsers: [], isAuthorized: false };

    const userId = identity.subject;

    // Verify channel access
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return { typingUsers: [], isAuthorized: false };

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return { typingUsers: [], isAuthorized: false };

    const now = Date.now();
    const typingIndicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    // Filter out expired indicators (older than 3 seconds) and exclude current user
    const activeTypingUsers: string[] = typingIndicators
      .filter((indicator) =>
        now - indicator.lastTypingAt < TYPING_EXPIRY_MS &&
        indicator.userId !== userId
      )
      .map((indicator) => indicator.userId);

    return { typingUsers: activeTypingUsers, isAuthorized: true };
  },
});

/**
 * Get users currently typing in a channel with user data
 */
export const getTypingUsers = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args): Promise<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }>> => {
    const result = await ctx.runQuery(api.messages.getTypingUsersQuery, {
      channelId: args.channelId,
    });

    if (!result.isAuthorized || result.typingUsers.length === 0) {
      return [];
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return result.typingUsers.map((userId: string) => ({
        userId,
        firstName: null,
        lastName: null,
        imageUrl: null,
      }));
    }

    // Fetch user data from Clerk for each typing user
    const typingUsersWithData = await Promise.all(
      result.typingUsers.map(async (userId: string) => {
        try {
          const response = await fetch(
            `https://api.clerk.com/v1/users/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
              },
            }
          );

          if (!response.ok) {
            return {
              userId,
              firstName: null,
              lastName: null,
              imageUrl: null,
            };
          }

          const userData = await response.json();
          return {
            userId,
            firstName: userData.first_name || null,
            lastName: userData.last_name || null,
            imageUrl: userData.image_url || null,
          };
        } catch {
          return {
            userId,
            firstName: null,
            lastName: null,
            imageUrl: null,
          };
        }
      })
    );

    return typingUsersWithData;
  },
});

/**
 * Get user data from Clerk for a list of user IDs
 */
export const getUserData = action({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args): Promise<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }>> => {
    if (args.userIds.length === 0) {
      return [];
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return args.userIds.map((userId: string) => ({
        userId,
        firstName: null,
        lastName: null,
        imageUrl: null,
      }));
    }

    // Fetch user data from Clerk for each user ID
    const usersWithData = await Promise.all(
      args.userIds.map(async (userId: string) => {
        try {
          const response = await fetch(
            `https://api.clerk.com/v1/users/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
              },
            }
          );

          if (!response.ok) {
            return {
              userId,
              firstName: null,
              lastName: null,
              imageUrl: null,
            };
          }

          const userData = await response.json();
          return {
            userId,
            firstName: userData.first_name || null,
            lastName: userData.last_name || null,
            imageUrl: userData.image_url || null,
          };
        } catch {
          return {
            userId,
            firstName: null,
            lastName: null,
            imageUrl: null,
          };
        }
      })
    );

    return usersWithData;
  },
});

// ============================================================================
// New Chat Feature Mutations
// ============================================================================

/**
 * Forward a message to another channel
 */
export const forwardMessage = mutation({
  args: {
    messageId: v.id("messages"),
    targetChannelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check access to target channel
    const { channel: targetChannel, isAdmin } = await checkChannelAccess(ctx, args.targetChannelId);

    // Check if target channel is read-only
    if (targetChannel.permissions === "readOnly" && !isAdmin) {
      throw new Error("Only admins can post in this read-only channel");
    }

    // Create new forwarded message
    const forwardedMessageId = await ctx.db.insert("messages", {
      channelId: args.targetChannelId,
      userId,
      content: message.content,
      attachments: message.attachments,
      createdAt: Date.now(),
    });

    return forwardedMessageId;
  },
});

/**
 * Add or remove a reaction (toggle)
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify membership
    const channel = await ctx.db.get(message.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const currentReactions = message.reactions || [];
    const existingReactionIndex = currentReactions.findIndex(
      (r) => r.userId === userId && r.emoji === args.emoji
    );

    let newReactions;
    if (existingReactionIndex >= 0) {
      // Remove the reaction
      newReactions = currentReactions.filter((_, i) => i !== existingReactionIndex);
    } else {
      // Add the reaction
      newReactions = [...currentReactions, { userId, emoji: args.emoji }];
    }

    await ctx.db.patch(args.messageId, {
      reactions: newReactions.length > 0 ? newReactions : undefined,
    });

    return { success: true };
  },
});

/**
 * Pin or unpin a message
 */
export const togglePin = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify membership and admin status
    const channel = await ctx.db.get(message.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Only admins can pin/unpin messages
    if (membership.role !== "admin") {
      throw new Error("Only admins can pin or unpin messages");
    }

    await ctx.db.patch(args.messageId, {
      pinned: !message.pinned,
    });

    return { success: true, pinned: !message.pinned };
  },
});

/**
 * Save a message for the current user
 */
export const saveMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify membership
    const channel = await ctx.db.get(message.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Check if already saved
    const existingSave = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId)
      )
      .first();

    if (existingSave) {
      throw new Error("Message already saved");
    }

    await ctx.db.insert("savedMessages", {
      userId,
      messageId: args.messageId,
      savedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Unsave a message for the current user
 */
export const unsaveMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const savedMessage = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId)
      )
      .first();

    if (!savedMessage) {
      throw new Error("Message not saved");
    }

    await ctx.db.delete(savedMessage._id);
    return { success: true };
  },
});

// ============================================================================
// New Chat Feature Queries
// ============================================================================

/**
 * Get pinned messages for a channel
 */
export const getPinnedMessages = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get channel and verify membership
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return [];

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return [];

    // Get all pinned messages for this channel
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("pinned"), true))
      .collect();

    return messages;
  },
});

/**
 * Get saved messages for the current user
 */
export const getSavedMessages = query({
  args: { 
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 20;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get saved messages for this user, ordered by saved date
    const savedMessageRefs = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_saved", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // Fetch the actual messages
    const messages = await Promise.all(
      savedMessageRefs.map(async (ref) => {
        const message = await ctx.db.get(ref.messageId);
        if (!message) return null;

        // Verify the message is in a channel belonging to this organization
        const channel = await ctx.db.get(message.channelId);
        if (!channel || channel.organizationId !== args.organizationId) return null;

        return {
          ...message,
          savedAt: ref.savedAt,
        };
      })
    );

    return messages.filter((m): m is NonNullable<typeof m> => m !== null);
  },
});

/**
 * Check if a message is saved by the current user
 */
export const isMessageSaved = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const savedMessage = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", identity.subject).eq("messageId", args.messageId)
      )
      .first();

    return !!savedMessage;
  },
});

/**
 * Get replies to a message
 */
export const getMessageReplies = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    // Verify membership
    const channel = await ctx.db.get(message.channelId);
    if (!channel) return [];

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return [];

    // Get all replies to this message
    const replies = await ctx.db
      .query("messages")
      .withIndex("by_parent_message", (q) => q.eq("parentMessageId", args.messageId))
      .collect();

    return replies;
  },
});

/**
 * Get organization members for mention autocomplete
 */
export const getOrganizationMembers = query({
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

    // Get all members of the organization
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    return members.map((m) => ({
      userId: m.userId,
      role: m.role,
    }));
  },
});
