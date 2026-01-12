"use client"

import * as React from "react"
import {
  HashIcon,
  MagnifyingGlassIcon,
  DotsThreeIcon,
  BellIcon,
  PushPinIcon,
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
import { EditChannelDialog } from "@/components/edit-channel-dialog"
import type { Id } from "@/convex/_generated/dataModel"

interface ChannelHeaderProps {
  channelName: string
  channelIcon?: React.ElementType
  pinnedCount?: number
  onViewPinnedMessages?: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  channelId?: Id<"channels">
  organizationId?: Id<"organizations">
  isAdmin?: boolean
  isSharedChannel?: boolean
  sharedChannelSourceOrg?: string
}

export function ChannelHeader({
  channelName,
  channelIcon: Icon = HashIcon,
  pinnedCount = 0,
  onViewPinnedMessages,
  searchQuery = "",
  onSearchChange,
  channelId,
  organizationId,
  isAdmin = false,
  isSharedChannel = false,
  sharedChannelSourceOrg,
}: ChannelHeaderProps) {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)

  return (
    <>
      {isSharedChannel && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <div className="size-4 rounded-full bg-amber-500 flex items-center justify-center">
            <span className="text-xs text-white font-bold">!</span>
          </div>
          <span className="text-xs text-amber-900">
            You're viewing a shared channel {sharedChannelSourceOrg && `from ${sharedChannelSourceOrg}`}
          </span>
        </div>
      )}
      <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4 shrink-0">
      {/* Left: Channel info */}
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <Icon className="size-5 text-foreground flex-shrink-0" weight="fill" />
        <h1 className="text-base font-semibold text-foreground truncate">{channelName}</h1>
        {pinnedCount > 0 && (
          <button
            onClick={onViewPinnedMessages}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <PushPinIcon className="size-3.5" />
            <span>{pinnedCount}</span>
          </button>
        )}
      </div>

      {/* Right: Search + Options */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
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
            <DropdownMenuSeparator />
            {isAdmin && channelId && organizationId && (
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <GearIcon className="size-4" />
                Channel settings
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Channel Dialog */}
      {channelId && organizationId && (
        <EditChannelDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          channelId={channelId}
          organizationId={organizationId}
        />
       )}
     </header>
   </>
   )
}
