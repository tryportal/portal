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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  HashIcon,
  MagnifyingGlassIcon,
  ChatCircleIcon,
  UserIcon,
  PaperclipIcon,
  LinkIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react"
import { getIconComponent } from "@/components/icon-picker"

type ForwardDestinationType = "channel" | "conversation"

interface ForwardMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messageId?: Id<"messages"> | string
  messageContent?: string
  messageAttachments?: Array<{ name: string }>
  messageLinkEmbed?: { url: string }
  organizationId?: Id<"organizations"> | string
  currentChannelId?: Id<"channels"> | string
  currentConversationId?: Id<"conversations"> | string
  onForwardToChannel?: (messageId: string, channelId: string) => Promise<void>
  onForwardToConversation?: (messageId: string, conversationId: string) => Promise<void>
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  messageId,
  messageContent,
  messageAttachments,
  messageLinkEmbed,
  organizationId,
  currentChannelId,
  currentConversationId,
  onForwardToChannel,
  onForwardToConversation,
}: ForwardMessageDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [destinationType, setDestinationType] = React.useState<ForwardDestinationType>("channel")
  const [selectedDestination, setSelectedDestination] = React.useState<{
    type: ForwardDestinationType
    id: string
    name: string
  } | null>(null)
  const [isForwarding, setIsForwarding] = React.useState(false)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSearchQuery("")
      setSelectedDestination(null)
      setIsForwarding(false)
    }
  }, [open])

  // Query channels for the organization
  const categoriesAndChannels = useQuery(
    api.channels.getCategoriesAndChannels,
    organizationId ? { organizationId: organizationId as Id<"organizations"> } : "skip"
  )

  // Query user's conversations
  const conversations = useQuery(api.conversations.getUserConversations)

  // Get unique user IDs from conversations to fetch their data
  const conversationUserIds = React.useMemo(() => {
    if (!conversations) return []
    return conversations.map((conv) => conv.otherParticipantId)
  }, [conversations])

  // Fetch user data for conversation participants
  const userData = useQuery(
    api.users.getUserData,
    conversationUserIds.length > 0 ? { userIds: conversationUserIds } : "skip"
  )

  // Create a map of user ID to user data
  const userDataMap = React.useMemo(() => {
    if (!userData) return {}
    return Object.fromEntries(userData.map((u) => [u.userId, u]))
  }, [userData])

  // Flatten all channels from all categories into a single list
  const allChannels = React.useMemo(() => {
    if (!categoriesAndChannels) return []
    return categoriesAndChannels.flatMap((category) => category.channels)
  }, [categoriesAndChannels])

  // Filter channels based on search
  const filteredChannels = React.useMemo(() => {
    if (!allChannels.length) return []
    if (!searchQuery.trim()) return allChannels

    const query = searchQuery.toLowerCase().trim()
    return allChannels.filter((channel) =>
      channel.name.toLowerCase().includes(query)
    )
  }, [allChannels, searchQuery])

  // Filter conversations based on search
  const filteredConversations = React.useMemo(() => {
    if (!conversations) return []
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase().trim()
    return conversations.filter((conv) => {
      const userData = userDataMap[conv.otherParticipantId]
      const name = userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.firstName || ""
      return name.toLowerCase().includes(query)
    })
  }, [conversations, searchQuery, userDataMap])


  // Check if a channel is the current location
  const isCurrentChannel = (channelId: string) => {
    return currentChannelId === channelId
  }

  // Check if a conversation is the current location
  const isCurrentConversation = (conversationId: string) => {
    return currentConversationId === conversationId
  }

  // Handle forward action
  const handleForward = async () => {
    if (!selectedDestination || !messageId) return

    setIsForwarding(true)
    try {
      if (selectedDestination.type === "channel") {
        await onForwardToChannel?.(messageId as string, selectedDestination.id)
      } else {
        await onForwardToConversation?.(messageId as string, selectedDestination.id)
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to forward message:", error)
    } finally {
      setIsForwarding(false)
    }
  }

  // Truncate message content for preview
  const truncatedContent = React.useMemo(() => {
    if (!messageContent) return ""
    const maxLength = 150
    if (messageContent.length <= maxLength) return messageContent
    return messageContent.slice(0, maxLength) + "..."
  }, [messageContent])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
          <DialogDescription>
            Choose where to forward this message
          </DialogDescription>
        </DialogHeader>

        {/* Message Preview */}
        {messageContent && (
          <div className="bg-muted/50 rounded-md p-3 border">
            <p className="text-sm text-muted-foreground mb-1">Message preview:</p>
            <p className="text-sm line-clamp-3">{truncatedContent}</p>
            {/* Attachment/Link indicators */}
            <div className="flex gap-2 mt-2">
              {messageAttachments && messageAttachments.length > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <PaperclipIcon className="h-3 w-3" />
                  {messageAttachments.length} attachment{messageAttachments.length > 1 ? "s" : ""}
                </span>
              )}
              {messageLinkEmbed && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Link preview
                </span>
              )}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Destination Type Toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          <button
            onClick={() => setDestinationType("channel")}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              destinationType === "channel"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setDestinationType("conversation")}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              destinationType === "conversation"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Messages
          </button>
        </div>

        {/* Destination List */}
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-1 pb-4">
            {destinationType === "channel" ? (
              // Channel list
              filteredChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchQuery ? "No channels found" : "No channels available"}
                </p>
              ) : (
                filteredChannels.map((channel) => {
                  const isCurrent = isCurrentChannel(channel._id)
                  const isSelected =
                    selectedDestination?.type === "channel" &&
                    selectedDestination.id === channel._id
                  const Icon = channel.icon ? getIconComponent(channel.icon) : HashIcon

                  return (
                    <button
                      key={channel._id}
                      onClick={() =>
                        !isCurrent &&
                        setSelectedDestination({
                          type: "channel",
                          id: channel._id,
                          name: channel.name,
                        })
                      }
                      disabled={isCurrent}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors ${
                        isCurrent
                          ? "opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{channel.name}</span>
                      {isCurrent && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          (current)
                        </span>
                      )}
                      {channel.permissions === "readOnly" && !isCurrent && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          read-only
                        </span>
                      )}
                    </button>
                  )
                })
              )
            ) : (
              // Conversation list
              filteredConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchQuery ? "No conversations found" : "No conversations available"}
                </p>
              ) : (
                filteredConversations.map((conv) => {
                  const userData = userDataMap[conv.otherParticipantId]
                  const name = userData?.firstName && userData?.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : userData?.firstName || "Loading..."
                  const initials = userData?.firstName && userData?.lastName
                    ? `${userData.firstName[0]}${userData.lastName[0]}`
                    : userData?.firstName?.[0] || "?"
                  const isCurrent = isCurrentConversation(conv._id)
                  const isSelected =
                    selectedDestination?.type === "conversation" &&
                    selectedDestination.id === conv._id

                  return (
                    <button
                      key={conv._id}
                      onClick={() =>
                        !isCurrent &&
                        setSelectedDestination({
                          type: "conversation",
                          id: conv._id,
                          name,
                        })
                      }
                      disabled={isCurrent}
                      className={`flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm transition-colors ${
                        isCurrent
                          ? "opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={userData?.imageUrl || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{name}</span>
                      {isCurrent && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          (current)
                        </span>
                      )}
                    </button>
                  )
                })
              )
            )}
          </div>
        </ScrollArea>

        {/* Selected destination indicator */}
        {selectedDestination && (
          <div className="text-sm text-muted-foreground">
            Forward to:{" "}
            <span className="text-foreground font-medium">
              {selectedDestination.type === "channel" ? "#" : "@"}
              {selectedDestination.name}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isForwarding}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={!selectedDestination || isForwarding}
          >
            {isForwarding ? (
              <>
                <SpinnerGapIcon className="h-4 w-4 mr-2 animate-spin" />
                Forwarding...
              </>
            ) : (
              "Forward"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
