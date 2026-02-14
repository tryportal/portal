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
      createdBy: org.createdBy,
      isPublic: org.isPublic ?? false,
    };
  },
});

export const getUserWorkspaces = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;

        const logoUrl = org.logoId
          ? await ctx.storage.getUrl(org.logoId)
          : null;

        return {
          _id: org._id,
          name: org.name,
          slug: org.slug,
          logoUrl,
          role: membership.role,
        };
      })
    );

    return workspaces.filter(Boolean);
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

export const getWorkspaceMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify caller is a member
    const callerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!callerMembership) return [];

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Get the org to check who the creator is
    const org = await ctx.db.get(args.organizationId);

    const results = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", member.userId))
          .unique();

        return {
          _id: member._id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          isCreator: org?.createdBy === member.userId,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          email: user?.email ?? null,
          imageUrl: user?.imageUrl ?? null,
        };
      })
    );

    // Sort: admins first, then by joinedAt
    return results.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;
      return a.joinedAt - b.joinedAt;
    });
  },
});

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("organizationMembers"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember) throw new Error("Member not found");

    // Verify caller is admin of the same organization
    const callerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", targetMember.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!callerMembership || callerMembership.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Can't change the workspace creator's role
    const org = await ctx.db.get(targetMember.organizationId);
    if (org?.createdBy === targetMember.userId) {
      throw new Error("Cannot change the workspace creator's role");
    }

    await ctx.db.patch(args.memberId, { role: args.role });
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("organizationMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember) throw new Error("Member not found");

    // Verify caller is admin of the same organization
    const callerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", targetMember.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!callerMembership || callerMembership.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Can't remove the workspace creator
    const org = await ctx.db.get(targetMember.organizationId);
    if (org?.createdBy === targetMember.userId) {
      throw new Error("Cannot remove the workspace creator");
    }

    // Can't remove yourself
    if (targetMember.userId === identity.subject) {
      throw new Error("Cannot remove yourself");
    }

    await ctx.db.delete(args.memberId);
  },
});

export const leaveWorkspace = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member");

    // Workspace creator cannot leave
    const org = await ctx.db.get(args.organizationId);
    if (org?.createdBy === identity.subject) {
      throw new Error("The workspace owner cannot leave. Transfer ownership first.");
    }

    await ctx.db.delete(membership._id);
  },
});

export const updateWorkspace = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    removeLogo: v.optional(v.boolean()),
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

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description.trim() || undefined;
    if (args.logoId !== undefined) patch.logoId = args.logoId;
    if (args.removeLogo) {
      patch.logoId = undefined;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.organizationId, patch);
    }
  },
});

export const updateWorkspaceSlug = mutation({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
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

    // Check slug uniqueness (exclude self)
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing && existing._id !== args.organizationId) {
      throw new Error("Slug already taken");
    }

    await ctx.db.patch(args.organizationId, { slug: args.slug });

    return { slug: args.slug };
  },
});

export const transferOwnership = mutation({
  args: {
    organizationId: v.id("organizations"),
    newOwnerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Workspace not found");

    // Only the creator can transfer ownership
    if (org.createdBy !== identity.subject) {
      throw new Error("Only the workspace creator can transfer ownership");
    }

    // Verify the new owner is a member
    const newOwnerMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.newOwnerUserId)
      )
      .unique();
    if (!newOwnerMembership) {
      throw new Error("New owner must be a member of the workspace");
    }

    // Ensure new owner is an admin
    if (newOwnerMembership.role !== "admin") {
      await ctx.db.patch(newOwnerMembership._id, { role: "admin" });
    }

    // Transfer ownership
    await ctx.db.patch(args.organizationId, { createdBy: args.newOwnerUserId });
  },
});

export const deleteWorkspace = mutation({
  args: {
    organizationId: v.id("organizations"),
    confirmName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Workspace not found");

    // Only the creator can delete the workspace
    if (org.createdBy !== identity.subject) {
      throw new Error("Only the workspace creator can delete the workspace");
    }

    // Verify confirmation name matches
    if (args.confirmName !== org.name) {
      throw new Error("Workspace name does not match");
    }

    // Cascade delete all related data

    // 1. Delete all messages in channels belonging to this workspace
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    for (const channel of channels) {
      // Delete messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      // Delete forum posts and their comments
      const forumPosts = await ctx.db
        .query("forumPosts")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const post of forumPosts) {
        const postComments = await ctx.db
          .query("messages")
          .withIndex("by_forum_post", (q) => q.eq("forumPostId", post._id))
          .collect();
        for (const comment of postComments) {
          await ctx.db.delete(comment._id);
        }
        await ctx.db.delete(post._id);
      }

      // Delete channel members
      const channelMembers = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const member of channelMembers) {
        await ctx.db.delete(member._id);
      }

      // Delete shared channel members
      const sharedMembers = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const member of sharedMembers) {
        await ctx.db.delete(member._id);
      }

      // Delete shared channel invitations
      const sharedInvitations = await ctx.db
        .query("sharedChannelInvitations")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const invitation of sharedInvitations) {
        await ctx.db.delete(invitation._id);
      }

      // Delete channel read statuses
      const readStatuses = await ctx.db
        .query("channelReadStatus")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const status of readStatuses) {
        await ctx.db.delete(status._id);
      }

      // Delete muted channels
      const mutedChannels = await ctx.db
        .query("mutedChannels")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const muted of mutedChannels) {
        await ctx.db.delete(muted._id);
      }

      // Delete typing indicators
      const typingIndicators = await ctx.db
        .query("typingIndicators")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const indicator of typingIndicators) {
        await ctx.db.delete(indicator._id);
      }

      // Delete the channel
      await ctx.db.delete(channel._id);
    }

    // 2. Delete channel categories
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const category of categories) {
      await ctx.db.delete(category._id);
    }

    // 3. Delete organization invitations
    const invitations = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // 4. Delete Pearl conversations and messages
    const pearlConversations = await ctx.db
      .query("pearlConversations")
      .withIndex("by_user_and_org", (q) => q.eq("userId", identity.subject).eq("organizationId", args.organizationId))
      .collect();
    for (const conv of pearlConversations) {
      const pearlMessages = await ctx.db
        .query("pearlMessages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const msg of pearlMessages) {
        await ctx.db.delete(msg._id);
      }
      await ctx.db.delete(conv._id);
    }

    // 5. Delete organization members
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // 6. Clear primaryWorkspaceId for any users pointing to this org
    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      if (user.primaryWorkspaceId === args.organizationId) {
        await ctx.db.patch(user._id, { primaryWorkspaceId: undefined });
      }
    }

    // 7. Delete the workspace logo from storage if exists
    if (org.logoId) {
      await ctx.storage.delete(org.logoId);
    }

    // 8. Delete the organization itself
    await ctx.db.delete(args.organizationId);
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
