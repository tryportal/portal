"use client"

import * as React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SmileyIcon } from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Quick reactions for the reaction bar
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "😢"]

// Full emoji list for the picker
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "💪", "🙏", "✌️", "🤞", "🤙", "👋", "🖐️", "✋", "👌", "🤌", "👆"],
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❤️‍🔥", "💕", "💞", "💓", "💗", "💖", "💘"],
  },
  {
    name: "Celebration",
    emojis: ["🎉", "🎊", "🎈", "🎁", "🏆", "⭐", "✨", "🔥", "💡", "📌", "🚀", "💯", "🎯", "🌟", "👑", "💎"],
  },
]

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void
  existingReactions?: Array<{ emoji: string; count: number; hasReacted: boolean }>
}

export function ReactionPicker({ onSelectReaction, existingReactions = [] }: ReactionPickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (emoji: string) => {
    onSelectReaction(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={<PopoverTrigger
            render={<Button
              variant="ghost"
              size="icon-xs"
              className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
            />}
          />}
        >
          <SmileyIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>Add reaction</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="start" className="w-72 p-0">
        {/* Quick reactions bar */}
        <div className="flex items-center gap-1 border-b border-[#26251E]/10 p-2">
          {QUICK_REACTIONS.map((emoji) => {
            const existing = existingReactions.find((r) => r.emoji === emoji)
            return (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors ${
                  existing?.hasReacted
                    ? "bg-[#26251E]/10"
                    : "hover:bg-[#26251E]/5"
                }`}
              >
                {emoji}
              </button>
            )
          })}
        </div>

        {/* Full emoji grid */}
        <div className="max-h-48 overflow-y-auto p-2">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.name} className="mb-3 last:mb-0">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[#26251E]/40">
                {category.name}
              </div>
              <div className="grid grid-cols-8 gap-0.5">
                {category.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-[#26251E]/5 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
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
          <Tooltip key={emoji}>
            <TooltipTrigger
              render={<button
                onClick={() => onToggleReaction(emoji)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  hasReacted
                    ? "border-[#26251E]/20 bg-[#26251E]/5 text-[#26251E]"
                    : "border-[#26251E]/10 bg-white text-[#26251E]/70 hover:border-[#26251E]/20"
                }`}
              />}
            >
              <span>{emoji}</span>
              <span className="font-medium">{count}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
