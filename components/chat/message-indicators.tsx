"use client"

import { memo } from "react"
import {
  ArrowBendUpLeftIcon,
  ArrowBendDoubleUpRightIcon,
  PushPinIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react"
import { useMessageCallbacks } from "./message-list-context"

/**
 * Message Indicators
 * 
 * Renders the various indicator badges that appear above message content:
 * - Reply indicator (shows parent message)
 * - Forward indicator (shows source channel/user)
 * - Pin indicator
 * - Solution indicator (for forum posts)
 * 
 * Each indicator is a separate memoized component for granular updates.
 */

// =============================================================================
// REPLY INDICATOR
// =============================================================================

interface ReplyIndicatorProps {
  parentMessageId: string
  parentMessage: {
    content: string
    userName: string
  }
  className?: string
}

function ReplyIndicatorInner({
  parentMessageId,
  parentMessage,
  className,
}: ReplyIndicatorProps) {
  const { scrollToMessage } = useMessageCallbacks()

  return (
    <button
      onClick={() => scrollToMessage(parentMessageId)}
      className={`flex items-center gap-2 mb-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${className ?? ""}`}
    >
      <ArrowBendUpLeftIcon className="size-3" />
      <span>Replying to</span>
      <span className="font-medium text-foreground/70">
        {parentMessage.userName}
      </span>
      <span className="truncate max-w-[200px] break-words">
        {parentMessage.content}
      </span>
    </button>
  )
}

export const ReplyIndicator = memo(ReplyIndicatorInner)

// =============================================================================
// FORWARD INDICATOR
// =============================================================================

interface ForwardIndicatorProps {
  forwardedFrom: {
    channelName?: string
    userName?: string
  }
  className?: string
}

function ForwardIndicatorInner({
  forwardedFrom,
  className,
}: ForwardIndicatorProps) {
  const source = forwardedFrom.channelName
    ? `#${forwardedFrom.channelName}`
    : forwardedFrom.userName
      ? `@${forwardedFrom.userName}`
      : "unknown"

  return (
    <div
      className={`flex items-center gap-1.5 mb-1 text-xs text-muted-foreground ${className ?? ""}`}
    >
      <ArrowBendDoubleUpRightIcon className="size-3" />
      <span>Forwarded from</span>
      <span className="font-medium text-foreground/70">{source}</span>
    </div>
  )
}

export const ForwardIndicator = memo(ForwardIndicatorInner)

// =============================================================================
// PIN INDICATOR
// =============================================================================

interface PinIndicatorProps {
  className?: string
}

function PinIndicatorInner({ className }: PinIndicatorProps) {
  return (
    <div
      className={`flex items-center gap-1.5 mb-1 text-xs text-amber-600 font-medium ${className ?? ""}`}
    >
      <PushPinIcon className="size-3" weight="fill" />
      <span>Pinned message</span>
    </div>
  )
}

export const PinIndicator = memo(PinIndicatorInner)

// =============================================================================
// SOLUTION INDICATOR
// =============================================================================

interface SolutionIndicatorProps {
  className?: string
}

function SolutionIndicatorInner({ className }: SolutionIndicatorProps) {
  return (
    <div
      className={`flex items-center gap-1.5 mb-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium ${className ?? ""}`}
    >
      <CheckCircleIcon className="size-3" weight="fill" />
      <span>Accepted Answer</span>
    </div>
  )
}

export const SolutionIndicator = memo(SolutionIndicatorInner)

// =============================================================================
// COMBINED INDICATORS
// =============================================================================

interface MessageIndicatorsProps {
  parentMessageId?: string
  parentMessage?: {
    content: string
    userName: string
  }
  forwardedFrom?: {
    channelName?: string
    userName?: string
  }
  pinned?: boolean
  isSolvedAnswer?: boolean
  isGrouped?: boolean
  indicatorClassName?: string
}

/**
 * Renders all applicable indicators for a message.
 * Renders nothing if the message has no indicators or is grouped.
 */
function MessageIndicatorsInner({
  parentMessageId,
  parentMessage,
  forwardedFrom,
  pinned,
  isSolvedAnswer,
  isGrouped,
  indicatorClassName,
}: MessageIndicatorsProps) {
  // Don't render solution indicator for grouped messages
  const showSolution = isSolvedAnswer && !isGrouped

  // Check if any indicator should be rendered
  const hasIndicators =
    showSolution ||
    (parentMessage && parentMessageId) ||
    forwardedFrom ||
    pinned

  if (!hasIndicators) return null

  return (
    <>
      {showSolution && <SolutionIndicator className={indicatorClassName} />}
      {parentMessage && parentMessageId && (
        <ReplyIndicator
          parentMessageId={parentMessageId}
          parentMessage={parentMessage}
          className={indicatorClassName}
        />
      )}
      {forwardedFrom && (
        <ForwardIndicator
          forwardedFrom={forwardedFrom}
          className={indicatorClassName}
        />
      )}
      {pinned && <PinIndicator className={indicatorClassName} />}
    </>
  )
}

export const MessageIndicators = memo(MessageIndicatorsInner)
