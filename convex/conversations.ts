import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize participant IDs to ensure consistent ordering
 * participant1Id is always alphabetically lower than participant2Id
 */
function normalizeParticipants(userId1: string, userId2: string): { participant1Id: string; participant2Id: string } {
  if (userId1 < userId2) {
    return { participant1Id: userId1, participant2Id: userId2 };
  }
  return { participant1Id: userId2, participant2Id: userId1 };
}

// ============================================================================
// Conversation Queries
// ============================================================================

/**
 * Get all conversations for the current user, ordered by last message time
 */
export const getUserConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Find conversations where user is participant1
    const conversationsAsP1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", userId))
      .collect();

    // Find conversations where user is participant2
    const conversationsAsP2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", userId))
      .collect();

    // Combine and deduplicate
    const allConversations = [...conversationsAsP1, ...conversationsAsP2];
    const uniqueConversations = Array.from(
      new Map(allConversations.map((c) => [c._id, c])).values()
    );

    // Sort by lastMessageAt descending
    uniqueConversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    // For each conversation, get the other participant's ID and the last message
    const conversationsWithDetails = await Promise.all(
      uniqueConversations.map(async (conv) => {
        const otherParticipantId = conv.participant1Id === userId
          ? conv.participant2Id
          : conv.participant1Id;

        // Get the last message in this conversation
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation_and_created", (q) => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        return {
          ...conv,
          otherParticipantId,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                userId: lastMessage.userId,
              }
            : null,
        };
      })
    );

    return conversationsWithDetails;
  },
});

/**
 * Get a single conversation by ID (verify current user is a participant)
 */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) return null;

    // Verify user is a participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      return null;
    }

    const otherParticipantId = conversation.participant1Id === userId
      ? conversation.participant2Id
      : conversation.participant1Id;

    return {
      ...conversation,
      otherParticipantId,
    };
  },
});

/**
 * Check if a conversation exists between two users
 */
export const getConversationByParticipants = query({
  args: { otherUserId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;
    const { participant1Id, participant2Id } = normalizeParticipants(userId, args.otherUserId);

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1Id", participant1Id).eq("participant2Id", participant2Id)
      )
      .first();

    return conversation;
  },
});

// ============================================================================
// Conversation Mutations
// ============================================================================

/**
 * Create a new conversation between the current user and another user
 * Returns the existing conversation if one already exists
 */
export const createConversation = mutation({
  args: { otherUserId: v.string() },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Can't create a conversation with yourself
    if (userId === args.otherUserId) {
      throw new Error("Cannot create a conversation with yourself");
    }

    const { participant1Id, participant2Id } = normalizeParticipants(userId, args.otherUserId);

    // Check if conversation already exists
    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1Id", participant1Id).eq("participant2Id", participant2Id)
      )
      .first();

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      participant1Id,
      participant2Id,
      createdAt: now,
      lastMessageAt: now,
    });

    return conversationId;
  },
});

/**
 * Get or create a conversation with another user
 * This is a convenience mutation that always returns a conversation ID
 */
export const getOrCreateConversation = mutation({
  args: { otherUserId: v.string() },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    if (userId === args.otherUserId) {
      throw new Error("Cannot create a conversation with yourself");
    }

    const { participant1Id, participant2Id } = normalizeParticipants(userId, args.otherUserId);

    // Check if conversation already exists
    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1Id", participant1Id).eq("participant2Id", participant2Id)
      )
      .first();

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      participant1Id,
      participant2Id,
      createdAt: now,
      lastMessageAt: now,
    });

    return conversationId;
  },
});

/**
 * Update the lastMessageAt timestamp for a conversation
 * Called internally when a new message is sent
 */
export const updateLastMessageAt = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Verify user is a participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error("Not a participant in this conversation");
    }

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });
  },
});

