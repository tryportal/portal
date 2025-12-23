import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
});
