"use client"

import * as React from "react"
import { ChannelHeader } from "./channel-header"
import { MessageList, type Message } from "./message-list"
import { MessageInput } from "./message-input"
import { TypingIndicator } from "@/components/typing-indicator"

interface TypingUser {
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

interface ChatInterfaceProps {
  channelName: string
  channelIcon?: React.ElementType
  messages: Message[]
  onSendMessage: (message: string, attachments?: Array<{
    storageId: string
    name: string
    size: number
    type: string
  }>) => void
  onDeleteMessage?: (messageId: string) => void
  currentUserId?: string
  disabled?: boolean
  disabledReason?: string
  onTyping?: () => void
  generateUploadUrl?: () => Promise<string>
  typingUsers?: TypingUser[]
}

export function ChatInterface({
  channelName,
  channelIcon,
  messages,
  onSendMessage,
  onDeleteMessage,
  currentUserId,
  disabled,
  disabledReason,
  onTyping,
  generateUploadUrl,
  typingUsers = [],
}: ChatInterfaceProps) {
  return (
    <div className="flex h-full flex-col bg-[#F7F7F4]">
      {/* Channel Header */}
      <ChannelHeader channelName={channelName} channelIcon={channelIcon} />

      {/* Message List */}
      <MessageList 
        messages={messages} 
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
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
      />
    </div>
  )
}

