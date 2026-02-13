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
