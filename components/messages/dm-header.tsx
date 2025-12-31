"use client"

import * as React from "react"
import {
  MagnifyingGlassIcon,
  DotsThreeIcon,
  BellIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DmHeaderProps {
  participantName: string
  participantImageUrl?: string | null
  participantInitials: string
  onBack?: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export function DmHeader({
  participantName,
  participantImageUrl,
  participantInitials,
  onBack,
  searchQuery = "",
  onSearchChange,
}: DmHeaderProps) {

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      {/* Left: Participant info */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        )}
        <Avatar size="sm">
          <AvatarImage src={participantImageUrl || undefined} alt={participantName} />
          <AvatarFallback className="text-xs bg-secondary text-foreground">
            {participantInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold text-foreground">{participantName}</h1>
          <span className="text-xs text-muted-foreground">Direct message</span>
        </div>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

