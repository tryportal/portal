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
import { parseMentions } from "./mention"

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
      // Add mentioned users if available
      if (mention.mentions) {
        mention.mentions.forEach((mentionedUserId: string) => {
          userIds.add(mentionedUserId)
        })
      }
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
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Inbox</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your unread mentions and direct messages
            </p>
          </div>
          {hasMentions && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllMentionsAsRead}
              className="text-foreground/70 hover:text-foreground text-xs sm:text-sm self-start sm:self-auto"
            >
              <CheckCircleIcon className="size-3.5 sm:size-4 mr-1.5" />
              Mark all as read
            </Button>
          )}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <div className="flex size-14 sm:size-16 items-center justify-center rounded-full bg-muted mb-3 sm:mb-4">
              <CheckIcon className="size-6 sm:size-8 text-muted-foreground" weight="light" />
            </div>
            <h2 className="text-base sm:text-lg font-medium text-foreground mb-1">All caught up!</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
              You have no unread mentions or direct messages. New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Mentions Section */}
            {hasMentions && (
              <section>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <AtIcon className="size-4 sm:size-5 text-foreground/70" weight="bold" />
                  <h2 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide">
                    Mentions
                  </h2>
                  <span className="flex h-4 sm:h-5 min-w-4 sm:min-w-5 items-center justify-center rounded-full bg-foreground px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-semibold text-background">
                    {unreadMentions?.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {unreadMentions?.map((mention) => {
                    const authorName = getUserName(mention.userId)
                    const authorInitials = getUserInitials(mention.userId)
                    const authorImage = getUserImage(mention.userId)

                    // Build mention user names map
                    const mentionUserNames: Record<string, string> = {}
                    if (mention.mentions) {
                      mention.mentions.forEach((userId: string) => {
                        mentionUserNames[userId] = getUserName(userId)
                      })
                    }

                    return (
                      <div
                        key={mention._id}
                        onClick={() => handleMentionClick(mention)}
                        className="group flex items-start gap-2.5 sm:gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 hover:border-border/80 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Avatar className="size-8 sm:size-10 flex-shrink-0">
                          <AvatarImage src={authorImage || undefined} alt={authorName} />
                          <AvatarFallback className="text-[10px] sm:text-xs bg-secondary text-foreground">
                            {authorInitials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                            <p className="text-xs sm:text-sm font-medium text-foreground">{authorName}</p>
                            {mention.channelName && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                in #{mention.channelName}
                              </span>
                            )}
                            <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto flex-shrink-0">
                              {formatTime(mention.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-foreground/70 line-clamp-2">
                            {parseMentions(mention.content, mentionUserNames)}
                          </p>
                        </div>

                        {/* Mark as read button on hover */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleMarkMentionAsRead(e, mention._id)}
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-muted-foreground hover:text-foreground hidden sm:flex"
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
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <ChatCircleIcon className="size-4 sm:size-5 text-foreground/70" weight="bold" />
                  <h2 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide">
                    Direct Messages
                  </h2>
                  <span className="flex h-4 sm:h-5 min-w-4 sm:min-w-5 items-center justify-center rounded-full bg-foreground px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-semibold text-background">
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
                        className="group flex items-start gap-2.5 sm:gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 hover:border-border/80 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="size-8 sm:size-10">
                            <AvatarImage src={participantImage || undefined} alt={participantName} />
                            <AvatarFallback className="text-[10px] sm:text-xs bg-secondary text-foreground">
                              {participantInitials}
                            </AvatarFallback>
                          </Avatar>
                          {/* Unread count badge */}
                          <span className="absolute -top-1 -right-1 flex h-4 sm:h-5 min-w-4 sm:min-w-5 items-center justify-center rounded-full bg-red-500 px-0.5 sm:px-1 text-[9px] sm:text-[10px] font-semibold text-white ring-2 ring-background">
                            {dm.unreadCount > 99 ? "99+" : dm.unreadCount}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                            <p className="text-xs sm:text-sm font-medium text-foreground">{participantName}</p>
                            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                              {dm.unreadCount} unread {dm.unreadCount === 1 ? "message" : "messages"}
                            </span>
                            {dm.lastMessage && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto flex-shrink-0">
                                {formatTime(dm.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          {dm.lastMessage && (
                            <p className="text-xs sm:text-sm text-foreground/70 line-clamp-2">
                              {dm.lastMessage.userId === user?.id ? (
                                <span className="text-muted-foreground">You: </span>
                              ) : null}
                              {dm.lastMessage.content}
                            </p>
                          )}
                        </div>

                        <ArrowRightIcon className="size-3.5 sm:size-4 text-foreground/30 group-hover:text-muted-foreground flex-shrink-0 mt-2 sm:mt-3 transition-colors" />
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

