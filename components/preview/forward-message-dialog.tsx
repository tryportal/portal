"use client"

import type { Id } from "@/convex/_generated/dataModel"

interface ForwardMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messageId?: Id<"messages"> | string
  messageContent?: string
  organizationId?: string
  onForwardToChannel?: (messageId: string, channelId: string) => Promise<void>
  onForwardToConversation?: (messageId: string, conversationId: string) => Promise<void>
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  messageId,
  messageContent,
  organizationId,
  onForwardToChannel,
  onForwardToConversation,
}: ForwardMessageDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Forward Message</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Forward message functionality coming soon...
        </p>
        <button
          onClick={() => onOpenChange(false)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}
