import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Reserved routes that cannot be used as workspace slugs
const RESERVED_ROUTES = [
  "invite",
  "preview",
  "setup",
  "sign-in",
  "sign-up",
  "api",
  "admin",
  "dashboard",
  "settings",
  "help",
  "about",
  "contact",
  "privacy",
  "terms",
  "login",
  "logout",
  "register",
];

/**
 * Debug: Check authentication status
 */
export const checkAuth = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return {
      authenticated: identity !== null,
      userId: identity?.subject || null,
      email: identity?.email || null,
      issuer: identity?.issuer || null,
    };
  },
});

/**
 * Get organization by ID
 */
export const getOrganization = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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
 * Get all organizations the current user is a member of
 */
export const getUserOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        return org ? { ...org, role: membership.role } : null;
      })
    );

    return organizations.filter((org) => org !== null);
  },
});

/**
 * Check if organization setup is complete (has description)
 */
export const isOrganizationSetup = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    return org !== null && org.description !== undefined && org.description.trim() !== "";
  },
});

/**
 * Check setup status for multiple organizations
 */
export const checkMultipleOrganizationsSetup = query({
  args: { organizationIds: v.array(v.id("organizations")) },
  handler: async (ctx, args) => {
    const results: Record<string, boolean> = {};

    for (const orgId of args.organizationIds) {
      const org = await ctx.db.get(orgId);
      results[orgId] = org !== null && org.description !== undefined && org.description.trim() !== "";
    }

    return results;
  },
});

/**
 * Create a new organization
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.error("[Convex Auth] createOrganization: No identity found");
      console.error("[Convex Auth] This usually means:");
      console.error("  1. CLERK_JWT_ISSUER_DOMAIN is not set in Convex Dashboard");
      console.error("  2. Domain format is incorrect (should match Clerk issuer exactly)");
      console.error("  3. Token is not being sent from client");
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if slug matches any reserved routes
    if (RESERVED_ROUTES.includes(args.slug.toLowerCase())) {
      throw new Error(
        `"${args.slug}" is a reserved route and cannot be used as a workspace URL. Please choose a different one.`
      );
    }

    // Check if slug is already taken
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingOrg) {
      throw new Error("That organization URL is already taken. Please choose a different one.");
    }

    // Create the organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      imageUrl: args.imageUrl,
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Add creator as admin member
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId,
      role: "admin",
      joinedAt: Date.now(),
    });

    return orgId;
  },
});

/**
 * Update an existing organization
 */
export const updateOrganization = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if user is an admin of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.id).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only organization admins can update the organization");
    }

    // If slug is being changed, check it's not taken
    if (args.slug !== undefined) {
      const slugToCheck = args.slug;

      // Check if slug matches any reserved routes
      if (RESERVED_ROUTES.includes(slugToCheck.toLowerCase())) {
        throw new Error(
          `"${slugToCheck}" is a reserved route and cannot be used as a workspace URL. Please choose a different one.`
        );
      }

      const existingOrg = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slugToCheck))
        .first();

      if (existingOrg && existingOrg._id !== args.id) {
        throw new Error("That organization URL is already taken. Please choose a different one.");
      }
    }

    // Update the organization
    const updates: Partial<{
      name: string;
      slug: string;
      description: string;
      imageUrl: string;
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.slug !== undefined) updates.slug = args.slug;
    if (args.description !== undefined) updates.description = args.description;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Get members of an organization
 */
export const getOrganizationMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Check if user is a member of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      return [];
    }

    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

/**
 * Get pending invitations for an organization
 */
export const getOrganizationInvitations = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Check if user is an admin of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      return [];
    }

    return await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

/**
 * Check if user is a member of an organization
 */
export const isUserMember = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const userId = identity.subject;
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    return membership !== null;
  },
});

/**
 * Get user's membership in an organization
 */
export const getUserMembership = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;
    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();
  },
});

/**
 * Invite a member to the organization
 */
export const inviteMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if user is an admin of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only organization admins can invite members");
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Generate a unique token
    const token = crypto.randomUUID();

    // Create the invitation (expires in 7 days)
    const invitationId = await ctx.db.insert("organizationInvitations", {
      organizationId: args.organizationId,
      email: args.email,
      role: args.role,
      invitedBy: userId,
      token,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return the invitation ID and token (email sending handled separately)
    return { invitationId, token };
  },
});

/**
 * Revoke an invitation
 */
export const revokeInvitation = mutation({
  args: { invitationId: v.id("organizationInvitations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if user is an admin of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only organization admins can revoke invitations");
    }

    await ctx.db.patch(args.invitationId, { status: "revoked" });
    return args.invitationId;
  },
});

/**
 * Get invitation by token
 */
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) return null;

    const org = await ctx.db.get(invitation.organizationId);
    return { invitation, organization: org };
  },
});

/**
 * Accept an invitation
 */
export const acceptInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const userEmail = identity.email;

    const invitation = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer valid");
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error("This invitation has expired");
    }

    // Verify email matches (optional - can be removed for more flexibility)
    if (userEmail && invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", userId)
      )
      .first();

    if (existingMembership) {
      throw new Error("You are already a member of this organization");
    }

    // Add as member
    await ctx.db.insert("organizationMembers", {
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      joinedAt: Date.now(),
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, { status: "accepted" });

    // Get the organization for redirect
    const org = await ctx.db.get(invitation.organizationId);
    return { organizationId: invitation.organizationId, slug: org?.slug };
  },
});

/**
 * Remove organization image
 */
export const removeOrganizationImage = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if user is an admin of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only organization admins can update the organization");
    }

    await ctx.db.patch(args.organizationId, { imageUrl: undefined });
    return args.organizationId;
  },
});
