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

          <div className="space-y-4 py-4">
            {/* Channel Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-channel-name">Channel Name</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#26251E]/5 hover:bg-[#26251E]/10 transition-colors"
                  onClick={() => {}}
                >
                  <SelectedIcon className="size-4 text-[#26251E]/70" />
                </button>
                <Input
                  id="edit-channel-name"
                  placeholder="e.g., announcements"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-channel-description">
                Description <span className="text-[#26251E]/40">(optional)</span>
              </Label>
              <Textarea
                id="edit-channel-description"
                placeholder="What's this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 rounded-md border border-transparent p-3 cursor-pointer hover:bg-[#26251E]/5 has-[:checked]:border-[#26251E]/20 has-[:checked]:bg-[#26251E]/5">
                  <input
                    type="radio"
                    name="edit-permissions"
                    value="open"
                    checked={permissions === "open"}
                    onChange={() => setPermissions("open")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">Open to everyone</div>
                    <div className="text-xs text-[#26251E]/60">
                      All members can send messages in this channel.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-md border border-transparent p-3 cursor-pointer hover:bg-[#26251E]/5 has-[:checked]:border-[#26251E]/20 has-[:checked]:bg-[#26251E]/5">
                  <input
                    type="radio"
                    name="edit-permissions"
                    value="readOnly"
                    checked={permissions === "readOnly"}
                    onChange={() => setPermissions("readOnly")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">Read-only (Announcements)</div>
                    <div className="text-xs text-[#26251E]/60">
                      Only admins can send messages. Great for announcements.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
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
