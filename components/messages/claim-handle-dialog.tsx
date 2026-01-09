"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import {
  CheckIcon,
  XIcon,
  SpinnerIcon,
  LinkIcon,
} from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ClaimHandleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (handle: string) => void
}

export function ClaimHandleDialog({
  open,
  onOpenChange,
  onSuccess,
}: ClaimHandleDialogProps) {
  const [handle, setHandle] = React.useState("")
  const [debouncedHandle, setDebouncedHandle] = React.useState("")
  const [isClaiming, setIsClaiming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const claimHandle = useMutation(api.users.claimHandle)

  // Check availability with debounced handle
  const availability = useQuery(
    api.users.checkHandleAvailability,
    debouncedHandle.length >= 3 ? { handle: debouncedHandle } : "skip"
  )

  // Debounce handle input
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedHandle(handle)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [handle])

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setHandle("")
      setDebouncedHandle("")
      setError(null)
    }
  }, [open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
    if (value.length <= 12) {
      setHandle(value)
      setError(null)
    }
  }

  const handleClaim = async () => {
    if (!handle || handle.length < 3 || !availability?.available) return

    setIsClaiming(true)
    setError(null)
    try {
      const result = await claimHandle({ handle })
      if (result.success) {
        onOpenChange(false)
        onSuccess?.(result.handle)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim handle")
    } finally {
      setIsClaiming(false)
    }
  }

  const getValidationMessage = () => {
    if (handle.length === 0) return null
    if (handle.length < 3) return "Must be at least 3 characters"
    if (!availability) return null
    if (availability.available) return "Available"
    switch (availability.reason) {
      case "taken":
        return "Already taken"
      case "reserved":
        return "This handle is reserved"
      case "invalid_format":
        return "Only letters, numbers, and underscores allowed"
      default:
        return "Not available"
    }
  }

  const isValid = handle.length >= 3 && availability?.available === true
  const validationMessage = getValidationMessage()
  const isChecking = handle.length >= 3 && debouncedHandle !== handle

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Claim Your DM Link</DialogTitle>
          <DialogDescription>
            Choose a unique handle to create your shareable DM link. Others can use this link to start a conversation with you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                @
              </span>
              <Input
                type="text"
                placeholder="yourhandle"
                value={handle}
                onChange={handleInputChange}
                className="pl-7 pr-9"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking ? (
                  <SpinnerIcon className="size-4 text-muted-foreground animate-spin" />
                ) : handle.length >= 3 && availability ? (
                  availability.available ? (
                    <CheckIcon className="size-4 text-green-500" weight="bold" />
                  ) : (
                    <XIcon className="size-4 text-red-500" weight="bold" />
                  )
                ) : null}
              </div>
            </div>

            {validationMessage && (
              <p
                className={cn(
                  "text-xs",
                  isValid ? "text-green-500" : "text-muted-foreground"
                )}
              >
                {validationMessage}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              3-12 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          {isValid && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">Your link will be:</p>
              <div className="flex items-center gap-2">
                <LinkIcon className="size-4 text-foreground/70" />
                <code className="text-sm text-foreground">
                  {typeof window !== "undefined" ? window.location.origin : ""}/dm/{handle}
                </code>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClaim}
              disabled={!isValid || isClaiming}
            >
              {isClaiming ? (
                <>
                  <SpinnerIcon className="size-4 animate-spin mr-2" />
                  Claiming...
                </>
              ) : (
                "Claim Handle"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
