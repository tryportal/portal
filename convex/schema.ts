import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Direct message conversations between two users
  conversations: defineTable({
    participant1Id: v.string(), // Clerk user ID (always the lower ID alphabetically for consistency)
    participant2Id: v.string(), // Clerk user ID (always the higher ID alphabetically)
    createdAt: v.number(),
    lastMessageAt: v.number(), // For sorting conversations by recent activity
  })
    .index("by_participant1", ["participant1Id"])
    .index("by_participant2", ["participant2Id"])
    .index("by_participants", ["participant1Id", "participant2Id"])
    .index("by_last_message", ["lastMessageAt"]),

  channelCategories: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_order", ["organizationId", "order"]),

  channels: defineTable({
    organizationId: v.id("organizations"),
    categoryId: v.id("channelCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.string(), // Phosphor icon name, e.g., "Hash", "ChatCircle"
    permissions: v.union(v.literal("open"), v.literal("readOnly")), // "open" = everyone can send, "readOnly" = only admins can send
    order: v.number(),
    createdAt: v.number(),
    createdBy: v.string(), // Clerk user ID
  })
    .index("by_organization", ["organizationId"])
    .index("by_category", ["categoryId"])
    .index("by_category_and_order", ["categoryId", "order"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    // Logo can be stored as a Convex file storage ID or a URL (for backwards compatibility)
    logoId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()), // Deprecated: kept for backwards compatibility
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_created_by", ["createdBy"]),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(), // Clerk user ID
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
    // Profile fields
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
    bio: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_and_user", ["organizationId", "userId"]),

  organizationInvitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.optional(v.string()), // Optional for link-based invites
    role: v.union(v.literal("admin"), v.literal("member")),
    invitedBy: v.string(), // Clerk user ID
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked")),
    createdAt: v.number(),
    expiresAt: v.number(),
    isLinkInvite: v.optional(v.boolean()), // True for shareable link invites
  })
    .index("by_organization", ["organizationId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  messages: defineTable({
    // Either channelId OR conversationId must be present (not both)
    channelId: v.optional(v.id("channels")), // For channel messages
    conversationId: v.optional(v.id("conversations")), // For direct messages
    userId: v.string(), // Clerk user ID
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      size: v.number(),
      type: v.string(),
    }))),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
    // New fields for chat features
    parentMessageId: v.optional(v.id("messages")), // For reply threading
    reactions: v.optional(v.array(v.object({
      userId: v.string(),
      emoji: v.string(),
    }))), // User reactions
    pinned: v.optional(v.boolean()), // Pin status
    mentions: v.optional(v.array(v.string())), // Array of mentioned user IDs
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_created", ["channelId", "createdAt"])
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_created", ["conversationId", "createdAt"])
    .index("by_parent_message", ["parentMessageId"]),

  savedMessages: defineTable({
    userId: v.string(), // Clerk user ID
    messageId: v.id("messages"), // Reference to saved message
    savedAt: v.number(), // Timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_and_saved", ["userId", "savedAt"])
    .index("by_user_and_message", ["userId", "messageId"]),

  typingIndicators: defineTable({
    // Either channelId OR conversationId must be present (not both)
    channelId: v.optional(v.id("channels")), // For channel typing
    conversationId: v.optional(v.id("conversations")), // For DM typing
    userId: v.string(), // Clerk user ID
    lastTypingAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_user", ["channelId", "userId"])
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_user", ["conversationId", "userId"]),

  // Tracks the last time a user read a conversation (for unread badges)
  conversationReadStatus: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(), // Clerk user ID
    lastReadAt: v.number(), // Timestamp of when user last read the conversation
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_and_user", ["conversationId", "userId"]),
});
