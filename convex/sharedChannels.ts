import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create an email-based invite for sharing a channel with an external user.
 * Returns the invite token for use in sending the email.
 */
export const createEmailInvite = mutation({
  args: {
    channelId: v.id("channels"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    const token = crypto.randomUUID();
    const inviteId = await ctx.db.insert("sharedChannelInvitations", {
      channelId: args.channelId,
      email: args.email,
      invitedBy: identity.subject,
      token,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { inviteId, token };
  },
});

/**
 * Create a shareable link invite for a channel.
 * Returns the invite token for constructing the link.
 */
export const createInviteLink = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Revoke any existing link invites for this channel
    const existing = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending")
      )
      .collect();

    for (const inv of existing) {
      if (inv.isLinkInvite) {
        await ctx.db.patch(inv._id, { status: "revoked" });
      }
    }

    const token = crypto.randomUUID();
    const inviteId = await ctx.db.insert("sharedChannelInvitations", {
      channelId: args.channelId,
      invitedBy: identity.subject,
      token,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      isLinkInvite: true,
    });

    return { inviteId, token };
  },
});

/**
 * Revoke all active link invites for a channel.
 */
export const revokeInviteLink = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    const invites = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending")
      )
      .collect();

    for (const inv of invites) {
      if (inv.isLinkInvite) {
        await ctx.db.patch(inv._id, { status: "revoked" });
      }
    }
  },
});

/**
 * Accept a shared channel invite.
 * Validates the token and adds the user as a shared channel member.
 */
export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const invite = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) throw new Error("Invalid invite");
    if (invite.status === "revoked") throw new Error("Invite has been revoked");
    if (invite.expiresAt && invite.expiresAt < Date.now()) throw new Error("Invite has expired");

    // Check if already a shared member
    const existingMember = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", invite.channelId).eq("userId", identity.subject)
      )
      .unique();

    if (existingMember) {
      // Already a member, just get channel info for redirect
      const channel = await ctx.db.get(invite.channelId);
      if (!channel) throw new Error("Channel not found");
      const org = await ctx.db.get(channel.organizationId);
      if (!org) throw new Error("Workspace not found");
      const categories = await ctx.db
        .query("channelCategories")
        .withIndex("by_organization", (q) => q.eq("organizationId", channel.organizationId))
        .collect();
      const category = categories.find((c) => c._id === channel.categoryId);
      return {
        slug: org.slug,
        categorySlug: category ? category.name.toLowerCase().replace(/\s+/g, "-") : "general",
        channelName: channel.name,
      };
    }

    // Find user's source organization (their primary workspace)
    const userOrgs = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const sourceOrgId = userOrgs.length > 0 ? userOrgs[0].organizationId : undefined;

    // Add as shared member
    await ctx.db.insert("sharedChannelMembers", {
      channelId: invite.channelId,
      userId: identity.subject,
      sourceOrganizationId: sourceOrgId,
      addedAt: Date.now(),
      addedBy: invite.invitedBy,
    });

    // Mark email invites as accepted (link invites stay pending for reuse)
    if (!invite.isLinkInvite) {
      await ctx.db.patch(invite._id, { status: "accepted" });
    }

    // Get channel info for redirect
    const channel = await ctx.db.get(invite.channelId);
    if (!channel) throw new Error("Channel not found");
    const org = await ctx.db.get(channel.organizationId);
    if (!org) throw new Error("Workspace not found");
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) => q.eq("organizationId", channel.organizationId))
      .collect();
    const category = categories.find((c) => c._id === channel.categoryId);

    return {
      slug: org.slug,
      categorySlug: category ? category.name.toLowerCase().replace(/\s+/g, "-") : "general",
      channelName: channel.name,
    };
  },
});

/**
 * Remove a shared member from a channel.
 */
export const removeSharedMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    const member = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .unique();

    if (member) {
      await ctx.db.delete(member._id);
    }
  },
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Get the active link invite for a channel (if any).
 */
export const getActiveInviteLink = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const invites = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_channel_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending")
      )
      .collect();

    const linkInvite = invites.find(
      (inv) => inv.isLinkInvite && (!inv.expiresAt || inv.expiresAt > Date.now())
    );

    return linkInvite ?? null;
  },
});

/**
 * Get invite details by token (public query for invite acceptance page).
 */
export const getInviteByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    const invite = await ctx.db
      .query("sharedChannelInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) return null;

    const channel = await ctx.db.get(invite.channelId);
    if (!channel) return null;

    const org = await ctx.db.get(channel.organizationId);
    if (!org) return null;

    // Get workspace logo URL
    let logoUrl: string | null = null;
    if (org.logoId) {
      logoUrl = await ctx.storage.getUrl(org.logoId);
    } else if (org.imageUrl) {
      logoUrl = org.imageUrl;
    }

    // Check if user is already a shared member
    let alreadyMember = false;
    if (identity) {
      const existingMember = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", invite.channelId).eq("userId", identity.subject)
        )
        .unique();
      // Also check if they're a workspace member
      const orgMember = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", org._id).eq("userId", identity.subject)
        )
        .unique();
      alreadyMember = !!existingMember || !!orgMember;
    }

    return {
      channel: {
        name: channel.name,
        description: channel.description,
      },
      workspace: {
        name: org.name,
        slug: org.slug,
        logoUrl,
      },
      isExpired: invite.expiresAt ? invite.expiresAt < Date.now() : false,
      status: invite.status,
      alreadyMember,
    };
  },
});

/**
 * Get all shared members of a channel with user profiles.
 */
export const getSharedMembers = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const members = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    const enriched = [];
    for (const member of members) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", member.userId))
        .unique();

      let sourceOrgName: string | undefined;
      let sourceOrgLogoUrl: string | null = null;
      if (member.sourceOrganizationId) {
        const sourceOrg = await ctx.db.get(member.sourceOrganizationId);
        if (sourceOrg) {
          sourceOrgName = sourceOrg.name;
          if (sourceOrg.logoId) {
            sourceOrgLogoUrl = await ctx.storage.getUrl(sourceOrg.logoId);
          } else if (sourceOrg.imageUrl) {
            sourceOrgLogoUrl = sourceOrg.imageUrl;
          }
        }
      }

      enriched.push({
        _id: member._id,
        userId: member.userId,
        addedAt: member.addedAt,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
        sourceOrgName,
        sourceOrgLogoUrl,
      });
    }

    return enriched;
  },
});

/**
 * Get all channels shared with the current user, grouped by source workspace.
 */
export const getMySharedChannels = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Group by workspace
    const workspaceMap = new Map<
      string,
      {
        orgId: string;
        name: string;
        slug: string;
        logoUrl: string | null;
        channels: { _id: string; name: string; categorySlug: string }[];
      }
    >();

    const seenChannels = new Set<string>();
    const addChannel = async (channelId: Id<"channels">) => {
      if (seenChannels.has(channelId as string)) return;
      seenChannels.add(channelId as string);
      const channel = await ctx.db.get(channelId);
      if (!channel) return;

      const orgIdStr = channel.organizationId as string;

      if (!workspaceMap.has(orgIdStr)) {
        const org = await ctx.db.get(channel.organizationId);
        if (!org) return;

        let logoUrl: string | null = null;
        if (org.logoId) {
          logoUrl = await ctx.storage.getUrl(org.logoId);
        } else if (org.imageUrl) {
          logoUrl = org.imageUrl;
        }

        workspaceMap.set(orgIdStr, {
          orgId: orgIdStr,
          name: org.name,
          slug: org.slug,
          logoUrl,
          channels: [],
        });
      }

      const existing = workspaceMap.get(orgIdStr)!.channels;
      const category = await ctx.db.get(channel.categoryId);
      const categorySlug = category
        ? category.name.toLowerCase().replace(/\s+/g, "-")
        : "general";

      existing.push({
        _id: channel._id as string,
        name: channel.name,
        categorySlug,
      });
    };

    // 1. Channels shared WITH me (I'm a shared member)
    const memberships = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    for (const m of memberships) {
      await addChannel(m.channelId);
    }

    // 2. Channels I own that have shared members (I'm a workspace member)
    const myOrgs = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    for (const org of myOrgs) {
      // Get all channels in this org
      const channels = await ctx.db
        .query("channels")
        .withIndex("by_organization", (q) => q.eq("organizationId", org.organizationId))
        .collect();

      for (const channel of channels) {
        // Check if this channel has any shared members
        const sharedMember = await ctx.db
          .query("sharedChannelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .first();

        if (sharedMember) {
          await addChannel(channel._id);
        }
      }
    }

    return Array.from(workspaceMap.values());
  },
});
