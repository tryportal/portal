/**
 * Chat Utility Functions
 * Pure, stateless utility functions for the chat rendering engine.
 * These functions are designed to be highly performant and reusable.
 */

import type { LinkEmbedData } from "@/components/preview/link-preview"

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Attachment {
  storageId: string
  name: string
  size: number
  type: string
}

export interface Reaction {
  userId: string
  emoji: string
}

export interface Message {
  id: string
  content: string
  timestamp: string
  createdAt?: number
  user: {
    id: string
    name: string
    avatar?: string
    initials: string
  }
  attachments?: Attachment[]
  linkEmbed?: LinkEmbedData
  editedAt?: number
  parentMessageId?: string
  parentMessage?: {
    content: string
    userName: string
  }
  reactions?: Reaction[]
  pinned?: boolean
  mentions?: string[]
  forwardedFrom?: {
    channelName?: string
    userName?: string
  }
  isOP?: boolean
  isSolvedAnswer?: boolean
  isPending?: boolean
  viaPearl?: boolean
}

export interface GroupedReaction {
  emoji: string
  count: number
  users: string[]
  hasReacted: boolean
}

// =============================================================================
// FILE SIZE FORMATTING
// =============================================================================

const FILE_SIZES = ["B", "KB", "MB", "GB"] as const

/**
 * Formats bytes into human-readable file size.
 * Uses base-1024 conversion (binary).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${FILE_SIZES[i]}`
}

// =============================================================================
// FILE TYPE DETECTION
// =============================================================================

/**
 * Checks if a MIME type represents an image.
 */
export function isImageType(type: string): boolean {
  return type.startsWith("image/")
}

/**
 * Checks if a MIME type represents a video.
 */
export function isVideoType(type: string): boolean {
  return type.startsWith("video/")
}

// =============================================================================
// DATE/TIME FORMATTING
// =============================================================================

// Reuse date formatter instances to avoid repeated object creation
const fullDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})

const dateSeparatorFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

/**
 * Formats a timestamp into a full date-time string.
 * Example: "Monday, January 15, 2024 at 3:45 PM"
 */
export function formatFullDateTime(timestamp: number): string {
  return fullDateTimeFormatter.format(new Date(timestamp))
}

/**
 * Formats a date for display in a date separator.
 * Returns "Today", "Yesterday", or a full date.
 */
export function formatDateForSeparator(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Reset hours to compare dates only
  today.setHours(0, 0, 0, 0)
  yesterday.setHours(0, 0, 0, 0)
  const messageDate = new Date(date)
  messageDate.setHours(0, 0, 0, 0)

  const messageTime = messageDate.getTime()
  if (messageTime === today.getTime()) {
    return "Today"
  }
  if (messageTime === yesterday.getTime()) {
    return "Yesterday"
  }
  return dateSeparatorFormatter.format(date)
}

/**
 * Checks if two timestamps represent different calendar days.
 */
export function isDifferentDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1)
  const date2 = new Date(timestamp2)
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  )
}

// =============================================================================
// MESSAGE GROUPING
// =============================================================================

const GROUPING_THRESHOLD_MS = 60000 // 1 minute

/**
 * Determines if the current message should be visually grouped with the previous one.
 * Messages are grouped if:
 * - Same user
 * - Neither message is pinned
 * - Within 1 minute of each other
 */
export function shouldGroupMessages(
  current: Message,
  previous: Message | undefined
): boolean {
  if (!previous) return false
  if (current.user.id !== previous.user.id) return false
  if (current.pinned || previous.pinned) return false
  if (current.createdAt && previous.createdAt) {
    return current.createdAt - previous.createdAt <= GROUPING_THRESHOLD_MS
  }
  return false
}

// =============================================================================
// EMOJI DETECTION
// =============================================================================

// Regex to match emoji sequences (ZWJ, modifiers, variation selectors)
const EMOJI_REGEX =
  /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji}(?:\u200D\p{Emoji})+)+$/u

// Regex for splitting emojis into grapheme clusters (fallback)
const EMOJI_MATCH_REGEX =
  /\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji}(?:\u200D\p{Emoji})+/gu

/**
 * Checks if content consists only of 1-3 emojis.
 * Used to render large emoji-only messages.
 */
export function isEmojiOnlyMessage(content: string): boolean {
  const trimmed = content.replace(/\s/g, "")
  if (!trimmed) return false

  // Use Intl.Segmenter for accurate grapheme splitting if available
  let graphemes: string[]
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter !== "undefined") {
    graphemes = [...new Intl.Segmenter().segment(trimmed)].map((s) => s.segment)
  } else {
    // Fallback for older environments
    graphemes = trimmed.match(EMOJI_MATCH_REGEX) ?? []
  }

  if (graphemes.length < 1 || graphemes.length > 3) return false
  return graphemes.every((g) => EMOJI_REGEX.test(g))
}

// =============================================================================
// MENTION PROCESSING
// =============================================================================

/**
 * Replaces user IDs with display names in mention text.
 * @param text - Original text containing @userId mentions
 * @param mentionMap - Map of userId to displayName
 */
function replaceMentionIds(
  text: string,
  mentionMap: Record<string, string>
): string {
  let result = text
  for (const [userId, displayName] of Object.entries(mentionMap)) {
    // Replace @userId with @displayName
    const pattern = new RegExp(`@${userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$|[^\\w])`, "g")
    result = result.replace(pattern, `@${displayName}`)
  }
  return result
}

/**
 * Processes message content to replace mention IDs with names and apply markdown formatting.
 * @param content - Original message content
 * @param mentions - Array of mentioned user IDs
 * @param userNames - Map of userId to displayName
 */
export function processMentions(
  content: string,
  mentions?: string[],
  userNames?: Record<string, string>
): string {
  if (!mentions || mentions.length === 0 || !userNames) return content

  // Build mention map
  const mentionMap: Record<string, string> = {}
  for (const userId of mentions) {
    if (userId === "everyone") {
      mentionMap[userId] = "everyone"
    } else if (userNames[userId]) {
      mentionMap[userId] = userNames[userId]
    }
  }

  // Replace IDs with display names
  let processedContent = replaceMentionIds(content, mentionMap)

  // Handle @everyone with special class (rendered by markdown)
  if (mentions.includes("everyone")) {
    processedContent = processedContent.replace(
      /@everyone(?=\s|$|[^\w])/g,
      '<span class="mention-everyone">@everyone</span>'
    )
  }

  // Wrap regular mentions in bold for markdown styling
  // Sort by length (longest first) to avoid partial matches
  const displayNames = Object.entries(mentionMap)
    .filter(([userId]) => userId !== "everyone")
    .map(([, name]) => name)
    .sort((a, b) => b.length - a.length)

  for (const displayName of displayNames) {
    const escapedName = displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const pattern = new RegExp(`@${escapedName}(?=\\s|$|[^\\w])`, "g")
    processedContent = processedContent.replace(pattern, `**@${displayName}**`)
  }

  return processedContent
}

// =============================================================================
// REACTION GROUPING
// =============================================================================

/**
 * Groups reactions by emoji and computes counts.
 * @param reactions - Array of individual reactions
 * @param currentUserId - The current user's ID (to highlight their reactions)
 */
export function groupReactions(
  reactions: Reaction[],
  currentUserId?: string
): GroupedReaction[] {
  const groups: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {}

  for (const reaction of reactions) {
    if (!groups[reaction.emoji]) {
      groups[reaction.emoji] = { count: 0, users: [], hasReacted: false }
    }
    groups[reaction.emoji].count++
    groups[reaction.emoji].users.push(reaction.userId)
    if (reaction.userId === currentUserId) {
      groups[reaction.emoji].hasReacted = true
    }
  }

  return Object.entries(groups).map(([emoji, data]) => ({
    emoji,
    ...data,
  }))
}

// =============================================================================
// SEARCH HIGHLIGHTING
// =============================================================================

/**
 * Escapes special regex characters in a string.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Splits text by search query for highlighting.
 * Returns an array of { text, isMatch } objects.
 */
export function splitBySearchQuery(
  text: string,
  searchQuery: string
): Array<{ text: string; isMatch: boolean }> {
  if (!searchQuery || !searchQuery.trim()) {
    return [{ text, isMatch: false }]
  }

  const escapedQuery = escapeRegex(searchQuery)
  const regex = new RegExp(`(${escapedQuery})`, "gi")
  const parts = text.split(regex)

  return parts
    .filter((part) => part !== "")
    .map((part) => ({
      text: part,
      isMatch: part.toLowerCase() === searchQuery.toLowerCase(),
    }))
}
