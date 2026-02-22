import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get a channel by workspace slug, category name, and channel name.
 * Also returns the user's membership role and mute status.
 */
export const getChannelByName = query({
  args: {
    slug: v.string(),
    categoryName: v.string(),
    channelName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Find the workspace
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!org) return null;

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", org._id).eq("userId", identity.subject)
      )
      .unique();

    // If not a workspace member, check if they're a shared channel member
    let isSharedMember = false;
    if (!membership) {
      // We need to find the channel first to check shared membership
      const categories = await ctx.db
        .query("channelCategories")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .collect();

      const category = categories.find(
        (c) => c.name.toLowerCase().replace(/\s+/g, "-") === args.categoryName.toLowerCase()
      );
      if (!category) return null;

      const channels = await ctx.db
        .query("channels")
        .withIndex("by_category", (q) => q.eq("categoryId", category._id))
        .collect();

      const channel = channels.find(
        (c) => c.name.toLowerCase() === args.channelName.toLowerCase()
      );
      if (!channel) return null;

      const sharedMember = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", channel._id).eq("userId", identity.subject)
        )
        .unique();
      if (!sharedMember) return null;
      isSharedMember = true;

      // Check mute status
      const muted = await ctx.db
        .query("mutedChannels")
        .withIndex("by_user_and_channel", (q) =>
          q.eq("userId", identity.subject).eq("channelId", channel._id)
        )
        .unique();

      return {
        ...channel,
        categoryName: category.name,
        role: "shared" as const,
        isMuted: !!muted,
        organizationId: org._id,
      };
    }

    // Find the category by name (case-insensitive compare)
    const categories = await ctx.db
      .query("channelCategories")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    const category = categories.find(
      (c) => c.name.toLowerCase().replace(/\s+/g, "-") === args.categoryName.toLowerCase()
    );
    if (!category) return null;

    // Find the channel by name within this category
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_category", (q) => q.eq("categoryId", category._id))
      .collect();

    const channel = channels.find(
      (c) => c.name.toLowerCase() === args.channelName.toLowerCase()
    );
    if (!channel) return null;

    // Check private channel access
    const isChannelPrivate = channel.isPrivate || category.isPrivate;
    if (isChannelPrivate && membership.role !== "admin") {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", channel._id).eq("userId", identity.subject)
        )
        .unique();
      if (!channelMember) return null;
    }

    // Check mute status
    const muted = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", identity.subject).eq("channelId", channel._id)
      )
      .unique();

    return {
      ...channel,
      categoryName: category.name,
      role: membership.role,
      isMuted: !!muted,
      organizationId: org._id,
    };
  },
});

/**
 * Get paginated messages for a channel.
 * Returns 50 messages per page, newest first. Client reverses for display.
 * Enriches each message with user profile data.
 */
export const getMessages = query({
  args: {
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };

    // Check private channel access
    const channel = await ctx.db.get(args.channelId);
    if (channel) {
      const category = await ctx.db.get(channel.categoryId);
      const isChannelPrivate = channel.isPrivate || category?.isPrivate;
      if (isChannelPrivate) {
        const membership = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization_and_user", (q) =>
            q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
          )
          .unique();
        if (!membership || membership.role !== "admin") {
          const channelMember = await ctx.db
            .query("channelMembers")
            .withIndex("by_channel_and_user", (q) =>
              q.eq("channelId", args.channelId).eq("userId", identity.subject)
            )
            .unique();
          if (!channelMember) return { page: [], isDone: true, continueCursor: "" };
        }
      }
    }

    const results = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Collect unique user IDs from this page
    const userIds = new Set<string>();
    for (const msg of results.page) {
      userIds.add(msg.userId);
    }

    // Batch fetch user profiles
    const userMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string; clerkId: string }>();
    for (const userId of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .unique();
      if (user) {
        userMap.set(userId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          clerkId: user.clerkId,
        });
      }
    }

    // Fetch parent messages for replies (batch)
    const parentIds: Id<"messages">[] = [];
    for (const msg of results.page) {
      if (msg.parentMessageId) {
        parentIds.push(msg.parentMessageId);
      }
    }

    const parentMap = new Map<Id<"messages">, { content: string; userId: string; userName: string }>();
    for (const parentId of parentIds) {
      const parent = await ctx.db.get(parentId);
      if (parent) {
        const parentUser = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", parent.userId))
          .unique();
        parentMap.set(parentId, {
          content: parent.content,
          userId: parent.userId,
          userName: parentUser
            ? [parentUser.firstName, parentUser.lastName].filter(Boolean).join(" ") || "Unknown"
            : "Unknown",
        });
      }
    }

    // Check which messages are saved by current user
    const savedMessages = await ctx.db
      .query("savedMessages")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const savedMessageIds = new Set(savedMessages.map((s) => s.messageId));

    // Resolve attachment URLs
    const attachmentUrlMap = new Map<string, string>();
    for (const msg of results.page) {
      if (msg.attachments) {
        for (const att of msg.attachments) {
          if (!attachmentUrlMap.has(att.storageId)) {
            const url = await ctx.storage.getUrl(att.storageId);
            if (url) attachmentUrlMap.set(att.storageId, url);
          }
        }
      }
    }

    // Filter out thread replies from main feed
    const mainMessages = results.page.filter((msg) => !msg.parentMessageId);

    // Count thread replies and get latest repliers for each main message
    const threadMetaMap = new Map<Id<"messages">, { count: number; latestRepliers: { imageUrl?: string; name: string }[] }>();
    for (const msg of mainMessages) {
      const replies = await ctx.db
        .query("messages")
        .withIndex("by_parent_message", (q) => q.eq("parentMessageId", msg._id))
        .collect();
      if (replies.length > 0) {
        // Get last 3 unique repliers
        const seen = new Set<string>();
        const latestRepliers: { imageUrl?: string; name: string }[] = [];
        for (let i = replies.length - 1; i >= 0 && latestRepliers.length < 3; i--) {
          const r = replies[i];
          if (seen.has(r.userId)) continue;
          seen.add(r.userId);
          const u = userMap.get(r.userId) ?? await (async () => {
            const user = await ctx.db
              .query("users")
              .withIndex("by_clerk_id", (q) => q.eq("clerkId", r.userId))
              .unique();
            if (user) {
              userMap.set(r.userId, { firstName: user.firstName, lastName: user.lastName, imageUrl: user.imageUrl, clerkId: user.clerkId });
              return userMap.get(r.userId)!;
            }
            return null;
          })();
          if (u) {
            latestRepliers.push({
              imageUrl: u.imageUrl,
              name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown",
            });
          }
        }
        threadMetaMap.set(msg._id, { count: replies.length, latestRepliers });
      }
    }

    // Build shared member map for workspace badge
    const sharedMembers = await ctx.db
      .query("sharedChannelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    const sharedMemberMap = new Map<string, { sourceOrgName?: string; sourceOrgLogoUrl?: string | null }>();
    for (const sm of sharedMembers) {
      if (userIds.has(sm.userId)) {
        let sourceOrgName: string | undefined;
        let sourceOrgLogoUrl: string | null = null;
        if (sm.sourceOrganizationId) {
          const sourceOrg = await ctx.db.get(sm.sourceOrganizationId);
          if (sourceOrg) {
            sourceOrgName = sourceOrg.name;
            if (sourceOrg.logoId) {
              sourceOrgLogoUrl = await ctx.storage.getUrl(sourceOrg.logoId);
            } else if (sourceOrg.imageUrl) {
              sourceOrgLogoUrl = sourceOrg.imageUrl;
            }
          }
        }
        sharedMemberMap.set(sm.userId, { sourceOrgName, sourceOrgLogoUrl });
      }
    }

    // Enrich messages
    const enrichedPage = mainMessages.map((msg) => {
      const user = userMap.get(msg.userId);
      const parentMessage = msg.parentMessageId
        ? parentMap.get(msg.parentMessageId) ?? null
        : null;
      const threadMeta = threadMetaMap.get(msg._id);
      const sharedInfo = sharedMemberMap.get(msg.userId);

      return {
        ...msg,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
        parentMessage,
        isSaved: savedMessageIds.has(msg._id),
        isOwn: msg.userId === identity.subject,
        attachments: msg.attachments?.map((att) => ({
          ...att,
          url: attachmentUrlMap.get(att.storageId) ?? null,
        })),
        threadReplyCount: threadMeta?.count ?? 0,
        threadLatestRepliers: threadMeta?.latestRepliers ?? [],
        isSharedMember: !!sharedInfo,
        sharedFromWorkspace: sharedInfo?.sourceOrgName ?? null,
        sharedFromWorkspaceLogoUrl: sharedInfo?.sourceOrgLogoUrl ?? null,
      };
    });

    return {
      ...results,
      page: enrichedPage,
    };
  },
});

/**
 * Get all pinned messages for a channel.
 */
export const getPinnedMessages = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .collect();

    const pinned = messages.filter((m) => m.pinned === true);

    // Enrich with user data
    const userIds = new Set(pinned.map((m) => m.userId));
    const userMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string }>();
    for (const userId of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .unique();
      if (user) {
        userMap.set(userId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        });
      }
    }

    return pinned.map((msg) => {
      const user = userMap.get(msg.userId);
      return {
        ...msg,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
      };
    });
  },
});

/**
 * Search messages in a channel by content substring.
 */
export const searchMessages = query({
  args: {
    channelId: v.id("channels"),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (!args.searchQuery.trim()) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .collect();

    const query = args.searchQuery.toLowerCase();
    const filtered = messages
      .filter((m) => m.content.toLowerCase().includes(query))
      .slice(0, 20); // Limit results

    // Enrich with user data
    const userIds = new Set(filtered.map((m) => m.userId));
    const userMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string }>();
    for (const userId of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .unique();
      if (user) {
        userMap.set(userId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        });
      }
    }

    // Check saved status
    const savedMessages = await ctx.db
      .query("savedMessages")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const savedMessageIds = new Set(savedMessages.map((s) => s.messageId));

    // Resolve attachment URLs
    const attachmentUrlMap = new Map<string, string>();
    for (const msg of filtered) {
      if (msg.attachments) {
        for (const att of msg.attachments) {
          if (!attachmentUrlMap.has(att.storageId)) {
            const url = await ctx.storage.getUrl(att.storageId);
            if (url) attachmentUrlMap.set(att.storageId, url);
          }
        }
      }
    }

    return filtered.map((msg) => {
      const user = userMap.get(msg.userId);
      return {
        ...msg,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
        parentMessage: null as { content: string; userId: string; userName: string } | null,
        isSaved: savedMessageIds.has(msg._id),
        isOwn: msg.userId === identity.subject,
        attachments: msg.attachments?.map((att) => ({
          ...att,
          url: attachmentUrlMap.get(att.storageId) ?? null,
        })),
      };
    });
  },
});

/**
 * Get a single message by ID, enriched with user data.
 */
export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const msg = await ctx.db.get(args.messageId);
    if (!msg) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", msg.userId))
      .unique();

    const saved = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", identity.subject).eq("messageId", args.messageId)
      )
      .unique();

    // Resolve attachment URLs
    const attachments = msg.attachments
      ? await Promise.all(
          msg.attachments.map(async (att) => ({
            ...att,
            url: (await ctx.storage.getUrl(att.storageId)) ?? null,
          }))
        )
      : undefined;

    return {
      ...msg,
      userName: user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
        : "Unknown",
      userImageUrl: user?.imageUrl ?? null,
      parentMessage: null as { content: string; userId: string; userName: string } | null,
      isSaved: !!saved,
      isOwn: msg.userId === identity.subject,
      attachments,
      threadReplyCount: 0,
      threadLatestRepliers: [] as { imageUrl?: string; name: string }[],
    };
  },
});

/**
 * Get all replies for a thread (by parent message ID).
 */
export const getThreadReplies = query({
  args: { parentMessageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const replies = await ctx.db
      .query("messages")
      .withIndex("by_parent_message", (q) =>
        q.eq("parentMessageId", args.parentMessageId)
      )
      .collect();

    // Sort ascending (oldest first)
    replies.sort((a, b) => a.createdAt - b.createdAt);

    // Batch fetch user profiles
    const userIds = new Set<string>();
    for (const msg of replies) {
      userIds.add(msg.userId);
    }

    const userMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string; clerkId: string }>();
    for (const userId of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .unique();
      if (user) {
        userMap.set(userId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          clerkId: user.clerkId,
        });
      }
    }

    // Check saved status
    const savedMessages = await ctx.db
      .query("savedMessages")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const savedMessageIds = new Set(savedMessages.map((s) => s.messageId));

    // Resolve attachment URLs
    const attachmentUrlMap = new Map<string, string>();
    for (const msg of replies) {
      if (msg.attachments) {
        for (const att of msg.attachments) {
          if (!attachmentUrlMap.has(att.storageId)) {
            const url = await ctx.storage.getUrl(att.storageId);
            if (url) attachmentUrlMap.set(att.storageId, url);
          }
        }
      }
    }

    return replies.map((msg) => {
      const user = userMap.get(msg.userId);
      return {
        ...msg,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
        parentMessage: null as { content: string; userId: string; userName: string } | null,
        isSaved: savedMessageIds.has(msg._id),
        isOwn: msg.userId === identity.subject,
        attachments: msg.attachments?.map((att) => ({
          ...att,
          url: attachmentUrlMap.get(att.storageId) ?? null,
        })),
        threadReplyCount: 0,
        threadLatestRepliers: [] as { imageUrl?: string; name: string }[],
      };
    });
  },
});

/**
 * Get all threads (parent messages with replies) in a channel.
 */
export const getChannelThreads = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get all messages in channel
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .collect();

    // Find parent messages that have at least 1 reply
    const parentIds = new Set<Id<"messages">>();
    for (const msg of messages) {
      if (msg.parentMessageId) {
        parentIds.add(msg.parentMessageId);
      }
    }

    // Get the parent messages and their thread metadata
    const threads: {
      parentMessage: typeof messages[0];
      replyCount: number;
      lastReplyAt: number;
    }[] = [];

    for (const parentId of parentIds) {
      const parent = messages.find((m) => m._id === parentId) ?? await ctx.db.get(parentId);
      if (!parent) continue;

      const replies = messages.filter((m) => m.parentMessageId === parentId);
      const lastReply = replies.length > 0
        ? Math.max(...replies.map((r) => r.createdAt))
        : parent.createdAt;

      threads.push({
        parentMessage: parent,
        replyCount: replies.length,
        lastReplyAt: lastReply,
      });
    }

    // Sort by most recent activity
    threads.sort((a, b) => b.lastReplyAt - a.lastReplyAt);

    // Enrich with user data
    const userIds = new Set(threads.map((t) => t.parentMessage.userId));
    const userMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string }>();
    for (const userId of userIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .unique();
      if (user) {
        userMap.set(userId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        });
      }
    }

    return threads.map((t) => {
      const user = userMap.get(t.parentMessage.userId);
      return {
        _id: t.parentMessage._id,
        content: t.parentMessage.content,
        userId: t.parentMessage.userId,
        createdAt: t.parentMessage.createdAt,
        channelId: t.parentMessage.channelId,
        userName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown",
        userImageUrl: user?.imageUrl ?? null,
        replyCount: t.replyCount,
        lastReplyAt: t.lastReplyAt,
      };
    });
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Send a new message to a channel.
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          name: v.string(),
          size: v.number(),
          type: v.string(),
        })
      )
    ),
    parentMessageId: v.optional(v.id("messages")),
    mentions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify membership in the workspace
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", channel.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();

    // If not a workspace member, check shared channel membership
    if (!membership) {
      const sharedMember = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", identity.subject)
        )
        .unique();
      if (!sharedMember) throw new Error("Not a member of this workspace");

      // Shared members can't send in read-only channels
      if (channel.permissions === "readOnly") {
        throw new Error("This channel is read-only");
      }
    } else {
      // Check private channel access for workspace members
      const category = await ctx.db.get(channel.categoryId);
      const isChannelPrivate = channel.isPrivate || category?.isPrivate;
      if (isChannelPrivate && membership.role !== "admin") {
        const channelMember = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel_and_user", (q) =>
            q.eq("channelId", args.channelId).eq("userId", identity.subject)
          )
          .unique();
        if (!channelMember) {
          throw new Error("Not a member of this private channel");
        }
      }

      // Check channel permissions for workspace members
      if (channel.permissions === "readOnly" && membership.role !== "admin") {
        throw new Error("This channel is read-only");
      }
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId: identity.subject,
      content: args.content,
      attachments: args.attachments,
      parentMessageId: args.parentMessageId,
      mentions: args.mentions,
      createdAt: Date.now(),
    });

    // Update read status for sender
    const existingReadStatus = await ctx.db
      .query("channelReadStatus")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", identity.subject)
      )
      .unique();

    if (existingReadStatus) {
      await ctx.db.patch(existingReadStatus._id, { lastReadAt: Date.now() });
    } else {
      await ctx.db.insert("channelReadStatus", {
        channelId: args.channelId,
        userId: identity.subject,
        lastReadAt: Date.now(),
      });
    }

    return messageId;
  },
});

/**
 * Edit own message.
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.userId !== identity.subject) {
      throw new Error("You can only edit your own messages");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      editedAt: Date.now(),
    });
  },
});

/**
 * Delete own message.
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.userId !== identity.subject) {
      throw new Error("You can only delete your own messages");
    }

    // Delete associated saved messages
    const saved = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", identity.subject).eq("messageId", args.messageId)
      )
      .collect();
    for (const s of saved) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.delete(args.messageId);
  },
});

/**
 * Toggle emoji reaction on a message.
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions ?? [];
    const existingIdx = reactions.findIndex(
      (r) => r.userId === identity.subject && r.emoji === args.emoji
    );

    if (existingIdx !== -1) {
      // Remove reaction
      reactions.splice(existingIdx, 1);
    } else {
      // Add reaction
      reactions.push({ userId: identity.subject, emoji: args.emoji });
    }

    await ctx.db.patch(args.messageId, { reactions });
  },
});

/**
 * Toggle pin status on a message (admin only).
 */
export const pinMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Get channel to find workspace
    const channelId = message.channelId;
    if (!channelId) throw new Error("Not a channel message");

    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", channel.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can pin messages");
    }

    await ctx.db.patch(args.messageId, { pinned: !message.pinned });
  },
});

/**
 * Toggle saved status for a message.
 */
export const toggleSaveMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", identity.subject).eq("messageId", args.messageId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    } else {
      await ctx.db.insert("savedMessages", {
        userId: identity.subject,
        messageId: args.messageId,
        savedAt: Date.now(),
      });
      return { saved: true };
    }
  },
});

/**
 * Forward a message to another channel.
 */
export const forwardMessage = mutation({
  args: {
    messageId: v.id("messages"),
    targetChannelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const originalMessage = await ctx.db.get(args.messageId);
    if (!originalMessage) throw new Error("Message not found");

    const targetChannel = await ctx.db.get(args.targetChannelId);
    if (!targetChannel) throw new Error("Target channel not found");

    // Verify membership in target workspace
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", targetChannel.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member of the target workspace");

    // Get source channel name for display
    let channelName: string | undefined;
    if (originalMessage.channelId) {
      const sourceChannel = await ctx.db.get(originalMessage.channelId);
      channelName = sourceChannel?.name;
    }

    // Get original author name
    const originalUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", originalMessage.userId))
      .unique();

    await ctx.db.insert("messages", {
      channelId: args.targetChannelId,
      userId: identity.subject,
      content: originalMessage.content,
      attachments: originalMessage.attachments,
      createdAt: Date.now(),
      forwardedFrom: {
        messageId: args.messageId,
        channelId: originalMessage.channelId,
        channelName,
        userName: originalUser
          ? [originalUser.firstName, originalUser.lastName]
              .filter(Boolean)
              .join(" ")
          : undefined,
      },
    });
  },
});

/**
 * Mute a channel.
 */
export const muteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if already muted
    const existing = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", identity.subject).eq("channelId", args.channelId)
      )
      .unique();

    if (existing) return; // Already muted

    await ctx.db.insert("mutedChannels", {
      userId: identity.subject,
      channelId: args.channelId,
      mutedAt: Date.now(),
    });
  },
});

/**
 * Unmute a channel.
 */
export const unmuteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user_and_channel", (q) =>
        q.eq("userId", identity.subject).eq("channelId", args.channelId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Mark a channel as read.
 */
export const markChannelRead = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("channelReadStatus")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", identity.subject)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadAt: Date.now() });
    } else {
      await ctx.db.insert("channelReadStatus", {
        channelId: args.channelId,
        userId: identity.subject,
        lastReadAt: Date.now(),
      });
    }
  },
});

/**
 * Generate an upload URL for file attachments.
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});
