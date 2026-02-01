"use client"

import { memo, useRef, useCallback, useEffect, useState, useMemo } from "react"
import { MessageListProvider, type MessageListCallbacks, type MessageListData } from "./message-list-context"
import { MessageItem, type MessageItemProps } from "./message-item"
import { DateSeparator } from "./date-separator"
import { ScrollToBottom } from "./scroll-to-bottom"
import { shouldGroupMessages, isDifferentDay, formatDateForSeparator, type Message } from "./utils"

/**
 * Message List
 * 
 * The main container for rendering messages with:
 * - CSS content-visibility virtualization (native browser rendering optimization)
 * - Automatic message grouping by user and time
 * - Date separators between days
 * - Scroll-to-bottom button
 * - Scroll position management
 * 
 * Key optimizations:
 * - MessageListProvider for stable callbacks
 * - CSS virtualization via content-visibility
 * - Memoized message items with custom comparator
 * - Scroll state managed outside React state to avoid re-renders
 */

// =============================================================================
// PROPS
// =============================================================================

export interface MessageListProps {
  messages: Message[]
  currentUserId?: string
  style?: "compact" | "bubble"
  searchQuery?: string
  savedMessageIds?: Set<string>
  userNames?: Record<string, string>
  attachmentUrls?: Record<string, string | null>
  isAdmin?: boolean
  isForumPost?: boolean
  canMarkSolution?: boolean
  highlightedMessageId?: string | null
  // Callbacks
  onDeleteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, content: string) => void
  onReply?: (messageId: string) => void
  onForward?: (messageId: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onAvatarClick?: (userId: string) => void
  onNameClick?: (userId: string) => void
  onMarkSolution?: (messageId: string) => void
  className?: string
}

// =============================================================================
// SCROLL MANAGEMENT
// =============================================================================

const SCROLL_THRESHOLD = 100 // pixels from bottom to consider "at bottom"

function useScrollManagement(
  containerRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
) {
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isAtBottomRef = useRef(true)
  const lastScrollTopRef = useRef(0)

  // Check if scrolled to bottom
  const checkIfAtBottom = useCallback(() => {
    const container = containerRef.current
    if (!container) return true

    const { scrollTop, scrollHeight, clientHeight } = container
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
  }, [containerRef])

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    })
    setShowScrollButton(false)
    isAtBottomRef.current = true
  }, [containerRef])

  // Handle scroll events — detect manual scrolling to unanchor
  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom()
    isAtBottomRef.current = atBottom
    setShowScrollButton(!atBottom)

    const container = containerRef.current
    if (container) {
      lastScrollTopRef.current = container.scrollTop
    }
  }, [checkIfAtBottom, containerRef])

  // Scroll to message by ID
  const scrollToMessage = useCallback((messageId: string) => {
    const container = containerRef.current
    if (!container) return

    const messageElement = container.querySelector(`[data-message-id="${messageId}"]`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [containerRef])

  // ResizeObserver: keep scroll anchored to bottom when content grows (e.g. images load)
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    let lastHeight = content.scrollHeight
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const resizeObserver = new ResizeObserver(() => {
      const newHeight = content.scrollHeight
      if (newHeight !== lastHeight) {
        lastHeight = newHeight
        // Only auto-scroll if the user is anchored at the bottom
        if (isAtBottomRef.current) {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            scrollToBottom(false)
          }, 30)
        }
      }
    })

    resizeObserver.observe(content)
    return () => {
      resizeObserver.disconnect()
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [contentRef, scrollToBottom])

  return {
    showScrollButton,
    isAtBottomRef,
    scrollToBottom,
    scrollToMessage,
    handleScroll,
  }
}

// =============================================================================
// MESSAGE LIST INNER (renders messages)
// =============================================================================

interface MessageListInnerProps {
  messages: Message[]
  currentUserId?: string
  style: "compact" | "bubble"
  searchQuery?: string
  savedMessageIds: Set<string>
  userNames: Record<string, string>
  attachmentUrls: Record<string, string | null>
  isAdmin: boolean
  isForumPost: boolean
  canMarkSolution: boolean
  highlightedMessageId?: string | null
}

const MessageListInner = memo(function MessageListInner({
  messages,
  currentUserId,
  style,
  searchQuery,
  savedMessageIds,
  userNames,
  attachmentUrls,
  isAdmin,
  isForumPost,
  canMarkSolution,
  highlightedMessageId,
}: MessageListInnerProps) {
  return (
    <>
      {messages.map((message, index) => {
        const previousMessage = index > 0 ? messages[index - 1] : undefined
        const isGrouped = shouldGroupMessages(message, previousMessage)

        // Check if we need a date separator
        const showDateSeparator =
          message.createdAt &&
          previousMessage?.createdAt &&
          isDifferentDay(message.createdAt, previousMessage.createdAt)

        return (
          <div key={message.id} data-message-id={message.id}>
            {showDateSeparator && message.createdAt && (
              <DateSeparator date={formatDateForSeparator(message.createdAt)} />
            )}
            <MessageItem
              message={message}
              currentUserId={currentUserId}
              isGrouped={isGrouped}
              isHighlighted={highlightedMessageId === message.id}
              searchQuery={searchQuery}
              isSaved={savedMessageIds.has(message.id)}
              isAdmin={isAdmin}
              style={style}
              userNames={userNames}
              attachmentUrls={attachmentUrls}
              isForumPost={isForumPost}
              canMarkSolution={canMarkSolution}
            />
          </div>
        )
      })}
    </>
  )
})

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function MessageListComponent({
  messages,
  currentUserId,
  style = "compact",
  searchQuery = "",
  savedMessageIds = new Set(),
  userNames = {},
  attachmentUrls = {},
  isAdmin = false,
  isForumPost = false,
  canMarkSolution = false,
  highlightedMessageId,
  onDeleteMessage,
  onEditMessage,
  onReply,
  onForward,
  onReaction,
  onPin,
  onSave,
  onUnsave,
  onAvatarClick,
  onNameClick,
  onMarkSolution,
  className,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousMessagesLengthRef = useRef(messages.length)

  // Scroll management
  const {
    showScrollButton,
    isAtBottomRef,
    scrollToBottom,
    scrollToMessage,
    handleScroll,
  } = useScrollManagement(containerRef, contentRef)

  // Callbacks for context
  const callbacks = useMemo<MessageListCallbacks>(
    () => ({
      onDeleteMessage,
      onEditMessage,
      onReply,
      onForward,
      onReaction,
      onPin,
      onSave,
      onUnsave,
      onAvatarClick,
      onNameClick,
      onScrollToMessage: scrollToMessage,
      onMarkSolution,
    }),
    [
      onDeleteMessage,
      onEditMessage,
      onReply,
      onForward,
      onReaction,
      onPin,
      onSave,
      onUnsave,
      onAvatarClick,
      onNameClick,
      scrollToMessage,
      onMarkSolution,
    ]
  )

  // Data for context
  const data = useMemo<MessageListData>(
    () => ({
      currentUserId,
      savedMessageIds,
      userNames,
      isAdmin,
      searchQuery,
      isForumPost,
      canMarkSolution,
      attachmentUrls,
    }),
    [
      currentUserId,
      savedMessageIds,
      userNames,
      isAdmin,
      searchQuery,
      isForumPost,
      canMarkSolution,
      attachmentUrls,
    ]
  )

  // Scroll to bottom on initial mount
  const hasInitialScrolled = useRef(false)
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current) {
      hasInitialScrolled.current = true
      // Double RAF ensures the DOM content is fully rendered and measured
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
            isAtBottomRef.current = true
          }
        })
      })
    }
  }, [messages.length])

  // Auto-scroll to bottom when new messages arrive (after initial load)
  useEffect(() => {
    // Skip on initial load (handled above)
    if (!hasInitialScrolled.current) return

    const newMessagesArrived = messages.length > previousMessagesLengthRef.current
    previousMessagesLengthRef.current = messages.length

    // If at bottom and new messages arrived, scroll to show them
    if (newMessagesArrived && isAtBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom(false)
      })
    }
  }, [messages.length, scrollToBottom, isAtBottomRef])

  // Scroll to highlighted message
  useEffect(() => {
    if (highlightedMessageId) {
      scrollToMessage(highlightedMessageId)
    }
  }, [highlightedMessageId, scrollToMessage])

  return (
    <MessageListProvider callbacks={callbacks} data={data}>
      <div className={`relative flex-1 ${className ?? ""}`}>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden"
          style={{
            // Optimize scroll performance
            willChange: "scroll-position",
            overscrollBehavior: "contain",
          }}
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div ref={contentRef} className="py-4">
              <MessageListInner
                messages={messages}
                currentUserId={currentUserId}
                style={style}
                searchQuery={searchQuery}
                savedMessageIds={savedMessageIds}
                userNames={userNames}
                attachmentUrls={attachmentUrls}
                isAdmin={isAdmin}
                isForumPost={isForumPost}
                canMarkSolution={canMarkSolution}
                highlightedMessageId={highlightedMessageId}
              />
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <ScrollToBottom
          visible={showScrollButton}
          onClick={() => scrollToBottom(true)}
        />
      </div>
    </MessageListProvider>
  )
}

export const MessageList = memo(MessageListComponent)
