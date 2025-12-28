"use client"

import * as React from "react"
import { useQuery, useAction, useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useParams } from "next/navigation"
import {
  AtIcon,
  ChatCircleIcon,
  CheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface InboxPageProps {
  organizationId: Id<"organizations">
}

interface UserData {
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

export function InboxPage({ organizationId }: InboxPageProps) {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const orgSlug = params?.slug as string | undefined

  // Fetch unread mentions
  const unreadMentions = useQuery(
    api.messages.getUnreadMentions,
    organizationId ? { organizationId, limit: 50 } : "skip"
  )

  // Fetch unread DMs grouped by sender
  const unreadDMs = useQuery(api.messages.getUnreadDMsGroupedBySender)

  // Fetch categories and channels for navigation
  const categoriesData = useQuery(
    api.channels.getCategoriesAndChannels,
    organizationId ? { organizationId } : "skip"
  )

  // Mutations
  const markMentionAsRead = useMutation(api.messages.markMentionAsRead)
  const markAllMentionsAsRead = useMutation(api.messages.markAllMentionsAsRead)
  const markConversationAsRead = useMutation(api.conversations.markConversationAsRead)

  // User data cache
  const getUserDataAction = useAction(api.messages.getUserData)
  const [userDataCache, setUserDataCache] = React.useState<Record<string, UserData>>({})

  // Fetch user data for message authors and DM participants
  React.useEffect(() => {
    const userIds = new Set<string>()

    // Add mention authors
    unreadMentions?.forEach((mention) => {
      userIds.add(mention.userId)
    })

    // Add DM participants
    unreadDMs?.forEach((dm) => {
      userIds.add(dm.otherParticipantId)
    })

    const missingIds = Array.from(userIds).filter((id) => !userDataCache[id])

    if (missingIds.length === 0) return

    const fetchUserData = async () => {
      try {
        const usersData = await getUserDataAction({ userIds: missingIds })
        const newCache: Record<string, UserData> = {}
        usersData.forEach((userData) => {
          newCache[userData.userId] = userData
        })
        setUserDataCache((prev) => ({ ...prev, ...newCache }))
      } catch {
        // Ignore errors
      }
    }

    fetchUserData()
  }, [unreadMentions, unreadDMs, getUserDataAction, userDataCache])

  // Helper functions
  const getUserName = (userId: string) => {
    const userData = userDataCache[userId]
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`
    }
    if (userData?.firstName) {
      return userData.firstName
    }
    if (user?.id === userId) {
      return user.firstName || "You"
    }
    return "Unknown User"
  }

  const getUserInitials = (userId: string) => {
    const userData = userDataCache[userId]
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    }
    if (userData?.firstName) {
      return userData.firstName[0].toUpperCase()
    }
    if (user?.id === userId && user.firstName) {
      return user.firstName[0].toUpperCase()
    }
    return "?"
  }

  const getUserImage = (userId: string) => {
    const userData = userDataCache[userId]
    if (userData?.imageUrl) return userData.imageUrl
    if (user?.id === userId) return user.imageUrl
    return null
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  // Create a map of channelId to channel info for quick lookup
  const channelMap = React.useMemo(() => {
    if (!categoriesData) return new Map<Id<"channels">, { name: string; categoryName: string }>()
    const map = new Map<Id<"channels">, { name: string; categoryName: string }>()
    categoriesData.forEach((category) => {
      category.channels.forEach((channel) => {
        map.set(channel._id, { name: channel.name, categoryName: category.name })
      })
    })
    return map
  }, [categoriesData])

  // Handle mention click - navigate to channel
  const handleMentionClick = async (mention: { _id: Id<"messages">; channelId?: Id<"channels">; channelName?: string; categoryName?: string }) => {
    if (!orgSlug || !mention.channelId) return

    // Mark as read
    await markMentionAsRead({ messageId: mention._id })

    // Navigate to the channel
    const channelInfo = channelMap.get(mention.channelId) || {
      name: mention.channelName || "",
      categoryName: mention.categoryName || "",
    }

    if (channelInfo.categoryName && channelInfo.name) {
      router.push(`/w/${orgSlug}/${encodeURIComponent(channelInfo.categoryName.toLowerCase())}/${encodeURIComponent(channelInfo.name.toLowerCase())}`)
    }
  }

  // Handle DM click - navigate to conversation
  const handleDMClick = async (dm: { conversationId: Id<"conversations"> }) => {
    if (!orgSlug) return

    // Mark conversation as read
    await markConversationAsRead({ conversationId: dm.conversationId })

    // Navigate to the conversation
    router.push(`/w/${orgSlug}/messages/${dm.conversationId}`)
  }

  // Handle mark all mentions as read
  const handleMarkAllMentionsAsRead = async () => {
    if (!organizationId) return
    await markAllMentionsAsRead({ organizationId })
  }

  // Handle marking single mention as read without navigating
  const handleMarkMentionAsRead = async (e: React.MouseEvent, messageId: Id<"messages">) => {
    e.stopPropagation()
    await markMentionAsRead({ messageId })
  }

  const hasMentions = (unreadMentions?.length ?? 0) > 0
  const hasDMs = (unreadDMs?.length ?? 0) > 0
  const isEmpty = !hasMentions && !hasDMs

  return (
    <ScrollArea className="h-full flex-1">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#26251E]">Inbox</h1>
            <p className="text-sm text-[#26251E]/60">
              Your unread mentions and direct messages
            </p>
          </div>
          {hasMentions && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllMentionsAsRead}
              className="text-[#26251E]/70 hover:text-[#26251E]"
            >
              <CheckCircleIcon className="size-4 mr-1.5" />
              Mark all as read
            </Button>
          )}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#26251E]/5 mb-4">
              <CheckIcon className="size-8 text-[#26251E]/40" weight="light" />
            </div>
            <h2 className="text-lg font-medium text-[#26251E] mb-1">All caught up!</h2>
            <p className="text-sm text-[#26251E]/50 max-w-sm">
              You have no unread mentions or direct messages. New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Mentions Section */}
            {hasMentions && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <AtIcon className="size-5 text-[#26251E]/70" weight="bold" />
                  <h2 className="text-sm font-semibold text-[#26251E] uppercase tracking-wide">
                    Mentions
                  </h2>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#26251E] px-1.5 text-[10px] font-semibold text-white">
                    {unreadMentions?.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {unreadMentions?.map((mention) => {
                    const authorName = getUserName(mention.userId)
                    const authorInitials = getUserInitials(mention.userId)
                    const authorImage = getUserImage(mention.userId)

                    return (
                      <div
                        key={mention._id}
                        onClick={() => handleMentionClick(mention)}
                        className="group flex items-start gap-3 rounded-lg border border-[#26251E]/10 bg-white p-4 hover:border-[#26251E]/20 hover:bg-[#26251E]/[0.02] transition-colors cursor-pointer"
                      >
                        <Avatar className="size-10 flex-shrink-0">
                          <AvatarImage src={authorImage || undefined} alt={authorName} />
                          <AvatarFallback className="text-xs bg-[#26251E]/10 text-[#26251E]">
                            {authorInitials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-[#26251E]">{authorName}</p>
                            {mention.channelName && (
                              <span className="text-xs text-[#26251E]/40">
                                in #{mention.channelName}
                              </span>
                            )}
                            <span className="text-xs text-[#26251E]/40 ml-auto flex-shrink-0">
                              {formatTime(mention.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-[#26251E]/70 line-clamp-2">
                            {mention.content}
                          </p>
                        </div>

                        {/* Mark as read button on hover */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleMarkMentionAsRead(e, mention._id)}
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#26251E]/40 hover:text-[#26251E]"
                          title="Mark as read"
                        >
                          <CheckIcon className="size-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Direct Messages Section */}
            {hasDMs && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ChatCircleIcon className="size-5 text-[#26251E]/70" weight="bold" />
                  <h2 className="text-sm font-semibold text-[#26251E] uppercase tracking-wide">
                    Direct Messages
                  </h2>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#26251E] px-1.5 text-[10px] font-semibold text-white">
                    {unreadDMs?.reduce((sum, dm) => sum + dm.unreadCount, 0)}
                  </span>
                </div>

                <div className="space-y-2">
                  {unreadDMs?.map((dm) => {
                    const participantName = getUserName(dm.otherParticipantId)
                    const participantInitials = getUserInitials(dm.otherParticipantId)
                    const participantImage = getUserImage(dm.otherParticipantId)

                    return (
                      <div
                        key={dm.conversationId}
                        onClick={() => handleDMClick(dm)}
                        className="group flex items-start gap-3 rounded-lg border border-[#26251E]/10 bg-white p-4 hover:border-[#26251E]/20 hover:bg-[#26251E]/[0.02] transition-colors cursor-pointer"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="size-10">
                            <AvatarImage src={participantImage || undefined} alt={participantName} />
                            <AvatarFallback className="text-xs bg-[#26251E]/10 text-[#26251E]">
                              {participantInitials}
                            </AvatarFallback>
                          </Avatar>
                          {/* Unread count badge */}
                          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                            {dm.unreadCount > 99 ? "99+" : dm.unreadCount}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-[#26251E]">{participantName}</p>
                            <span className="text-xs text-[#26251E]/40">
                              {dm.unreadCount} unread {dm.unreadCount === 1 ? "message" : "messages"}
                            </span>
                            {dm.lastMessage && (
                              <span className="text-xs text-[#26251E]/40 ml-auto flex-shrink-0">
                                {formatTime(dm.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          {dm.lastMessage && (
                            <p className="text-sm text-[#26251E]/70 line-clamp-2">
                              {dm.lastMessage.userId === user?.id ? (
                                <span className="text-[#26251E]/40">You: </span>
                              ) : null}
                              {dm.lastMessage.content}
                            </p>
                          )}
                        </div>

                        <ArrowRightIcon className="size-4 text-[#26251E]/30 group-hover:text-[#26251E]/60 flex-shrink-0 mt-3 transition-colors" />
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

