import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a random token for invitations
 */
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if the current user is an admin of the channel's organization
 */
async function requireChannelAdmin(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: any },
  channelId: Id<"channels">
): Promise<{ userId: string; channel: any; organization: any }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userId = identity.subject;
  const channel = await ctx.db.get(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  const organization = await ctx.db.get(channel.organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_and_user", (q: any) =>
      q.eq("organizationId", channel.organizationId).eq("userId", userId)
    )
    .first();

  if (!membership || membership.role !== "admin") {
    throw new Error("Only organization admins can share channels externally");
  }

  return { userId, channel, organization };
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create an email invitation to share a channel with an external user
 */
export const createSharedChannelInvite = mutation({
  args: {
    channelId: v.id("channels"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, channel, organization } = await requireChannelAdmin(ctx, args.channelId);

    // Check if there's already a pending invitation for this email and channel
    const existingInvite = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .filter((q) =>
        q.and(
          q.eq(q.field("channelId"), args.channelId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvite) {
      throw new Error("An invitation has already been sent to this email for this channel");
    }

    // Check if this user is already a shared member
    // First we need to find if there's a user with this email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      // Check if they're already a shared member
      const existingMember = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", existingUser.clerkId)
        )
        .first();

      if (existingMember) {
        throw new Error("This user already has access to this channel");
      }

      // Check if they're already a member of the organization
      const orgMember = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", existingUser.clerkId)
        )
        .first();

      if (orgMember) {
        throw new Error("This user is already a member of your workspace");
      }
    }

    const token = generateToken();

    const invitationId = await ctx.db.insert("sharedChannelInvitations", {
      channelId: args.channelId,
      email: args.email.toLowerCase(),
      invitedBy: userId,
      token,
      status: "pending",
      createdAt: Date.now(),
      isLinkInvite: false,
    });

    return {
      invitationId,
      token,
      channelName: channel.name,
      organizationName: organization.name,
    };
  },
});

/**
 * Create a shareable link to invite external users to a channel
 */
export const createSharedChannelLink = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const { userId, channel, organization } = await requireChannelAdmin(ctx, args.channelId);

    // Check if there's already an active link invite for this channel
    const existingLink = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("isLinkInvite"), true))
      .first();

    if (existingLink) {
      return {
        token: existingLink.token,
        channelName: channel.name,
        organizationName: organization.name,
      };
    }

    const token = generateToken();

    await ctx.db.insert("sharedChannelInvitations", {
      channelId: args.channelId,
      invitedBy: userId,
      token,
      status: "pending",
      createdAt: Date.now(),
      isLinkInvite: true,
    });

    return {
      token,
      channelName: channel.name,
      organizationName: organization.name,
    };
  },
});

/**
 * Revoke a shared channel invitation
 */
export const revokeSharedChannelInvite = mutation({
  args: {
    invitationId: v.id("sharedChannelInvitations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify admin access
    await requireChannelAdmin(ctx, invitation.channelId);

    await ctx.db.patch(args.invitationId, {
      status: "revoked",
    });

    return { success: true };
  },
});

/**
 * Revoke the shareable link for a channel
 */
export const revokeSharedChannelLink = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    await requireChannelAdmin(ctx, args.channelId);

    // Find and revoke the active link
    const existingLink = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("isLinkInvite"), true))
      .first();

    if (existingLink) {
      await ctx.db.patch(existingLink._id, {
        status: "revoked",
      });
    }

    return { success: true };
  },
});

/**
 * Accept a shared channel invitation
 */
export const acceptSharedChannelInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Find the invitation
    const invitation = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer valid");
    }

    // Check expiration if set
    if (invitation.expiresAt && invitation.expiresAt < Date.now()) {
      throw new Error("This invitation has expired");
    }

    const channel = await ctx.db.get(invitation.channelId);
    if (!channel) {
      throw new Error("Channel no longer exists");
    }

    const organization = await ctx.db.get(channel.organizationId);
    if (!organization) {
      throw new Error("Organization no longer exists");
    }

    // Check if user is already a member of the organization
    const orgMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (orgMember) {
      throw new Error("You are already a member of this workspace. You have access to this channel.");
    }

    // Check if already a shared member
    const existingMember = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", invitation.channelId).eq("userId", userId)
      )
      .first();

    if (existingMember) {
      throw new Error("You already have access to this channel");
    }

    // Get user's primary organization (if any)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
      .first();

    const sourceOrganizationId = user?.primaryWorkspaceId;

    // Add user as shared channel member
    await ctx.db.insert("sharedChannelMembers", {
      channelId: invitation.channelId,
      userId,
      sourceOrganizationId,
      addedAt: Date.now(),
      addedBy: invitation.invitedBy,
    });

    // Mark email invitations as accepted (link invites stay pending for reuse)
    if (!invitation.isLinkInvite) {
      await ctx.db.patch(invitation._id, {
        status: "accepted",
      });
    }

    // Get category for URL construction
    const category = await ctx.db.get(channel.categoryId);

    return {
      channelId: channel._id,
      channelName: channel.name,
      categoryName: category?.name || "general",
      organizationSlug: organization.slug,
      organizationName: organization.name,
    };
  },
});

/**
 * Leave a shared channel (for external users)
 */
export const leaveSharedChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const membership = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("You are not an external member of this channel");
    }

    await ctx.db.delete(membership._id);

    return { success: true };
  },
});

/**
 * Remove an external member from a shared channel (admin only)
 */
export const removeExternalMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireChannelAdmin(ctx, args.channelId);

    const membership = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      throw new Error("User is not an external member of this channel");
    }

    await ctx.db.delete(membership._id);

    return { success: true };
  },
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Get shared channel invitation by token (for accept page)
 */
export const getSharedChannelInviteByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    const channel = await ctx.db.get(invitation.channelId);
    if (!channel) {
      return null;
    }

    const organization = await ctx.db.get(channel.organizationId);
    if (!organization) {
      return null;
    }

    // Get the inviter's info
    const inviter = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", invitation.invitedBy))
      .first();

    return {
      invitation: {
        _id: invitation._id,
        status: invitation.status,
        email: invitation.email,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        isLinkInvite: invitation.isLinkInvite,
      },
      channel: {
        _id: channel._id,
        name: channel.name,
        icon: channel.icon,
        description: channel.description,
      },
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
      inviter: inviter
        ? {
            firstName: inviter.firstName,
            lastName: inviter.lastName,
            imageUrl: inviter.imageUrl,
          }
        : null,
    };
  },
});

/**
 * Get the active shareable link for a channel
 */
export const getSharedChannelLink = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Verify the user is an admin of the channel's org
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      return null;
    }

    const link = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("isLinkInvite"), true))
      .first();

    return link ? { token: link.token, createdAt: link.createdAt } : null;
  },
});

/**
 * Get all external members of a shared channel
 */
export const getSharedChannelMembers = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      return [];
    }

    // Check if user has access (either org member or shared member)
    const orgMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    const sharedMember = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", identity.subject)
      )
      .first();

    if (!orgMember && !sharedMember) {
      return [];
    }

    // Get all shared members
    const members = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    // Enrich with user data
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", member.userId))
          .first();

        let sourceOrg = null;
        if (member.sourceOrganizationId) {
          sourceOrg = await ctx.db.get(member.sourceOrganizationId);
        }

        return {
          _id: member._id,
          userId: member.userId,
          addedAt: member.addedAt,
          user: user
            ? {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                imageUrl: user.imageUrl,
              }
            : null,
          sourceOrganization: sourceOrg
            ? {
                name: sourceOrg.name,
                slug: sourceOrg.slug,
              }
            : null,
        };
      })
    );

    return enrichedMembers;
  },
});

/**
 * Get all channels shared with the current user (from other workspaces)
 */
export const getSharedChannelsForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // Get all shared channel memberships for this user
    const memberships = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Enrich with channel and organization data
    const channels = await Promise.all(
      memberships.map(async (membership) => {
        const channel = await ctx.db.get(membership.channelId);
        if (!channel) return null;

        const organization = await ctx.db.get(channel.organizationId);
        if (!organization) return null;

        const category = await ctx.db.get(channel.categoryId);

        return {
          _id: channel._id,
          name: channel.name,
          icon: channel.icon,
          description: channel.description,
          categoryName: category?.name || "general",
          organization: {
            _id: organization._id,
            name: organization.name,
            slug: organization.slug,
          },
          addedAt: membership.addedAt,
        };
      })
    );

    // Filter out nulls and sort by most recently added
    return channels
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.addedAt - a.addedAt);
  },
});

/**
 * Get pending shared channel invitations for a channel (admin only)
 */
export const getPendingSharedInvitations = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      return [];
    }

    // Check admin access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      return [];
    }

    // Get pending email invitations (not link invites)
    const invitations = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending")
      )
      .filter((q) => q.neq(q.field("isLinkInvite"), true))
      .collect();

    return invitations.map((inv) => ({
      _id: inv._id,
      email: inv.email,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  },
});

/**
 * Check if a channel has any external sharing (for UI indicators)
 */
export const isChannelShared = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    // Check if there are any shared members
    const sharedMember = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .first();

    if (sharedMember) {
      return true;
    }

    // Check if there's an active share link
    const shareLink = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("isLinkInvite"), true))
      .first();

    return !!shareLink;
  },
});

/**
 * Get shared channel count for sidebar badge
 */
export const getSharedChannelCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const memberships = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return memberships.length;
  },
});

/**
 * Get unread shared channels for the current user
 */
export const getUnreadSharedChannels = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {};
    }

    const userId = identity.subject;

    // Get all shared channels for this user
    const sharedMemberships = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const unreadChannels: Record<string, boolean> = {};

    // For each shared channel, check if there are unread messages
    for (const membership of sharedMemberships) {
      // Use the timestamp when the user was added as the baseline
      // All messages after this time should be considered for unread status
      const membershipTime = membership.addedAt;

      // Get the latest message in this channel that was created after the membership
      const latestMessage = await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) => q.eq("channelId", membership.channelId))
        .order("desc")
        .first();

      // If there's a message after the membership was created, mark as unread
      // In a real app, you'd track lastReadAt per user per channel
      if (latestMessage && latestMessage._creationTime > membershipTime) {
        unreadChannels[membership.channelId] = true;
      }
    }

    return unreadChannels;
  },
});

/**
 * Check if the current user has access to any shared channels in a workspace
 * Used by the layout to allow external users to access shared channels
 */
export const hasSharedChannelAccessInWorkspace = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const userId = identity.subject;

    // Get all shared channel memberships for this user
    const sharedMemberships = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (sharedMemberships.length === 0) {
      return false;
    }

    // Check if any of these shared channels belong to this organization
    for (const membership of sharedMemberships) {
      const channel = await ctx.db.get(membership.channelId);
      if (channel && channel.organizationId === args.organizationId) {
        return true;
      }
    }

    return false;
  },
});
