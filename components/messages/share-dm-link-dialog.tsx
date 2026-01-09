"use client"

import * as React from "react"
import {
  CopyIcon,
  CheckIcon,
  LinkIcon,
} from "@phosphor-icons/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShareDmLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  handle: string
}

export function ShareDmLinkDialog({
  open,
  onOpenChange,
  handle,
}: ShareDmLinkDialogProps) {
  const [copied, setCopied] = React.useState(false)

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/dm/${handle}`
    : `/dm/${handle}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Reset copied state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setCopied(false)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Share Your DM Link</DialogTitle>
          <DialogDescription>
            Anyone with this link can start a direct message with you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Your DM Link
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="pl-9 pr-3 bg-muted"
                />
              </div>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                {copied ? (
                  <CheckIcon className="size-4 text-green-500" weight="bold" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-green-500">Copied to clipboard</p>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              Your handle: <span className="font-medium text-foreground">@{handle}</span>
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
