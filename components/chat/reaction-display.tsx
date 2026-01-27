"use client"

import { memo, useMemo } from "react"
import { groupReactions, type Reaction } from "./utils"

/**
 * Reaction Display
 * 
 * Renders grouped reactions under a message.
 * Each reaction shows the emoji, count, and highlights if current user reacted.
 * Memoized to prevent re-renders when parent message updates.
 */

// =============================================================================
// PROPS
// =============================================================================

interface ReactionDisplayProps {
  reactions: Reaction[]
  currentUserId?: string
  onToggleReaction: (emoji: string) => void
  userNames?: Record<string, string>
  className?: string
}

// =============================================================================
// REACTION BADGE
// =============================================================================

interface ReactionBadgeProps {
  emoji: string
  count: number
  hasReacted: boolean
  users: string[]
  userNames: Record<string, string>
  onToggle: () => void
}

const ReactionBadge = memo(function ReactionBadge({
  emoji,
  count,
  hasReacted,
  users,
  userNames,
  onToggle,
}: ReactionBadgeProps) {
  // Build tooltip text
  const tooltipText = useMemo(() => {
    const displayNames = users
      .slice(0, 5)
      .map((userId) => userNames[userId] || "Someone")
    const suffix = users.length > 5 ? ` and ${users.length - 5} more` : ""
    return displayNames.join(", ") + suffix
  }, [users, userNames])

  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
        hasReacted
          ? "border-primary/20 bg-muted text-foreground"
          : "border-border bg-card text-foreground/70 hover:border-border/80"
      }`}
      title={tooltipText}
    >
      <span>{emoji}</span>
      <span className="font-medium">{count}</span>
    </button>
  )
})

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function ReactionDisplayInner({
  reactions,
  currentUserId,
  onToggleReaction,
  userNames = {},
  className,
}: ReactionDisplayProps) {
  // Group reactions by emoji
  const groupedReactions = useMemo(
    () => groupReactions(reactions, currentUserId),
    [reactions, currentUserId]
  )

  if (groupedReactions.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1.5 ${className ?? ""}`}>
      {groupedReactions.map(({ emoji, count, hasReacted, users }) => (
        <ReactionBadge
          key={emoji}
          emoji={emoji}
          count={count}
          hasReacted={hasReacted}
          users={users}
          userNames={userNames}
          onToggle={() => onToggleReaction(emoji)}
        />
      ))}
    </div>
  )
}

export const ReactionDisplay = memo(ReactionDisplayInner)
