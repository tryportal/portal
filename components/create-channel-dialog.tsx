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
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react"

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: Id<"organizations">
  defaultCategoryId?: Id<"channelCategories">
}

type Step = "details" | "permissions"

export function CreateChannelDialog({
  open,
  onOpenChange,
  organizationId,
  defaultCategoryId,
}: CreateChannelDialogProps) {
  const [step, setStep] = React.useState<Step>("details")
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [icon, setIcon] = React.useState("Hash")
  const [permissions, setPermissions] = React.useState<"open" | "readOnly">("open")
  const [categoryId, setCategoryId] = React.useState<Id<"channelCategories"> | null>(
    defaultCategoryId ?? null
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const createChannel = useMutation(api.channels.createChannel)
  const categoriesData = useQuery(api.channels.getCategoriesAndChannels, { organizationId })

  // Set default category when data loads
  React.useEffect(() => {
    if (categoriesData && categoriesData.length > 0 && !categoryId) {
      setCategoryId(categoriesData[0]._id)
    }
  }, [categoriesData, categoryId])

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setStep("details")
      setName("")
      setDescription("")
      setIcon("Hash")
      setPermissions("open")
      setCategoryId(defaultCategoryId ?? null)
      setError(null)
    }
  }, [open, defaultCategoryId])

  const handleNext = () => {
    if (!name.trim()) {
      setError("Channel name is required")
      return
    }
    setError(null)
    setStep("permissions")
  }

  const handleBack = () => {
    setError(null)
    setStep("details")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryId) {
      setError("Please select a category")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createChannel({
        organizationId,
        categoryId,
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: description.trim() || undefined,
        icon,
        permissions,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep("details")
      setName("")
      setDescription("")
      setIcon("Hash")
      setPermissions("open")
      setError(null)
    }
    onOpenChange(newOpen)
  }

  const SelectedIcon = getIconComponent(icon)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="default">
        <form onSubmit={step === "permissions" ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          <DialogHeader>
            <DialogTitle>
              {step === "details" ? "Create Channel" : "Channel Settings"}
            </DialogTitle>
            <DialogDescription>
              {step === "details"
                ? "Channels are where your team communicates."
                : "Configure permissions and select a category."}
            </DialogDescription>
          </DialogHeader>

          {step === "details" ? (
            <div className="space-y-6 py-4">
              {/* Channel Name */}
              <div className="space-y-2">
                <Label htmlFor="channel-name" className="text-xs font-semibold uppercase tracking-wider text-[#26251E]/50">Channel Name</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#26251E]/5 hover:bg-[#26251E]/10 transition-colors border border-[#26251E]/5"
                    onClick={() => {}}
                  >
                    <SelectedIcon className="size-5 text-[#26251E]/70" />
                  </button>
                  <Input
                    id="channel-name"
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
                <Label htmlFor="channel-description" className="text-xs font-semibold uppercase tracking-wider text-[#26251E]/50">
                  Description <span className="font-normal text-[#26251E]/30">(optional)</span>
                </Label>
                <Textarea
                  id="channel-description"
                  placeholder="What's this channel about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>

              {/* Icon Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-[#26251E]/50">Icon</Label>
                <div className="rounded-lg border border-[#26251E]/10 p-3 bg-[#F7F7F4]/50">
                  <IconPicker value={icon} onChange={setIcon} />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-100">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Permissions */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-[#26251E]/50">Permissions</Label>
                <div className="grid gap-3">
                  <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${permissions === "open" ? "border-[#26251E] bg-[#26251E]/5 shadow-sm" : "border-[#26251E]/10 hover:border-[#26251E]/30 hover:bg-[#26251E]/5"}`}>
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="permissions"
                        value="open"
                        checked={permissions === "open"}
                        onChange={() => setPermissions("open")}
                        className="sr-only"
                      />
                      <div className={`flex size-4 items-center justify-center rounded-full border ${permissions === "open" ? "border-[#26251E] bg-[#26251E]" : "border-[#26251E]/30"}`}>
                        {permissions === "open" && <div className="size-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#26251E]">Open to everyone</div>
                      <div className="mt-1 text-sm text-[#26251E]/60">
                        All members can send messages in this channel.
                      </div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${permissions === "readOnly" ? "border-[#26251E] bg-[#26251E]/5 shadow-sm" : "border-[#26251E]/10 hover:border-[#26251E]/30 hover:bg-[#26251E]/5"}`}>
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="permissions"
                        value="readOnly"
                        checked={permissions === "readOnly"}
                        onChange={() => setPermissions("readOnly")}
                        className="sr-only"
                      />
                      <div className={`flex size-4 items-center justify-center rounded-full border ${permissions === "readOnly" ? "border-[#26251E] bg-[#26251E]" : "border-[#26251E]/30"}`}>
                        {permissions === "readOnly" && <div className="size-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#26251E]">Read-only</div>
                      <div className="mt-1 text-sm text-[#26251E]/60">
                        Only admins can send messages. Great for announcements.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-[#26251E]/50">Category</Label>
                <div className="grid grid-cols-2 gap-2">
                  {categoriesData?.map((category) => (
                    <label
                      key={category._id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${categoryId === category._id ? "border-[#26251E] bg-[#26251E]/5 shadow-sm" : "border-[#26251E]/10 hover:border-[#26251E]/30 hover:bg-[#26251E]/5"}`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={category._id}
                        checked={categoryId === category._id}
                        onChange={() => setCategoryId(category._id)}
                        className="sr-only"
                      />
                      <div className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${categoryId === category._id ? "border-[#26251E] bg-[#26251E]" : "border-[#26251E]/30"}`}>
                        {categoryId === category._id && <div className="size-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-medium truncate">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-100">
                  {error}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {step === "details" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim()}>
                  Next
                  <ArrowRightIcon className="size-4 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeftIcon className="size-4 mr-1" />
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting || !categoryId}>
                  {isSubmitting ? "Creating..." : "Create Channel"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
