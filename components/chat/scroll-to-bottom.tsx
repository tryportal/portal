"use client"

import { memo, useCallback } from "react"
import { ArrowDownIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

/**
 * Scroll To Bottom Button
 * 
 * Floating button that appears when user scrolls up from the bottom.
 * Clicking scrolls the container to the bottom.
 * Shows an optional unread count badge.
 */

// =============================================================================
// PROPS
// =============================================================================

interface ScrollToBottomProps {
  visible: boolean
  unreadCount?: number
  onClick: () => void
  className?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function ScrollToBottomInner({
  visible,
  unreadCount,
  onClick,
  className,
}: ScrollToBottomProps) {
  if (!visible) {
    return null
  }

  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 ${className ?? ""}`}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="shadow-lg hover:shadow-xl transition-shadow gap-2"
      >
        <ArrowDownIcon className="size-4" />
        {unreadCount && unreadCount > 0 ? (
          <span className="text-xs font-medium">
            {unreadCount > 99 ? "99+" : unreadCount} new
          </span>
        ) : (
          <span className="text-xs font-medium">Jump to bottom</span>
        )}
      </Button>
    </div>
  )
}

export const ScrollToBottom = memo(ScrollToBottomInner)
