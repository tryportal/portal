"use client"

import { useState, useCallback, useMemo } from "react"
import { MessageList, type MessageListProps } from "./message-list"
import type { Message } from "./utils"

/**
 * Chat Interface
 * 
 * Simplified orchestrator that wraps MessageList and manages:
 * - Reply state
 * - Forward state
 * - Highlighted message state
 * 
 * Note: This is a lightweight wrapper. The heavy lifting is done by MessageList
 * which handles the MessageListProvider and scroll management.
 * 
 * For full chat functionality (header, input, dialogs), import these separately
 * and compose them in your page component:
 * - ChannelHeader from '@/components/preview/channel-header'
 * - MessageInput from '@/components/preview/message-input'
 * - PinnedMessagesDialog from '@/components/preview/pinned-messages-dialog'
 * - ForwardMessageDialog from '@/components/preview/forward-message-dialog'
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ReplyingTo {
  messageId: string
  content: string
  userName: string
}

export interface ForwardingMessage {
  id: string
  content: string
  attachments?: Array<{ name: string }>
  linkEmbed?: { url: string }
}

export interface ChatInterfaceProps extends Omit<MessageListProps, 'highlightedMessageId'> {
  // Reply management (optional - can be managed externally)
  onReplyStart?: (replyingTo: ReplyingTo) => void
  // Forward management (optional - can be managed externally)
  onForwardStart?: (forwardingMessage: ForwardingMessage) => void
}

// =============================================================================
// HOOK: useChatState
// =============================================================================

/**
 * Hook for managing chat state (reply, forward, highlight).
 * Can be used separately if you need more control.
 */
export function useChatState(messages: Message[]) {
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<ForwardingMessage | null>(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)

  const handleReply = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId)
      if (message) {
        setReplyingTo({
          messageId: message.id,
          content: message.content,
          userName: message.user.name,
        })
      }
    },
    [messages]
  )

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  const handleForward = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId)
      if (message) {
        setForwardingMessage({
          id: message.id,
          content: message.content,
          attachments: message.attachments?.map((a) => ({ name: a.name })),
          linkEmbed: message.linkEmbed ? { url: message.linkEmbed.url } : undefined,
        })
      }
    },
    [messages]
  )

  const handleCancelForward = useCallback(() => {
    setForwardingMessage(null)
  }, [])

  const handleHighlightMessage = useCallback((messageId: string) => {
    setHighlightedMessageId(messageId)
    // Clear highlight after animation
    setTimeout(() => setHighlightedMessageId(null), 2000)
  }, [])

  return {
    replyingTo,
    forwardingMessage,
    highlightedMessageId,
    handleReply,
    handleCancelReply,
    handleForward,
    handleCancelForward,
    handleHighlightMessage,
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ChatInterface({
  messages,
  onReplyStart,
  onForwardStart,
  onReply: externalOnReply,
  onForward: externalOnForward,
  ...messageListProps
}: ChatInterfaceProps) {
  // Internal state management
  const {
    highlightedMessageId,
    handleReply: internalHandleReply,
    handleForward: internalHandleForward,
  } = useChatState(messages)

  // Wrap reply handler to optionally notify parent
  const handleReply = useCallback(
    (messageId: string) => {
      internalHandleReply(messageId)
      
      const message = messages.find((m) => m.id === messageId)
      if (message && onReplyStart) {
        onReplyStart({
          messageId: message.id,
          content: message.content,
          userName: message.user.name,
        })
      }
      
      // Also call external handler if provided
      externalOnReply?.(messageId)
    },
    [messages, internalHandleReply, onReplyStart, externalOnReply]
  )

  // Wrap forward handler to optionally notify parent
  const handleForward = useCallback(
    (messageId: string) => {
      internalHandleForward(messageId)
      
      const message = messages.find((m) => m.id === messageId)
      if (message && onForwardStart) {
        onForwardStart({
          id: message.id,
          content: message.content,
          attachments: message.attachments?.map((a) => ({ name: a.name })),
          linkEmbed: message.linkEmbed ? { url: message.linkEmbed.url } : undefined,
        })
      }
      
      // Also call external handler if provided
      externalOnForward?.(messageId)
    },
    [messages, internalHandleForward, onForwardStart, externalOnForward]
  )

  return (
    <MessageList
      messages={messages}
      onReply={handleReply}
      onForward={handleForward}
      highlightedMessageId={highlightedMessageId}
      {...messageListProps}
    />
  )
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export types from utils for convenience
export type { Message, Attachment, Reaction } from "./utils"
