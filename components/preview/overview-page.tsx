"use client"

import * as React from "react"
import { HashIcon, ChatCircleIcon, AtIcon } from "@phosphor-icons/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Channel {
  id: string
  name: string
  icon?: React.ElementType
}

interface Category {
  id: string
  name: string
  channels: Channel[]
}

interface OverviewPageProps {
  categories: Category[]
  onChannelSelect: (channelId: string) => void
}

export function OverviewPage({ categories, onChannelSelect }: OverviewPageProps) {
  // Flatten all channels from all categories
  const allChannels = React.useMemo(() => {
    return categories.flatMap((category) =>
      category.channels.map((channel) => ({
        ...channel,
        categoryName: category.name,
      }))
    )
  }, [categories])

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#26251E]">Overview</h1>
          <p className="text-sm text-[#26251E]/60">
            Your recent activity and quick access to channels
          </p>
        </div>

        {/* Cards Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {/* Recent Messages Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChatCircleIcon className="size-4" />
                Recent Messages
              </CardTitle>
              <CardDescription>Messages you've sent recently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-[#26251E]/10">
                <p className="text-sm text-[#26251E]/40">No recent messages</p>
              </div>
            </CardContent>
          </Card>

          {/* Mentions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AtIcon className="size-4" />
                Mentions
              </CardTitle>
              <CardDescription>Messages where you were mentioned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-[#26251E]/10">
                <p className="text-sm text-[#26251E]/40">No mentions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channels List */}
        <div>
          <h2 className="mb-4 text-sm font-medium text-[#26251E]">All Channels</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allChannels.map((channel) => {
              const Icon = channel.icon || HashIcon
              return (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel.id)}
                  className="flex items-center gap-3 rounded-lg border border-[#26251E]/10 bg-white p-3 text-left transition-colors hover:border-[#26251E]/20 hover:bg-[#26251E]/[0.02]"
                >
                  <div className="flex size-8 items-center justify-center rounded-md bg-[#26251E]/5">
                    <Icon className="size-4 text-[#26251E]/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#26251E]">
                      {channel.name}
                    </p>
                    <p className="truncate text-xs text-[#26251E]/50">
                      {channel.categoryName}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
