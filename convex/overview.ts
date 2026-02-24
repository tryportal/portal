import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function mentionsUser(
  mentions: string[] | undefined,
  userId: string
): boolean {
  return (
    mentions?.includes(userId) === true ||
    mentions?.includes("everyone") === true
  );
}

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
    const allChannels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter out muted channels
    const mutedEntries = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const mutedChannelIds = new Set(mutedEntries.map((m) => m.channelId));
    const channels = allChannels.filter((c) => !mutedChannelIds.has(c._id));

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
        if (mentionsUser(msg.mentions, identity.subject)) {
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
        let categorySlug: string | null = null;
        if (channel?.categoryId) {
          const cat = await ctx.db.get(channel.categoryId);
          if (cat) categorySlug = cat.name.toLowerCase().replace(/\s+/g, "-");
        }

        return {
          _id: msg._id,
          content: msg.content,
          createdAt: msg.createdAt,
          channelName: channel?.name ?? null,
          channelId: msg.channelId ?? null,
          categorySlug,
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
      let categorySlug: string | null = null;
      if (channel?.categoryId) {
        const cat = await ctx.db.get(channel.categoryId);
        if (cat) categorySlug = cat.name.toLowerCase().replace(/\s+/g, "-");
      }

      results.push({
        _id: msg._id,
        savedMessageId: s._id,
        content: msg.content,
        createdAt: msg.createdAt,
        savedAt: s.savedAt,
        channelName: channel?.name ?? null,
        channelId: msg.channelId,
        categorySlug,
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

    const allChannels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter out muted channels
    const mutedEntries = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const mutedChannelIds = new Set(mutedEntries.map((m) => m.channelId));
    const channels = allChannels.filter((c) => !mutedChannelIds.has(c._id));

    // Check if user has cleared their inbox
    const clearedEntry = await ctx.db
      .query("inboxClearedAt")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject).eq("organizationId", args.organizationId)
      )
      .unique();
    const clearedAt = clearedEntry?.clearedAt ?? 0;

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
          mentionsUser(msg.mentions, identity.subject) &&
          !readMessageIds.has(msg._id) &&
          msg.createdAt > clearedAt
        ) {
          count++;
        }
      }
    }

    return count;
  },
});

/**
 * Get all mentions for the current user in a workspace (for inbox page).
 */
export const getAllMentions = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return [];

    const allChannels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter out muted channels
    const mutedEntries = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const mutedChannelIds = new Set(mutedEntries.map((m) => m.channelId));
    const channels = allChannels.filter((c) => !mutedChannelIds.has(c._id));

    const channelMap = new Map(channels.map((c) => [c._id, c]));

    // Check if user has cleared their inbox
    const clearedEntry = await ctx.db
      .query("inboxClearedAt")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject).eq("organizationId", args.organizationId)
      )
      .unique();
    const clearedAt = clearedEntry?.clearedAt ?? 0;

    const readStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const readMessageIds = new Set(readStatuses.map((s) => s.messageId));

    const mentionMessages = [];
    for (const channel of channels) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_created", (q) =>
          q.eq("channelId", channel._id)
        )
        .order("desc")
        .take(100);

      for (const msg of messages) {
        if (
          mentionsUser(msg.mentions, identity.subject) &&
          msg.createdAt > clearedAt
        ) {
          mentionMessages.push(msg);
        }
      }
    }

    mentionMessages.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      mentionMessages.map(async (msg) => {
        const sender = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", msg.userId))
          .unique();

        const channel = msg.channelId ? channelMap.get(msg.channelId) : null;
        let categorySlug: string | null = null;
        if (channel?.categoryId) {
          const cat = await ctx.db.get(channel.categoryId);
          if (cat) categorySlug = cat.name.toLowerCase().replace(/\s+/g, "-");
        }

        return {
          _id: msg._id,
          content: msg.content,
          createdAt: msg.createdAt,
          channelName: channel?.name ?? null,
          channelId: msg.channelId ?? null,
          categorySlug,
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
 * Get all saved messages for the current user in a workspace.
 */
export const getAllSavedMessages = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return [];

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const channelIds = new Set(channels.map((c) => c._id));
    const channelMap = new Map(channels.map((c) => [c._id, c]));

    const saved = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_saved", (q) =>
        q.eq("userId", identity.subject)
      )
      .order("desc")
      .take(100);

    const results = [];
    for (const s of saved) {
      const msg = await ctx.db.get(s.messageId);
      if (!msg || !msg.channelId) continue;
      if (!channelIds.has(msg.channelId)) continue;

      const sender = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", msg.userId))
        .unique();

      const channel = channelMap.get(msg.channelId);
      let categorySlug: string | null = null;
      if (channel?.categoryId) {
        const cat = await ctx.db.get(channel.categoryId);
        if (cat) categorySlug = cat.name.toLowerCase().replace(/\s+/g, "-");
      }

      results.push({
        _id: msg._id,
        savedMessageId: s._id,
        content: msg.content,
        createdAt: msg.createdAt,
        savedAt: s.savedAt,
        channelName: channel?.name ?? null,
        channelId: msg.channelId,
        categorySlug,
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
 * Get all muted channel IDs for the current user.
 */
export const getMutedChannelIds = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const mutedEntries = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return mutedEntries.map((m) => m.channelId);
  },
});

/**
 * Mark all unread mentions as read for the current user in a workspace.
 */
export const markAllMentionsRead = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return;

    const allChannels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter out muted channels
    const mutedEntries = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const mutedChannelIds = new Set(mutedEntries.map((m) => m.channelId));
    const channels = allChannels.filter((c) => !mutedChannelIds.has(c._id));

    const readStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const readMessageIds = new Set(readStatuses.map((s) => s.messageId));

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
          mentionsUser(msg.mentions, identity.subject) &&
          !readMessageIds.has(msg._id)
        ) {
          await ctx.db.insert("mentionReadStatus", {
            userId: identity.subject,
            messageId: msg._id,
            readAt: Date.now(),
          });
        }
      }
    }
  },
});

/**
 * Clear all inbox notifications by setting a clearedAt timestamp.
 * Mentions created before this timestamp will be hidden.
 */
export const clearAllNotifications = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("inboxClearedAt")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject).eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { clearedAt: Date.now() });
    } else {
      await ctx.db.insert("inboxClearedAt", {
        userId: identity.subject,
        organizationId: args.organizationId,
        clearedAt: Date.now(),
      });
    }
  },
});

/**
 * Get combined unread inbox count (mentions + DMs) for badge display.
 */
export const getUnreadInboxCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { mentions: 0, dms: 0 };

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .unique();
    if (!membership) return { mentions: 0, dms: 0 };

    // --- Unread mentions ---
    const allChannels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const mutedEntries = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const mutedChannelIds = new Set(mutedEntries.map((m) => m.channelId));
    const channels = allChannels.filter((c) => !mutedChannelIds.has(c._id));

    const clearedEntry = await ctx.db
      .query("inboxClearedAt")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject).eq("organizationId", args.organizationId)
      )
      .unique();
    const clearedAt = clearedEntry?.clearedAt ?? 0;

    const readStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const readMessageIds = new Set(readStatuses.map((s) => s.messageId));

    let mentionCount = 0;
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
          mentionsUser(msg.mentions, identity.subject) &&
          !readMessageIds.has(msg._id) &&
          msg.createdAt > clearedAt
        ) {
          mentionCount++;
        }
      }
    }

    // --- Unread DMs ---
    const userId = identity.subject;
    const asP1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", userId))
      .collect();
    const asP2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", userId))
      .collect();
    const allConvs = [...asP1, ...asP2];

    const convReadStatuses = await ctx.db
      .query("conversationReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const convReadMap = new Map(convReadStatuses.map((rs) => [rs.conversationId, rs.lastReadAt]));

    let dmCount = 0;
    for (const conv of allConvs) {
      const lastReadAt = convReadMap.get(conv._id) ?? 0;
      if (conv.lastMessageAt > lastReadAt) {
        dmCount++;
      }
    }

    return { mentions: mentionCount, dms: dmCount };
  },
});
