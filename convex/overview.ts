import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the 3 most recent messages where the current user is mentioned
 * within a given workspace (across all channels in that workspace).
 */
export const getRecentMentions = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return [];

    // Get all channels in this workspace
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const channelIds = new Set(channels.map((c) => c._id));
    const channelMap = new Map(channels.map((c) => [c._id, c]));

    // Get read mention statuses for the user
    const readStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const readMessageIds = new Set(readStatuses.map((s) => s.messageId));

    // Scan recent messages across all channels looking for mentions of this user.
    // We collect from each channel and merge, taking the 3 most recent.
    const mentionMessages = [];

    for (const channel of channels) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_created", (q) =>
          q.eq("channelId", channel._id)
        )
        .order("desc")
        .take(50);

      for (const msg of messages) {
        if (msg.mentions?.includes(identity.subject)) {
          mentionMessages.push(msg);
        }
      }
    }

    // Sort by createdAt desc and take the first 3
    mentionMessages.sort((a, b) => b.createdAt - a.createdAt);
    const recent = mentionMessages.slice(0, 3);

    // Enrich with sender info and channel name
    const enriched = await Promise.all(
      recent.map(async (msg) => {
        const sender = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", msg.userId))
          .unique();

        const channel = msg.channelId ? channelMap.get(msg.channelId) : null;

        return {
          _id: msg._id,
          content: msg.content,
          createdAt: msg.createdAt,
          channelName: channel?.name ?? null,
          channelId: msg.channelId ?? null,
          isRead: readMessageIds.has(msg._id),
          sender: sender
            ? {
                firstName: sender.firstName ?? null,
                lastName: sender.lastName ?? null,
                imageUrl: sender.imageUrl ?? null,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get the 3 most recently saved messages for the current user,
 * scoped to a workspace (only messages from channels in that workspace).
 */
export const getRecentSavedMessages = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return [];

    // Get all channels in this workspace
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const channelIds = new Set(channels.map((c) => c._id));
    const channelMap = new Map(channels.map((c) => [c._id, c]));

    // Get saved messages for this user, sorted by most recently saved
    const saved = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_saved", (q) =>
        q.eq("userId", identity.subject)
      )
      .order("desc")
      .take(20);

    // Filter to only messages in this workspace's channels and take 3
    const results = [];
    for (const s of saved) {
      if (results.length >= 3) break;

      const msg = await ctx.db.get(s.messageId);
      if (!msg || !msg.channelId) continue;
      if (!channelIds.has(msg.channelId)) continue;

      const sender = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", msg.userId))
        .unique();

      const channel = channelMap.get(msg.channelId);

      results.push({
        _id: msg._id,
        savedMessageId: s._id,
        content: msg.content,
        createdAt: msg.createdAt,
        savedAt: s.savedAt,
        channelName: channel?.name ?? null,
        channelId: msg.channelId,
        sender: sender
          ? {
              firstName: sender.firstName ?? null,
              lastName: sender.lastName ?? null,
              imageUrl: sender.imageUrl ?? null,
            }
          : null,
      });
    }

    return results;
  },
});

/**
 * Get the total count of unread mentions for badge display.
 */
export const getUnreadMentionCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return 0;

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const readStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const readMessageIds = new Set(readStatuses.map((s) => s.messageId));

    let count = 0;
    for (const channel of channels) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_created", (q) =>
          q.eq("channelId", channel._id)
        )
        .order("desc")
        .take(50);

      for (const msg of messages) {
        if (
          msg.mentions?.includes(identity.subject) &&
          !readMessageIds.has(msg._id)
        ) {
          count++;
        }
      }
    }

    return count;
  },
});
