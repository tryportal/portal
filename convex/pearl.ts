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
 * Get inbox data for summarization.
 * This mirrors the logic in messages.getUnreadMentions and getUnreadDMsGroupedBySender
 * to ensure consistency with what the user sees in their inbox.
 * Returns both unread mentions and unread DMs.
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

    // ===== PART 1: Get unread mentions =====
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const mutedChannels = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mutedChannelIds = new Set(mutedChannels.map((m) => m.channelId));

    const activeChannelIds = channels
      .filter((c) => !mutedChannelIds.has(c._id))
      .map((c) => c._id);

    const channelNameMap = new Map(channels.map((c) => [c._id as string, c.name]));

    const mentionReadStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const readMessageIds = new Set(mentionReadStatuses.map((rs) => rs.messageId));

    const mentions: Array<{
      type: "mention";
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
        .take(100);

      for (const m of messages) {
        const hasMention = Array.isArray(m.mentions) && m.mentions.includes(userId);
        const isUnread = !readMessageIds.has(m._id);
        const notFromSelf = m.userId !== userId;

        if (hasMention && isUnread && notFromSelf) {
          const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", m.userId))
            .first();

          mentions.push({
            type: "mention",
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

    // ===== PART 2: Get unread DMs =====
    const conversationsAsP1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", userId))
      .collect();

    const conversationsAsP2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", userId))
      .collect();

    const allConversations = [...conversationsAsP1, ...conversationsAsP2];
    const uniqueConversations = Array.from(
      new Map(allConversations.map((c) => [c._id, c])).values()
    );

    const dmReadStatuses = await ctx.db
      .query("conversationReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const dmReadStatusMap = new Map(
      dmReadStatuses.map((rs) => [rs.conversationId, rs.lastReadAt])
    );

    const dms: Array<{
      type: "dm";
      author: string;
      content: string;
      createdAt: number;
      unreadCount: number;
    }> = [];

    for (const conv of uniqueConversations) {
      const lastReadAt = dmReadStatusMap.get(conv._id) ?? 0;

      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_created", (q) =>
          q.eq("conversationId", conv._id).gt("createdAt", lastReadAt)
        )
        .collect();

      const unreadFromOther = unreadMessages.filter((msg) => msg.userId !== userId);

      if (unreadFromOther.length > 0) {
        const otherParticipantId = conv.participant1Id === userId
          ? conv.participant2Id
          : conv.participant1Id;

        const otherUser = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", otherParticipantId))
          .first();

        const otherUserName = otherUser
          ? [otherUser.firstName, otherUser.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown";

        // Add each unread DM message
        for (const msg of unreadFromOther) {
          dms.push({
            type: "dm",
            author: otherUserName,
            content: msg.content,
            createdAt: msg.createdAt,
            unreadCount: unreadFromOther.length,
          });
        }
      }
    }

    // Combine and sort by most recent
    const allItems = [...mentions, ...dms];
    allItems.sort((a, b) => b.createdAt - a.createdAt);

    return {
      mentions: mentions.slice(0, 25),
      dms: dms.slice(0, 25),
      totalMentions: mentions.length,
      totalDMs: dms.length,
    };
  },
});

/**
 * List all Pearl conversations for a user in a workspace.
 */
export const listConversations = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    const conversations = await ctx.db
      .query("pearlConversations")
      .withIndex("by_user_org_and_last_message", (q) =>
        q.eq("userId", userId).eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);

    return conversations.map((c) => ({
      id: c._id,
      title: c.title || "New chat",
      createdAt: c.createdAt,
      lastMessageAt: c.lastMessageAt,
    }));
  },
});

/**
 * Get messages for a specific Pearl conversation.
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("pearlConversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Verify conversation belongs to user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) return [];

    const messages = await ctx.db
      .query("pearlMessages")
      .withIndex("by_conversation_and_created", (q) =>
        q.eq("conversationId", args.conversationId)
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
 * Get persisted Pearl chat history (legacy - returns most recent conversation).
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

/**
 * Get workspace members for Pearl mention autocomplete.
 * Returns all members with their user info and DM conversation ID (if exists).
 */
export const getWorkspaceMembers = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Check org membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get all org members
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    console.log("[Pearl getWorkspaceMembers] Total members:", members.length, "Current user:", userId);

    // Get existing DM conversations for the current user
    const convos1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", userId))
      .collect();

    const convos2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", userId))
      .collect();

    // Build a map of otherUserId -> conversationId
    const convoMap = new Map<string, string>();
    for (const c of [...convos1, ...convos2]) {
      const otherUserId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      convoMap.set(otherUserId, c._id);
    }

    // Fetch user data and build result - include ALL members (including self)
    const result = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", m.userId))
          .first();

        return {
          userId: m.userId,
          name: user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
            : "Unknown",
          imageUrl: user?.imageUrl || null,
          conversationId: convoMap.get(m.userId) || null,
          isCurrentUser: m.userId === userId,
        };
      })
    );

    console.log("[Pearl getWorkspaceMembers] Returning members:", result.length);
    return result;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new Pearl conversation.
 */
export const createConversation = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const now = Date.now();

    return await ctx.db.insert("pearlConversations", {
      userId,
      organizationId: args.organizationId,
      title: args.title,
      createdAt: now,
      lastMessageAt: now,
    });
  },
});

/**
 * Update conversation title.
 */
export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id("pearlConversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, { title: args.title });
  },
});

/**
 * Save a Pearl chat message (user or assistant).
 */
export const savePearlMessage = mutation({
  args: {
    organizationId: v.id("organizations"),
    conversationId: v.optional(v.id("pearlConversations")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolInvocations: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const now = Date.now();

    // Update conversation lastMessageAt if conversationId provided
    if (args.conversationId) {
      const conversation = await ctx.db.get(args.conversationId);
      if (conversation && conversation.userId === userId) {
        await ctx.db.patch(args.conversationId, { lastMessageAt: now });
      }
    }

    return await ctx.db.insert("pearlMessages", {
      userId,
      organizationId: args.organizationId,
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      toolInvocations: args.toolInvocations,
      createdAt: now,
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
 * Delete a specific Pearl conversation and its messages.
 */
export const deleteConversation = mutation({
  args: {
    conversationId: v.id("pearlConversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query("pearlMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the conversation
    await ctx.db.delete(args.conversationId);

    return { deleted: messages.length };
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

    // Delete all conversations
    const conversations = await ctx.db
      .query("pearlConversations")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", userId).eq("organizationId", args.organizationId)
      )
      .collect();

    for (const conversation of conversations) {
      await ctx.db.delete(conversation._id);
    }

    // Delete all messages (including any orphaned ones)
    const messages = await ctx.db
      .query("pearlMessages")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", userId).eq("organizationId", args.organizationId)
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    return { deleted: messages.length, conversations: conversations.length };
  },
});
