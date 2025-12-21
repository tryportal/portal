import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_org_id", ["clerkOrgId"]),
});
