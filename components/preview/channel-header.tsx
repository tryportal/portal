"use client"

import * as React from "react"
import {
  HashIcon,
  MagnifyingGlassIcon,
  DotsThreeIcon,
  BellIcon,
  PushPinIcon,
  UserPlusIcon,
  GearIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ChannelHeaderProps {
  channelName: string
  channelIcon?: React.ElementType
  pinnedCount?: number
  onViewPinnedMessages?: () => void
}

export function ChannelHeader({
  channelName,
  channelIcon: Icon = HashIcon,
  pinnedCount = 0,
  onViewPinnedMessages,
}: ChannelHeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState("")

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4 shrink-0">
      {/* Left: Channel info */}
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-foreground" weight="fill" />
        <h1 className="text-base font-semibold text-foreground">{channelName}</h1>
        {pinnedCount > 0 && (
          <button
            onClick={onViewPinnedMessages}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <PushPinIcon className="size-3.5" />
            <span>{pinnedCount}</span>
          </button>
        )}
      </div>

      {/* Right: Search + Options */}
      <div className="flex items-center gap-2">
        {/* Search bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-56 bg-muted pl-8 text-sm placeholder:text-muted-foreground border-transparent focus-visible:border-border"
          />
        </div>

        {/* Options button */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            />}
          >
            <DotsThreeIcon className="size-5" weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <BellIcon className="size-4" />
              Notification settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewPinnedMessages}>
              <PushPinIcon className="size-4" />
              View pinned messages
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlusIcon className="size-4" />
              Add members
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <GearIcon className="size-4" />
              Channel settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
