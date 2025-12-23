import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    channelId: v.id("channels"),
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
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_created", ["channelId", "createdAt"]),

  typingIndicators: defineTable({
    channelId: v.id("channels"),
    userId: v.string(), // Clerk user ID
    lastTypingAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_user", ["channelId", "userId"]),
});
