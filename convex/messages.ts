import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// Typing indicator expiry time in milliseconds (3 seconds)
const TYPING_EXPIRY_MS = 3000;

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Link embed type for Open Graph metadata
export interface LinkEmbed {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function checkChannelAccess(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: { get: Function; query: Function } },
  channelId: Id<"channels">
): Promise<{
  userId: string;
  channel: Doc<"channels">;
  membership: Doc<"organizationMembers">;
  isAdmin: boolean;
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

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_and_user", (q: { eq: Function }) =>
      q.eq("organizationId", channel.organizationId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  const isAdmin = membership.role === "admin";

  // Check private channel access
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

  return { userId, channel, membership, isAdmin };
}

// ============================================================================
// Message Queries
// ============================================================================

/**
 * Get messages for a channel with pagination, ordered by creation time (newest first for initial load)
 */
export const getMessages = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp for cursor-based pagination
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { messages: [], nextCursor: null, hasMore: false };

    // Get channel and verify membership
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return { messages: [], nextCursor: null, hasMore: false };

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return { messages: [], nextCursor: null, hasMore: false };

    const limit = args.limit ?? 50; // Default to 50 messages

    // Get messages ordered by creation time
    let messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) => q.eq("channelId", args.channelId));

    // If we have a cursor, filter to get older messages
    if (args.cursor) {
      messagesQuery = messagesQuery.filter((q) =>
        q.lt(q.field("createdAt"), args.cursor!)
      );
    }

    // Get one extra to check if there are more
    const messages = await messagesQuery
      .order("desc")
      .take(limit + 1);

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // Reverse to get chronological order for display
    const chronologicalMessages = resultMessages.reverse();

    // Next cursor is the oldest message's createdAt
    const nextCursor = hasMore && resultMessages.length > 0
      ? resultMessages[resultMessages.length - 1].createdAt
      : null;

    return {
      messages: chronologicalMessages,
      nextCursor,
      hasMore
    };
  },
});

/**
 * Get a single message by ID
 */
export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Verify access based on message type
    if (message.channelId) {
      // Channel message - verify membership through channel
      const channel = await ctx.db.get(message.channelId);
      if (!channel) return null;

      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
        )
        .first();

      if (!membership) return null;
    } else if (message.conversationId) {
      // DM message - verify participant access
      const conversation = await ctx.db.get(message.conversationId);
      if (!conversation) return null;

      const userId = identity.subject;
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return null;
      }
    } else {
      return null; // Invalid message - no channelId or conversationId
    }

    return message;
  },
});

/**
 * Get recent messages for the current user (last 5)
 */
export const getRecentMessages = query({
  args: { organizationId: v.id("organizations"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 5;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get all channels in the organization
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const channelIds = channels.map((c) => c._id);

    // Get all messages from user in these channels
    const allMessages = await Promise.all(
      channelIds.map(async (channelId) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_channel_and_created", (q) => q.eq("channelId", channelId))
          .collect();

        return messages.filter((m) => m.userId === userId);
      })
    );

    // Flatten and sort by createdAt descending
    const flatMessages = allMessages.flat().sort((a, b) => b.createdAt - a.createdAt);

    // Return the most recent messages
    return flatMessages.slice(0, limit).map((m) => ({
      ...m,
      channelId: m.channelId,
    }));
  },
});

/**
 * Get messages where the current user was mentioned (last 5)
 * Mentions are detected by searching for @ symbol in message content
 * Note: This is a simple implementation. In production, you'd want to parse
 * actual @username mentions and match them against the user's name/handle
 */
export const getMentions = query({
  args: { organizationId: v.id("organizations"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 5;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get all channels in the organization
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get user's muted channels
    const mutedChannels = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mutedChannelIds = new Set(mutedChannels.map((m) => m.channelId));

    // Filter out muted channels
    const channelIds = channels
      .filter((c) => !mutedChannelIds.has(c._id))
      .map((c) => c._id);

    // Build possible display name variants for fallback detection
    const displayNameParts = [
      identity.name,
      identity.givenName && identity.familyName
        ? `${identity.givenName} ${identity.familyName}`
        : undefined,
      identity.givenName,
    ]
      .filter(Boolean)
      .map((name) => name!.toLowerCase());

    // Get all messages from these channels that mention the current user
    const allMessages = await Promise.all(
      channelIds.map(async (channelId) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_channel_and_created", (q) => q.eq("channelId", channelId))
          .collect();

        return messages.filter((m) => {
          // Structured mentions stored in the message document
          const hasStructuredMention = Array.isArray(m.mentions) && m.mentions.includes(userId);
          // Fallback for any legacy messages without the mentions array
          const hasLegacyMention = !m.mentions && m.content.includes(`@${userId}`);
          // Fallback for manual @name mentions (case-insensitive)
          const contentLower = m.content.toLowerCase();
          const hasNameMention = displayNameParts.some((name) =>
            contentLower.includes(`@${name}`)
          );

          return hasStructuredMention || hasLegacyMention || hasNameMention;
        });
      })
    );

    // Flatten and sort by createdAt descending
    const flatMessages = allMessages.flat().sort((a, b) => b.createdAt - a.createdAt);

    // Return the most recent mentions
    return flatMessages.slice(0, limit).map((m) => ({
      ...m,
      channelId: m.channelId,
    }));
  },
});

// ============================================================================
// Message Mutations
// ============================================================================

/**
 * Helper function to parse mentions from message content
 * Mentions are in the format @userId
 */
function parseMentions(content: string): string[] {
  const mentionRegex = /@(user_[a-zA-Z0-9]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }
  return mentions;
}

/**
 * Send a new message to a channel
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
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
  },
  handler: async (ctx, args) => {
    const { userId, channel, isAdmin } = await checkChannelAccess(ctx, args.channelId);

    // Check if channel is read-only and user is not admin
    if (channel.permissions === "readOnly" && !isAdmin) {
      throw new Error("Only admins can post in this read-only channel");
    }

    // Validate content
    if (!args.content.trim() && (!args.attachments || args.attachments.length === 0)) {
      throw new Error("Message must have content or attachments");
    }

    // Validate attachment sizes
    if (args.attachments) {
      for (const attachment of args.attachments) {
        if (attachment.size > MAX_FILE_SIZE) {
          throw new Error(`File "${attachment.name}" exceeds the 5MB limit`);
        }
      }
    }

    // If replying, verify parent message exists and is in the same channel
    let parentMessage: Doc<"messages"> | null = null;
    if (args.parentMessageId) {
      parentMessage = await ctx.db.get(args.parentMessageId);
      if (!parentMessage) {
        throw new Error("Parent message not found");
      }
      if (parentMessage.channelId !== args.channelId) {
        throw new Error("Cannot reply to a message in a different channel");
      }
    }

    // Parse mentions from content
    const mentions = parseMentions(args.content);

    // If replying, add the parent message author to mentions
    if (parentMessage && parentMessage.userId !== userId) {
      if (!mentions.includes(parentMessage.userId)) {
        mentions.push(parentMessage.userId);
      }
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId,
      content: args.content.trim(),
      attachments: args.attachments,
      linkEmbed: args.linkEmbed,
      createdAt: Date.now(),
      parentMessageId: args.parentMessageId,
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    // Clear typing indicator for this user in this channel
    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .first();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return messageId;
  },
});

/**
 * Edit a message
 */
export const editMessage = mutation({
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
      throw new Error("Message not found");
    }

    // Verify access based on message type
    let isAdmin = false;
    if (message.channelId) {
      // Channel message - check membership
      const channel = await ctx.db.get(message.channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", userId)
        )
        .first();

      if (!membership) {
        throw new Error("Not a member of this organization");
      }
      isAdmin = membership.role === "admin";
    } else if (message.conversationId) {
      // DM message - verify participant access
      const conversation = await ctx.db.get(message.conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new Error("Not a participant in this conversation");
      }
    } else {
      throw new Error("Invalid message");
    }

    const isOwner = message.userId === userId;

    if (!isOwner && !isAdmin) {
      throw new Error("Only message owner or admins can edit messages");
    }

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Message content cannot be empty");
    }

    // Parse mentions from content
    const mentions = parseMentions(args.content);

    await ctx.db.patch(args.messageId, {
      content: args.content.trim(),
      editedAt: Date.now(),
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    return args.messageId;
  },
});

/**
 * Delete a message (only owner can delete)
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify access based on message type
    if (message.channelId) {
      // Channel message - check membership
      const channel = await ctx.db.get(message.channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", userId)
        )
        .first();

      if (!membership) {
        throw new Error("Not a member of this organization");
      }
    } else if (message.conversationId) {
      // DM message - verify participant access
      const conversation = await ctx.db.get(message.conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new Error("Not a participant in this conversation");
      }
    } else {
      throw new Error("Invalid message");
    }

    const isOwner = message.userId === userId;

    if (!isOwner) {
      throw new Error("Only the message owner can delete messages");
    }

    // Delete attachments from storage
    if (message.attachments) {
      for (const attachment of message.attachments) {
        try {
          await ctx.storage.delete(attachment.storageId);
        } catch {
          // Ignore deletion errors for attachments
        }
      }
    }

    // Delete any saved message references
    const savedRefs = await ctx.db
      .query("savedMessages")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .collect();

    for (const savedRef of savedRefs) {
      await ctx.db.delete(savedRef._id);
    }

    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

// ============================================================================
// File Upload Functions
// ============================================================================

/**
 * Generate an upload URL for file attachments
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get the URL for a stored file
 */
export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get URLs for multiple stored files in a single batch query
 * This prevents N+1 query patterns when loading multiple attachments
 */
export const getBatchStorageUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map(async (storageId) => {
        const url = await ctx.storage.getUrl(storageId);
        return { storageId, url };
      })
    );
    // Return as a map for easy lookup
    return Object.fromEntries(urls.map(({ storageId, url }) => [storageId, url]));
  },
});

// ============================================================================
// Link Embed Functions
// ============================================================================

/**
 * Helper function to check if an IP address is in a private range
 * Blocks SSRF attacks by preventing requests to internal/private IPs
 */
function isPrivateIP(hostname: string): boolean {
  // Check if it's an IPv4 address
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Regex);

  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);

    // Validate octets are in valid range
    if (octets.some(octet => octet > 255)) {
      return true; // Invalid IP, treat as private
    }

    // Check private IP ranges
    // 10.0.0.0/8
    if (octets[0] === 10) return true;

    // 172.16.0.0/12
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;

    // 192.168.0.0/16
    if (octets[0] === 192 && octets[1] === 168) return true;

    // 127.0.0.0/8 (localhost)
    if (octets[0] === 127) return true;

    // 169.254.0.0/16 (link-local)
    if (octets[0] === 169 && octets[1] === 254) return true;

    // 0.0.0.0/8
    if (octets[0] === 0) return true;

    // 224.0.0.0/4 (multicast)
    if (octets[0] >= 224 && octets[0] <= 239) return true;

    // 240.0.0.0/4 (reserved)
    if (octets[0] >= 240) return true;

    return false;
  }

  // Check for IPv6 localhost and private ranges
  const lowerHostname = hostname.toLowerCase();
  if (
    lowerHostname === "localhost" ||
    lowerHostname === "::1" ||
    lowerHostname.startsWith("fc") || // fc00::/7 (unique local)
    lowerHostname.startsWith("fd") || // fc00::/7 (unique local)
    lowerHostname.startsWith("fe80:") || // fe80::/10 (link-local)
    lowerHostname === "::" // unspecified
  ) {
    return true;
  }

  return false;
}

/**
 * Fetch Open Graph metadata for a URL
 * Returns title, description, image, site name, and favicon
 * 
 * Note: This action has basic protection against abuse through URL validation,
 * SSRF protection, and timeouts. For production-grade rate limiting across
 * distributed instances, consider using @convex-dev/rate-limiter package.
 */
export const fetchLinkMetadata = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<LinkEmbed | null> => {
    try {
      // Basic authentication check - only authenticated users can fetch metadata
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return null;
      }

      // Validate URL
      const urlObj = new URL(args.url);

      // Only allow http/https
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return null;
      }

      // SSRF Protection: Block private IP addresses
      if (isPrivateIP(urlObj.hostname)) {
        return null;
      }

      // Fetch the page with timeout (5 seconds max to prevent slow-response DoS)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(args.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PortalBot/1.0; +https://portal.app)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        // Not HTML, return basic info
        return {
          url: args.url,
          title: urlObj.hostname,
          siteName: urlObj.hostname,
        };
      }

      const html = await response.text();

      // Parse meta tags using regex (lightweight approach)
      const getMetaContent = (property: string): string | undefined => {
        // Try og: first
        const ogMatch = html.match(
          new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, "i")
        ) || html.match(
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, "i")
        );
        if (ogMatch) return ogMatch[1];

        // Try twitter: cards
        const twitterMatch = html.match(
          new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`, "i")
        ) || html.match(
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:${property}["']`, "i")
        );
        if (twitterMatch) return twitterMatch[1];

        // Try standard meta tags
        const metaMatch = html.match(
          new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i")
        ) || html.match(
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, "i")
        );
        return metaMatch?.[1];
      };

      // Get title
      let title = getMetaContent("title");
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch?.[1];
      }

      // Get description
      const description = getMetaContent("description");

      // Get image
      let image = getMetaContent("image");
      if (image && !image.startsWith("http")) {
        // Make relative URLs absolute
        image = new URL(image, args.url).href;
      }

      // Get site name
      const siteName = getMetaContent("site_name") || urlObj.hostname;

      // Get favicon
      let favicon: string | undefined;
      const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
        || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
      if (faviconMatch) {
        favicon = faviconMatch[1];
        if (!favicon.startsWith("http")) {
          favicon = new URL(favicon, args.url).href;
        }
      } else {
        // Default to /favicon.ico
        favicon = `${urlObj.origin}/favicon.ico`;
      }

      return {
        url: args.url,
        title: title?.trim(),
        description: description?.trim(),
        image,
        siteName,
        favicon,
      };
    } catch {
      // Return null on any error
      return null;
    }
  },
});

// ============================================================================
// Typing Indicator Functions
// ============================================================================

/**
 * Set typing status for a user in a channel
 */
export const setTyping = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify channel access
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Upsert typing indicator
    const existingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .first();

    if (existingIndicator) {
      await ctx.db.patch(existingIndicator._id, {
        lastTypingAt: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        channelId: args.channelId,
        userId,
        lastTypingAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Clear typing status for a user in a channel
 */
export const clearTyping = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .first();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return { success: true };
  },
});

/**
 * Get users currently typing in a channel (query for internal use)
 */
export const getTypingUsersQuery = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { typingUsers: [], isAuthorized: false };

    const userId = identity.subject;

    // Verify channel access
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return { typingUsers: [], isAuthorized: false };

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return { typingUsers: [], isAuthorized: false };

    const now = Date.now();
    const typingIndicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    // Filter out expired indicators (older than 3 seconds) and exclude current user
    const activeTypingUsers: string[] = typingIndicators
      .filter((indicator) =>
        now - indicator.lastTypingAt < TYPING_EXPIRY_MS &&
        indicator.userId !== userId
      )
      .map((indicator) => indicator.userId);

    return { typingUsers: activeTypingUsers, isAuthorized: true };
  },
});

/**
 * Get users currently typing in a channel with user data
 */
export const getTypingUsers = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args): Promise<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }>> => {
    const result = await ctx.runQuery(api.messages.getTypingUsersQuery, {
      channelId: args.channelId,
    });

    if (!result.isAuthorized || result.typingUsers.length === 0) {
      return [];
    }

    // Fetch user data from local users table instead of Clerk API
    const usersData = await ctx.runQuery(api.users.getUserData, {
      userIds: result.typingUsers,
    });

    return usersData;
  },
});

/**
 * Get user data for a list of user IDs
 * Now uses local Convex users table instead of Clerk API
 */
export const getUserData = action({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args): Promise<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }>> => {
    if (args.userIds.length === 0) {
      return [];
    }

    // Fetch user data from local users table
    return await ctx.runQuery(api.users.getUserData, {
      userIds: args.userIds,
    });
  },
});

// ============================================================================
// New Chat Feature Mutations
// ============================================================================

/**
 * Forward a message to another channel or conversation (DM)
 * Either targetChannelId or targetConversationId must be provided (not both)
 * Returns forwarding info including target details for navigation
 */
export const forwardMessage = mutation({
  args: {
    messageId: v.id("messages"),
    targetChannelId: v.optional(v.id("channels")),
    targetConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate that exactly one target is provided
    if (!args.targetChannelId && !args.targetConversationId) {
      throw new Error("Must provide either a target channel or conversation");
    }
    if (args.targetChannelId && args.targetConversationId) {
      throw new Error("Cannot forward to both a channel and conversation");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check for same-location forwarding
    if (message.channelId && args.targetChannelId && message.channelId === args.targetChannelId) {
      throw new Error("Cannot forward a message to the same channel");
    }
    if (message.conversationId && args.targetConversationId && message.conversationId === args.targetConversationId) {
      throw new Error("Cannot forward a message to the same conversation");
    }

    // Build forwardedFrom metadata
    let forwardedFrom: {
      messageId: typeof args.messageId;
      channelId?: typeof message.channelId;
      conversationId?: typeof message.conversationId;
      channelName?: string;
      userName?: string;
    } = {
      messageId: args.messageId,
    };

    // Verify user has access to the source message and gather source info
    if (message.channelId) {
      const channel = await ctx.db.get(message.channelId);
      if (!channel) {
        throw new Error("Source channel not found");
      }
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", userId)
        )
        .first();
      if (!membership) {
        throw new Error("Not a member of the source organization");
      }
      
      // Store channel info for forwarding indicator
      forwardedFrom.channelId = message.channelId;
      forwardedFrom.channelName = channel.name;
    } else if (message.conversationId) {
      const conversation = await ctx.db.get(message.conversationId);
      if (!conversation) {
        throw new Error("Source conversation not found");
      }
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new Error("Not a participant in the source conversation");
      }
      
      // Get the other participant's name for the forwarding indicator
      const otherParticipantId = conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;
      
      const otherUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", otherParticipantId))
        .first();
      
      const userName = otherUser?.firstName && otherUser?.lastName
        ? `${otherUser.firstName} ${otherUser.lastName}`
        : otherUser?.firstName || "Unknown User";
      
      forwardedFrom.conversationId = message.conversationId;
      forwardedFrom.userName = userName;
    } else {
      throw new Error("Invalid source message");
    }

    // Forward to channel
    if (args.targetChannelId) {
      const { channel: targetChannel, isAdmin } = await checkChannelAccess(ctx, args.targetChannelId);

      // Check if target channel is read-only
      if (targetChannel.permissions === "readOnly" && !isAdmin) {
        throw new Error("Only admins can post in this read-only channel");
      }

      // Get category info for navigation
      const category = await ctx.db.get(targetChannel.categoryId);
      
      // Get organization for slug
      const organization = await ctx.db.get(targetChannel.organizationId);

      // Create new forwarded message in channel
      const forwardedMessageId = await ctx.db.insert("messages", {
        channelId: args.targetChannelId,
        userId,
        content: message.content,
        attachments: message.attachments,
        linkEmbed: message.linkEmbed,
        createdAt: Date.now(),
        forwardedFrom,
      });

      return {
        messageId: forwardedMessageId,
        targetType: "channel" as const,
        targetName: targetChannel.name,
        categoryName: category?.name || "general",
        organizationSlug: organization?.slug || "",
      };
    }

    // Forward to conversation (DM)
    if (args.targetConversationId) {
      const conversation = await ctx.db.get(args.targetConversationId);
      if (!conversation) {
        throw new Error("Target conversation not found");
      }

      // Verify user is a participant in the target conversation
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new Error("Not a participant in the target conversation");
      }

      // Get the other participant's name for the toast
      const otherParticipantId = conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;
      
      const otherUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", otherParticipantId))
        .first();
      
      const targetUserName = otherUser?.firstName && otherUser?.lastName
        ? `${otherUser.firstName} ${otherUser.lastName}`
        : otherUser?.firstName || "Unknown User";

      // Create new forwarded message in conversation
      const forwardedMessageId = await ctx.db.insert("messages", {
        conversationId: args.targetConversationId,
        userId,
        content: message.content,
        attachments: message.attachments,
        linkEmbed: message.linkEmbed,
        createdAt: Date.now(),
        forwardedFrom,
      });

      // Update conversation's lastMessageAt
      await ctx.db.patch(args.targetConversationId, {
        lastMessageAt: Date.now(),
      });

      return {
        messageId: forwardedMessageId,
        targetType: "conversation" as const,
        targetName: targetUserName,
        conversationId: args.targetConversationId,
      };
    }

    throw new Error("No target provided");
  },
});

/**
 * Add or remove a reaction (toggle)
 */
export const toggleReaction = mutation({
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
      throw new Error("Message not found");
    }

    // Verify access based on message type
    if (message.channelId) {
      // Channel message
      const channel = await ctx.db.get(message.channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", userId)
        )
        .first();

      if (!membership) {
        throw new Error("Not a member of this organization");
      }
    } else if (message.conversationId) {
      // DM message
      const conversation = await ctx.db.get(message.conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new Error("Not a participant in this conversation");
      }
    } else {
      throw new Error("Invalid message");
    }

    const currentReactions = message.reactions || [];
    const existingReactionIndex = currentReactions.findIndex(
      (r) => r.userId === userId && r.emoji === args.emoji
    );

    let newReactions;
    if (existingReactionIndex >= 0) {
      // Remove the reaction
      newReactions = currentReactions.filter((_, i) => i !== existingReactionIndex);
    } else {
      // Add the reaction
      newReactions = [...currentReactions, { userId, emoji: args.emoji }];
    }

    await ctx.db.patch(args.messageId, {
      reactions: newReactions.length > 0 ? newReactions : undefined,
    });

    return { success: true };
  },
});

/**
 * Pin or unpin a message (only for channel messages)
 */
export const togglePin = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Pinning is only for channel messages
    if (!message.channelId) {
      throw new Error("Can only pin channel messages");
    }

    // Verify membership and admin status
    const channel = await ctx.db.get(message.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Only admins can pin/unpin messages
    if (membership.role !== "admin") {
      throw new Error("Only admins can pin or unpin messages");
    }

    await ctx.db.patch(args.messageId, {
      pinned: !message.pinned,
    });

    return { success: true, pinned: !message.pinned };
  },
});

/**
 * Save a message for the current user
 */
export const saveMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify access based on message type
    if (message.channelId) {
      // Channel message
      const channel = await ctx.db.get(message.channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", userId)
        )
        .first();

      if (!membership) {
        throw new Error("Not a member of this organization");
      }
    } else if (message.conversationId) {
      // DM message
      const conversation = await ctx.db.get(message.conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new Error("Not a participant in this conversation");
      }
    } else {
      throw new Error("Invalid message");
    }

    // Check if already saved
    const existingSave = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId)
      )
      .first();

    if (existingSave) {
      throw new Error("Message already saved");
    }

    await ctx.db.insert("savedMessages", {
      userId,
      messageId: args.messageId,
      savedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Unsave a message for the current user
 */
export const unsaveMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const savedMessage = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId)
      )
      .first();

    if (!savedMessage) {
      throw new Error("Message not saved");
    }

    await ctx.db.delete(savedMessage._id);
    return { success: true };
  },
});

// ============================================================================
// New Chat Feature Queries
// ============================================================================

/**
 * Get pinned messages for a channel
 */
export const getPinnedMessages = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get channel and verify membership
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return [];

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return [];

    // Get all pinned messages for this channel
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("pinned"), true))
      .collect();

    return messages;
  },
});

/**
 * Get saved messages for the current user
 */
export const getSavedMessages = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 20;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get saved messages for this user, ordered by saved date
    const savedMessageRefs = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_saved", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // Fetch the actual messages
    const messages = await Promise.all(
      savedMessageRefs.map(async (ref) => {
        const message = await ctx.db.get(ref.messageId);
        if (!message) return null;

        // Only include channel messages (not DMs) and verify org membership
        if (!message.channelId) return null;

        const channel = await ctx.db.get(message.channelId);
        if (!channel || channel.organizationId !== args.organizationId) return null;

        return {
          ...message,
          savedAt: ref.savedAt,
        };
      })
    );

    return messages.filter((m): m is NonNullable<typeof m> => m !== null);
  },
});

/**
 * Check if a message is saved by the current user
 */
export const isMessageSaved = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const savedMessage = await ctx.db
      .query("savedMessages")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", identity.subject).eq("messageId", args.messageId)
      )
      .first();

    return !!savedMessage;
  },
});

/**
 * Get replies to a message
 */
export const getMessageReplies = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    // Verify access based on message type
    if (message.channelId) {
      // Channel message
      const channel = await ctx.db.get(message.channelId);
      if (!channel) return [];

      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", identity.subject)
        )
        .first();

      if (!membership) return [];
    } else if (message.conversationId) {
      // DM message
      const conversation = await ctx.db.get(message.conversationId);
      if (!conversation) return [];

      if (conversation.participant1Id !== identity.subject && conversation.participant2Id !== identity.subject) {
        return [];
      }
    } else {
      return [];
    }

    // Get all replies to this message
    const replies = await ctx.db
      .query("messages")
      .withIndex("by_parent_message", (q) => q.eq("parentMessageId", args.messageId))
      .collect();

    return replies;
  },
});

/**
 * Get organization members for mention autocomplete
 */
export const getOrganizationMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) return [];

    // Get all members of the organization
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    return members.map((m) => ({
      userId: m.userId,
      role: m.role,
    }));
  },
});

// ============================================================================
// Direct Message Functions
// ============================================================================

/**
 * Helper function to verify conversation access
 */
async function checkConversationAccess(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: { get: Function } },
  conversationId: Id<"conversations">
): Promise<{
  userId: string;
  conversation: Doc<"conversations">;
  otherParticipantId: string;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userId = identity.subject;
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Verify user is a participant
  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    throw new Error("Not a participant in this conversation");
  }

  const otherParticipantId = conversation.participant1Id === userId
    ? conversation.participant2Id
    : conversation.participant1Id;

  return { userId, conversation, otherParticipantId };
}

/**
 * Get messages for a conversation with pagination
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp for cursor-based pagination
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { messages: [], nextCursor: null, hasMore: false };

    const userId = identity.subject;
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) return { messages: [], nextCursor: null, hasMore: false };

    // Verify user is a participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    const limit = args.limit ?? 50;

    // Get messages ordered by creation time
    let messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created", (q) => q.eq("conversationId", args.conversationId));

    // If we have a cursor, filter to get older messages
    if (args.cursor) {
      messagesQuery = messagesQuery.filter((q) =>
        q.lt(q.field("createdAt"), args.cursor!)
      );
    }

    // Get one extra to check if there are more
    const messages = await messagesQuery
      .order("desc")
      .take(limit + 1);

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // Reverse to get chronological order for display
    const chronologicalMessages = resultMessages.reverse();

    // Next cursor is the oldest message's createdAt
    const nextCursor = hasMore && resultMessages.length > 0
      ? resultMessages[resultMessages.length - 1].createdAt
      : null;

    return {
      messages: chronologicalMessages,
      nextCursor,
      hasMore
    };
  },
});

/**
 * Search messages in a channel or conversation
 * Searches message content using case-insensitive matching
 */
export const searchMessages = query({
  args: {
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("conversations")),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Validate that exactly one target is provided
    if (!args.channelId && !args.conversationId) {
      return [];
    }
    if (args.channelId && args.conversationId) {
      return [];
    }

    // Empty query returns no results
    if (!args.query.trim()) {
      return [];
    }

    const userId = identity.subject;
    const limit = args.limit ?? 50;
    const searchTerm = args.query.toLowerCase().trim();

    // Search in channel
    if (args.channelId) {
      // Verify channel access
      const channel = await ctx.db.get(args.channelId);
      if (!channel) return [];

      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", channel.organizationId).eq("userId", userId)
        )
        .first();

      if (!membership) return [];

      // Get all messages from channel
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_created", (q) => q.eq("channelId", args.channelId))
        .order("desc")
        .collect();

      // Filter messages by search term (case-insensitive)
      const matchingMessages = messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchTerm)
      );

      // Return limited results
      return matchingMessages.slice(0, limit);
    }

    // Search in conversation
    if (args.conversationId) {
      // Verify conversation access
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) return [];

      // Verify user is a participant
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return [];
      }

      // Get all messages from conversation
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_created", (q) => q.eq("conversationId", args.conversationId))
        .order("desc")
        .collect();

      // Filter messages by search term (case-insensitive)
      const matchingMessages = messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchTerm)
      );

      // Return limited results
      return matchingMessages.slice(0, limit);
    }

    return [];
  },
});

/**
 * Send a direct message to a conversation
 */
export const sendDirectMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
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
  },
  handler: async (ctx, args) => {
    const { userId, conversation } = await checkConversationAccess(ctx, args.conversationId);

    // Validate content
    if (!args.content.trim() && (!args.attachments || args.attachments.length === 0)) {
      throw new Error("Message must have content or attachments");
    }

    // Validate attachment sizes
    if (args.attachments) {
      for (const attachment of args.attachments) {
        if (attachment.size > MAX_FILE_SIZE) {
          throw new Error(`File "${attachment.name}" exceeds the 5MB limit`);
        }
      }
    }

    // If replying, verify parent message exists and is in the same conversation
    let parentMessage: Doc<"messages"> | null = null;
    if (args.parentMessageId) {
      parentMessage = await ctx.db.get(args.parentMessageId);
      if (!parentMessage) {
        throw new Error("Parent message not found");
      }
      if (parentMessage.conversationId !== args.conversationId) {
        throw new Error("Cannot reply to a message in a different conversation");
      }
    }

    // Parse mentions from content
    const mentions = parseMentions(args.content);

    // If replying, add the parent message author to mentions
    if (parentMessage && parentMessage.userId !== userId) {
      if (!mentions.includes(parentMessage.userId)) {
        mentions.push(parentMessage.userId);
      }
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      content: args.content.trim(),
      attachments: args.attachments,
      linkEmbed: args.linkEmbed,
      createdAt: Date.now(),
      parentMessageId: args.parentMessageId,
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    // Update conversation's lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    // Clear typing indicator for this user in this conversation
    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", userId)
      )
      .first();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return messageId;
  },
});

/**
 * Edit a direct message
 */
export const editDirectMessage = mutation({
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
      throw new Error("Message not found");
    }

    // Ensure this is a DM message
    if (!message.conversationId) {
      throw new Error("Not a direct message");
    }

    // Verify conversation access
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error("Not a participant in this conversation");
    }

    // Only message owner can edit
    if (message.userId !== userId) {
      throw new Error("Only message owner can edit messages");
    }

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Message content cannot be empty");
    }

    // Parse mentions from content
    const mentions = parseMentions(args.content);

    await ctx.db.patch(args.messageId, {
      content: args.content.trim(),
      editedAt: Date.now(),
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    return args.messageId;
  },
});

/**
 * Delete a direct message
 */
export const deleteDirectMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Ensure this is a DM message
    if (!message.conversationId) {
      throw new Error("Not a direct message");
    }

    // Verify conversation access
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error("Not a participant in this conversation");
    }

    // Only message owner can delete
    if (message.userId !== userId) {
      throw new Error("Only the message owner can delete messages");
    }

    // Delete attachments from storage
    if (message.attachments) {
      for (const attachment of message.attachments) {
        try {
          await ctx.storage.delete(attachment.storageId);
        } catch {
          // Ignore deletion errors for attachments
        }
      }
    }

    // Delete any saved message references
    const savedRefs = await ctx.db
      .query("savedMessages")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .collect();

    for (const savedRef of savedRefs) {
      await ctx.db.delete(savedRef._id);
    }

    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

/**
 * Toggle reaction on a direct message
 */
export const toggleDirectMessageReaction = mutation({
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
      throw new Error("Message not found");
    }

    // Ensure this is a DM message
    if (!message.conversationId) {
      throw new Error("Not a direct message");
    }

    // Verify conversation access
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error("Not a participant in this conversation");
    }

    const currentReactions = message.reactions || [];
    const existingReactionIndex = currentReactions.findIndex(
      (r) => r.userId === userId && r.emoji === args.emoji
    );

    let newReactions;
    if (existingReactionIndex >= 0) {
      // Remove the reaction
      newReactions = currentReactions.filter((_, i) => i !== existingReactionIndex);
    } else {
      // Add the reaction
      newReactions = [...currentReactions, { userId, emoji: args.emoji }];
    }

    await ctx.db.patch(args.messageId, {
      reactions: newReactions.length > 0 ? newReactions : undefined,
    });

    return { success: true };
  },
});

// ============================================================================
// Direct Message Typing Indicators
// ============================================================================

/**
 * Set typing status for a user in a conversation
 */
export const setTypingInConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { userId } = await checkConversationAccess(ctx, args.conversationId);

    // Upsert typing indicator
    const existingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", userId)
      )
      .first();

    if (existingIndicator) {
      await ctx.db.patch(existingIndicator._id, {
        lastTypingAt: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId,
        lastTypingAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Clear typing status for a user in a conversation
 */
export const clearTypingInConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", userId)
      )
      .first();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return { success: true };
  },
});

/**
 * Get users currently typing in a conversation (query for internal use)
 */
export const getTypingUsersInConversationQuery = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { typingUsers: [], isAuthorized: false };

    const userId = identity.subject;
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) return { typingUsers: [], isAuthorized: false };

    // Verify user is a participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      return { typingUsers: [], isAuthorized: false };
    }

    const now = Date.now();
    const typingIndicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Filter out expired indicators and exclude current user
    const activeTypingUsers: string[] = typingIndicators
      .filter((indicator) =>
        now - indicator.lastTypingAt < TYPING_EXPIRY_MS &&
        indicator.userId !== userId
      )
      .map((indicator) => indicator.userId);

    return { typingUsers: activeTypingUsers, isAuthorized: true };
  },
});

/**
 * Get users currently typing in a conversation with user data
 * Now uses local Convex users table instead of Clerk API
 */
export const getTypingUsersInConversation = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }>> => {
    const result = await ctx.runQuery(api.messages.getTypingUsersInConversationQuery, {
      conversationId: args.conversationId,
    });

    if (!result.isAuthorized || result.typingUsers.length === 0) {
      return [];
    }

    // Fetch user data from local users table instead of Clerk API
    const usersData = await ctx.runQuery(api.users.getUserData, {
      userIds: result.typingUsers,
    });

    return usersData;
  },
});

// ============================================================================
// User Search for DMs
// ============================================================================

/**
 * Search for users to start a DM with
 * - For organization members: search by name using local Convex users table
 * - For external users: search by email via Clerk API (for users not yet in system)
 */
export const searchUsersForDM = action({
  args: {
    organizationId: v.id("organizations"),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{
    userId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    isOrgMember: boolean;
    handle?: string | null;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUserId = identity.subject;
    const searchQuery = args.query.trim().toLowerCase();

    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }

    // Check if searching by handle (starts with @)
    if (searchQuery.startsWith("@")) {
      const handleQuery = searchQuery.slice(1); // Remove the @ prefix
      if (handleQuery.length >= 2) {
        const user = await ctx.runQuery(api.users.getUserByHandle, {
          handle: handleQuery,
        });

        if (user && user.clerkId !== currentUserId) {
          // Check if this user is an org member
          const membership = await ctx.runQuery(api.organizations.checkUserMembership, {
            organizationId: args.organizationId,
            userId: user.clerkId,
          });

          return [{
            userId: user.clerkId,
            email: null,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            imageUrl: user.imageUrl ?? null,
            isOrgMember: membership?.isMember ?? false,
            handle: user.handle,
          }];
        }
      }
      return [];
    }

    const results: Array<{
      userId: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      imageUrl: string | null;
      isOrgMember: boolean;
      handle?: string | null;
    }> = [];

    // Check if query looks like an email
    const isEmailQuery = searchQuery.includes("@");

    if (isEmailQuery) {
      // Search Clerk for user by email (needed for external users not in our system)
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (clerkSecretKey) {
        try {
          const response = await fetch(
            `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(searchQuery)}`,
            {
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
              },
            }
          );

          if (response.ok) {
            const users = await response.json();
            for (const user of users) {
              if (user.id !== currentUserId) {
                // Check if this user is an org member
                const membership = await ctx.runQuery(api.organizations.checkUserMembership, {
                  organizationId: args.organizationId,
                  userId: user.id,
                });

                results.push({
                  userId: user.id,
                  email: user.email_addresses?.[0]?.email_address || null,
                  firstName: user.first_name || null,
                  lastName: user.last_name || null,
                  imageUrl: user.image_url || null,
                  isOrgMember: membership?.isMember ?? false,
                });
              }
            }
          }
        } catch {
          // Ignore errors
        }
      }
    } else {
      // Search organization members by name using local Convex users table
      const members = await ctx.runQuery(api.messages.getOrganizationMembers, {
        organizationId: args.organizationId,
      });

      // Get user IDs excluding current user
      const memberUserIds = members.map((m) => m.userId).filter((id) => id !== currentUserId);

      if (memberUserIds.length > 0) {
        // Fetch user data from local users table
        const usersData = await ctx.runQuery(api.users.getUserData, {
          userIds: memberUserIds,
        });

        // Also get emails
        const users = await ctx.runQuery(api.users.getUsers, {
          clerkIds: memberUserIds,
        });
        const userEmailMap = new Map(users.map((u) => [u.clerkId, u.email]));

        // Filter by search query
        for (const userData of usersData) {
          const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.toLowerCase();
          const email = userEmailMap.get(userData.userId) || "";

          // Match against name or email
          if (fullName.includes(searchQuery) || email.toLowerCase().includes(searchQuery)) {
            results.push({
              userId: userData.userId,
              email: email || null,
              firstName: userData.firstName,
              lastName: userData.lastName,
              imageUrl: userData.imageUrl,
              isOrgMember: true,
            });
          }
        }
      }
    }

    // Limit results
    return results.slice(0, 10);
  },
});

// ============================================================================
// Inbox Queries (Unread Mentions & DMs)
// ============================================================================

/**
 * Get unread mentions for the current user in a specific organization
 * Returns channel messages where the user was mentioned and hasn't marked as read
 */
export const getUnreadMentions = query({
  args: { organizationId: v.id("organizations"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 50;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return [];

    // Get all channels in the organization
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get user's muted channels
    const mutedChannels = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mutedChannelIds = new Set(mutedChannels.map((m) => m.channelId));

    // Filter out muted channels
    const channelIds = channels
      .filter((c) => !mutedChannelIds.has(c._id))
      .map((c) => c._id);

    // Get user's read mention statuses
    const readStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const readMessageIds = new Set(readStatuses.map((rs) => rs.messageId));

    // Get all messages from these channels that mention the current user
    const allMentions: Array<Doc<"messages"> & { channelName?: string; categoryName?: string }> = [];

    for (const channelId of channelIds) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_created", (q) => q.eq("channelId", channelId))
        .order("desc")
        .collect();

      const mentionedMessages = messages.filter((m) => {
        // Check if user is mentioned
        const hasMention = Array.isArray(m.mentions) && m.mentions.includes(userId);
        // Check if not already read
        const isUnread = !readMessageIds.has(m._id);
        // Not from current user
        const notFromSelf = m.userId !== userId;
        return hasMention && isUnread && notFromSelf;
      });

      // Get channel info for context
      const channel = channels.find((c) => c._id === channelId);
      if (channel) {
        const category = await ctx.db.get(channel.categoryId);
        mentionedMessages.forEach((m) => {
          allMentions.push({
            ...m,
            channelName: channel.name,
            categoryName: category?.name,
          });
        });
      }
    }

    // Sort by createdAt descending and limit
    allMentions.sort((a, b) => b.createdAt - a.createdAt);
    return allMentions.slice(0, limit);
  },
});

/**
 * Get unread DMs grouped by sender
 * Returns conversations with unread messages, grouped by the other participant
 */
export const getUnreadDMsGroupedBySender = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;

    // Get all conversations for this user
    const conversationsAsP1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", userId))
      .collect();

    const conversationsAsP2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", userId))
      .collect();

    const allConversations = [...conversationsAsP1, ...conversationsAsP2];
    const uniqueConversations = Array.from(
      new Map(allConversations.map((c) => [c._id, c])).values()
    );

    // Get all read statuses for this user
    const readStatuses = await ctx.db
      .query("conversationReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const readStatusMap = new Map(
      readStatuses.map((rs) => [rs.conversationId, rs.lastReadAt])
    );

    const groupedDMs: Array<{
      conversationId: Id<"conversations">;
      otherParticipantId: string;
      unreadCount: number;
      lastMessage: {
        content: string;
        createdAt: number;
        userId: string;
      } | null;
    }> = [];

    // Count unread messages in each conversation
    for (const conv of uniqueConversations) {
      const lastReadAt = readStatusMap.get(conv._id) ?? 0;

      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_created", (q) =>
          q.eq("conversationId", conv._id).gt("createdAt", lastReadAt)
        )
        .collect();

      // Filter out messages from current user
      const unreadFromOther = unreadMessages.filter((msg) => msg.userId !== userId);

      if (unreadFromOther.length > 0) {
        // Get the last message
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation_and_created", (q) => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        const otherParticipantId = conv.participant1Id === userId
          ? conv.participant2Id
          : conv.participant1Id;

        groupedDMs.push({
          conversationId: conv._id,
          otherParticipantId,
          unreadCount: unreadFromOther.length,
          lastMessage: lastMessage
            ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              userId: lastMessage.userId,
            }
            : null,
        });
      }
    }

    // Sort by last message time descending
    groupedDMs.sort((a, b) =>
      (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0)
    );

    return groupedDMs;
  },
});

/**
 * Get total inbox count (unread mentions + unread DMs) for badge display
 */
export const getTotalInboxCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { mentions: 0, dms: 0, total: 0 };

    const userId = identity.subject;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) return { mentions: 0, dms: 0, total: 0 };

    // Count unread mentions
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get user's muted channels
    const mutedChannels = await ctx.db
      .query("mutedChannels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mutedChannelIds = new Set(mutedChannels.map((m) => m.channelId));

    // Filter out muted channels
    const channelIds = channels
      .filter((c) => !mutedChannelIds.has(c._id))
      .map((c) => c._id);

    const readStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const readMessageIds = new Set(readStatuses.map((rs) => rs.messageId));

    let mentionCount = 0;

    for (const channelId of channelIds) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_created", (q) => q.eq("channelId", channelId))
        .collect();

      const unreadMentions = messages.filter((m) => {
        const hasMention = Array.isArray(m.mentions) && m.mentions.includes(userId);
        const isUnread = !readMessageIds.has(m._id);
        const notFromSelf = m.userId !== userId;
        return hasMention && isUnread && notFromSelf;
      });

      mentionCount += unreadMentions.length;
    }

    // Count unread DMs
    const conversationsAsP1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", userId))
      .collect();

    const conversationsAsP2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", userId))
      .collect();

    const allConversations = [...conversationsAsP1, ...conversationsAsP2];
    const uniqueConversations = Array.from(
      new Map(allConversations.map((c) => [c._id, c])).values()
    );

    const convReadStatuses = await ctx.db
      .query("conversationReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const convReadStatusMap = new Map(
      convReadStatuses.map((rs) => [rs.conversationId, rs.lastReadAt])
    );

    let dmCount = 0;

    for (const conv of uniqueConversations) {
      const lastReadAt = convReadStatusMap.get(conv._id) ?? 0;

      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_created", (q) =>
          q.eq("conversationId", conv._id).gt("createdAt", lastReadAt)
        )
        .collect();

      dmCount += unreadMessages.filter((msg) => msg.userId !== userId).length;
    }

    return {
      mentions: mentionCount,
      dms: dmCount,
      total: mentionCount + dmCount,
    };
  },
});

// ============================================================================
// Inbox Mutations (Mark Mentions as Read)
// ============================================================================

/**
 * Mark a single mention as read
 */
export const markMentionAsRead = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Verify the user was actually mentioned
    if (!message.mentions || !message.mentions.includes(userId)) {
      throw new Error("User was not mentioned in this message");
    }

    // Check if already marked as read
    const existingStatus = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId)
      )
      .first();

    if (existingStatus) {
      // Already marked as read
      return { success: true, alreadyRead: true };
    }

    // Create new read status
    await ctx.db.insert("mentionReadStatus", {
      userId,
      messageId: args.messageId,
      readAt: Date.now(),
    });

    return { success: true, alreadyRead: false };
  },
});

/**
 * Mark all mentions as read for a specific organization
 */
export const markAllMentionsAsRead = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Get all channels in the organization
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const channelIds = channels.map((c) => c._id);

    // Get user's already-read mention statuses
    const existingReadStatuses = await ctx.db
      .query("mentionReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const alreadyReadMessageIds = new Set(existingReadStatuses.map((rs) => rs.messageId));

    // Find all unread mentions and mark them as read
    let markedCount = 0;
    const now = Date.now();

    for (const channelId of channelIds) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_created", (q) => q.eq("channelId", channelId))
        .collect();

      const unreadMentions = messages.filter((m) => {
        const hasMention = Array.isArray(m.mentions) && m.mentions.includes(userId);
        const isUnread = !alreadyReadMessageIds.has(m._id);
        const notFromSelf = m.userId !== userId;
        return hasMention && isUnread && notFromSelf;
      });

      for (const mention of unreadMentions) {
        await ctx.db.insert("mentionReadStatus", {
          userId,
          messageId: mention._id,
          readAt: now,
        });
        markedCount++;
      }
    }

    return { success: true, markedCount };
  },
});
