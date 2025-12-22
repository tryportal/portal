"use client"

import * as React from "react"
import { TopNav } from "@/components/preview/top-nav"
import { Sidebar } from "@/components/preview/sidebar"
import { ChatInterface } from "@/components/preview/chat-interface"
import { OverviewPage } from "@/components/preview/overview-page"
import {
  mockCategories,
  getMessagesForChannel,
  getChannelInfo,
  mockUsers,
} from "@/components/preview/mock-data"
import type { Message } from "@/components/preview/message-list"

export default function PreviewPage() {
  const [activeTab, setActiveTab] = React.useState("home")
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [activeChannel, setActiveChannel] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<Record<string, Message[]>>(() => {
    // Initialize with mock messages
    const initial: Record<string, Message[]> = {}
    for (const category of mockCategories) {
      for (const channel of category.channels) {
        initial[channel.id] = getMessagesForChannel(channel.id)
      }
    }
    return initial
  })

  const channelInfo = activeChannel ? getChannelInfo(activeChannel) : null
  const currentMessages = activeChannel ? messages[activeChannel] || [] : []

  const handleSendMessage = (content: string) => {
    if (!activeChannel) return
    
    const newMessage: Message = {
      id: `${Date.now()}`,
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      user: mockUsers.john, // Current user
    }

    setMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMessage],
    }))
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F4]">
      {/* Top Navigation */}
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          activeChannel={activeChannel ?? ""}
          onChannelSelect={setActiveChannel}
          categories={mockCategories}
        />

        {/* Main Content - Overview or Chat */}
        <main className="flex-1 overflow-hidden">
          {activeChannel && channelInfo ? (
            <ChatInterface
              channelName={channelInfo.name}
              channelIcon={channelInfo.icon}
              messages={currentMessages}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <OverviewPage
              categories={mockCategories}
              onChannelSelect={setActiveChannel}
            />
          )}
        </main>
      </div>
    </div>
  )
}

