import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const createEmailInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
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

    const token = generateToken();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    const inviteId = await ctx.db.insert("organizationInvitations", {
      organizationId: args.organizationId,
      email: args.email,
      role: "member",
      invitedBy: identity.subject,
      token,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + sevenDays,
    });

    return { inviteId, token };
  },
});

export const getActiveInviteLink = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Verify user is a member
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return null;

    // Find an active (pending, non-expired) link invite
    const invites = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const now = Date.now();
    const activeLink = invites.find(
      (inv) =>
        inv.isLinkInvite &&
        inv.status === "pending" &&
        inv.expiresAt > now
    );

    if (!activeLink) return null;

    return { token: activeLink.token, expiresAt: activeLink.expiresAt };
  },
});

export const revokeInviteLink = mutation({
  args: { organizationId: v.id("organizations") },
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

    // Revoke all active link invites for this org
    const invites = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const now = Date.now();
    for (const inv of invites) {
      if (inv.isLinkInvite && inv.status === "pending" && inv.expiresAt > now) {
        await ctx.db.patch(inv._id, { status: "revoked" });
      }
    }
  },
});

// Get invite details by token (public - no auth required for viewing)
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) return null;

    const org = await ctx.db.get(invite.organizationId);
    if (!org) return null;

    const logoUrl = org.logoId ? await ctx.storage.getUrl(org.logoId) : null;

    const memberCount = (
      await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", invite.organizationId)
        )
        .collect()
    ).length;

    // Check if the current user is already a member
    const identity = await ctx.auth.getUserIdentity();
    let alreadyMember = false;
    if (identity) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q
            .eq("organizationId", invite.organizationId)
            .eq("userId", identity.subject)
        )
        .unique();
      alreadyMember = !!membership;
    }

    return {
      _id: invite._id,
      status: invite.status,
      expiresAt: invite.expiresAt,
      isExpired: invite.expiresAt < Date.now(),
      role: invite.role,
      workspace: {
        _id: org._id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        logoUrl,
        memberCount,
      },
      alreadyMember,
    };
  },
});

// Accept an invite token and join the workspace
export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const invite = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) throw new Error("Invalid invite link");
    if (invite.status === "revoked") throw new Error("This invite has been revoked");
    if (invite.status === "accepted" && !invite.isLinkInvite)
      throw new Error("This invite has already been used");
    if (invite.expiresAt < Date.now()) throw new Error("This invite has expired");

    const org = await ctx.db.get(invite.organizationId);
    if (!org) throw new Error("Workspace no longer exists");

    // Check if already a member
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", invite.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();

    if (existingMembership) {
      return { slug: org.slug, alreadyMember: true };
    }

    // Add as member
    await ctx.db.insert("organizationMembers", {
      organizationId: invite.organizationId,
      userId: identity.subject,
      role: invite.role,
      joinedAt: Date.now(),
    });

    // Mark email invites as accepted (link invites stay pending for reuse)
    if (!invite.isLinkInvite) {
      await ctx.db.patch(invite._id, { status: "accepted" });
    }

    // Set as primary workspace if user doesn't have one
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (user && !user.primaryWorkspaceId) {
      await ctx.db.patch(user._id, {
        primaryWorkspaceId: invite.organizationId,
      });
    }

    return { slug: org.slug, alreadyMember: false };
  },
});

export const createInviteLink = mutation({
  args: {
    organizationId: v.id("organizations"),
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

    const token = generateToken();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("organizationInvitations", {
      organizationId: args.organizationId,
      role: "member",
      invitedBy: identity.subject,
      token,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + thirtyDays,
      isLinkInvite: true,
    });

    return { token };
  },
});
