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
 * Get all messages for a channel, ordered by creation time
 */
export const getMessages = query({
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

    // Get messages ordered by creation time
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) => q.eq("channelId", args.channelId))
      .collect();

    return messages;
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

    // Get all messages from these channels that contain @ mentions
    // Exclude messages sent by the user themselves
    const allMessages = await Promise.all(
      channelIds.map(async (channelId) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_channel_and_created", (q) => q.eq("channelId", channelId))
          .collect();
        
        return messages.filter((m) => 
          m.content.includes("@") &&
          m.userId !== userId // Exclude messages sent by the user themselves
        );
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

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId,
      content: args.content.trim(),
      attachments: args.attachments,
      createdAt: Date.now(),
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

    await ctx.db.patch(args.messageId, {
      content: args.content.trim(),
      editedAt: Date.now(),
    });

    return args.messageId;
  },
});

/**
 * Delete a message
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
      throw new Error("Only message owner or admins can delete messages");
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
