"use client"

import * as React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

import { SmileyIcon } from "@phosphor-icons/react"
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react"
import { useTheme } from "@/lib/theme-provider"

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void
  onOpenChange?: (open: boolean) => void
}

export function ReactionPicker({ onSelectReaction, onOpenChange }: ReactionPickerProps) {
  const [open, setOpen] = React.useState(false)
  const { resolvedTheme } = useTheme()

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const handleSelect = (emoji: string) => {
    onSelectReaction(emoji)
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={<Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Add reaction"
        />}
      >
        <SmileyIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-auto p-0 border-0 bg-transparent shadow-none">
        <EmojiPicker
          onEmojiClick={(emojiData: EmojiClickData) => handleSelect(emojiData.emoji)}
          theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
          width={350}
          height={350}
          searchPlaceHolder="Search emoji..."
          previewConfig={{ showPreview: false }}
        />
      </PopoverContent>
    </Popover>
  )
}

interface ReactionDisplayProps {
  reactions: Array<{ userId: string; emoji: string }>
  currentUserId?: string
  onToggleReaction: (emoji: string) => void
  userNames?: Record<string, string>
}

export function ReactionDisplay({
  reactions,
  currentUserId,
  onToggleReaction,
  userNames = {},
}: ReactionDisplayProps) {
  // Group reactions by emoji
  const groupedReactions = React.useMemo(() => {
    const groups: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {}

    for (const reaction of reactions) {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = { count: 0, users: [], hasReacted: false }
      }
      groups[reaction.emoji].count++
      groups[reaction.emoji].users.push(reaction.userId)
      if (reaction.userId === currentUserId) {
        groups[reaction.emoji].hasReacted = true
      }
    }

    return Object.entries(groups).map(([emoji, data]) => ({
      emoji,
      ...data,
    }))
  }, [reactions, currentUserId])

  if (groupedReactions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {groupedReactions.map(({ emoji, count, hasReacted, users }) => {
        const tooltipText = users
          .slice(0, 5)
          .map((userId) => userNames[userId] || "Someone")
          .join(", ") + (users.length > 5 ? ` and ${users.length - 5} more` : "")

        return (
          <button
            key={emoji}
            onClick={() => onToggleReaction(emoji)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${hasReacted
              ? "border-primary/20 bg-muted text-foreground"
              : "border-border bg-card text-foreground/70 hover:border-border/80"
              }`}
            title={tooltipText}
          >
            <span>{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
