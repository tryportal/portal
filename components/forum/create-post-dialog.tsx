"use client"

import * as React from "react"
import { useMutation } from "convex/react"
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
import { ImageIcon, XIcon, SpinnerIcon, FileIcon } from "@phosphor-icons/react"

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

interface PendingAttachment {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: "pending" | "uploading" | "uploaded" | "error"
  storageId?: string
  error?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: Id<"channels">
  onPostCreated?: (postId: Id<"forumPosts">) => void
  generateUploadUrl?: () => Promise<string>
}

export function CreatePostDialog({
  open,
  onOpenChange,
  channelId,
  onPostCreated,
  generateUploadUrl,
}: CreatePostDialogProps) {
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [isDraggingOver, setIsDraggingOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dragCounterRef = React.useRef(0)

  const createPost = useMutation(api.forumPosts.createPost)

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setTitle("")
      setContent("")
      setError(null)
      setAttachments([])
      setIsUploading(false)
      setIsDraggingOver(false)
      dragCounterRef.current = 0
    }
  }, [open])

  // Process files for upload
  const processFiles = React.useCallback(async (files: File[]) => {
    if (!generateUploadUrl) return

    const newAttachments: PendingAttachment[] = []

    for (const file of files) {
      const id = crypto.randomUUID()

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        newAttachments.push({
          id,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
          error: "File exceeds 5MB limit",
        })
        continue
      }

      newAttachments.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "pending",
      })
    }

    setAttachments(prev => [...prev, ...newAttachments])

    // Upload each pending file
    setIsUploading(true)
    for (const attachment of newAttachments) {
      if (attachment.status !== "pending") continue

      // Update status to uploading
      setAttachments(prev => prev.map(a =>
        a.id === attachment.id ? { ...a, status: "uploading" as const } : a
      ))

      try {
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": attachment.file.type },
          body: attachment.file,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const { storageId } = await response.json()

        // Update status to uploaded
        setAttachments(prev => prev.map(a =>
          a.id === attachment.id
            ? { ...a, status: "uploaded" as const, storageId }
            : a
        ))
      } catch {
        // Update status to error
        setAttachments(prev => prev.map(a =>
          a.id === attachment.id
            ? { ...a, status: "error" as const, error: "Upload failed" }
            : a
        ))
      }
    }
    setIsUploading(false)
  }, [generateUploadUrl])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  // Handle pasting images from clipboard
  const handlePaste = React.useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!generateUploadUrl) return
    
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          // Generate a filename for pasted images
          const extension = item.type.split("/")[1] || "png"
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
          const namedFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
            type: file.type,
          })
          imageFiles.push(namedFile)
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault() // Prevent the image from being pasted as text/base64
      await processFiles(imageFiles)
    }
  }, [processFiles, generateUploadUrl])

  // Drag and drop handlers
  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true)
    }
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false)
    }
  }, [])

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = React.useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDraggingOver(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    // Process all file types
    await processFiles(Array.from(files))
  }, [processFiles])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError("Title is required")
      return
    }

    if (!content.trim() && attachments.filter(a => a.status === "uploaded").length === 0) {
      setError("Content or at least one attachment is required")
      return
    }

    // Wait for any pending uploads to complete
    if (isUploading) {
      setError("Please wait for file uploads to complete")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const uploadedAttachments = attachments
        .filter(a => a.status === "uploaded" && a.storageId)
        .map(a => ({
          storageId: a.storageId! as Id<"_storage">,
          name: a.name,
          size: a.size,
          type: a.type,
        }))

      const postId = await createPost({
        channelId,
        title: title.trim(),
        content: content.trim(),
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      })
      onPostCreated?.(postId)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        size="default"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={isDraggingOver ? "ring-2 ring-primary ring-inset" : ""}
      >
        {/* Drag overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-primary pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <FileIcon className="size-8" />
              <span className="text-sm font-medium">Drop images here</span>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
            <DialogDescription>
              Start a new discussion in this forum. Add a clear title and
              description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label
                htmlFor="post-title"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Title
              </Label>
              <Input
                id="post-title"
                placeholder="What's your question or topic?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className="h-10 text-base"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label
                htmlFor="post-content"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Details
              </Label>
              <Textarea
                id="post-content"
                placeholder="Provide more context or details about your post..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                className="min-h-[150px] resize-none text-sm"
              />
            </div>

            {/* File Upload */}
            {generateUploadUrl && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Attachments
                </Label>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isSubmitting}
                    className="w-fit"
                  >
                    <ImageIcon className="size-4 mr-2" />
                    Add Images
                  </Button>

                  {/* Attachment Preview List */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="relative flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1.5 text-sm"
                        >
                          {attachment.status === "uploading" ? (
                            <>
                              <SpinnerIcon className="size-4 animate-spin text-muted-foreground" />
                              <span className="text-muted-foreground text-xs">
                                Uploading...
                              </span>
                            </>
                          ) : attachment.status === "error" ? (
                            <>
                              <FileIcon className="size-4 text-red-500" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-red-500 truncate">
                                  {attachment.name}
                                </span>
                                <span className="text-xs text-red-500/70">
                                  {attachment.error}
                                </span>
                              </div>
                            </>
                          ) : attachment.status === "uploaded" ? (
                            <>
                              <ImageIcon className="size-4 text-green-500" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-foreground truncate">
                                  {attachment.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(attachment.size)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <FileIcon className="size-4 text-muted-foreground" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-foreground truncate">
                                  {attachment.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(attachment.size)}
                                </span>
                              </div>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            className="ml-1 p-0.5 hover:bg-muted rounded transition-colors"
                            disabled={attachment.status === "uploading"}
                          >
                            <XIcon className="size-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                isUploading ||
                !title.trim() ||
                (!content.trim() && attachments.filter(a => a.status === "uploaded").length === 0)
              }
            >
              {isSubmitting ? "Creating..." : isUploading ? "Uploading..." : "Create Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
