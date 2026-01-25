"use client"

import { memo, useMemo } from "react"
import { MarkdownRenderer, HighlightedText } from "./markdown-renderer"
import { isEmojiOnlyMessage, processMentions, splitBySearchQuery } from "./utils"

/**
 * Message Content
 * 
 * Renders the text content of a message with:
 * - Emoji-only detection (renders large for 1-3 emoji messages)
 * - Markdown rendering (for normal messages)
 * - Search highlighting (when searching)
 * - Mention processing
 * 
 * Memoized to prevent re-renders when parent message updates.
 */

// =============================================================================
// PROPS
// =============================================================================

interface MessageContentProps {
  content: string
  mentions?: string[]
  userNames?: Record<string, string>
  searchQuery?: string
  isOwn?: boolean
  className?: string
}

// =============================================================================
// EMOJI-ONLY MESSAGE
// =============================================================================

interface EmojiOnlyContentProps {
  content: string
  className?: string
}

const EmojiOnlyContent = memo(function EmojiOnlyContent({
  content,
  className,
}: EmojiOnlyContentProps) {
  return (
    <div className={`text-4xl leading-tight select-text ${className ?? ""}`}>
      {content}
    </div>
  )
})

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function MessageContentInner({
  content,
  mentions,
  userNames,
  searchQuery,
  isOwn = false,
  className,
}: MessageContentProps) {
  // Check if emoji-only before processing mentions
  const isEmojiOnly = useMemo(() => isEmojiOnlyMessage(content), [content])

  // Process mentions (replace user IDs with display names)
  const processedContent = useMemo(() => {
    if (isEmojiOnly) return content
    return processMentions(content, mentions, userNames)
  }, [content, mentions, userNames, isEmojiOnly])

  // If no content, render nothing
  if (!content.trim()) {
    return null
  }

  // Emoji-only messages get special large rendering
  if (isEmojiOnly) {
    return <EmojiOnlyContent content={content} className={className} />
  }

  // If searching, render with highlights (no markdown)
  if (searchQuery?.trim()) {
    const parts = splitBySearchQuery(processedContent, searchQuery)
    return (
      <div
        className={`text-sm leading-[1.46] break-words overflow-hidden [overflow-wrap:anywhere] ${
          isOwn ? "text-primary-foreground" : "text-foreground/90"
        } ${className ?? ""}`}
      >
        <HighlightedText parts={parts} />
      </div>
    )
  }

  // Normal message with markdown
  return (
    <MarkdownRenderer
      content={processedContent}
      isOwn={isOwn}
      className={className}
    />
  )
}

export const MessageContent = memo(MessageContentInner)
