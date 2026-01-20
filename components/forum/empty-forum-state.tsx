"use client"

import { ChatCircleDotsIcon, PlusIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface EmptyForumStateProps {
  onCreatePost?: () => void
  canCreatePost: boolean
}

export function EmptyForumState({
  onCreatePost,
  canCreatePost,
}: EmptyForumStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
        <ChatCircleDotsIcon className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No posts yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {canCreatePost
          ? "Be the first to start a discussion in this forum. Create a post to get the conversation going."
          : "There are no posts in this forum yet. Check back later for new discussions."}
      </p>
      {canCreatePost && onCreatePost && (
        <Button onClick={onCreatePost} className="gap-2">
          <PlusIcon className="size-4" />
          Create First Post
        </Button>
      )}
    </div>
  )
}
