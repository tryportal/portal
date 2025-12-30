"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { IconPicker, getIconComponent } from "@/components/icon-picker"

interface EditChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: Id<"channels"> | null
  organizationId: Id<"organizations">
}

export function EditChannelDialog({
  open,
  onOpenChange,
  channelId,
  organizationId,
}: EditChannelDialogProps) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [icon, setIcon] = React.useState("Hash")
  const [permissions, setPermissions] = React.useState<"open" | "readOnly">("open")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const updateChannel = useMutation(api.channels.updateChannel)
  const channel = useQuery(
    api.channels.getChannel,
    channelId ? { channelId } : "skip"
  )

  // Populate form when channel data loads
  React.useEffect(() => {
    if (channel) {
      setName(channel.name)
      setDescription(channel.description || "")
      setIcon(channel.icon)
      setPermissions(channel.permissions)
      setError(null)
    }
  }, [channel])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!channelId) return

    if (!name.trim()) {
      setError("Channel name is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await updateChannel({
        channelId,
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: description.trim() || undefined,
        icon,
        permissions,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update channel")
    } finally {
      setIsSubmitting(false)
    }
  }

  const SelectedIcon = getIconComponent(icon)

  // Don't render if no channel
  if (!channelId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
            <DialogDescription>
              Update the channel settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Channel Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-channel-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel Name</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted hover:bg-secondary transition-colors border border-border"
                  onClick={() => {}}
                >
                  <SelectedIcon className="size-5 text-foreground/70" />
                </button>
                <Input
                  id="edit-channel-name"
                  placeholder="e.g., announcements"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="h-10 text-base"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-channel-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description <span className="font-normal text-foreground/30">(optional)</span>
              </Label>
              <Textarea
                id="edit-channel-description"
                placeholder="What's this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Icon</Label>
              <div className="rounded-lg border border-border p-3 bg-background/50">
                <IconPicker value={icon} onChange={setIcon} />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissions</Label>
              <div className="grid gap-3">
                <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${permissions === "open" ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}>
                  <div className="mt-1">
                    <input
                      type="radio"
                      name="edit-permissions"
                      value="open"
                      checked={permissions === "open"}
                      onChange={() => setPermissions("open")}
                      className="sr-only"
                    />
                    <div className={`flex size-4 items-center justify-center rounded-full border ${permissions === "open" ? "border-primary bg-foreground" : "border-muted-foreground"}`}>
                      {permissions === "open" && <div className="size-1.5 rounded-full bg-card" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Open to everyone</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      All members can send messages in this channel.
                    </div>
                  </div>
                </label>
                <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${permissions === "readOnly" ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}>
                  <div className="mt-1">
                    <input
                      type="radio"
                      name="edit-permissions"
                      value="readOnly"
                      checked={permissions === "readOnly"}
                      onChange={() => setPermissions("readOnly")}
                      className="sr-only"
                    />
                    <div className={`flex size-4 items-center justify-center rounded-full border ${permissions === "readOnly" ? "border-primary bg-foreground" : "border-muted-foreground"}`}>
                      {permissions === "readOnly" && <div className="size-1.5 rounded-full bg-card" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Read-only</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Only admins can send messages. Great for announcements.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-100">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
