"use client"

import type { Id } from "@/convex/_generated/dataModel"

interface ForwardMessageDialogProps {
  isOpen: boolean
  onClose: () => void
  messageId?: Id<"messages">
  messageContent?: string
}

export function ForwardMessageDialog({
  isOpen,
  onClose,
  messageId,
  messageContent,
}: ForwardMessageDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Forward Message</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Forward message functionality coming soon...
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}
