"use client"

import * as React from "react"
import { useQuery, useAction } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useParams } from "next/navigation"
import { HashIcon, BookmarkIcon, AtIcon, ArrowRightIcon } from "@phosphor-icons/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { getIconComponent } from "@/components/icon-picker"
import type { Message } from "@/components/preview/message-list"
import { parseMentions } from "./mention"

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

  // Fetch saved messages instead of recent messages
  const savedMessagesRaw = useQuery(
    api.messages.getSavedMessages,
    organizationId ? { organizationId, limit: 5 } : "skip"
  )

  const mentionsRaw = useQuery(
    api.messages.getMentions,
    organizationId ? { organizationId, limit: 5 } : "skip"
  )

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

  const savedMessages = (savedMessagesRaw || []).filter(m => m.channelId).map(formatMessage).filter((m): m is Message => m !== null)
  const mentions = (mentionsRaw || []).filter(m => m.channelId).map(formatMessage).filter((m): m is Message => m !== null)

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
      }))
    )
  }, [categoriesData])

  const handleChannelClick = (channelId: Id<"channels">, categoryName: string, channelName: string) => {
    // Navigate to the channel page
    if (orgSlug) {
      router.push(`/w/${orgSlug}/${encodeURIComponent(categoryName)}/${encodeURIComponent(channelName)}`)
    }
  }

  const handleViewAllSaved = () => {
    if (orgSlug) {
      router.push(`/w/${orgSlug}/saved`)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your saved messages and quick access to channels
          </p>
        </div>

        {/* Cards Grid */}
        <div className="mb-6 sm:mb-8 grid gap-4 md:grid-cols-2">
          {/* Saved Messages Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <BookmarkIcon className="size-4" weight="fill" />
                Saved Messages
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Messages you've saved for later</CardDescription>
            </CardHeader>
            <CardContent>
              {savedMessages.length === 0 ? (
                <div className="flex h-20 sm:h-24 items-center justify-center rounded-md border border-dashed border-border">
                  <p className="text-xs sm:text-sm text-muted-foreground">No saved messages</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedMessages.map((message) => {
                    const channel = savedMessagesRaw?.find(m => m._id === message.id)
                    const channelInfo = channel?.channelId ? channelMap.get(channel.channelId) : null
                    const msgWithMentions = message as Message & { mentionUserNames?: Record<string, string> }
                    return (
                      <div
                        key={message.id}
                        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:border-border/80 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (channel?.channelId && channelInfo) {
                            handleChannelClick(channel.channelId, channelInfo.categoryName, channelInfo.name)
                          }
                        }}
                      >
                        <Avatar className="size-8 flex-shrink-0">
                          <AvatarImage src={message.user.avatar} alt={message.user.name} />
                          <AvatarFallback className="text-sm">{message.user.initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{message.user.name}</p>
                            {channelInfo && (
                              <p className="text-sm text-foreground/40 truncate">in {channelInfo.name}</p>
                            )}
                            <p className="text-sm text-foreground/50 ml-auto flex-shrink-0">{message.timestamp}</p>
                          </div>
                          <p className="text-sm text-foreground/70 line-clamp-2">
                            {msgWithMentions.mentionUserNames 
                              ? parseMentions(message.content, msgWithMentions.mentionUserNames)
                              : message.content
                            }
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {savedMessages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-sm text-muted-foreground hover:text-foreground"
                      onClick={handleViewAllSaved}
                    >
                      View all saved messages
                      <ArrowRightIcon className="size-4 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mentions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <AtIcon className="size-4" />
                Mentions
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Messages where you were mentioned</CardDescription>
            </CardHeader>
            <CardContent>
              {mentions.length === 0 ? (
                <div className="flex h-20 sm:h-24 items-center justify-center rounded-md border border-dashed border-border">
                  <p className="text-xs sm:text-sm text-muted-foreground">No mentions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mentions.map((message) => {
                    const channel = mentionsRaw?.find(m => m._id === message.id)
                    const channelInfo = channel?.channelId ? channelMap.get(channel.channelId) : null
                    const msgWithMentions = message as Message & { mentionUserNames?: Record<string, string> }
                    return (
                      <div
                        key={message.id}
                        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:border-border/80 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (channel?.channelId && channelInfo) {
                            handleChannelClick(channel.channelId, channelInfo.categoryName, channelInfo.name)
                          }
                        }}
                      >
                        <Avatar className="size-8 flex-shrink-0">
                          <AvatarImage src={message.user.avatar} alt={message.user.name} />
                          <AvatarFallback className="text-sm">{message.user.initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{message.user.name}</p>
                            {channelInfo && (
                              <p className="text-sm text-foreground/40 truncate">in {channelInfo.name}</p>
                            )}
                            <p className="text-sm text-foreground/50 ml-auto flex-shrink-0">{message.timestamp}</p>
                          </div>
                          <p className="text-sm text-foreground/70 line-clamp-2">
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
            </CardContent>
          </Card>
        </div>

        {/* Channels List */}
        <div>
          <h2 className="mb-3 sm:mb-4 text-xs sm:text-sm font-medium text-muted-foreground">All Channels</h2>
          {allChannels.length === 0 ? (
            <div className="flex h-20 sm:h-24 items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-xs sm:text-sm text-muted-foreground">No channels available</p>
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
                    className="flex items-center gap-2.5 sm:gap-3 rounded-lg border border-border bg-card p-2.5 sm:p-3 text-left transition-colors hover:border-border/80 hover:bg-muted/50"
                  >
                    <div className="flex size-7 sm:size-8 items-center justify-center rounded-md bg-muted flex-shrink-0">
                      <Icon className="size-3.5 sm:size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs sm:text-sm font-medium text-foreground">
                        {channel.name}
                      </p>
                      <p className="truncate text-[10px] sm:text-xs text-muted-foreground">
                        {channel.categoryName}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
