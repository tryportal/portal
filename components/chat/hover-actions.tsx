"use client"

import { memo, useCallback } from "react"
import {
  ArrowBendUpLeftIcon,
  ShareIcon,
  DotsThreeIcon,
  CopyIcon,
  PushPinIcon,
  BookmarkIcon,
  BookmarkSimpleIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ReactionPicker } from "@/components/preview/reaction-picker"

/**
 * Hover Actions
 * 
 * Renders the floating action toolbar that appears when hovering over a message.
 * Includes quick actions (reply, forward, react) and a more menu.
 * Uses the external hover coordinator to manage visibility.
 */

// =============================================================================
// PROPS
// =============================================================================

interface HoverActionsProps {
  messageId: string
  messageContent: string
  isPinned?: boolean
  isSaved?: boolean
  isOwner?: boolean
  isAdmin?: boolean
  position?: "left" | "right"
  onReply: (messageId: string) => void
  onForward: (messageId: string) => void
  onReaction: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onMenuOpenChange?: (open: boolean) => void
  className?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function HoverActionsInner({
  messageId,
  messageContent,
  isPinned,
  isSaved,
  isOwner,
  isAdmin,
  position = "right",
  onReply,
  onForward,
  onReaction,
  onPin,
  onSave,
  onUnsave,
  onEdit,
  onDelete,
  onMenuOpenChange,
  className,
}: HoverActionsProps) {
  // Handlers with stable identity via useCallback
  const handleReply = useCallback(() => onReply(messageId), [messageId, onReply])
  const handleForward = useCallback(() => onForward(messageId), [messageId, onForward])
  const handleReaction = useCallback(
    (emoji: string) => onReaction(messageId, emoji),
    [messageId, onReaction]
  )
  const handlePin = useCallback(() => onPin?.(messageId), [messageId, onPin])
  const handleSaveToggle = useCallback(() => {
    if (isSaved) {
      onUnsave?.(messageId)
    } else {
      onSave?.(messageId)
    }
  }, [messageId, isSaved, onSave, onUnsave])
  const handleEdit = useCallback(() => onEdit?.(messageId), [messageId, onEdit])
  const handleDelete = useCallback(() => onDelete?.(messageId), [messageId, onDelete])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(messageContent)
  }, [messageContent])

  const positionClass = position === "left" ? "left-4" : "right-4"

  return (
    <div
      className={`absolute top-1 ${positionClass} flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-md z-50 ${className ?? ""}`}
    >
      {/* Reply */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground hover:bg-muted"
        onClick={handleReply}
        title="Reply"
      >
        <ArrowBendUpLeftIcon className="size-3.5" />
      </Button>

      {/* Forward */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground hover:bg-muted"
        onClick={handleForward}
        title="Forward"
      >
        <ShareIcon className="size-3.5" />
      </Button>

      {/* Reaction Picker */}
      <ReactionPicker
        onSelectReaction={handleReaction}
        onOpenChange={onMenuOpenChange}
      />

      {/* More Options */}
      <DropdownMenu onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
              title="More options"
            />
          }
        >
          <DotsThreeIcon className="size-3.5" weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={handleCopy}>
            <CopyIcon className="size-4" />
            Copy text
          </DropdownMenuItem>

          {isAdmin && onPin && (
            <DropdownMenuItem onClick={handlePin}>
              <PushPinIcon className="size-4" />
              {isPinned ? "Unpin message" : "Pin message"}
            </DropdownMenuItem>
          )}

          {(onSave || onUnsave) && (
            <DropdownMenuItem onClick={handleSaveToggle}>
              {isSaved ? (
                <>
                  <BookmarkSimpleIcon className="size-4" />
                  Unsave message
                </>
              ) : (
                <>
                  <BookmarkIcon className="size-4" />
                  Save message
                </>
              )}
            </DropdownMenuItem>
          )}

          {isOwner && (
            <>
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <PencilIcon className="size-4" />
                  Edit message
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    <TrashIcon className="size-4" />
                    Delete message
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const HoverActions = memo(HoverActionsInner)
