"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MagnifyingGlassIcon,
  HashIcon,
  ChatCircleDotsIcon,
  ShareIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react"
import { getIconComponent } from "@/components/icon-picker"
import { useUserDataCache } from "@/components/user-data-cache"

interface ForwardMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messageId: string | null
  messageContent: string
  organizationId: Id<"organizations"> | undefined
  onForwardToChannel: (messageId: string, channelId: string) => void
  onForwardToConversation: (messageId: string, conversationId: string) => void
}

interface ChannelItem {
  type: "channel"
  id: string
  name: string
  categoryName: string
  icon: string
}

interface ConversationItem {
  type: "conversation"
  id: string
  otherParticipantId: string
  otherParticipantName: string
  otherParticipantAvatar?: string
  otherParticipantInitials: string
}

type ForwardTarget = ChannelItem | ConversationItem

export function ForwardMessageDialog({
  open,
  onOpenChange,
  messageId,
  messageContent,
  organizationId,
  onForwardToChannel,
  onForwardToConversation,
}: ForwardMessageDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isForwarding, setIsForwarding] = React.useState(false)
  const { cache: userDataCache, fetchUserData } = useUserDataCache()

  // Fetch channels for the organization
  const categoriesAndChannels = useQuery(
    api.channels.getCategoriesAndChannels,
    organizationId ? { organizationId } : "skip"
  )

  // Fetch user's conversations (DMs)
  const conversations = useQuery(api.conversations.getUserConversations)

  // Fetch user data for conversation participants
  React.useEffect(() => {
    if (conversations && conversations.length > 0) {
      const participantIds = conversations.map((c) => c.otherParticipantId)
      fetchUserData(participantIds)
    }
  }, [conversations, fetchUserData])

  // Build list of all forward targets
  const allTargets: ForwardTarget[] = React.useMemo(() => {
    const targets: ForwardTarget[] = []

    // Add channels
    if (categoriesAndChannels) {
      for (const category of categoriesAndChannels) {
        for (const channel of category.channels) {
          targets.push({
            type: "channel",
            id: channel._id,
            name: channel.name,
            categoryName: category.name,
            icon: channel.icon,
          })
        }
      }
    }

    // Add conversations
    if (conversations) {
      for (const conv of conversations) {
        const userData = userDataCache[conv.otherParticipantId]
        const firstName = userData?.firstName
        const lastName = userData?.lastName
        const imageUrl = userData?.imageUrl

        const name =
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || "Unknown User"

        const initials =
          firstName && lastName
            ? `${firstName[0]}${lastName[0]}`.toUpperCase()
            : firstName?.[0]?.toUpperCase() || "?"

        targets.push({
          type: "conversation",
          id: conv._id,
          otherParticipantId: conv.otherParticipantId,
          otherParticipantName: name,
          otherParticipantAvatar: imageUrl ?? undefined,
          otherParticipantInitials: initials,
        })
      }
    }

    return targets
  }, [categoriesAndChannels, conversations, userDataCache])

  // Filter targets based on search query
  const filteredTargets = React.useMemo(() => {
    if (!searchQuery.trim()) return allTargets

    const query = searchQuery.toLowerCase()
    return allTargets.filter((target) => {
      if (target.type === "channel") {
        return (
          target.name.toLowerCase().includes(query) ||
          target.categoryName.toLowerCase().includes(query)
        )
      } else {
        return target.otherParticipantName.toLowerCase().includes(query)
      }
    })
  }, [allTargets, searchQuery])

  // Separate channels and conversations for grouped display
  const channels = filteredTargets.filter(
    (t): t is ChannelItem => t.type === "channel"
  )
  const conversationItems = filteredTargets.filter(
    (t): t is ConversationItem => t.type === "conversation"
  )

  const handleForward = async (target: ForwardTarget) => {
    if (!messageId || isForwarding) return

    setIsForwarding(true)
    try {
      if (target.type === "channel") {
        await onForwardToChannel(messageId, target.id)
      } else {
        await onForwardToConversation(messageId, target.id)
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to forward message:", error)
    } finally {
      setIsForwarding(false)
    }
  }

  // Reset search when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("")
      setIsForwarding(false)
    }
  }, [open])

  // Truncate message content for preview
  const truncatedContent =
    messageContent.length > 100
      ? messageContent.slice(0, 100) + "..."
      : messageContent

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShareIcon className="size-5" weight="duotone" />
            Forward Message
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Select a channel or person to forward this message to
          </DialogDescription>
        </DialogHeader>

        {/* Message Preview */}
        <div className="px-4 py-3 bg-foreground/[0.03] border-b border-border">
          <div className="text-xs text-muted-foreground mb-1">Forwarding:</div>
          <div className="text-sm text-foreground/80 line-clamp-2">
            {truncatedContent || "(empty message)"}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search channels or people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Target List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
          <div className="p-2">
            {/* Channels Section */}
            {channels.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                  Channels
                </div>
                <div className="space-y-0.5">
                  {channels.map((channel) => {
                    const IconComponent = getIconComponent(channel.icon)
                    return (
                      <button
                        key={channel.id}
                        onClick={() => handleForward(channel)}
                        disabled={isForwarding}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-foreground/[0.05] transition-colors text-left disabled:opacity-50"
                      >
                        <div className="size-8 flex items-center justify-center rounded-md bg-muted">
                          {IconComponent ? (
                            <IconComponent className="size-4 text-muted-foreground" />
                          ) : (
                            <HashIcon className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {channel.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {channel.categoryName}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Direct Messages Section */}
            {conversationItems.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                  Direct Messages
                </div>
                <div className="space-y-0.5">
                  {conversationItems.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleForward(conv)}
                      disabled={isForwarding}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-foreground/[0.05] transition-colors text-left disabled:opacity-50"
                    >
                      <Avatar className="size-8">
                        {conv.otherParticipantAvatar ? (
                          <AvatarImage
                            src={conv.otherParticipantAvatar}
                            alt={conv.otherParticipantName}
                          />
                        ) : null}
                        <AvatarFallback className="bg-secondary text-foreground text-xs font-medium">
                          {conv.otherParticipantInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {conv.otherParticipantName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Direct message
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {channels.length === 0 && conversationItems.length === 0 && (
              <div className="py-8 text-center">
                <ChatCircleDotsIcon className="size-10 mx-auto text-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No matching channels or conversations"
                    : "No destinations available"}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Loading overlay */}
        {isForwarding && (
          <div className="absolute inset-0 bg-card/80 flex items-center justify-center rounded-xl z-10">
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <CircleNotchIcon className="size-4 animate-spin" />
              Forwarding...
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}



