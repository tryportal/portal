"use client"

import * as React from "react"
import { ChatInterface } from "@/components/preview/chat-interface"
import {
  mockCategories,
  getMessagesForChannel,
  getChannelInfo,
  mockUsers,
} from "@/components/preview/mock-data"
import type { Message } from "@/components/preview/message-list"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ChartBarIcon,
  UsersIcon,
  HashIcon,
  CaretDownIcon,
  CaretRightIcon,
  SidebarIcon,
  GearIcon,
  HouseIcon,
  ChatCircleIcon,
  TrayIcon,
} from "@phosphor-icons/react"
import Image from "next/image"

// Local preview top nav that uses mock data
function PreviewTopNav({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const tabs = [
    { id: "home", label: "Home", icon: HouseIcon },
    { id: "messages", label: "Messages", icon: ChatCircleIcon },
    { id: "inbox", label: "Inbox", icon: TrayIcon },
  ]

  return (
    <header className="grid h-14 grid-cols-3 items-center border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
      {/* Left: Portal Logo */}
      <div className="flex items-center">
        <Image
          src="/portal-full.svg"
          alt="Portal"
          width={100}
          height={24}
          className="h-6 w-auto"
        />
      </div>

      {/* Center: Workspace + Tabs */}
      <div className="flex items-center justify-center gap-2">
        {/* Organization display */}
        <div className="gap-2 px-2 text-[#26251E] h-8 inline-flex items-center justify-center">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-[#26251E]">
            <Image
              src="/portal.svg"
              alt="Workspace"
              width={12}
              height={12}
              className="invert"
            />
          </div>
          <span className="text-sm font-medium">Preview Workspace</span>
        </div>

        <Separator orientation="vertical" className="mr-2 bg-[#26251E]/10" />

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Button
                key={tab.id}
                variant={isActive ? "secondary" : "ghost"}
                size="default"
                onClick={() => onTabChange(tab.id)}
                className={`gap-1.5 ${
                  isActive
                    ? "bg-[#26251E]/10 text-[#26251E]"
                    : "text-[#26251E]/70 hover:text-[#26251E]"
                }`}
              >
                <Icon weight={isActive ? "fill" : "regular"} className="size-4" />
                {tab.label}
              </Button>
            )
          })}
        </nav>
      </div>

      {/* Right: Placeholder */}
      <div className="flex justify-end">
        <div className="size-8 rounded-full bg-[#26251E]/10" />
      </div>
    </header>
  )
}

// Local preview sidebar that uses mock data
function PreviewSidebar({
  isOpen,
  onToggle,
  activeChannel,
  onChannelSelect,
}: {
  isOpen: boolean
  onToggle: () => void
  activeChannel: string | null
  onChannelSelect: (channelId: string | null) => void
}) {
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>(
    mockCategories.map((c) => c.id)
  )

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  if (!isOpen) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-[#26251E]/10 bg-[#F7F7F4] py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-[#26251E]/70 hover:text-[#26251E]"
        >
          <SidebarIcon className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-60 flex-col border-r border-[#26251E]/10 bg-[#F7F7F4]">
      {/* Header with toggle */}
      <div className="flex h-12 items-center justify-between border-b border-[#26251E]/10 px-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-[#26251E]">
            <Image
              src="/portal.svg"
              alt="Workspace"
              width={12}
              height={12}
              className="invert"
            />
          </div>
          <span className="text-sm font-medium text-[#26251E]">
            Preview Workspace
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-[#26251E]/50 hover:text-[#26251E]"
        >
          <SidebarIcon className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Sidebar Tabs */}
          <div className="mb-4 space-y-0.5">
            <Button
              variant={!activeChannel ? "secondary" : "ghost"}
              onClick={() => onChannelSelect(null)}
              className={`w-full justify-start gap-2 ${
                !activeChannel
                  ? "bg-[#26251E]/10 text-[#26251E]"
                  : "text-[#26251E]/80 hover:bg-[#26251E]/5 hover:text-[#26251E]"
              }`}
            >
              <ChartBarIcon
                className="size-4"
                weight={!activeChannel ? "fill" : "regular"}
              />
              Overview
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-[#26251E]/80 hover:bg-[#26251E]/5 hover:text-[#26251E]"
            >
              <UsersIcon className="size-4" />
              People
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-[#26251E]/80 hover:bg-[#26251E]/5 hover:text-[#26251E]"
            >
              <GearIcon className="size-4" />
              Settings
            </Button>
          </div>

          {/* Categories and Channels */}
          <div className="space-y-2">
            {mockCategories.map((category) => {
              const isExpanded = expandedCategories.includes(category.id)
              return (
                <div key={category.id}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="group flex w-full items-center gap-1 rounded px-1 py-1 text-xs font-medium text-[#26251E]/60 hover:text-[#26251E]"
                  >
                    {isExpanded ? (
                      <CaretDownIcon className="size-3" />
                    ) : (
                      <CaretRightIcon className="size-3" />
                    )}
                    <span className="uppercase tracking-wider">
                      {category.name}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-0.5 space-y-0.5 pl-1">
                      {category.channels.map((channel) => {
                        const Icon = channel.icon || HashIcon
                        const isActive = activeChannel === channel.id
                        return (
                          <Button
                            key={channel.id}
                            variant={isActive ? "secondary" : "ghost"}
                            className={`w-full justify-start gap-2 ${
                              isActive
                                ? "bg-[#26251E]/10 text-[#26251E]"
                                : "text-[#26251E]/70 hover:bg-[#26251E]/5 hover:text-[#26251E]"
                            }`}
                            onClick={() => onChannelSelect(channel.id)}
                          >
                            <Icon
                              className="size-4"
                              weight={isActive ? "fill" : "regular"}
                            />
                            <span className="truncate">{channel.name}</span>
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

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
      <PreviewTopNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <PreviewSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          activeChannel={activeChannel}
          onChannelSelect={setActiveChannel}
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
            <div className="flex flex-1 items-center justify-center bg-[#F7F7F4]">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-[#26251E]">Welcome to Portal</h2>
                <p className="mt-1 text-sm text-[#26251E]/60">Select a channel from the sidebar to get started</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
