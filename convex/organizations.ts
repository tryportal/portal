import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// Member type returned from the action
type MemberWithUserData = {
  _id: Id<"organizationMembers">;
  organizationId: Id<"organizations">;
  userId: string;
  role: "admin" | "member";
  emailAddress: string | null;
  publicUserData: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | undefined;
};

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

// ============================================================================
// File Storage
// ============================================================================

/**
 * Generate an upload URL for organization logo
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get the URL for a stored file
 */
export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ============================================================================
// Organization Queries
// ============================================================================

/**
 * Get organization by ID with logo URL resolved
 */
export const getOrganization = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    if (!org) return null;

    // Resolve logo URL from storage ID or use legacy imageUrl
    let logoUrl: string | undefined = org.imageUrl;
    if (org.logoId) {
      const url = await ctx.storage.getUrl(org.logoId);
      logoUrl = url ?? undefined;
    }

    return { ...org, logoUrl };
  },
});

/**
 * Get organization by slug with logo URL resolved
 */
export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!org) return null;

    // Resolve logo URL from storage ID or use legacy imageUrl
    let logoUrl: string | undefined = org.imageUrl;
    if (org.logoId) {
      const url = await ctx.storage.getUrl(org.logoId);
      logoUrl = url ?? undefined;
    }

    return { ...org, logoUrl };
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
        if (!org) return null;

        // Resolve logo URL
        let logoUrl: string | undefined = org.imageUrl;
        if (org.logoId) {
          const url = await ctx.storage.getUrl(org.logoId);
          logoUrl = url ?? undefined;
        }

        return { ...org, logoUrl, role: membership.role };
      })
    );

    return organizations.filter((org) => org !== null);
  },
});

/**
 * Check if organization setup is complete (has name and slug)
 */
export const isOrganizationSetup = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    return (
      org !== null &&
      Boolean(org.name && org.name.trim() !== "") &&
      Boolean(org.slug && org.slug.trim() !== "")
    );
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
      const isSetup =
        org !== null &&
        Boolean(org.name && org.name.trim() !== "") &&
        Boolean(org.slug && org.slug.trim() !== "");
      results[orgId] = isSetup;
    }

    return results;
  },
});

// ============================================================================
// Organization Mutations
// ============================================================================

/**
 * Create a new organization
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Validate slug
    if (RESERVED_ROUTES.includes(args.slug.toLowerCase())) {
      throw new Error(
        `"${args.slug}" is a reserved route and cannot be used as a workspace URL.`
      );
    }

    // Check if slug is already taken
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingOrg) {
      throw new Error("That organization URL is already taken.");
    }

    // Create the organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      logoId: args.logoId,
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
    logoId: v.optional(v.id("_storage")),
    removeLogo: v.optional(v.boolean()),
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

    // Validate slug if being changed
    if (args.slug !== undefined) {
      const slugValue = args.slug;
      if (RESERVED_ROUTES.includes(slugValue.toLowerCase())) {
        throw new Error(
          `"${slugValue}" is a reserved route and cannot be used as a workspace URL.`
        );
      }

      const existingOrg = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slugValue))
        .first();

      if (existingOrg && existingOrg._id !== args.id) {
        throw new Error("That organization URL is already taken.");
      }
    }

    // Get current org to handle logo deletion
    const currentOrg = await ctx.db.get(args.id);
    if (!currentOrg) {
      throw new Error("Organization not found");
    }

    // Build updates object
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.slug !== undefined) updates.slug = args.slug;
    if (args.description !== undefined) updates.description = args.description;

    // Handle logo update
    if (args.removeLogo) {
      // Delete old logo from storage if exists
      if (currentOrg.logoId) {
        await ctx.storage.delete(currentOrg.logoId);
      }
      updates.logoId = undefined;
      updates.imageUrl = undefined;
    } else if (args.logoId !== undefined) {
      // Delete old logo from storage if exists and different
      if (currentOrg.logoId && currentOrg.logoId !== args.logoId) {
        await ctx.storage.delete(currentOrg.logoId);
      }
      updates.logoId = args.logoId;
      updates.imageUrl = undefined; // Clear legacy field when using new storage
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete an organization
 */
export const deleteOrganization = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if user is an admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only organization admins can delete the organization");
    }

    // Get org to delete logo
    const org = await ctx.db.get(args.organizationId);
    if (org?.logoId) {
      await ctx.storage.delete(org.logoId);
    }

    // Delete all memberships
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const member of memberships) {
      await ctx.db.delete(member._id);
    }

    // Delete all invitations
    const invitations = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // Delete the organization
    await ctx.db.delete(args.organizationId);

    return { success: true };
  },
});

// ============================================================================
// Membership Queries
// ============================================================================

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
 * Get members of an organization (query for internal use)
 */
export const getOrganizationMembersQuery = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { members: [], isAuthorized: false };

    const userId = identity.subject;

    // Check if user is a member
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return { members: [], isAuthorized: false };

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return { members, isAuthorized: true };
  },
});

/**
 * Get members of an organization with enriched user data
 */
export const getOrganizationMembers = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<MemberWithUserData[]> => {
    const result = await ctx.runQuery(api.organizations.getOrganizationMembersQuery, {
      organizationId: args.organizationId,
    });

    if (!result.isAuthorized) return [];

    const members: Doc<"organizationMembers">[] = result.members;

    // Fetch user data from Clerk for each member
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return members.map((member: Doc<"organizationMembers">): MemberWithUserData => ({
        _id: member._id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        emailAddress: null,
        publicUserData: undefined,
      }));
    }

    const membersWithUserData: MemberWithUserData[] = await Promise.all(
      members.map(async (member: Doc<"organizationMembers">): Promise<MemberWithUserData> => {
        try {
          const response = await fetch(
            `https://api.clerk.com/v1/users/${member.userId}`,
            {
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
              },
            }
          );

          if (!response.ok) {
            return {
              _id: member._id,
              organizationId: member.organizationId,
              userId: member.userId,
              role: member.role,
              emailAddress: null,
              publicUserData: undefined,
            };
          }

          const userData = await response.json();
          return {
            _id: member._id,
            organizationId: member.organizationId,
            userId: member.userId,
            role: member.role,
            emailAddress: userData.email_addresses?.[0]?.email_address || null,
            publicUserData: {
              firstName: userData.first_name || null,
              lastName: userData.last_name || null,
              imageUrl: userData.image_url || null,
            },
          };
        } catch {
          return {
            _id: member._id,
            organizationId: member.organizationId,
            userId: member.userId,
            role: member.role,
            emailAddress: null,
            publicUserData: undefined,
          };
        }
      })
    );

    return membersWithUserData;
  },
});

// ============================================================================
// Invitation Queries
// ============================================================================

/**
 * Get pending invitations for an organization
 */
export const getOrganizationInvitations = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Only admins can see invitations
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") return [];

    return await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
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

    // Resolve logo URL
    let logoUrl: string | undefined = org?.imageUrl;
    if (org?.logoId) {
      const url = await ctx.storage.getUrl(org.logoId);
      logoUrl = url ?? undefined;
    }

    return {
      invitation,
      organization: org ? { ...org, logoUrl } : null,
    };
  },
});

/**
 * Get active invite link for an organization
 */
export const getInviteLink = query({
  args: {
    organizationId: v.id("organizations"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;

    // Only admins can see invite links
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") return null;

    const activeLink = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isLinkInvite"), true),
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("role"), args.role),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    return activeLink
      ? { token: activeLink.token, expiresAt: activeLink.expiresAt }
      : null;
  },
});

// ============================================================================
// Invitation Mutations
// ============================================================================

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

    // Check if user is an admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only organization admins can invite members");
    }

    // Check for existing pending invitation
    const existingInvitation = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
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

    const token = crypto.randomUUID();

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

    // Verify email matches for email-based invites
    if (
      invitation.email &&
      userEmail &&
      invitation.email.toLowerCase() !== userEmail.toLowerCase()
    ) {
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

    const org = await ctx.db.get(invitation.organizationId);
    return { organizationId: invitation.organizationId, slug: org?.slug };
  },
});

/**
 * Create or get an invite link for the organization
 */
export const createInviteLink = mutation({
  args: {
    organizationId: v.id("organizations"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only organization admins can create invite links");
    }

    // Check for existing active link
    const existingLink = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isLinkInvite"), true),
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("role"), args.role),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (existingLink) {
      return { token: existingLink.token, expiresAt: existingLink.expiresAt };
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("organizationInvitations", {
      organizationId: args.organizationId,
      role: args.role,
      invitedBy: userId,
      token,
      status: "pending",
      createdAt: Date.now(),
      expiresAt,
      isLinkInvite: true,
    });

    return { token, expiresAt };
  },
});

/**
 * Revoke an invite link
 */
export const revokeInviteLink = mutation({
  args: {
    organizationId: v.id("organizations"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only organization admins can revoke invite links");
    }

    const activeLinks = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isLinkInvite"), true),
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("role"), args.role)
        )
      )
      .collect();

    for (const link of activeLinks) {
      await ctx.db.patch(link._id, { status: "revoked" });
    }

    return { revokedCount: activeLinks.length };
  },
});
