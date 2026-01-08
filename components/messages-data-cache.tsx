"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface SavedMessage {
  _id: Id<"messages">
  channelId?: Id<"channels">
  userId: string
  content: string
  createdAt: number
  editedAt?: number
  attachments?: Array<{
    storageId: Id<"_storage">
    name: string
    size: number
    type: string
  }>
  mentions?: string[]
  savedAt: number
}

interface Mention {
  _id: Id<"messages">
  channelId?: Id<"channels">
  channelName?: string
  categoryName?: string
  userId: string
  content: string
  createdAt: number
  editedAt?: number
  attachments?: Array<{
    storageId: Id<"_storage">
    name: string
    size: number
    type: string
  }>
  mentions?: string[]
}

interface MessagesDataCacheContextType {
  savedMessages: SavedMessage[] | undefined
  mentions: Mention[] | undefined
  unreadMentions: Mention[] | undefined
  savedMessagesLoading: boolean
  mentionsLoading: boolean
  unreadMentionsLoading: boolean
}

const MessagesDataCacheContext = React.createContext<MessagesDataCacheContextType | undefined>(undefined)

interface MessagesDataCacheProviderProps {
  children: React.ReactNode
  organizationId: Id<"organizations"> | undefined
}

export function MessagesDataCacheProvider({ children, organizationId }: MessagesDataCacheProviderProps) {
  // Fetch saved messages - this will be cached and shared across components
  const savedMessages = useQuery(
    api.messages.getSavedMessages,
    organizationId ? { organizationId, limit: 50 } : "skip"
  )

  // Fetch mentions - this will be cached and shared across components
  const mentions = useQuery(
    api.messages.getMentions,
    organizationId ? { organizationId, limit: 50 } : "skip"
  )

  // Fetch unread mentions - this will be cached and shared across components
  const unreadMentions = useQuery(
    api.messages.getUnreadMentions,
    organizationId ? { organizationId, limit: 50 } : "skip"
  )

  const savedMessagesLoading = organizationId !== undefined && savedMessages === undefined
  const mentionsLoading = organizationId !== undefined && mentions === undefined
  const unreadMentionsLoading = organizationId !== undefined && unreadMentions === undefined

  const value = React.useMemo(
    () => ({
      savedMessages: savedMessages as SavedMessage[] | undefined,
      mentions: mentions as Mention[] | undefined,
      unreadMentions: unreadMentions as Mention[] | undefined,
      savedMessagesLoading,
      mentionsLoading,
      unreadMentionsLoading,
    }),
    [savedMessages, mentions, unreadMentions, savedMessagesLoading, mentionsLoading, unreadMentionsLoading]
  )

  return (
    <MessagesDataCacheContext.Provider value={value}>
      {children}
    </MessagesDataCacheContext.Provider>
  )
}

export function useMessagesDataCache() {
  const context = React.useContext(MessagesDataCacheContext)
  if (context === undefined) {
    throw new Error("useMessagesDataCache must be used within a MessagesDataCacheProvider")
  }
  return context
}

// Convenience hooks for individual data types
export function useSavedMessages() {
  const { savedMessages, savedMessagesLoading } = useMessagesDataCache()
  return { savedMessages, isLoading: savedMessagesLoading }
}

export function useMentions() {
  const { mentions, mentionsLoading } = useMessagesDataCache()
  return { mentions, isLoading: mentionsLoading }
}

export function useUnreadMentions() {
  const { unreadMentions, unreadMentionsLoading } = useMessagesDataCache()
  return { unreadMentions, isLoading: unreadMentionsLoading }
}
