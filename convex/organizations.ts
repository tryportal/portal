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
  joinedAt?: number;
  jobTitle?: string;
  department?: string;
  location?: string;
  timezone?: string;
  bio?: string;
  emailAddress: string | null;
  publicUserData: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | undefined;
};

// Reserved routes that cannot be used as workspace slugs
const RESERVED_ROUTES = [
  "w",
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

    // Create default category and channel
    const categoryId = await ctx.db.insert("channelCategories", {
      organizationId: orgId,
      name: "General",
      order: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert("channels", {
      organizationId: orgId,
      categoryId,
      name: "general",
      description: "General discussion for the workspace",
      icon: "Hash",
      permissions: "open",
      order: 0,
      createdAt: Date.now(),
      createdBy: userId,
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
    isPublic: v.optional(v.boolean()),
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

    // Handle isPublic update
    if (args.isPublic !== undefined) {
      updates.isPublic = args.isPublic;
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

    // Delete all channels
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const channel of channels) {
      await ctx.db.delete(channel._id);
    }

    // Delete all channel categories
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const category of categories) {
      await ctx.db.delete(category._id);
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
 * Check if a specific user is a member of an organization
 * Used internally for DM user search
 */
export const checkUserMembership = query({
  args: { 
    organizationId: v.id("organizations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Verify the caller is a member of this organization
    const callerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!callerMembership) return null;

    // Check if the target user is a member
    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .first();

    return { isMember: !!targetMembership };
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
 * Now uses local Convex users table instead of Clerk API
 */
export const getOrganizationMembers = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<MemberWithUserData[]> => {
    const result = await ctx.runQuery(api.organizations.getOrganizationMembersQuery, {
      organizationId: args.organizationId,
    });

    if (!result.isAuthorized) return [];

    const members: Doc<"organizationMembers">[] = result.members;

    // Get all user IDs
    const userIds = members.map((m) => m.userId);

    // Fetch user data from local Convex users table
    const usersData = await ctx.runQuery(api.users.getUserData, {
      userIds,
    });

    // Create a map for quick lookup
    const userDataMap = new Map(usersData.map((u) => [u.userId, u]));

    // Also get emails from users table
    const users = await ctx.runQuery(api.users.getUsers, {
      clerkIds: userIds,
    });
    const userEmailMap = new Map(users.map((u) => [u.clerkId, u.email]));

    const membersWithUserData: MemberWithUserData[] = members.map((member): MemberWithUserData => {
      const userData = userDataMap.get(member.userId);
      const email = userEmailMap.get(member.userId);

      return {
        _id: member._id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        jobTitle: member.jobTitle,
        department: member.department,
        location: member.location,
        timezone: member.timezone,
        bio: member.bio,
        emailAddress: email || null,
        publicUserData: userData ? {
          firstName: userData.firstName,
          lastName: userData.lastName,
          imageUrl: userData.imageUrl,
        } : undefined,
      };
    });

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
 * Get a single member of an organization with user data (query for internal use)
 */
export const getOrganizationMemberQuery = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { member: null, isAuthorized: false };

    const currentUserId = identity.subject;

    // Check if current user is a member
    const currentMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", currentUserId)
      )
      .first();

    if (!currentMembership) return { member: null, isAuthorized: false };

    // Get the requested member
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .first();

    return { member, isAuthorized: true, isAdmin: currentMembership.role === "admin" };
  },
});

/**
 * Get a single member of an organization with enriched user data
 * Now uses local Convex users table instead of Clerk API
 */
export const getOrganizationMember = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    member: MemberWithUserData | null;
    isAdmin: boolean;
  }> => {
    const result = await ctx.runQuery(api.organizations.getOrganizationMemberQuery, {
      organizationId: args.organizationId,
      userId: args.userId,
    });

    if (!result.isAuthorized || !result.member) {
      return { member: null, isAdmin: false };
    }

    const member = result.member;

    // Fetch user data from local Convex users table
    const usersData = await ctx.runQuery(api.users.getUserData, {
      userIds: [member.userId],
    });
    const userData = usersData[0];

    // Get email from users table
    const users = await ctx.runQuery(api.users.getUsers, {
      clerkIds: [member.userId],
    });
    const email = users[0]?.email || null;

    return {
      member: {
        _id: member._id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        jobTitle: member.jobTitle,
        department: member.department,
        location: member.location,
        timezone: member.timezone,
        bio: member.bio,
        emailAddress: email,
        publicUserData: userData ? {
          firstName: userData.firstName,
          lastName: userData.lastName,
          imageUrl: userData.imageUrl,
        } : undefined,
      },
      isAdmin: result.isAdmin ?? false,
    };
  },
});

/**
 * Update a member's role in an organization
 */
export const updateOrganizationMemberRole = mutation({
  args: {
    organizationId: v.id("organizations"),
    membershipId: v.id("organizationMembers"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if current user is an admin
    const currentMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!currentMembership || currentMembership.role !== "admin") {
      throw new Error("Only organization admins can update member roles");
    }

    // Get the target membership
    const targetMembership = await ctx.db.get(args.membershipId);
    if (!targetMembership) {
      throw new Error("Member not found");
    }

    if (targetMembership.organizationId !== args.organizationId) {
      throw new Error("Member does not belong to this organization");
    }

    // Prevent removing the last admin
    if (targetMembership.role === "admin" && args.role === "member") {
      const admins = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (admins.length <= 1) {
        throw new Error("Cannot remove the last admin. Promote another member to admin first.");
      }
    }

    await ctx.db.patch(args.membershipId, { role: args.role });
    return args.membershipId;
  },
});

/**
 * Remove a member from an organization
 */
export const removeOrganizationMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    membershipId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if current user is an admin
    const currentMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!currentMembership || currentMembership.role !== "admin") {
      throw new Error("Only organization admins can remove members");
    }

    // Get the target membership
    const targetMembership = await ctx.db.get(args.membershipId);
    if (!targetMembership) {
      throw new Error("Member not found");
    }

    if (targetMembership.organizationId !== args.organizationId) {
      throw new Error("Member does not belong to this organization");
    }

    // Prevent removing the last admin
    if (targetMembership.role === "admin") {
      const admins = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (admins.length <= 1) {
        throw new Error("Cannot remove the last admin. Promote another member to admin first.");
      }
    }

    // Prevent self-removal (admins should leave via a different flow)
    if (targetMembership.userId === userId) {
      throw new Error("You cannot remove yourself. Use the leave workspace option instead.");
    }

    await ctx.db.delete(args.membershipId);
    return { success: true };
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

/**
 * Toggle whether a workspace is public
 */
export const setOrganizationPublic = mutation({
  args: {
    organizationId: v.id("organizations"),
    isPublic: v.boolean(),
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
      throw new Error("Only organization admins can change public access settings");
    }

    await ctx.db.patch(args.organizationId, { isPublic: args.isPublic });
    return { success: true };
  },
});

/**
 * Join a public workspace (no invitation required)
 */
export const joinPublicOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if it's public
    if (!org.isPublic) {
      throw new Error("This workspace is not public. You need an invitation to join.");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (existingMembership) {
      throw new Error("You are already a member of this workspace");
    }

    // Add as member
    await ctx.db.insert("organizationMembers", {
      organizationId: args.organizationId,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });

    return { organizationId: args.organizationId, slug: org.slug };
  },
});

/**
 * Update a member's profile information
 */
export const updateMemberProfile = mutation({
  args: {
    organizationId: v.id("organizations"),
    membershipId: v.id("organizationMembers"),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the target membership
    const targetMembership = await ctx.db.get(args.membershipId);
    if (!targetMembership) {
      throw new Error("Member not found");
    }

    if (targetMembership.organizationId !== args.organizationId) {
      throw new Error("Member does not belong to this organization");
    }

    // Check if user is updating their own profile or is an admin
    const currentMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!currentMembership) {
      throw new Error("You are not a member of this organization");
    }

    const isSelf = targetMembership.userId === userId;
    const isAdmin = currentMembership.role === "admin";

    if (!isSelf && !isAdmin) {
      throw new Error("You can only update your own profile or you must be an admin");
    }

    await ctx.db.patch(args.membershipId, {
      jobTitle: args.jobTitle,
      department: args.department,
      location: args.location,
      timezone: args.timezone,
      bio: args.bio,
    });

    return args.membershipId;
  },
});
