"use client"

import * as React from "react"
import { ChannelHeader } from "./channel-header"
import { MessageList, type Message } from "./message-list"
import { MessageInput, type ReplyingTo } from "./message-input"
import { TypingIndicator } from "@/components/typing-indicator"
import { PinnedMessagesDialog, type PinnedMessage } from "./pinned-messages-dialog"
import { ForwardMessageDialog } from "./forward-message-dialog"
import type { MentionUser } from "./mention-autocomplete"
import type { LinkEmbedData } from "./link-preview"
import type { Id } from "@/convex/_generated/dataModel"

interface TypingUser {
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

interface ChatInterfaceProps {
  channelName: string
  channelDescription?: string
  channelIcon?: React.ElementType
  messages: Message[]
  onSendMessage: (message: string, attachments?: Array<{
    storageId: string
    name: string
    size: number
    type: string
  }>, parentMessageId?: string, linkEmbed?: LinkEmbedData) => void
  onDeleteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, content: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onForwardToChannel?: (messageId: string, channelId: string) => void
  onForwardToConversation?: (messageId: string, conversationId: string) => void
  onAvatarClick?: (userId: string) => void
  onNameClick?: (userId: string) => void
  currentUserId?: string
  disabled?: boolean
  disabledReason?: string
  onTyping?: () => void
  generateUploadUrl?: () => Promise<string>
  typingUsers?: TypingUser[]
  pinnedMessages?: PinnedMessage[]
  savedMessageIds?: Set<string>
  userNames?: Record<string, string>
  mentionUsers?: MentionUser[]
  isAdmin?: boolean
  organizationId?: Id<"organizations">
  channelId?: Id<"channels">
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export function ChatInterface({
  channelName,
  channelDescription,
  channelIcon,
  messages,
  onSendMessage,
  onDeleteMessage,
  onEditMessage,
  onReaction,
  onPin,
  onSave,
  onUnsave,
  onForwardToChannel,
  onForwardToConversation,
  onAvatarClick,
  onNameClick,
  currentUserId,
  disabled,
  disabledReason,
  onTyping,
  generateUploadUrl,
  typingUsers = [],
  pinnedMessages = [],
  savedMessageIds = new Set(),
  userNames = {},
  mentionUsers = [],
  isAdmin = false,
  organizationId,
  channelId,
  searchQuery = "",
  onSearchChange,
}: ChatInterfaceProps) {
  const [replyingTo, setReplyingTo] = React.useState<ReplyingTo | null>(null)
  const [pinnedDialogOpen, setPinnedDialogOpen] = React.useState(false)
  const [forwardDialogOpen, setForwardDialogOpen] = React.useState(false)
  const [forwardingMessage, setForwardingMessage] = React.useState<{
    id: string
    content: string
  } | null>(null)

  // Handle reply button click
  const handleReply = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (message) {
      setReplyingTo({
        messageId: message.id,
        content: message.content,
        userName: message.user.name,
      })
    }
  }

  // Handle cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  // Handle forward button click - opens the forward dialog
  const handleForward = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (message) {
      setForwardingMessage({
        id: message.id,
        content: message.content,
      })
      setForwardDialogOpen(true)
    }
  }

  // Handle name click to insert mention
  const handleNameClick = (userId: string) => {
    // This will be handled by parent component to add mention to input
    onNameClick?.(userId)
  }

  // Handle pinned message click (scroll to message)
  const handlePinnedMessageClick = (messageId: string) => {
    setPinnedDialogOpen(false)
    // In a full implementation, this would scroll to the message
    console.log("Scroll to message:", messageId)
  }

  // Handle forward to channel
  const handleForwardToChannel = async (messageId: string, channelId: string) => {
    await onForwardToChannel?.(messageId, channelId)
  }

  // Handle forward to conversation
  const handleForwardToConversation = async (messageId: string, conversationId: string) => {
    await onForwardToConversation?.(messageId, conversationId)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Channel Header */}
      <ChannelHeader 
        channelName={channelName} 
        channelIcon={channelIcon}
        pinnedCount={pinnedMessages.length}
        onViewPinnedMessages={() => setPinnedDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        channelId={channelId}
        organizationId={organizationId}
        isAdmin={isAdmin}
      />

      {/* Message List */}
      <MessageList 
        messages={messages} 
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        onEditMessage={onEditMessage}
        onReply={handleReply}
        onForward={handleForward}
        onReaction={onReaction}
        onPin={onPin}
        onSave={onSave}
        onUnsave={onUnsave}
        onAvatarClick={onAvatarClick}
        onNameClick={handleNameClick}
        savedMessageIds={savedMessageIds}
        userNames={userNames}
        channelName={channelName}
        channelDescription={channelDescription}
        channelIcon={channelIcon}
        isAdmin={isAdmin}
        searchQuery={searchQuery}
      />

      {/* Message Input with Typing Indicator overlay */}
      <div className="relative">
        <TypingIndicator typingUsers={typingUsers} />
        <MessageInput 
          onSendMessage={onSendMessage} 
          channelName={channelName}
          disabled={disabled}
          disabledReason={disabledReason}
          onTyping={onTyping}
          generateUploadUrl={generateUploadUrl}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          mentionUsers={mentionUsers}
        />
      </div>

      {/* Pinned Messages Dialog */}
      <PinnedMessagesDialog
        open={pinnedDialogOpen}
        onOpenChange={setPinnedDialogOpen}
        pinnedMessages={pinnedMessages}
        onMessageClick={handlePinnedMessageClick}
        onUnpin={onPin}
        isAdmin={isAdmin}
      />

      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        messageId={forwardingMessage?.id}
        messageContent={forwardingMessage?.content ?? ""}
        organizationId={organizationId}
        onForwardToChannel={handleForwardToChannel}
        onForwardToConversation={handleForwardToConversation}
      />
    </div>
  )
}
