import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listPublicWorkspaces = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const orgs = await ctx.db
      .query("organizations")
      .withIndex("by_is_public", (q) => q.eq("isPublic", true))
      .collect();

    // Get member counts and logo URLs
    const results = await Promise.all(
      orgs.map(async (org) => {
        const members = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
          .collect();

        const logoUrl = org.logoId
          ? await ctx.storage.getUrl(org.logoId)
          : null;

        return {
          _id: org._id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logoUrl,
          memberCount: members.length,
        };
      })
    );

    return results;
  },
});

export const checkSlugAvailability = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    return { available: !existing };
  },
});

export const getUserMemberships = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const getWorkspaceBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!org) return null;

    // Verify user is a member
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", org._id).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return null;

    const logoUrl = org.logoId ? await ctx.storage.getUrl(org.logoId) : null;

    return {
      _id: org._id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      logoUrl,
      role: membership.role,
    };
  },
});

export const getUserFirstWorkspace = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Check if user has a primary workspace
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user?.primaryWorkspaceId) {
      const org = await ctx.db.get(user.primaryWorkspaceId);
      if (org) return { slug: org.slug };
    }

    // Otherwise, get the first membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    if (!membership) return null;

    const org = await ctx.db.get(membership.organizationId);
    if (!org) return null;

    return { slug: org.slug };
  },
});

export const createWorkspace = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check slug uniqueness
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Slug already taken");

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      logoId: args.logoId,
      createdBy: identity.subject,
      createdAt: Date.now(),
      isPublic: args.isPublic ?? false,
    });

    // Add creator as admin
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId: identity.subject,
      role: "admin",
      joinedAt: Date.now(),
    });

    // Set as primary workspace
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (user) {
      await ctx.db.patch(user._id, { primaryWorkspaceId: orgId });
    }

    return orgId;
  },
});

export const joinWorkspace = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Workspace not found");
    if (!org.isPublic) throw new Error("Workspace is not public");

    // Check if already a member
    const existing = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (existing) throw new Error("Already a member");

    await ctx.db.insert("organizationMembers", {
      organizationId: args.organizationId,
      userId: identity.subject,
      role: "member",
      joinedAt: Date.now(),
    });

    // Set as primary workspace if user doesn't have one
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (user && !user.primaryWorkspaceId) {
      await ctx.db.patch(user._id, { primaryWorkspaceId: args.organizationId });
    }

    return args.organizationId;
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

export const updateWorkspacePublic = mutation({
  args: {
    organizationId: v.id("organizations"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify user is admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.organizationId, { isPublic: args.isPublic });
  },
});
