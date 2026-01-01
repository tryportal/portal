"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { useQuery, useMutation, useAction } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { BookmarkIcon, ArrowLeftIcon, HashIcon } from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { parseMentions } from "./mention"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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

interface SavedMessagesPageProps {
  organizationId: Id<"organizations">
}

export function SavedMessagesPage({ organizationId }: SavedMessagesPageProps) {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const orgSlug = params?.slug as string | undefined

  // Fetch saved messages
  const savedMessages = useQuery(
    api.messages.getSavedMessages,
    organizationId ? { organizationId, limit: 50 } : "skip"
  )

  // Fetch channels for navigation
  const categoriesData = useQuery(
    api.channels.getCategoriesAndChannels,
    organizationId ? { organizationId } : "skip"
  )

  // Unsave mutation
  const unsaveMessage = useMutation(api.messages.unsaveMessage)

  // Fetch user data for message authors
  const getUserDataAction = useAction(api.messages.getUserData)
  const [userDataCache, setUserDataCache] = React.useState<Record<string, {
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
  }>>({})

  // Fetch user data for messages
  React.useEffect(() => {
    if (!savedMessages || savedMessages.length === 0) return

    const uniqueUserIds = Array.from(new Set([
      ...savedMessages.map(msg => msg.userId),
      ...savedMessages.flatMap(msg => msg.mentions || [])
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
  }, [savedMessages, getUserDataAction, userDataCache])

  // Create channel map for navigation
  const channelMap = React.useMemo(() => {
    if (!categoriesData) return new Map<string, { name: string; categoryName: string }>()
    const map = new Map<string, { name: string; categoryName: string }>()
    categoriesData.forEach(category => {
      category.channels.forEach(channel => {
        map.set(channel._id, { name: channel.name, categoryName: category.name })
      })
    })
    return map
  }, [categoriesData])

  const handleMessageClick = (channelId: string | undefined) => {
    if (!channelId) return
    const channelInfo = channelMap.get(channelId as Id<"channels">)
    if (channelInfo && orgSlug) {
      router.push(`/w/${orgSlug}/${encodeURIComponent(channelInfo.categoryName)}/${encodeURIComponent(channelInfo.name)}`)
    }
  }

  const handleUnsave = async (messageId: string) => {
    try {
      await unsaveMessage({ messageId: messageId as Id<"messages"> })
    } catch (error) {
      console.error("Failed to unsave message:", error)
    }
  }

  const formatMessage = (msg: NonNullable<typeof savedMessages>[number]) => {
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

    // Build user names map for mentions
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
      channelId: msg.channelId,
      content: msg.content,
      mentions: msg.mentions,
      mentionUserNames,
      timestamp: new Date(msg.createdAt).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      createdAt: msg.createdAt,
      user: {
        id: msg.userId,
        name,
        avatar: imageUrl || undefined,
        initials,
      },
    }
  }

  const formattedMessages = (savedMessages || []).map(formatMessage)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex h-12 items-center gap-3 border-b border-border bg-background px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <BookmarkIcon className="size-5 text-foreground" weight="fill" />
          <h1 className="text-base font-semibold text-foreground">Saved Messages</h1>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {formattedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <BookmarkIcon className="size-12 text-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">No saved messages</p>
              <p className="text-xs text-muted-foreground">
                Save messages to find them easily later
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {formattedMessages.map((message) => {
                const channelInfo = message.channelId ? channelMap.get(message.channelId as Id<"channels">) : null
                return (
                  <div
                    key={message.id}
                    className="group relative rounded-lg border border-border bg-card p-3 hover:border-border/80 transition-colors cursor-pointer"
                    onClick={() => handleMessageClick(message.channelId)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-8 flex-shrink-0">
                        {message.user.avatar && (
                          <AvatarImage src={message.user.avatar} alt={message.user.name} />
                        )}
                        <AvatarFallback className="text-xs bg-secondary text-foreground">
                          {message.user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {message.user.name}
                          </span>
                          {channelInfo && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <HashIcon className="size-3" />
                              {channelInfo.name}
                            </span>
                          )}
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-xs text-muted-foreground ml-auto cursor-default">
                                {message.timestamp}
                              </span>
                            </TooltipTrigger>
                            {message.createdAt && (
                              <TooltipContent>
                                {formatFullDateTime(message.createdAt)}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                        <p className="text-sm text-foreground/70 line-clamp-3">
                          {parseMentions(message.content, message.mentionUserNames)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnsave(message.id)
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                      title="Remove from saved"
                    >
                      <BookmarkIcon className="size-3.5 text-muted-foreground" weight="fill" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
