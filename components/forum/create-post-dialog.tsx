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

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: Id<"channels">
  onPostCreated?: (postId: Id<"forumPosts">) => void
}

export function CreatePostDialog({
  open,
  onOpenChange,
  channelId,
  onPostCreated,
}: CreatePostDialogProps) {
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const createPost = useMutation(api.forumPosts.createPost)

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setTitle("")
      setContent("")
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError("Title is required")
      return
    }

    if (!content.trim()) {
      setError("Content is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const postId = await createPost({
        channelId,
        title: title.trim(),
        content: content.trim(),
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
      <DialogContent size="default">
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
                className="min-h-[150px] resize-none text-sm"
              />
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
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
