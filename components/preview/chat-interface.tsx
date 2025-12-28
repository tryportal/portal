"use client"

import * as React from "react"
import { ChannelHeader } from "./channel-header"
import { MessageList, type Message } from "./message-list"
import { MessageInput, type ReplyingTo } from "./message-input"
import { TypingIndicator } from "@/components/typing-indicator"
import { PinnedMessagesDialog, type PinnedMessage } from "./pinned-messages-dialog"
import type { MentionUser } from "./mention-autocomplete"

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
  }>, parentMessageId?: string) => void
  onDeleteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, content: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onForward?: (messageId: string, targetChannelId: string) => void
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onForward,
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
}: ChatInterfaceProps) {
  const [replyingTo, setReplyingTo] = React.useState<ReplyingTo | null>(null)
  const [pinnedDialogOpen, setPinnedDialogOpen] = React.useState(false)

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

  // Handle forward (placeholder - would need channel selection UI)
  const handleForward = (messageId: string) => {
    // In a full implementation, this would open a channel selection dialog
    console.log("Forward message:", messageId)
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

  return (
    <div className="flex h-full flex-col bg-[#F7F7F4]">
      {/* Channel Header */}
      <ChannelHeader 
        channelName={channelName} 
        channelIcon={channelIcon}
        pinnedCount={pinnedMessages.length}
        onViewPinnedMessages={() => setPinnedDialogOpen(true)}
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
      />

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Message Input */}
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

      {/* Pinned Messages Dialog */}
      <PinnedMessagesDialog
        open={pinnedDialogOpen}
        onOpenChange={setPinnedDialogOpen}
        pinnedMessages={pinnedMessages}
        onMessageClick={handlePinnedMessageClick}
        onUnpin={onPin}
        isAdmin={isAdmin}
      />
    </div>
  )
}
