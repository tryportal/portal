import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============================================================================
// Queries
// ============================================================================

/**
 * List all conversations for the current user, sorted by most recent activity.
 * Enriches each with the other participant's profile, last message preview, and unread status.
 */
export const listConversations = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Query both indexes to find all conversations
    const asParticipant1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", userId))
      .collect();

    const asParticipant2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", userId))
      .collect();

    // Merge and sort by lastMessageAt desc
    const all = [...asParticipant1, ...asParticipant2];
    all.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    // Get read statuses for all conversations
    const readStatuses = await ctx.db
      .query("conversationReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const readMap = new Map(readStatuses.map((rs) => [rs.conversationId, rs.lastReadAt]));

    // Enrich each conversation
    const enriched = await Promise.all(
      all.map(async (conv) => {
        const otherUserId =
          conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;

        // Get other user's profile
        const otherUser = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", otherUserId))
          .unique();

        // Get last message
        const lastMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_and_created", (q) =>
            q.eq("conversationId", conv._id)
          )
          .order("desc")
          .take(1);
        const lastMessage = lastMessages[0] ?? null;

        // Check unread status
        const lastReadAt = readMap.get(conv._id) ?? 0;
        const hasUnread = conv.lastMessageAt > lastReadAt;

        return {
          _id: conv._id,
          lastMessageAt: conv.lastMessageAt,
          otherUser: otherUser
            ? {
                clerkId: otherUser.clerkId,
                firstName: otherUser.firstName,
                lastName: otherUser.lastName,
                imageUrl: otherUser.imageUrl,
              }
            : null,
          lastMessagePreview: lastMessage?.content?.slice(0, 100) ?? null,
          lastMessageUserId: lastMessage?.userId ?? null,
          hasUnread,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single conversation by ID with the other participant's profile.
 * Verifies the caller is a participant.
 */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return null;

    const userId = identity.subject;
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return null;
    }

    const otherUserId =
      conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;

    const otherUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", otherUserId))
      .unique();

    return {
      ...conv,
      otherUser: otherUser
        ? {
            clerkId: otherUser.clerkId,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            imageUrl: otherUser.imageUrl,
          }
        : null,
    };
  },
});

/**
 * Find existing or create new conversation between two users.
 * Alphabetically sorts participant IDs for canonical ordering.
 */
export const getOrCreateConversation = mutation({
  args: { otherUserId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    if (userId === args.otherUserId) {
      throw new Error("Cannot create conversation with yourself");
    }

    // Canonical ordering
    const [participant1Id, participant2Id] =
      userId < args.otherUserId
        ? [userId, args.otherUserId]
        : [args.otherUserId, userId];

    // Check if conversation exists
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1Id", participant1Id).eq("participant2Id", participant2Id)
      )
      .unique();

    if (existing) return existing._id;

    // Create new conversation
    const now = Date.now();
    const id = await ctx.db.insert("conversations", {
      participant1Id,
      participant2Id,
      createdAt: now,
      lastMessageAt: now,
    });

    return id;
  },
});

/**
 * Get paginated DM messages for a conversation.
 * 50 messages per page, newest first. Enriches with user profiles, thread metadata, etc.
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };

    // Verify participation
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return { page: [], isDone: true, continueCursor: "" };
    if (
      conv.participant1Id !== identity.subject &&
      conv.participant2Id !== identity.subject
    ) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const results = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Collect unique user IDs
    const userIds = new Set<string>();
    for (const msg of results.page) {
      userIds.add(msg.userId);
    }

    // Batch fetch user profiles
    const userMap = new Map<
      string,
      { firstName?: string; lastName?: string; imageUrl?: string; clerkId: string }
    >();
    for (const uid of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", uid))
        .unique();
      if (user) {
        userMap.set(uid, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          clerkId: user.clerkId,
        });
      }
    }

    // Fetch parent messages for replies
    const parentIds: Id<"messages">[] = [];
    for (const msg of results.page) {
      if (msg.parentMessageId) {
        parentIds.push(msg.parentMessageId);
      }
    }

    const parentMap = new Map<
      Id<"messages">,
      { content: string; userId: string; userName: string }
    >();
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
            ? [parentUser.firstName, parentUser.lastName].filter(Boolean).join(" ") ||
              "Unknown"
            : "Unknown",
        });
      }
    }

    // Check saved messages
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

    // Filter out thread replies from main feed
    const mainMessages = results.page.filter((msg) => !msg.parentMessageId);

    // Thread metadata
    const threadMetaMap = new Map<
      Id<"messages">,
      { count: number; latestRepliers: { imageUrl?: string; name: string }[] }
    >();
    for (const msg of mainMessages) {
      const replies = await ctx.db
        .query("messages")
        .withIndex("by_parent_message", (q) => q.eq("parentMessageId", msg._id))
        .collect();
      if (replies.length > 0) {
        const seen = new Set<string>();
        const latestRepliers: { imageUrl?: string; name: string }[] = [];
        for (let i = replies.length - 1; i >= 0 && latestRepliers.length < 3; i--) {
          const r = replies[i];
          if (seen.has(r.userId)) continue;
          seen.add(r.userId);
          const u =
            userMap.get(r.userId) ??
            (await (async () => {
              const user = await ctx.db
                .query("users")
                .withIndex("by_clerk_id", (q) => q.eq("clerkId", r.userId))
                .unique();
              if (user) {
                userMap.set(r.userId, {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  imageUrl: user.imageUrl,
                  clerkId: user.clerkId,
                });
                return userMap.get(r.userId)!;
              }
              return null;
            })());
          if (u) {
            latestRepliers.push({
              imageUrl: u.imageUrl,
              name:
                [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown",
            });
          }
        }
        threadMetaMap.set(msg._id, { count: replies.length, latestRepliers });
      }
    }

    // Enrich messages
    const enrichedPage = mainMessages.map((msg) => {
      const user = userMap.get(msg.userId);
      const parentMessage = msg.parentMessageId
        ? parentMap.get(msg.parentMessageId) ?? null
        : null;
      const threadMeta = threadMetaMap.get(msg._id);

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
        threadReplyCount: threadMeta?.count ?? 0,
        threadLatestRepliers: threadMeta?.latestRepliers ?? [],
        isSharedMember: false,
        sharedFromWorkspace: null as string | null,
        sharedFromWorkspaceLogoUrl: null as string | null,
      };
    });

    return {
      ...results,
      page: enrichedPage,
    };
  },
});

/**
 * Send a direct message in a conversation.
 */
export const sendDirectMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
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

    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error("Conversation not found");

    const userId = identity.subject;
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      throw new Error("Not a participant in this conversation");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      content: args.content,
      attachments: args.attachments,
      parentMessageId: args.parentMessageId,
      mentions: args.mentions,
      createdAt: Date.now(),
    });

    // Update lastMessageAt
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });

    // Schedule link embed fetch if URL detected
    const urlMatch = args.content.match(/https?:\/\/[^\s<>)"']+/);
    if (urlMatch) {
      await ctx.scheduler.runAfter(0, internal.linkEmbedsAction.fetchLinkEmbed, {
        messageId,
        url: urlMatch[0],
      });
    }

    // Update read status for sender
    const existingReadStatus = await ctx.db
      .query("conversationReadStatus")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", userId)
      )
      .unique();

    if (existingReadStatus) {
      await ctx.db.patch(existingReadStatus._id, { lastReadAt: Date.now() });
    } else {
      await ctx.db.insert("conversationReadStatus", {
        conversationId: args.conversationId,
        userId,
        lastReadAt: Date.now(),
      });
    }

    return messageId;
  },
});

/**
 * Mark a conversation as read for the current user.
 */
export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("conversationReadStatus")
      .withIndex("by_conversation_and_user", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("userId", identity.subject)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadAt: Date.now() });
    } else {
      await ctx.db.insert("conversationReadStatus", {
        conversationId: args.conversationId,
        userId: identity.subject,
        lastReadAt: Date.now(),
      });
    }
  },
});
