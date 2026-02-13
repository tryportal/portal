import { mutation } from "./_generated/server";
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
