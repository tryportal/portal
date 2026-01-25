"use client"

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react"
import type { Message } from "./utils"
import type { LinkEmbedData } from "@/components/preview/link-preview"

/**
 * Message List Context
 * 
 * Provides stable callback references to all message action handlers.
 * Uses refs internally so callbacks never change identity, preventing
 * unnecessary re-renders of memoized message components.
 * 
 * Key optimization: All callbacks are created once and reference the latest
 * handler via refs, eliminating prop drilling and callback recreation.
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface MessageListCallbacks {
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
  onScrollToMessage?: (messageId: string) => void
  onMarkSolution?: (messageId: string) => void
}

export interface MessageListData {
  currentUserId?: string
  savedMessageIds: Set<string>
  userNames: Record<string, string>
  isAdmin: boolean
  searchQuery: string
  isForumPost: boolean
  canMarkSolution: boolean
  attachmentUrls: Record<string, string | null>
}

interface MessageListContextValue {
  // Stable callbacks that never change identity
  callbacks: {
    deleteMessage: (messageId: string) => void
    editMessage: (messageId: string, content: string) => void
    reply: (messageId: string) => void
    forward: (messageId: string) => void
    reaction: (messageId: string, emoji: string) => void
    pin: (messageId: string) => void
    save: (messageId: string) => void
    unsave: (messageId: string) => void
    avatarClick: (userId: string) => void
    nameClick: (userId: string) => void
    scrollToMessage: (messageId: string) => void
    markSolution: (messageId: string) => void
    copyText: (text: string) => void
  }
  // Data that may change - accessed via getters to avoid stale closures
  getData: () => MessageListData
  // Check if a message is saved
  isMessageSaved: (messageId: string) => boolean
  // Get attachment URL
  getAttachmentUrl: (storageId: string) => string | null
}

// =============================================================================
// CONTEXT
// =============================================================================

const MessageListContext = createContext<MessageListContextValue | null>(null)

// =============================================================================
// PROVIDER
// =============================================================================

interface MessageListProviderProps {
  children: ReactNode
  callbacks: MessageListCallbacks
  data: MessageListData
}

export function MessageListProvider({
  children,
  callbacks,
  data,
}: MessageListProviderProps) {
  // Store callbacks in refs to ensure stable function identity
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Store data in ref for stable getter access
  const dataRef = useRef(data)
  dataRef.current = data

  // Create stable callback wrappers that reference the refs
  const stableCallbacks = useMemo(
    () => ({
      deleteMessage: (messageId: string) => {
        callbacksRef.current.onDeleteMessage?.(messageId)
      },
      editMessage: (messageId: string, content: string) => {
        callbacksRef.current.onEditMessage?.(messageId, content)
      },
      reply: (messageId: string) => {
        callbacksRef.current.onReply?.(messageId)
      },
      forward: (messageId: string) => {
        callbacksRef.current.onForward?.(messageId)
      },
      reaction: (messageId: string, emoji: string) => {
        callbacksRef.current.onReaction?.(messageId, emoji)
      },
      pin: (messageId: string) => {
        callbacksRef.current.onPin?.(messageId)
      },
      save: (messageId: string) => {
        callbacksRef.current.onSave?.(messageId)
      },
      unsave: (messageId: string) => {
        callbacksRef.current.onUnsave?.(messageId)
      },
      avatarClick: (userId: string) => {
        callbacksRef.current.onAvatarClick?.(userId)
      },
      nameClick: (userId: string) => {
        callbacksRef.current.onNameClick?.(userId)
      },
      scrollToMessage: (messageId: string) => {
        callbacksRef.current.onScrollToMessage?.(messageId)
      },
      markSolution: (messageId: string) => {
        callbacksRef.current.onMarkSolution?.(messageId)
      },
      copyText: (text: string) => {
        navigator.clipboard.writeText(text)
      },
    }),
    [] // Empty deps - callbacks are stable via refs
  )

  // Stable getter for data
  const getData = useCallback(() => dataRef.current, [])

  // Stable check for saved status
  const isMessageSaved = useCallback(
    (messageId: string) => dataRef.current.savedMessageIds.has(messageId),
    []
  )

  // Stable getter for attachment URL
  const getAttachmentUrl = useCallback(
    (storageId: string) => dataRef.current.attachmentUrls[storageId] ?? null,
    []
  )

  const contextValue = useMemo<MessageListContextValue>(
    () => ({
      callbacks: stableCallbacks,
      getData,
      isMessageSaved,
      getAttachmentUrl,
    }),
    [stableCallbacks, getData, isMessageSaved, getAttachmentUrl]
  )

  return (
    <MessageListContext.Provider value={contextValue}>
      {children}
    </MessageListContext.Provider>
  )
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Access the message list context.
 * Throws if used outside of MessageListProvider.
 */
export function useMessageListContext(): MessageListContextValue {
  const context = useContext(MessageListContext)
  if (!context) {
    throw new Error(
      "useMessageListContext must be used within a MessageListProvider"
    )
  }
  return context
}

/**
 * Access just the stable callbacks.
 * These never change identity and are safe to use in dependencies.
 */
export function useMessageCallbacks() {
  return useMessageListContext().callbacks
}

/**
 * Access the current data snapshot.
 * Note: This returns current data, not reactive updates.
 * For reactive updates, pass data as props to child components.
 */
export function useMessageListData(): MessageListData {
  return useMessageListContext().getData()
}

/**
 * Check if a message is saved.
 * Returns a stable function for checking.
 */
export function useIsMessageSaved() {
  return useMessageListContext().isMessageSaved
}

/**
 * Get an attachment URL.
 * Returns a stable function for getting URLs.
 */
export function useGetAttachmentUrl() {
  return useMessageListContext().getAttachmentUrl
}
