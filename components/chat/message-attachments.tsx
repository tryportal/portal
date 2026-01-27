"use client"

import { memo } from "react"
import { AttachmentItem } from "./attachment-item"
import { useGetAttachmentUrl } from "./message-list-context"
import type { Attachment } from "./utils"

/**
 * Message Attachments Grid
 *
 * Renders a grid of attachments for a message.
 * Automatically adapts layout based on attachment count and types.
 * Memoized to prevent re-renders when parent message updates.
 */

// =============================================================================
// PROPS
// =============================================================================

interface MessageAttachmentsProps {
  attachments: Attachment[]
  attachmentUrls?: Record<string, string | null>
  className?: string
}

// =============================================================================
// LAYOUT HELPERS
// =============================================================================

/**
 * Determines if attachments should use a compact grid layout.
 * Used when we have multiple images that can be displayed in a gallery.
 */
function shouldUseCompactGrid(attachments: Attachment[]): boolean {
  // Only use grid for 2+ image attachments
  if (attachments.length < 2) return false
  
  // Check if all attachments are images
  return attachments.every((a) => a.type.startsWith("image/"))
}

/**
 * Gets grid column class based on attachment count.
 */
function getGridClass(count: number): string {
  if (count === 2) return "grid-cols-2"
  if (count === 3) return "grid-cols-3"
  if (count >= 4) return "grid-cols-2"
  return ""
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function MessageAttachmentsInner({
  attachments,
  attachmentUrls,
  className,
}: MessageAttachmentsProps) {
  // Get URL getter from context as fallback
  const getAttachmentUrl = useGetAttachmentUrl()

  if (!attachments || attachments.length === 0) {
    return null
  }

  // Helper to get URL - prefer prop, fallback to context
  const getUrl = (storageId: string) => {
    if (attachmentUrls && storageId in attachmentUrls) {
      return attachmentUrls[storageId]
    }
    return getAttachmentUrl(storageId)
  }

  const useCompactGrid = shouldUseCompactGrid(attachments)

  if (useCompactGrid) {
    return (
      <div
        className={`grid gap-2 ${getGridClass(attachments.length)} ${className ?? ""}`}
      >
        {attachments.map((attachment) => (
          <AttachmentItem
            key={attachment.storageId}
            attachment={attachment}
            url={getUrl(attachment.storageId)}
          />
        ))}
      </div>
    )
  }

  // Default: stack attachments vertically
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.storageId}
          attachment={attachment}
          url={getUrl(attachment.storageId)}
        />
      ))}
    </div>
  )
}

export const MessageAttachments = memo(MessageAttachmentsInner)
