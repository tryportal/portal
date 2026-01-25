"use client"

import { memo, useCallback } from "react"
import {
  ArrowBendUpLeftIcon,
  ShareIcon,
  CopyIcon,
  PushPinIcon,
  BookmarkIcon,
  BookmarkSimpleIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react"
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"

/**
 * Context Menu Content
 * 
 * Renders the content for the right-click context menu on messages.
 * Shared between compact and bubble layouts.
 * Includes forum-specific options (mark as solution).
 */

// =============================================================================
// PROPS
// =============================================================================

interface MessageContextMenuContentProps {
  messageId: string
  messageContent: string
  isPinned?: boolean
  isSaved?: boolean
  isSolvedAnswer?: boolean
  isOwner?: boolean
  isAdmin?: boolean
  isForumPost?: boolean
  canMarkSolution?: boolean
  onReply?: (messageId: string) => void
  onForward?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onMarkSolution?: (messageId: string) => void
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function MessageContextMenuContentInner({
  messageId,
  messageContent,
  isPinned,
  isSaved,
  isSolvedAnswer,
  isOwner,
  isAdmin,
  isForumPost,
  canMarkSolution,
  onReply,
  onForward,
  onPin,
  onSave,
  onUnsave,
  onEdit,
  onDelete,
  onMarkSolution,
}: MessageContextMenuContentProps) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(messageContent)
  }, [messageContent])

  const handleSaveToggle = useCallback(() => {
    if (isSaved) {
      onUnsave?.(messageId)
    } else {
      onSave?.(messageId)
    }
  }, [messageId, isSaved, onSave, onUnsave])

  return (
    <ContextMenuContent className="w-48">
      {/* Reply */}
      {onReply && (
        <ContextMenuItem onClick={() => onReply(messageId)}>
          <ArrowBendUpLeftIcon className="size-4" />
          Reply
        </ContextMenuItem>
      )}

      {/* Forward */}
      {onForward && (
        <ContextMenuItem onClick={() => onForward(messageId)}>
          <ShareIcon className="size-4" />
          Forward
        </ContextMenuItem>
      )}

      {(onReply || onForward) && <ContextMenuSeparator />}

      {/* Forum: Mark as Solution */}
      {isForumPost && canMarkSolution && onMarkSolution && (
        <>
          <ContextMenuItem
            onClick={() => onMarkSolution(messageId)}
            className={
              isSolvedAnswer ? "text-emerald-600 dark:text-emerald-400" : ""
            }
          >
            <CheckCircleIcon
              className="size-4"
              weight={isSolvedAnswer ? "fill" : "regular"}
            />
            {isSolvedAnswer ? "Unmark as solution" : "Mark as solution"}
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}

      {/* Copy */}
      <ContextMenuItem onClick={handleCopy}>
        <CopyIcon className="size-4" />
        Copy text
      </ContextMenuItem>

      {/* Pin (admin only) */}
      {isAdmin && onPin && (
        <ContextMenuItem onClick={() => onPin(messageId)}>
          <PushPinIcon className="size-4" />
          {isPinned ? "Unpin message" : "Pin message"}
        </ContextMenuItem>
      )}

      {/* Save/Unsave */}
      {(onSave || onUnsave) && (
        <ContextMenuItem onClick={handleSaveToggle}>
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
        </ContextMenuItem>
      )}

      {/* Owner actions */}
      {isOwner && (
        <>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(messageId)}>
              <PencilIcon className="size-4" />
              Edit message
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={() => onDelete(messageId)}
              >
                <TrashIcon className="size-4" />
                Delete message
              </ContextMenuItem>
            </>
          )}
        </>
      )}
    </ContextMenuContent>
  )
}

export const MessageContextMenuContent = memo(MessageContextMenuContentInner)
