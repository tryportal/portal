import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// Constants
// ============================================================================

const DAILY_MESSAGE_LIMIT = 10;
const PEARL_SYSTEM_USER_ID = "pearl-assistant";

// ============================================================================
// Helper: Get today's date string
// ============================================================================

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get workspace context for Pearl's system prompt.
 * Returns all channels (id, name, type, category) and DM conversation
 * participants (id, name) for the current user in a workspace.
 */
export const getWorkspaceContext = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;

    // Check org membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return null;

    // Get all categories
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    // Get all channels
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to accessible channels (public or private with membership)
    const isAdmin = membership.role === "admin";
    const userChannelMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const memberChannelIds = new Set(userChannelMemberships.map((m) => m.channelId));

    const accessibleChannels = channels.filter((ch) => {
      if (!ch.isPrivate) return true;
      if (isAdmin) return true;
      return memberChannelIds.has(ch._id);
    });

    const channelData = accessibleChannels.map((ch) => ({
      id: ch._id,
      name: ch.name,
      type: ch.channelType || "chat",
      categoryName: categoryMap.get(ch.categoryId) || "Unknown",
      isPrivate: ch.isPrivate || false,
      permissions: ch.permissions,
    }));

    // Get DM conversations
    const convos1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", userId))
      .collect();

    const convos2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", userId))
      .collect();

    // Deduplicate
    const convoMap = new Map<string, typeof convos1[0]>();
    for (const c of [...convos1, ...convos2]) {
      convoMap.set(c._id, c);
    }

    const conversations = Array.from(convoMap.values());

    // Get user data for other participants
    const otherUserIds = conversations.map((c) =>
      c.participant1Id === userId ? c.participant2Id : c.participant1Id
    );

    const uniqueUserIds = [...new Set(otherUserIds)];
    const userRecords = await Promise.all(
      uniqueUserIds.map(async (uid) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", uid))
          .first();
        return user ? { id: uid, name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown" } : { id: uid, name: "Unknown" };
      })
    );

    const userMap = new Map(userRecords.map((u) => [u.id, u.name]));

    const conversationData = conversations.map((c) => {
      const otherUserId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      return {
        id: c._id,
        otherUserId,
        otherUserName: userMap.get(otherUserId) || "Unknown",
      };
    });

    return {
      channels: channelData,
      conversations: conversationData,
      userId,
    };
  },
});

/**
 * Get last 50 messages from a channel for summarization.
 */
export const getChannelMessagesForSummary = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;

    // Verify channel exists and user has access
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      // Check shared access
      const sharedMember = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", userId)
        )
        .first();
      if (!sharedMember) return null;
    }

    // Get last 50 messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .take(50);

    // Reverse to chronological order
    const chronological = messages.reverse();

    // Resolve user names
    const userIds = [...new Set(chronological.map((m) => m.userId))];
    const users = await Promise.all(
      userIds.map(async (uid) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", uid))
          .first();
        return {
          id: uid,
          name: user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
            : "Unknown",
        };
      })
    );

    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    return {
      channelName: channel.name,
      messages: chronological.map((m) => ({
        author: nameMap.get(m.userId) || "Unknown",
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  },
});

/**
 * Get last 50 messages from a DM conversation for summarization.
 */
export const getConversationMessagesForSummary = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Verify participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      return null;
    }

    // Get last 50 messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(50);

    const chronological = messages.reverse();

    // Resolve user names
    const userIds = [...new Set(chronological.map((m) => m.userId))];
    const users = await Promise.all(
      userIds.map(async (uid) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", uid))
          .first();
        return {
          id: uid,
          name: user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
            : "Unknown",
        };
      })
    );

    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    const otherUserId =
      conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;

    return {
      otherUserName: nameMap.get(otherUserId) || "Unknown",
      messages: chronological.map((m) => ({
        author: nameMap.get(m.userId) || "Unknown",
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  },
});

/**
 * Get inbox mentions for summarization.
 */
export const getInboxForSummary = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;

    // Check org membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return null;

    // Get channels in org
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Get muted channels
    const mutedChannels = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mutedChannelIds = new Set(mutedChannels.map((m) => m.channelId));

    const activeChannelIds = channels
      .filter((c) => !mutedChannelIds.has(c._id))
      .map((c) => c._id);

    const channelNameMap = new Map(channels.map((c) => [c._id as string, c.name]));

    // Build display name variants
    const displayNameParts = [
      identity.name,
      identity.givenName && identity.familyName
        ? `${identity.givenName} ${identity.familyName}`
        : undefined,
      identity.givenName,
    ]
      .filter(Boolean)
      .map((name) => name!.toLowerCase());

    // Get recent messages mentioning the user
    const allMentions: Array<{
      author: string;
      content: string;
      channelName: string;
      createdAt: number;
    }> = [];

    for (const channelId of activeChannelIds) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_created", (q) =>
          q.eq("channelId", channelId)
        )
        .order("desc")
        .take(200);

      for (const m of messages) {
        const isMentioned =
          (Array.isArray(m.mentions) && (m.mentions.includes(userId) || m.mentions.includes("everyone"))) ||
          m.content.includes(`@${userId}`) ||
          displayNameParts.some((name) => m.content.toLowerCase().includes(`@${name}`));

        if (isMentioned && m.userId !== userId) {
          const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", m.userId))
            .first();

          allMentions.push({
            author: user
              ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
              : "Unknown",
            content: m.content,
            channelName: channelNameMap.get(channelId as string) || "Unknown",
            createdAt: m.createdAt,
          });
        }
      }
    }

    // Sort by most recent and take top 50
    allMentions.sort((a, b) => b.createdAt - a.createdAt);
    return allMentions.slice(0, 50);
  },
});

/**
 * Get persisted Pearl chat history.
 */
export const getChatHistory = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    const messages = await ctx.db
      .query("pearlMessages")
      .withIndex("by_user_org_and_created", (q) =>
        q.eq("userId", userId).eq("organizationId", args.organizationId)
      )
      .order("asc")
      .take(100);

    return messages.map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      toolInvocations: m.toolInvocations,
      createdAt: m.createdAt,
    }));
  },
});

/**
 * Check daily message limit.
 */
export const checkDailyLimit = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { count: 0, limit: DAILY_MESSAGE_LIMIT, remaining: 0, allowed: false };

    const userId = identity.subject;
    const today = getTodayDateString();

    const usage = await ctx.db
      .query("pearlUsage")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .first();

    const count = usage?.messageCount ?? 0;
    const remaining = Math.max(0, DAILY_MESSAGE_LIMIT - count);

    return {
      count,
      limit: DAILY_MESSAGE_LIMIT,
      remaining,
      allowed: count < DAILY_MESSAGE_LIMIT,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Save a Pearl chat message (user or assistant).
 */
export const savePearlMessage = mutation({
  args: {
    organizationId: v.id("organizations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolInvocations: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    return await ctx.db.insert("pearlMessages", {
      userId,
      organizationId: args.organizationId,
      role: args.role,
      content: args.content,
      toolInvocations: args.toolInvocations,
      createdAt: Date.now(),
    });
  },
});

/**
 * Increment daily usage count. Returns whether the action is allowed.
 */
export const incrementUsage = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const today = getTodayDateString();

    const existing = await ctx.db
      .query("pearlUsage")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .first();

    if (existing) {
      if (existing.messageCount >= DAILY_MESSAGE_LIMIT) {
        return { allowed: false, count: existing.messageCount };
      }
      await ctx.db.patch(existing._id, {
        messageCount: existing.messageCount + 1,
      });
      return { allowed: true, count: existing.messageCount + 1 };
    }

    await ctx.db.insert("pearlUsage", {
      userId,
      date: today,
      messageCount: 1,
    });
    return { allowed: true, count: 1 };
  },
});

/**
 * Send a message to a channel on behalf of the user via Pearl.
 */
export const sendChannelMessageViaPearl = mutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // Verify channel exists and user has access
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) throw new Error("Not a member of this workspace");

    // Check channel permissions
    if (channel.permissions === "readOnly" && membership.role !== "admin") {
      throw new Error("Channel is read-only");
    }

    if (channel.channelType === "forum") {
      throw new Error("Cannot send messages directly to forum channels");
    }

    // Validate content
    const trimmed = args.content.trim();
    if (!trimmed) throw new Error("Message content cannot be empty");

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId,
      content: trimmed,
      createdAt: Date.now(),
      viaPearl: true,
    });

    return messageId;
  },
});

/**
 * Send a DM on behalf of the user via Pearl.
 */
export const sendDirectMessageViaPearl = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Verify participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error("Not a participant in this conversation");
    }

    const trimmed = args.content.trim();
    if (!trimmed) throw new Error("Message content cannot be empty");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      content: trimmed,
      createdAt: Date.now(),
      viaPearl: true,
    });

    // Update conversation lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Create a forum post on behalf of Pearl (as the Pearl system user).
 */
export const createForumPostViaPearl = mutation({
  args: {
    channelId: v.id("channels"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // Verify channel exists and is a forum
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");
    if (channel.channelType !== "forum") throw new Error("Channel is not a forum");

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) throw new Error("Not a member of this workspace");

    const trimmedTitle = args.title.trim();
    const trimmedContent = args.content.trim();

    if (!trimmedTitle) throw new Error("Title cannot be empty");
    if (trimmedTitle.length > 200) throw new Error("Title must be 200 characters or less");
    if (!trimmedContent) throw new Error("Content cannot be empty");

    const now = Date.now();

    const postId = await ctx.db.insert("forumPosts", {
      channelId: args.channelId,
      title: trimmedTitle,
      content: trimmedContent,
      authorId: PEARL_SYSTEM_USER_ID,
      status: "open",
      isPinned: false,
      createdAt: now,
      lastActivityAt: now,
      commentCount: 0,
      viaPearl: true,
    });

    return postId;
  },
});

/**
 * Clear Pearl chat history for a user in a workspace.
 */
export const clearChatHistory = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    const messages = await ctx.db
      .query("pearlMessages")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", userId).eq("organizationId", args.organizationId)
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    return { deleted: messages.length };
  },
});
