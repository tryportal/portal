"use client"

import type { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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
}: ForwardMessageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
          <DialogDescription>
            Forward message functionality coming soon...
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
