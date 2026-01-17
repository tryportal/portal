"use client"

import * as React from "react"
import { useQuery, useAction } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useParams } from "next/navigation"
import {
  HashIcon,
  BookmarkIcon,
  AtIcon,
  ArrowRightIcon,
  LockIcon,
  HouseIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { getIconComponent } from "@/components/icon-picker"
import type { Message } from "@/components/preview/message-list"
import { parseMentions } from "./mention"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useSavedMessages, useMentions } from "@/components/messages-data-cache"


function formatFullDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatTime(timestamp: number): string {
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

interface OverviewPageProps {
  organizationId: Id<"organizations">
}

export function OverviewPage({ organizationId }: OverviewPageProps) {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const orgSlug = params?.slug as string | undefined
  
  // Fetch categories and channels
  const categoriesData = useQuery(
    api.channels.getCategoriesAndChannels,
    organizationId ? { organizationId } : "skip"
  )

  // Use cached saved messages and mentions
  const { savedMessages: savedMessagesRaw, isLoading: savedMessagesLoading } = useSavedMessages()
  const { mentions: mentionsRaw, isLoading: mentionsLoading } = useMentions()

  // Fetch user data
  const getUserDataAction = useAction(api.messages.getUserData)
  const [userDataCache, setUserDataCache] = React.useState<Record<string, {
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
  }>>({})

  // Fetch user data for messages
  React.useEffect(() => {
    if (!savedMessagesRaw && !mentionsRaw) return

    const allMessages = [
      ...(savedMessagesRaw || []),
      ...(mentionsRaw || [])
    ]

    const uniqueUserIds = Array.from(new Set([
      ...allMessages.map(msg => msg.userId),
      ...allMessages.flatMap(msg => msg.mentions || [])
    ]))
    const missingUserIds = uniqueUserIds.filter(userId => !userDataCache[userId])

    if (missingUserIds.length === 0) return

    const fetchUserData = async () => {
      try {
        const usersData = await getUserDataAction({ userIds: missingUserIds })
        const newCache: typeof userDataCache = {}
        usersData.forEach(userData => {
          newCache[userData.userId] = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            imageUrl: userData.imageUrl,
          }
        })
        setUserDataCache(prev => ({ ...prev, ...newCache }))
      } catch {
        // Ignore errors
      }
    }

    fetchUserData()
  }, [savedMessagesRaw, mentionsRaw, getUserDataAction, userDataCache])

  // Format messages
  const formatMessage = (msg: { _id: Id<"messages">; channelId?: Id<"channels">; userId: string; content: string; createdAt: number; editedAt?: number; attachments?: Array<{ storageId: Id<"_storage">; name: string; size: number; type: string }>; mentions?: string[] }): Message | null => {
    const cachedUserData = userDataCache[msg.userId]
    const firstName = cachedUserData?.firstName ?? (user?.id === msg.userId ? user?.firstName : null)
    const lastName = cachedUserData?.lastName ?? (user?.id === msg.userId ? user?.lastName : null)
    const imageUrl = cachedUserData?.imageUrl ?? (user?.id === msg.userId ? user?.imageUrl : null)
    
    const name = firstName && lastName 
      ? `${firstName} ${lastName}`
      : firstName || "Unknown User"
    
    const initials = firstName && lastName
      ? `${firstName[0]}${lastName[0]}`
      : firstName?.[0] || "?"

    // Build mention user names map
    const mentionUserNames: Record<string, string> = {}
    if (msg.mentions) {
      msg.mentions.forEach((userId: string) => {
        const mentionedUserData = userDataCache[userId]
        if (mentionedUserData) {
          const mentionedName = mentionedUserData.firstName && mentionedUserData.lastName
            ? `${mentionedUserData.firstName} ${mentionedUserData.lastName}`
            : mentionedUserData.firstName || "Unknown User"
          mentionUserNames[userId] = mentionedName
        }
      })
    }

    return {
      id: msg._id,
      content: msg.content,
      timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      }),
      createdAt: msg.createdAt,
      user: {
        id: msg.userId,
        name,
        avatar: imageUrl || undefined,
        initials,
      },
      attachments: msg.attachments?.map(att => ({
        storageId: att.storageId,
        name: att.name,
        size: att.size,
        type: att.type,
      })),
      editedAt: msg.editedAt,
      mentions: msg.mentions,
      mentionUserNames,
    } as Message & { mentionUserNames: Record<string, string> }
  }

  const savedMessages = (savedMessagesRaw || []).filter(m => m.channelId).map(formatMessage).filter((m): m is Message => m !== null).slice(0, 3)
  const mentions = (mentionsRaw || []).filter(m => m.channelId).map(formatMessage).filter((m): m is Message => m !== null).slice(0, 3)

  // Create a map of channelId to channel info for quick lookup
  const channelMap = React.useMemo(() => {
    if (!categoriesData) return new Map()
    const map = new Map<Id<"channels">, { name: string; categoryName: string }>()
    categoriesData.forEach(category => {
      category.channels.forEach(channel => {
        map.set(channel._id, { name: channel.name, categoryName: category.name })
      })
    })
    return map
  }, [categoriesData])

  // Flatten all channels from all categories
  const allChannels = React.useMemo(() => {
    if (!categoriesData) return []
    return categoriesData.flatMap((category) =>
      category.channels.map((channel) => ({
        _id: channel._id,
        name: channel.name,
        icon: channel.icon,
        categoryName: category.name,
        isPrivate: channel.isPrivate,
      }))
    )
  }, [categoriesData])

  const handleChannelClick = (channelId: Id<"channels">, categoryName: string, channelName: string) => {
    if (orgSlug) {
      router.push(`/w/${orgSlug}/${encodeURIComponent(categoryName)}/${encodeURIComponent(channelName)}`)
    }
  }

  const handleViewAllSaved = () => {
    if (orgSlug) {
      router.push(`/w/${orgSlug}/saved`)
    }
  }

  const isLoading = savedMessagesLoading || mentionsLoading
  const hasSavedMessages = savedMessages.length > 0
  const hasMentions = mentions.length > 0

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
        <HouseIcon className="size-4 sm:size-5 text-foreground" weight="fill" />
        <h1 className="text-sm sm:text-base font-semibold text-foreground">Overview</h1>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {/* Quick Access Section */}
              {(hasSavedMessages || hasMentions) && (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {/* Saved Messages */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BookmarkIcon className="size-4 text-foreground/70" weight="fill" />
                        <h2 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide">
                          Saved
                        </h2>
                        {hasSavedMessages && (
                          <span className="flex h-4 sm:h-5 min-w-4 sm:min-w-5 items-center justify-center rounded-full bg-muted px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-medium text-muted-foreground">
                            {savedMessagesRaw?.length || 0}
                          </span>
                        )}
                      </div>
                      {hasSavedMessages && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleViewAllSaved}
                          className="text-xs text-muted-foreground hover:text-foreground -mr-2"
                        >
                          View all
                          <ArrowRightIcon className="size-3 ml-1" />
                        </Button>
                      )}
                    </div>

                    {!hasSavedMessages ? (
                      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                        <p className="text-xs text-muted-foreground">No saved messages</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {savedMessages.map((message) => {
                          const channel = savedMessagesRaw?.find(m => m._id === message.id)
                          const channelInfo = channel?.channelId ? channelMap.get(channel.channelId) : null
                          const msgWithMentions = message as Message & { mentionUserNames?: Record<string, string> }
                          return (
                            <div
                              key={message.id}
                              className="group flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5 sm:p-3 hover:border-border/80 hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => {
                                if (channel?.channelId && channelInfo) {
                                  handleChannelClick(channel.channelId, channelInfo.categoryName, channelInfo.name)
                                }
                              }}
                            >
                              <Avatar className="size-7 sm:size-8 flex-shrink-0">
                                <AvatarImage src={message.user.avatar} alt={message.user.name} />
                                <AvatarFallback className="text-[10px] sm:text-xs">{message.user.initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{message.user.name}</p>
                                  <span 
                                    className="text-[10px] sm:text-xs text-muted-foreground ml-auto flex-shrink-0 cursor-default"
                                    title={message.createdAt ? formatFullDateTime(message.createdAt) : undefined}
                                  >
                                    {message.createdAt ? formatTime(message.createdAt) : message.timestamp}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-foreground/70 line-clamp-1">
                                  {msgWithMentions.mentionUserNames
                                    ? parseMentions(message.content, msgWithMentions.mentionUserNames)
                                    : message.content
                                  }
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  {/* Mentions */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <AtIcon className="size-4 text-foreground/70" weight="bold" />
                      <h2 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide">
                        Mentions
                      </h2>
                      {hasMentions && (
                        <span className="flex h-4 sm:h-5 min-w-4 sm:min-w-5 items-center justify-center rounded-full bg-muted px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-medium text-muted-foreground">
                          {mentionsRaw?.length || 0}
                        </span>
                      )}
                    </div>

                    {!hasMentions ? (
                      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                        <p className="text-xs text-muted-foreground">No mentions</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mentions.map((message) => {
                          const channel = mentionsRaw?.find(m => m._id === message.id)
                          const channelInfo = channel?.channelId ? channelMap.get(channel.channelId) : null
                          const msgWithMentions = message as Message & { mentionUserNames?: Record<string, string> }
                          return (
                            <div
                              key={message.id}
                              className="group flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5 sm:p-3 hover:border-border/80 hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => {
                                if (channel?.channelId && channelInfo) {
                                  handleChannelClick(channel.channelId, channelInfo.categoryName, channelInfo.name)
                                }
                              }}
                            >
                              <Avatar className="size-7 sm:size-8 flex-shrink-0">
                                <AvatarImage src={message.user.avatar} alt={message.user.name} />
                                <AvatarFallback className="text-[10px] sm:text-xs">{message.user.initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{message.user.name}</p>
                                  <span 
                                    className="text-[10px] sm:text-xs text-muted-foreground ml-auto flex-shrink-0 cursor-default"
                                    title={message.createdAt ? formatFullDateTime(message.createdAt) : undefined}
                                  >
                                    {message.createdAt ? formatTime(message.createdAt) : message.timestamp}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-foreground/70 line-clamp-1">
                                  {msgWithMentions.mentionUserNames
                                    ? parseMentions(message.content, msgWithMentions.mentionUserNames)
                                    : message.content
                                  }
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* Channels Section */}
              <section>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <HashIcon className="size-4 text-foreground/70" weight="bold" />
                  <h2 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide">
                    Channels
                  </h2>
                  <span className="flex h-4 sm:h-5 min-w-4 sm:min-w-5 items-center justify-center rounded-full bg-muted px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-medium text-muted-foreground">
                    {allChannels.length}
                  </span>
                </div>

                {allChannels.length === 0 ? (
                  <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                    <p className="text-xs text-muted-foreground">No channels available</p>
                  </div>
                ) : (
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {allChannels.map((channel) => {
                      const Icon = channel.icon ? getIconComponent(channel.icon) : HashIcon
                      return (
                        <button
                          key={channel._id}
                          onClick={() => {
                            const catData = categoriesData?.find(cat => 
                              cat.channels.some(ch => ch._id === channel._id)
                            )
                            if (catData) {
                              handleChannelClick(channel._id, catData.name, channel.name)
                            }
                          }}
                          className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 sm:p-3 text-left transition-colors hover:border-border/80 hover:bg-muted/50"
                        >
                          <div className="flex size-7 sm:size-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                            <Icon className="size-3.5 sm:size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-xs sm:text-sm font-medium text-foreground">
                                {channel.name}
                              </p>
                              {channel.isPrivate && (
                                <LockIcon className="size-3 text-muted-foreground shrink-0" weight="bold" />
                              )}
                            </div>
                            <p className="truncate text-[10px] sm:text-xs text-muted-foreground">
                              {channel.categoryName}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
