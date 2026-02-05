import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores user profile data synced from Clerk for faster loading
  // Note: clerkId should be unique per user - enforced at application level via upsert logic
  users: defineTable({
    clerkId: v.string(), // Clerk user ID (same as identity.subject) - unique per user
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    updatedAt: v.number(),
    // User preferences
    primaryWorkspaceId: v.optional(v.id("organizations")), // User's preferred default workspace
    // DM sharing - unique handle for shareable DM links (3-12 chars, alphanumeric + underscore, stored lowercase)
    handle: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_handle", ["handle"]),

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
    isPrivate: v.optional(v.boolean()), // If true, only selected members can access this channel
    order: v.number(),
    createdAt: v.number(),
    createdBy: v.string(), // Clerk user ID
    // Forum channel type settings
    channelType: v.optional(v.union(v.literal("chat"), v.literal("forum"))), // Default "chat" if not set
    forumSettings: v.optional(v.object({
      whoCanPost: v.union(v.literal("everyone"), v.literal("admins")), // Who can create new forum posts
    })),
  })
    .index("by_organization", ["organizationId"])
    .index("by_category", ["categoryId"])
    .index("by_category_and_order", ["categoryId", "order"]),

  // Members of private channels - only users in this table can access a private channel
  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.string(), // Clerk user ID
    addedAt: v.number(),
    addedBy: v.string(), // Clerk user ID of who added this member
  })
    .index("by_channel", ["channelId"])
    .index("by_user", ["userId"])
    .index("by_channel_and_user", ["channelId", "userId"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    // Logo can be stored as a Convex file storage ID or a URL (for backwards compatibility)
    logoId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()), // Deprecated: kept for backwards compatibility
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    isPublic: v.optional(v.boolean()), // If true, anyone can join this workspace without an invite
  })
    .index("by_slug", ["slug"])
    .index("by_created_by", ["createdBy"])
    .index("by_is_public", ["isPublic"]),

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
    // Either channelId OR conversationId OR forumPostId must be present (not multiple)
    channelId: v.optional(v.id("channels")), // For channel messages
    conversationId: v.optional(v.id("conversations")), // For direct messages
    forumPostId: v.optional(v.id("forumPosts")), // For forum post comments
    userId: v.string(), // Clerk user ID
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      size: v.number(),
      type: v.string(),
    }))),
    // Link embed preview (Open Graph metadata)
    linkEmbed: v.optional(v.object({
      url: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      favicon: v.optional(v.string()),
    })),
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
    // Pearl AI assistant metadata
    viaPearl: v.optional(v.boolean()), // True if message was sent by Pearl on behalf of user
    // Forwarding metadata
    forwardedFrom: v.optional(v.object({
      messageId: v.id("messages"), // Original message ID
      channelId: v.optional(v.id("channels")), // If forwarded from a channel
      conversationId: v.optional(v.id("conversations")), // If forwarded from a DM
      channelName: v.optional(v.string()), // Channel name for display
      userName: v.optional(v.string()), // User name for DM display
    })),
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_created", ["channelId", "createdAt"])
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_created", ["conversationId", "createdAt"])
    .index("by_parent_message", ["parentMessageId"])
    .index("by_forum_post", ["forumPostId"])
    .index("by_forum_post_and_created", ["forumPostId", "createdAt"]),

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

  // Tracks which mentions have been read by users (for inbox)
  mentionReadStatus: defineTable({
    userId: v.string(), // The user who was mentioned
    messageId: v.id("messages"), // The message containing the mention
    readAt: v.number(), // When they read/dismissed it
  })
    .index("by_user", ["userId"])
    .index("by_user_and_message", ["userId", "messageId"]),

  // Tracks which channels a user has muted (no notifications/mentions from muted channels)
  mutedChannels: defineTable({
    userId: v.string(), // Clerk user ID of the user who muted the channel
    channelId: v.id("channels"), // The muted channel
    mutedAt: v.number(), // When the channel was muted
  })
    .index("by_user", ["userId"])
    .index("by_channel", ["channelId"])
    .index("by_user_and_channel", ["userId", "channelId"]),

  // Tracks the last time a user read a channel (for unread indicators)
  channelReadStatus: defineTable({
    channelId: v.id("channels"),
    userId: v.string(), // Clerk user ID
    lastReadAt: v.number(), // Timestamp of when user last read the channel
  })
    .index("by_channel", ["channelId"])
    .index("by_user", ["userId"])
    .index("by_channel_and_user", ["channelId", "userId"]),

  // ============================================================================
  // Shared Channels - Cross-workspace channel sharing
  // ============================================================================

  // Invitations for external users to access a channel from another workspace
  sharedChannelInvitations: defineTable({
    channelId: v.id("channels"),
    email: v.optional(v.string()), // Optional for link-based invites
    invitedBy: v.string(), // Clerk user ID of who created the invite
    token: v.string(), // Unique invite token
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked")),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // Optional - no expiration by default
    isLinkInvite: v.optional(v.boolean()), // True for shareable link invites
  })
    .index("by_channel", ["channelId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_channel_and_status", ["channelId", "status"]),

  // External members who have access to a shared channel (from other workspaces)
  // This is separate from channelMembers which tracks internal workspace members for private channels
  sharedChannelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.string(), // Clerk user ID of the external user
    sourceOrganizationId: v.optional(v.id("organizations")), // User's home workspace (if any)
    addedAt: v.number(),
    addedBy: v.string(), // Clerk user ID of who invited them
  })
    .index("by_channel", ["channelId"])
    .index("by_user", ["userId"])
    .index("by_channel_and_user", ["channelId", "userId"]),

  // ============================================================================
  // Pearl AI Assistant
  // ============================================================================

  // Persistent chat history with Pearl
  pearlMessages: defineTable({
    userId: v.string(), // Clerk user ID
    organizationId: v.id("organizations"), // Workspace context
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(), // Message text
    toolInvocations: v.optional(v.string()), // JSON-serialized tool calls/results
    createdAt: v.number(),
  })
    .index("by_user_and_org", ["userId", "organizationId"])
    .index("by_user_org_and_created", ["userId", "organizationId", "createdAt"]),

  // Daily rate limit tracking for Pearl
  pearlUsage: defineTable({
    userId: v.string(), // Clerk user ID
    date: v.string(), // Date string "YYYY-MM-DD"
    messageCount: v.number(), // Messages sent today
  })
    .index("by_user_and_date", ["userId", "date"]),

  // ============================================================================
  // Forum Posts - Posts in forum-type channels
  // ============================================================================

  forumPosts: defineTable({
    channelId: v.id("channels"), // The forum channel this post belongs to
    title: v.string(), // Post title
    content: v.string(), // Initial post content (rich text/markdown)
    authorId: v.string(), // Clerk user ID of the post author
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("solved")), // Post status
    isPinned: v.optional(v.boolean()), // Pinned posts appear at top
    solvedCommentId: v.optional(v.id("messages")), // The accepted answer comment
    createdAt: v.number(),
    lastActivityAt: v.number(), // Updated when new comments are added
    commentCount: v.number(), // Denormalized for performance
    // Support same attachment features as messages
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      size: v.number(),
      type: v.string(),
    }))),
    // Link embed preview (Open Graph metadata)
    linkEmbed: v.optional(v.object({
      url: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      favicon: v.optional(v.string()),
    })),
    // Pearl AI assistant metadata
    viaPearl: v.optional(v.boolean()), // True if forum post was created by Pearl
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_status", ["channelId", "status"])
    .index("by_channel_and_last_activity", ["channelId", "lastActivityAt"])
    .index("by_channel_and_pinned", ["channelId", "isPinned"])
    .index("by_author", ["authorId"]),
});
