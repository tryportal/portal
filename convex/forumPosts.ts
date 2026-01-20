import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has access to a forum channel
 */
async function checkForumChannelAccess(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: { get: Function; query: Function } },
  channelId: Id<"channels">
): Promise<{
  userId: string;
  channel: Doc<"channels">;
  membership: Doc<"organizationMembers"> | null;
  isAdmin: boolean;
  isExternalMember: boolean;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userId = identity.subject;
  const channel = await ctx.db.get(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  // Verify this is a forum channel
  if (channel.channelType !== "forum") {
    throw new Error("This is not a forum channel");
  }

  // Check organization membership first
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_and_user", (q: { eq: Function }) =>
      q.eq("organizationId", channel.organizationId).eq("userId", userId)
    )
    .first();

  if (membership) {
    const isAdmin = membership.role === "admin";

    // Check private channel access for org members
    if (channel.isPrivate && !isAdmin) {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q: { eq: Function }) =>
          q.eq("channelId", channelId).eq("userId", userId)
        )
        .first();

      if (!channelMember) {
        throw new Error("You don't have access to this private channel");
      }
    }

    return { userId, channel, membership, isAdmin, isExternalMember: false };
  }

  // Check if user is a shared channel member (external access)
  const sharedMember = await ctx.db
    .query("sharedChannelMembers")
    .withIndex("by_channel_and_user", (q: { eq: Function }) =>
      q.eq("channelId", channelId).eq("userId", userId)
    )
    .first();

  if (sharedMember) {
    return { userId, channel, membership: null, isAdmin: false, isExternalMember: true };
  }

  throw new Error("Not a member of this organization or channel");
}

/**
 * Check if user can create posts in a forum channel
 */
function canCreatePost(
  channel: Doc<"channels">,
  isAdmin: boolean
): boolean {
  const whoCanPost = channel.forumSettings?.whoCanPost ?? "everyone";
  
  if (whoCanPost === "admins") {
    return isAdmin;
  }
  
  return true; // "everyone" can post
}

/**
 * Check if user can modify a post (author or admin)
 */
function canModifyPost(
  post: Doc<"forumPosts">,
  userId: string,
  isAdmin: boolean
): boolean {
  return post.authorId === userId || isAdmin;
}

// ============================================================================
// Forum Post Queries
// ============================================================================

/**
 * Get all posts for a forum channel with pagination
 * Sorted by: pinned first, then by lastActivityAt desc
 */
export const getPosts = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // lastActivityAt timestamp for cursor-based pagination
    statusFilter: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("solved"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { posts: [], nextCursor: null, hasMore: false };

    // Get channel and verify access
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return { posts: [], nextCursor: null, hasMore: false };

    // Verify this is a forum channel
    if (channel.channelType !== "forum") {
      return { posts: [], nextCursor: null, hasMore: false };
    }

    // Check organization membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    // If not an org member, check for shared channel access
    if (!membership) {
      const sharedMember = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", identity.subject)
        )
        .first();
      
      if (!sharedMember) {
        return { posts: [], nextCursor: null, hasMore: false };
      }
    }

    const limit = args.limit ?? 20;
    const statusFilter = args.statusFilter ?? "all";

    // Get all posts for the channel
    let allPosts = await ctx.db
      .query("forumPosts")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    // Apply status filter
    if (statusFilter !== "all") {
      allPosts = allPosts.filter((post) => post.status === statusFilter);
    }

    // Sort: pinned first, then by lastActivityAt desc
    allPosts.sort((a, b) => {
      // Pinned posts first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by last activity (most recent first)
      return b.lastActivityAt - a.lastActivityAt;
    });

    // Apply cursor-based pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = allPosts.findIndex(
        (post) => !post.isPinned && post.lastActivityAt < args.cursor!
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex;
      } else {
        // Cursor is beyond all posts
        return { posts: [], nextCursor: null, hasMore: false };
      }
    }

    // Get the page of posts
    const postsPage = allPosts.slice(startIndex, startIndex + limit + 1);
    const hasMore = postsPage.length > limit;
    const posts = hasMore ? postsPage.slice(0, limit) : postsPage;
    const nextCursor = hasMore ? posts[posts.length - 1]?.lastActivityAt : null;

    return { posts, nextCursor, hasMore };
  },
});

/**
 * Get a single post by ID
 */
export const getPost = query({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    // Get channel and verify access
    const channel = await ctx.db.get(post.channelId);
    if (!channel) return null;

    // Check organization membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    // If not an org member, check for shared channel access
    if (!membership) {
      const sharedMember = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", post.channelId).eq("userId", identity.subject)
        )
        .first();
      
      if (!sharedMember) {
        return null;
      }
    }

    return {
      post,
      channel,
      membership,
      isAdmin: membership?.role === "admin" || false,
      isAuthor: post.authorId === identity.subject,
    };
  },
});

/**
 * Get comments for a forum post with pagination
 */
export const getPostComments = query({
  args: {
    postId: v.id("forumPosts"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp for cursor-based pagination
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { comments: [], nextCursor: null, hasMore: false };

    const post = await ctx.db.get(args.postId);
    if (!post) return { comments: [], nextCursor: null, hasMore: false };

    // Get channel and verify access
    const channel = await ctx.db.get(post.channelId);
    if (!channel) return { comments: [], nextCursor: null, hasMore: false };

    // Check organization membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    // If not an org member, check for shared channel access
    if (!membership) {
      const sharedMember = await ctx.db
        .query("sharedChannelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", post.channelId).eq("userId", identity.subject)
        )
        .first();
      
      if (!sharedMember) {
        return { comments: [], nextCursor: null, hasMore: false };
      }
    }

    const limit = args.limit ?? 50;

    // Get comments for the post
    let commentsQuery = ctx.db
      .query("messages")
      .withIndex("by_forum_post_and_created", (q) => q.eq("forumPostId", args.postId));

    // If we have a cursor, filter to get older messages
    if (args.cursor) {
      commentsQuery = commentsQuery.filter((q) =>
        q.lt(q.field("createdAt"), args.cursor!)
      );
    }

    // Get one extra to check if there are more
    const comments = await commentsQuery
      .order("desc")
      .take(limit + 1);

    const hasMore = comments.length > limit;
    const resultComments = hasMore ? comments.slice(0, limit) : comments;
    
    // Reverse to show oldest first (chat order)
    resultComments.reverse();

    const nextCursor = hasMore ? resultComments[0]?.createdAt : null;

    return { comments: resultComments, nextCursor, hasMore };
  },
});

// ============================================================================
// Forum Post Mutations
// ============================================================================

/**
 * Create a new forum post
 */
export const createPost = mutation({
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
    linkEmbed: v.optional(v.object({
      url: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      favicon: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, channel, isAdmin } = await checkForumChannelAccess(ctx, args.channelId);

    // Check if user can create posts
    if (!canCreatePost(channel, isAdmin)) {
      throw new Error("Only admins can create posts in this forum");
    }

    // Validate title
    if (!args.title.trim()) {
      throw new Error("Post title cannot be empty");
    }

    if (args.title.length > 200) {
      throw new Error("Post title must be 200 characters or less");
    }

    const now = Date.now();

    const postId = await ctx.db.insert("forumPosts", {
      channelId: args.channelId,
      title: args.title.trim(),
      content: args.content,
      authorId: userId,
      status: "open",
      isPinned: false,
      createdAt: now,
      lastActivityAt: now,
      commentCount: 0,
      attachments: args.attachments,
      linkEmbed: args.linkEmbed,
    });

    return postId;
  },
});

/**
 * Update a forum post's title and/or content
 */
export const updatePost = mutation({
  args: {
    postId: v.id("forumPosts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    // Check if user can modify this post
    if (!canModifyPost(post, userId, isAdmin)) {
      throw new Error("You don't have permission to edit this post");
    }

    const updates: Partial<Doc<"forumPosts">> = {};

    if (args.title !== undefined) {
      if (!args.title.trim()) {
        throw new Error("Post title cannot be empty");
      }
      if (args.title.length > 200) {
        throw new Error("Post title must be 200 characters or less");
      }
      updates.title = args.title.trim();
    }

    if (args.content !== undefined) {
      updates.content = args.content;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.postId, updates);
    }

    return args.postId;
  },
});

/**
 * Delete a forum post and all its comments
 */
export const deletePost = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    // Check if user can modify this post
    if (!canModifyPost(post, userId, isAdmin)) {
      throw new Error("You don't have permission to delete this post");
    }

    // Delete all comments for this post
    const comments = await ctx.db
      .query("messages")
      .withIndex("by_forum_post", (q) => q.eq("forumPostId", args.postId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete the post
    await ctx.db.delete(args.postId);

    return { success: true };
  },
});

/**
 * Close a forum post (prevents new comments)
 */
export const closePost = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    // Check if user can modify this post
    if (!canModifyPost(post, userId, isAdmin)) {
      throw new Error("You don't have permission to close this post");
    }

    await ctx.db.patch(args.postId, { status: "closed" });

    return { success: true };
  },
});

/**
 * Reopen a closed forum post
 */
export const reopenPost = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    // Check if user can modify this post
    if (!canModifyPost(post, userId, isAdmin)) {
      throw new Error("You don't have permission to reopen this post");
    }

    // Reopen as "open" (remove solved status if it was solved)
    await ctx.db.patch(args.postId, { 
      status: "open",
      solvedCommentId: undefined,
    });

    return { success: true };
  },
});

/**
 * Mark a forum post as solved, optionally with a specific answer comment
 */
export const markAsSolved = mutation({
  args: {
    postId: v.id("forumPosts"),
    solvedCommentId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    // Check if user can modify this post
    if (!canModifyPost(post, userId, isAdmin)) {
      throw new Error("You don't have permission to mark this post as solved");
    }

    // If a specific comment is marked as the solution, verify it belongs to this post
    if (args.solvedCommentId) {
      const comment = await ctx.db.get(args.solvedCommentId);
      if (!comment || comment.forumPostId !== args.postId) {
        throw new Error("Invalid solution comment");
      }
    }

    await ctx.db.patch(args.postId, { 
      status: "solved",
      solvedCommentId: args.solvedCommentId,
    });

    return { success: true };
  },
});

/**
 * Remove solved status from a forum post
 */
export const markAsUnsolved = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    // Check if user can modify this post
    if (!canModifyPost(post, userId, isAdmin)) {
      throw new Error("You don't have permission to modify this post");
    }

    await ctx.db.patch(args.postId, { 
      status: "open",
      solvedCommentId: undefined,
    });

    return { success: true };
  },
});

/**
 * Pin a forum post (admin only)
 */
export const pinPost = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    if (!isAdmin) {
      throw new Error("Only admins can pin posts");
    }

    await ctx.db.patch(args.postId, { isPinned: true });

    return { success: true };
  },
});

/**
 * Unpin a forum post (admin only)
 */
export const unpinPost = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    if (!isAdmin) {
      throw new Error("Only admins can unpin posts");
    }

    await ctx.db.patch(args.postId, { isPinned: false });

    return { success: true };
  },
});

/**
 * Send a comment to a forum post
 */
export const sendComment = mutation({
  args: {
    postId: v.id("forumPosts"),
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      size: v.number(),
      type: v.string(),
    }))),
    linkEmbed: v.optional(v.object({
      url: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      favicon: v.optional(v.string()),
    })),
    parentMessageId: v.optional(v.id("messages")),
    mentions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if post is closed
    if (post.status === "closed") {
      throw new Error("This post is closed. No new comments can be added.");
    }

    // Verify channel access (this also verifies it's a forum channel)
    await checkForumChannelAccess(ctx, post.channelId);

    // Validate parent message if provided (for reply threading)
    if (args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);
      if (!parentMessage || parentMessage.forumPostId !== args.postId) {
        throw new Error("Invalid parent message");
      }
    }

    const now = Date.now();

    // Create the comment
    const messageId = await ctx.db.insert("messages", {
      forumPostId: args.postId,
      userId,
      content: args.content,
      createdAt: now,
      attachments: args.attachments,
      linkEmbed: args.linkEmbed,
      parentMessageId: args.parentMessageId,
      mentions: args.mentions,
    });

    // Update post stats
    await ctx.db.patch(args.postId, {
      lastActivityAt: now,
      commentCount: post.commentCount + 1,
    });

    return messageId;
  },
});

/**
 * Delete a comment from a forum post
 */
export const deleteComment = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Comment not found");
    }

    if (!message.forumPostId) {
      throw new Error("This is not a forum comment");
    }

    const post = await ctx.db.get(message.forumPostId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    // Only the comment author or admin can delete
    if (message.userId !== userId && !isAdmin) {
      throw new Error("You don't have permission to delete this comment");
    }

    // If this comment was the solved answer, clear it
    if (post.solvedCommentId === args.messageId) {
      await ctx.db.patch(post._id, {
        solvedCommentId: undefined,
        status: "open",
      });
    }

    // Delete the comment
    await ctx.db.delete(args.messageId);

    // Update post comment count
    await ctx.db.patch(post._id, {
      commentCount: Math.max(0, post.commentCount - 1),
    });

    return { success: true };
  },
});

/**
 * Edit a comment in a forum post
 */
export const editComment = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Comment not found");
    }

    if (!message.forumPostId) {
      throw new Error("This is not a forum comment");
    }

    const post = await ctx.db.get(message.forumPostId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { isAdmin } = await checkForumChannelAccess(ctx, post.channelId);

    // Only the comment author or admin can edit
    if (message.userId !== userId && !isAdmin) {
      throw new Error("You don't have permission to edit this comment");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      editedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Toggle reaction on a forum comment
 */
export const toggleCommentReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Comment not found");
    }

    if (!message.forumPostId) {
      throw new Error("This is not a forum comment");
    }

    const post = await ctx.db.get(message.forumPostId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Verify channel access
    await checkForumChannelAccess(ctx, post.channelId);

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex(
      (r) => r.userId === userId && r.emoji === args.emoji
    );

    if (existingIndex !== -1) {
      // Remove the reaction
      reactions.splice(existingIndex, 1);
    } else {
      // Add the reaction
      reactions.push({ userId, emoji: args.emoji });
    }

    await ctx.db.patch(args.messageId, { reactions });

    return { success: true };
  },
});

/**
 * Get organization members for mention autocomplete in forum posts
 */
export const getForumMembers = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const channel = await ctx.db.get(args.channelId);
    if (!channel) return [];

    // Get organization members
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", channel.organizationId))
      .collect();

    return members.map((member) => ({
      userId: member.userId,
    }));
  },
});
