import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get organization by Clerk organization ID
 */
export const getOrganization = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
  },
});

/**
 * Get organization by slug
 */
export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Check if organization setup is complete (has description)
 */
export const isOrganizationSetup = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    // Organization is set up if it exists and has a description
    return org !== null && org.description !== undefined && org.description.trim() !== "";
  },
});

/**
 * Check setup status for multiple organizations
 * Returns a map of clerkOrgId -> boolean
 */
export const checkMultipleOrganizationsSetup = query({
  args: { clerkOrgIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<string, boolean> = {};
    
    for (const clerkOrgId of args.clerkOrgIds) {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
        .first();
      
      results[clerkOrgId] = org !== null && org.description !== undefined && org.description.trim() !== "";
    }
    
    return results;
  },
});

/**
 * Create or update an organization
 */
export const createOrUpdateOrganization = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) {
      // Update existing organization
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        description: args.description,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    } else {
      // Create new organization
      return await ctx.db.insert("organizations", {
        clerkOrgId: args.clerkOrgId,
        name: args.name,
        slug: args.slug,
        description: args.description,
        imageUrl: args.imageUrl,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Sync organization data from Clerk
 * Call this after updating organization in Clerk
 */
export const syncFromClerk = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("organizations", {
        clerkOrgId: args.clerkOrgId,
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        createdAt: Date.now(),
      });
    }
  },
});

