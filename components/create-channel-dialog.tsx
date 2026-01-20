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
import { MemberSelector } from "@/components/member-selector"
import { ArrowLeftIcon, ArrowRightIcon, LockIcon, ChatCircleDotsIcon, HashIcon } from "@phosphor-icons/react"
import { analytics } from "@/lib/analytics"

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: Id<"organizations">
  defaultCategoryId?: Id<"channelCategories">
}

type Step = "details" | "permissions" | "members"

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
  const [channelType, setChannelType] = React.useState<"chat" | "forum">("chat")
  const [permissions, setPermissions] = React.useState<"open" | "readOnly">("open")
  const [whoCanPost, setWhoCanPost] = React.useState<"everyone" | "admins">("everyone")
  const [isPrivate, setIsPrivate] = React.useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>([])
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

  // Check if there are no categories
  const hasNoCategories = categoriesData !== undefined && categoriesData.length === 0

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setStep("details")
      setName("")
      setDescription("")
      setIcon("Hash")
      setChannelType("chat")
      setPermissions("open")
      setWhoCanPost("everyone")
      setIsPrivate(false)
      setSelectedMemberIds([])
      setCategoryId(defaultCategoryId ?? null)
      setError(null)
    }
  }, [open, defaultCategoryId])

  const handleNext = () => {
    if (step === "details") {
      if (!name.trim()) {
        setError("Channel name is required")
        return
      }
      setError(null)
      setStep("permissions")
    } else if (step === "permissions") {
      setError(null)
      if (isPrivate) {
        setStep("members")
      } else {
        // Skip members step for non-private channels, submit directly
        handleFinalSubmit()
      }
    }
  }

  const handleBack = () => {
    setError(null)
    if (step === "permissions") {
      setStep("details")
    } else if (step === "members") {
      setStep("permissions")
    }
  }

  const handleFinalSubmit = async () => {
    if (!categoryId) {
      setError("Please select a category")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const channelId = await createChannel({
        organizationId,
        categoryId,
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: description.trim() || undefined,
        icon,
        permissions,
        isPrivate,
        memberIds: isPrivate ? selectedMemberIds : undefined,
        channelType,
        forumSettings: channelType === "forum" ? { whoCanPost } : undefined,
      })
      analytics.channelCreated({
        channelId,
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        workspaceId: organizationId,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step === "members") {
      await handleFinalSubmit()
    } else {
      handleNext()
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep("details")
      setName("")
      setDescription("")
      setIcon("Hash")
      setChannelType("chat")
      setPermissions("open")
      setWhoCanPost("everyone")
      setIsPrivate(false)
      setSelectedMemberIds([])
      setError(null)
    }
    onOpenChange(newOpen)
  }

  const SelectedIcon = getIconComponent(icon)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="default">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {step === "details" && "Create Channel"}
              {step === "permissions" && "Channel Settings"}
              {step === "members" && "Select Members"}
            </DialogTitle>
            <DialogDescription>
              {step === "details" && "Channels are where your team communicates."}
              {step === "permissions" && "Configure permissions and select a category."}
              {step === "members" && "Choose who can access this private channel."}
            </DialogDescription>
          </DialogHeader>

          {step === "details" && (
            <div className="space-y-6 py-4">
              {hasNoCategories ? (
                <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-200">
                  <p className="font-medium mb-1">No categories available</p>
                  <p className="text-yellow-700">
                    You need to create at least one category before you can create a channel. Channels must belong to a category.
                  </p>
                </div>
              ) : (
                <>
              {/* Channel Name */}
              <div className="space-y-2">
                <Label htmlFor="channel-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel Name</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted hover:bg-secondary transition-colors border border-border"
                    onClick={() => {}}
                  >
                    <SelectedIcon className="size-5 text-foreground/70" />
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
                <Label htmlFor="channel-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description <span className="font-normal text-foreground/30">(optional)</span>
                </Label>
                <Textarea
                  id="channel-description"
                  placeholder="What's this channel about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>

              {/* Channel Type */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${channelType === "chat" ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}>
                    <input
                      type="radio"
                      name="channelType"
                      value="chat"
                      checked={channelType === "chat"}
                      onChange={() => setChannelType("chat")}
                      className="sr-only"
                    />
                    <HashIcon className="size-5 text-muted-foreground" weight="bold" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">Chat</div>
                      <div className="text-xs text-muted-foreground">Real-time messaging</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${channelType === "forum" ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}>
                    <input
                      type="radio"
                      name="channelType"
                      value="forum"
                      checked={channelType === "forum"}
                      onChange={() => setChannelType("forum")}
                      className="sr-only"
                    />
                    <ChatCircleDotsIcon className="size-5 text-muted-foreground" weight="bold" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">Forum</div>
                      <div className="text-xs text-muted-foreground">Threaded discussions</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Icon</Label>
                <div className="rounded-lg border border-border p-3 bg-background/50">
                  <IconPicker value={icon} onChange={setIcon} />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-100">
                  {error}
                </div>
              )}
              </>
              )}
            </div>
          )}

          {step === "permissions" && (
            <div className="space-y-6 py-4">
              {/* Chat Channel Permissions */}
              {channelType === "chat" && (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissions</Label>
                  <div className="grid gap-3">
                    <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${permissions === "open" ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}>
                      <div className="mt-1">
                        <input
                          type="radio"
                          name="permissions"
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
                          name="permissions"
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
              )}

              {/* Forum Channel Permissions */}
              {channelType === "forum" && (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who Can Create Posts</Label>
                  <div className="grid gap-3">
                    <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${whoCanPost === "everyone" ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}>
                      <div className="mt-1">
                        <input
                          type="radio"
                          name="whoCanPost"
                          value="everyone"
                          checked={whoCanPost === "everyone"}
                          onChange={() => setWhoCanPost("everyone")}
                          className="sr-only"
                        />
                        <div className={`flex size-4 items-center justify-center rounded-full border ${whoCanPost === "everyone" ? "border-primary bg-foreground" : "border-muted-foreground"}`}>
                          {whoCanPost === "everyone" && <div className="size-1.5 rounded-full bg-card" />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">Everyone</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          All members can create posts and reply to discussions.
                        </div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${whoCanPost === "admins" ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}>
                      <div className="mt-1">
                        <input
                          type="radio"
                          name="whoCanPost"
                          value="admins"
                          checked={whoCanPost === "admins"}
                          onChange={() => setWhoCanPost("admins")}
                          className="sr-only"
                        />
                        <div className={`flex size-4 items-center justify-center rounded-full border ${whoCanPost === "admins" ? "border-primary bg-foreground" : "border-muted-foreground"}`}>
                          {whoCanPost === "admins" && <div className="size-1.5 rounded-full bg-card" />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">Admins only</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Only admins can create posts. Everyone can comment.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Private Channel Toggle */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access</Label>
                <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${isPrivate ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}>
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`flex size-5 items-center justify-center rounded border transition-colors ${isPrivate ? "border-primary bg-foreground" : "border-muted-foreground"}`}>
                      {isPrivate && <LockIcon className="size-3 text-background" weight="bold" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      <LockIcon className="size-4" weight="bold" />
                      Private Channel
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Only selected members can see and access this channel.
                    </div>
                  </div>
                </label>
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                {hasNoCategories ? (
                  <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-200">
                    <p className="font-medium mb-1">No categories available</p>
                    <p className="text-yellow-700">
                      You need to create at least one category before you can create a channel. Channels must belong to a category.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {categoriesData?.map((category) => (
                      <label
                        key={category._id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${categoryId === category._id ? "border-primary bg-muted shadow-sm" : "border-border hover:border-border/80 hover:bg-muted"}`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category._id}
                          checked={categoryId === category._id}
                          onChange={() => setCategoryId(category._id)}
                          className="sr-only"
                        />
                        <div className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${categoryId === category._id ? "border-primary bg-foreground" : "border-muted-foreground"}`}>
                          {categoryId === category._id && <div className="size-1.5 rounded-full bg-card" />}
                        </div>
                        <span className="text-sm font-medium truncate">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-100">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === "members" && (
            <div className="space-y-6 py-4">
              <MemberSelector
                organizationId={organizationId}
                selectedMemberIds={selectedMemberIds}
                onSelectionChange={setSelectedMemberIds}
                label="Channel Members"
              />

              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <p>You will be automatically added as a member of this channel.</p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-100">
                  {error}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {step === "details" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || hasNoCategories}>
                  Next
                  <ArrowRightIcon className="size-4 ml-1" />
                </Button>
              </>
            )}
            {step === "permissions" && (
              <>
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeftIcon className="size-4 mr-1" />
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting || !categoryId || hasNoCategories}>
                  {isSubmitting ? "Creating..." : isPrivate ? (
                    <>
                      Next
                      <ArrowRightIcon className="size-4 ml-1" />
                    </>
                  ) : "Create Channel"}
                </Button>
              </>
            )}
            {step === "members" && (
              <>
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeftIcon className="size-4 mr-1" />
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting || !categoryId || hasNoCategories}>
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
