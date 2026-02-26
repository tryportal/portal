import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get paginated forum posts for a channel.
 * Returns posts with author info, sorted by pinned first then last activity.
 */
export const getForumPosts = query({
  args: {
    channelId: v.id("channels"),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("solved"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };

    // Verify channel access
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return { page: [], isDone: true, continueCursor: "" };

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return { page: [], isDone: true, continueCursor: "" };

    // Check private channel access
    if (channel.isPrivate && membership.role !== "admin") {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", identity.subject)
        )
        .unique();
      if (!channelMember) return { page: [], isDone: true, continueCursor: "" };
    }

    let results;
    if (args.status) {
      results = await ctx.db
        .query("forumPosts")
        .withIndex("by_channel_and_status", (q) =>
          q.eq("channelId", args.channelId).eq("status", args.status!)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      results = await ctx.db
        .query("forumPosts")
        .withIndex("by_channel_and_last_activity", (q) =>
          q.eq("channelId", args.channelId)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Batch fetch author profiles
    const authorIds = new Set<string>();
    for (const post of results.page) {
      authorIds.add(post.authorId);
    }

    const authorMap = new Map<string, { firstName?: string; lastName?: string; imageUrl?: string }>();
    for (const authorId of authorIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", authorId))
        .unique();
      if (user) {
        authorMap.set(authorId, {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        });
      }
    }

    const enrichedPage = results.page.map((post) => {
      const author = authorMap.get(post.authorId);
      const authorName = author
        ? [author.firstName, author.lastName].filter(Boolean).join(" ") || "Unknown"
        : "Unknown";
      return {
        ...post,
        authorName,
        authorImageUrl: author?.imageUrl ?? null,
      };
    });

    return {
      ...results,
      page: enrichedPage,
    };
  },
});

/**
 * Get a single forum post with full details and author info.
 */
export const getForumPost = query({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    // Verify channel access
    const channel = await ctx.db.get(post.channelId);
    if (!channel) return null;

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return null;

    if (channel.isPrivate && membership.role !== "admin") {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", post.channelId).eq("userId", identity.subject)
        )
        .unique();
      if (!channelMember) return null;
    }

    const author = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", post.authorId))
      .unique();

    const authorName = author
      ? [author.firstName, author.lastName].filter(Boolean).join(" ") || "Unknown"
      : "Unknown";

    return {
      ...post,
      authorName,
      authorImageUrl: author?.imageUrl ?? null,
      isOwn: post.authorId === identity.subject,
      isAdmin: membership.role === "admin",
    };
  },
});

/**
 * Get paginated comments for a forum post.
 * Comments are messages with forumPostId set.
 */
export const getForumComments = query({
  args: {
    postId: v.id("forumPosts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };

    const post = await ctx.db.get(args.postId);
    if (!post) return { page: [], isDone: true, continueCursor: "" };

    const channel = await ctx.db.get(post.channelId);
    if (!channel) return { page: [], isDone: true, continueCursor: "" };

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return { page: [], isDone: true, continueCursor: "" };

    const results = await ctx.db
      .query("messages")
      .withIndex("by_forum_post_and_created", (q) =>
        q.eq("forumPostId", args.postId)
      )
      .order("asc")
      .paginate(args.paginationOpts);

    // Batch fetch user profiles
    const userIds = new Set<string>();
    for (const msg of results.page) {
      userIds.add(msg.userId);
    }

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
    const savedSet = new Set(savedMessages.map((s) => s.messageId));

    const enrichedPage = results.page.map((msg) => {
      const user = userMap.get(msg.userId);
      const userName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
        : "Unknown";
      return {
        ...msg,
        userName,
        userImageUrl: user?.imageUrl ?? null,
        isSaved: savedSet.has(msg._id),
        isOwn: msg.userId === identity.subject,
        parentMessage: null,
      };
    });

    return {
      ...results,
      page: enrichedPage,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new forum post.
 */
export const createForumPost = mutation({
  args: {
    channelId: v.id("channels"),
    title: v.string(),
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      size: v.number(),
      type: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member");

    // Check forum post permissions
    if (channel.forumSettings?.whoCanPost === "admins" && membership.role !== "admin") {
      throw new Error("Only admins can create posts in this forum");
    }

    // Check read-only
    if (channel.permissions === "readOnly" && membership.role !== "admin") {
      throw new Error("This channel is read-only");
    }

    const now = Date.now();
    const postId = await ctx.db.insert("forumPosts", {
      channelId: args.channelId,
      title: args.title.trim(),
      content: args.content,
      authorId: identity.subject,
      status: "open",
      createdAt: now,
      lastActivityAt: now,
      commentCount: 0,
      attachments: args.attachments,
    });

    return postId;
  },
});

/**
 * Update a forum post (title, content, status).
 */
export const updateForumPost = mutation({
  args: {
    postId: v.id("forumPosts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const channel = await ctx.db.get(post.channelId);
    if (!channel) throw new Error("Channel not found");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member");

    // Only author or admin can edit
    if (post.authorId !== identity.subject && membership.role !== "admin") {
      throw new Error("Not authorized to edit this post");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.content !== undefined) updates.content = args.content;

    await ctx.db.patch(args.postId, updates);
  },
});

/**
 * Delete a forum post and all its comments.
 */
export const deleteForumPost = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const channel = await ctx.db.get(post.channelId);
    if (!channel) throw new Error("Channel not found");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member");

    // Only author or admin can delete
    if (post.authorId !== identity.subject && membership.role !== "admin") {
      throw new Error("Not authorized to delete this post");
    }

    // Delete all comments (messages with this forumPostId)
    const comments = await ctx.db
      .query("messages")
      .withIndex("by_forum_post", (q) => q.eq("forumPostId", args.postId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(args.postId);
  },
});

/**
 * Update forum post status (open/closed/solved).
 */
export const updatePostStatus = mutation({
  args: {
    postId: v.id("forumPosts"),
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("solved")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const channel = await ctx.db.get(post.channelId);
    if (!channel) throw new Error("Channel not found");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member");

    // Only author or admin can change status
    if (post.authorId !== identity.subject && membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    const updates: Record<string, unknown> = { status: args.status };
    // Clear solved comment if changing away from solved
    if (args.status !== "solved") {
      updates.solvedCommentId = undefined;
    }

    await ctx.db.patch(args.postId, updates);
  },
});

/**
 * Toggle pin status for a forum post. Admin only.
 */
export const togglePinPost = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const channel = await ctx.db.get(post.channelId);
    if (!channel) throw new Error("Channel not found");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.postId, {
      isPinned: post.isPinned ? undefined : true,
    });
  },
});

/**
 * Mark a comment as the solved answer.
 */
export const markSolvedComment = mutation({
  args: {
    postId: v.id("forumPosts"),
    commentId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const channel = await ctx.db.get(post.channelId);
    if (!channel) throw new Error("Channel not found");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member");

    // Only post author or admin can mark as solved
    if (post.authorId !== identity.subject && membership.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Verify the comment belongs to this post
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.forumPostId !== args.postId) {
      throw new Error("Comment not found on this post");
    }

    // Toggle: if already marked, unmark
    if (post.solvedCommentId === args.commentId) {
      await ctx.db.patch(args.postId, {
        status: "open",
        solvedCommentId: undefined,
      });
    } else {
      await ctx.db.patch(args.postId, {
        status: "solved",
        solvedCommentId: args.commentId,
      });
    }
  },
});

/**
 * Send a comment on a forum post.
 */
export const sendForumComment = mutation({
  args: {
    postId: v.id("forumPosts"),
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      size: v.number(),
      type: v.string(),
    }))),
    mentions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const channel = await ctx.db.get(post.channelId);
    if (!channel) throw new Error("Channel not found");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) throw new Error("Not a member");

    // Check read-only
    if (channel.permissions === "readOnly" && membership.role !== "admin") {
      throw new Error("This channel is read-only");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      forumPostId: args.postId,
      userId: identity.subject,
      content: args.content,
      attachments: args.attachments,
      createdAt: now,
      mentions: args.mentions,
    });

    // Update post's comment count and last activity
    await ctx.db.patch(args.postId, {
      commentCount: post.commentCount + 1,
      lastActivityAt: now,
    });

    return messageId;
  },
});
