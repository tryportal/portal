"use client"

import { memo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatFullDateTime } from "./utils"

/**
 * Message Header Components
 * 
 * Handles the avatar and name/timestamp header for messages.
 * Split into separate memoized components for granular updates:
 * - MessageAvatar: The user's avatar (shown for first message in group)
 * - GroupedTimestamp: Compact timestamp shown on hover for grouped messages
 * - MessageHeader: Name + timestamp row for first message in group
 */

// =============================================================================
// MESSAGE AVATAR
// =============================================================================

interface MessageAvatarProps {
  userId: string
  name: string
  avatar?: string
  initials: string
  size?: "sm" | "md" | "lg"
  onAvatarClick?: (userId: string) => void
}

const SIZE_CLASSES = {
  sm: "size-7",
  md: "size-9",
  lg: "size-10",
} as const

const INITIALS_SIZE_CLASSES = {
  sm: "text-[9px]",
  md: "text-[11px]",
  lg: "text-xs",
} as const

function MessageAvatarInner({
  userId,
  name,
  avatar,
  initials,
  size = "md",
  onAvatarClick,
}: MessageAvatarProps) {
  return (
    <Avatar
      className={`${SIZE_CLASSES[size]} cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0`}
      onClick={() => onAvatarClick?.(userId)}
    >
      {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
      <AvatarFallback
        className={`bg-muted text-foreground ${INITIALS_SIZE_CLASSES[size]} font-medium`}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export const MessageAvatar = memo(MessageAvatarInner)

// =============================================================================
// GROUPED TIMESTAMP (for grouped messages - shows on hover)
// =============================================================================

interface GroupedTimestampProps {
  timestamp: string
  createdAt?: number
  className?: string
}

function GroupedTimestampInner({
  timestamp,
  createdAt,
  className,
}: GroupedTimestampProps) {
  return (
    <div className={`w-9 flex-shrink-0 flex items-start justify-center pt-[2px] ${className ?? ""}`}>
      <span
        className="text-[8px] leading-none whitespace-nowrap text-transparent group-hover:text-muted-foreground transition-colors font-medium tabular-nums cursor-default"
        title={createdAt ? formatFullDateTime(createdAt) : undefined}
      >
        {timestamp}
      </span>
    </div>
  )
}

export const GroupedTimestamp = memo(GroupedTimestampInner)

// =============================================================================
// MESSAGE HEADER (Name + Timestamp + Edited indicator)
// =============================================================================

interface MessageHeaderProps {
  userId: string
  userName: string
  timestamp: string
  createdAt?: number
  editedAt?: number
  isOP?: boolean
  onNameClick?: (userId: string) => void
  className?: string
}

function MessageHeaderInner({
  userId,
  userName,
  timestamp,
  createdAt,
  editedAt,
  isOP,
  onNameClick,
  className,
}: MessageHeaderProps) {
  return (
    <div className={`flex items-baseline gap-2 mb-0.5 ${className ?? ""}`}>
      <button
        onClick={() => onNameClick?.(userId)}
        className="font-semibold text-sm text-foreground hover:underline"
      >
        {userName}
      </button>
      {isOP && (
        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          OP
        </span>
      )}
      <span
        className="text-[10px] leading-none text-muted-foreground font-medium tabular-nums cursor-default"
        title={createdAt ? formatFullDateTime(createdAt) : undefined}
      >
        {timestamp}
      </span>
      {editedAt && (
        <span className="text-[10px] text-muted-foreground/70 font-medium">
          (edited)
        </span>
      )}
    </div>
  )
}

export const MessageHeader = memo(MessageHeaderInner)

// =============================================================================
// AVATAR PLACEHOLDER (invisible spacer for grouped messages)
// =============================================================================

interface AvatarPlaceholderProps {
  size?: "sm" | "md" | "lg"
}

function AvatarPlaceholderInner({ size = "md" }: AvatarPlaceholderProps) {
  return <div className={`${SIZE_CLASSES[size]} flex-shrink-0`} />
}

export const AvatarPlaceholder = memo(AvatarPlaceholderInner)
