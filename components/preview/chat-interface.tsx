"use client"

import * as React from "react"
import { ChannelHeader } from "./channel-header"
import { MessageList, type Message } from "./message-list"
import { MessageInput } from "./message-input"

interface ChatInterfaceProps {
  channelName: string
  channelIcon?: React.ElementType
  messages: Message[]
  onSendMessage: (message: string) => void
}

export function ChatInterface({
  channelName,
  channelIcon,
  messages,
  onSendMessage,
}: ChatInterfaceProps) {
  return (
    <div className="flex h-full flex-col bg-[#F7F7F4]">
      {/* Channel Header */}
      <ChannelHeader channelName={channelName} channelIcon={channelIcon} />

      {/* Message List */}
      <MessageList messages={messages} />

      {/* Message Input */}
      <MessageInput onSendMessage={onSendMessage} channelName={channelName} />
    </div>
  )
}

