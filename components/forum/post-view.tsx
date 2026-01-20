"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { PostHeader } from "./post-header"
import { OPBadge } from "./op-badge"
import { SolvedBadge } from "./solved-badge"
import { MessageList, type Message } from "@/components/preview/message-list"
import { MessageInput, type ReplyingTo } from "@/components/preview/message-input"
import type { MentionUser } from "@/components/preview/mention-autocomplete"
import type { LinkEmbedData } from "@/components/preview/link-preview"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, LockIcon } from "@phosphor-icons/react"

interface PostViewProps {
  post: Doc<"forumPosts">
  author: {
    userId: string
    name: string
    avatar?: string
    initials: string
  }
  comments: Message[]
  currentUserId?: string
  canModify: boolean
  isAdmin: boolean
  // Handlers
  onSendComment: (
    content: string,
    attachments?: Array<{
      storageId: string
      name: string
      size: number
      type: string
    }>,
    parentMessageId?: string,
    linkEmbed?: LinkEmbedData
  ) => void
  onDeleteComment?: (messageId: string) => void
  onEditComment?: (messageId: string, content: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  onMarkSolutionComment?: (messageId: string) => void
  onClose?: () => void
  onReopen?: () => void
  onMarkSolved?: () => void
  onMarkUnsolved?: () => void
  onPin?: () => void
  onUnpin?: () => void
  onDelete?: () => void
  onEdit?: () => void
  onBack?: () => void
  showBackButton?: boolean
  // Input props
  disabled?: boolean
  disabledReason?: string
  onTyping?: () => void
  generateUploadUrl?: () => Promise<string>
  mentionUsers?: MentionUser[]
  userNames?: Record<string, string>
}

export function PostView({
  post,
  author,
  comments,
  currentUserId,
  canModify,
  isAdmin,
  onSendComment,
  onDeleteComment,
  onEditComment,
  onReaction,
  onMarkSolutionComment,
  onClose,
  onReopen,
  onMarkSolved,
  onMarkUnsolved,
  onPin,
  onUnpin,
  onDelete,
  onEdit,
  onBack,
  showBackButton = false,
  disabled,
  disabledReason,
  onTyping,
  generateUploadUrl,
  mentionUsers = [],
  userNames = {},
}: PostViewProps) {
  const [replyingTo, setReplyingTo] = React.useState<ReplyingTo | null>(null)

  const handleReply = (messageId: string) => {
    const comment = comments.find((c) => c.id === messageId)
    if (comment) {
      setReplyingTo({
        messageId: comment.id,
        content: comment.content,
        userName: comment.user.name,
      })
    }
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  // Determine if commenting is disabled (closed posts can't receive new comments)
  const isCommentingDisabled = disabled || post.status === "closed"
  const commentDisabledReason =
    post.status === "closed"
      ? "This post is closed. No new comments can be added."
      : disabledReason

  // Enhanced comments with OP and solution badges
  const enhancedComments: Message[] = comments.map((comment) => ({
    ...comment,
    isOP: comment.user.id === post.authorId,
    isSolvedAnswer: post.solvedCommentId === comment.id,
  }))

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Post header */}
      <PostHeader
        title={post.title}
        author={author}
        status={post.status}
        isPinned={post.isPinned}
        createdAt={post.createdAt}
        canModify={canModify}
        isAdmin={isAdmin}
        onClose={onClose}
        onReopen={onReopen}
        onMarkSolved={onMarkSolved}
        onMarkUnsolved={onMarkUnsolved}
        onPin={onPin}
        onUnpin={onUnpin}
        onDelete={onDelete}
        onEdit={onEdit}
        onBack={onBack}
        showBackButton={showBackButton}
      />

      {/* Post content */}
      <div className="px-4 py-4 border-b border-border bg-muted/30">
        <div className="flex gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback>{author.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">{author.name}</span>
              <OPBadge />
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {post.content}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Closed post banner */}
      {post.status === "closed" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border text-sm text-muted-foreground">
          <LockIcon className="size-4" />
          This post is closed. No new comments can be added.
        </div>
      )}

      {/* Solved banner with solution link */}
      {post.status === "solved" && post.solvedCommentId && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircleIcon className="size-4" weight="fill" />
          This post has been marked as solved
        </div>
      )}

      {/* Comments section */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-border bg-muted/20">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {post.commentCount} {post.commentCount === 1 ? "Comment" : "Comments"}
          </span>
        </div>

        {/* Comments list - reuse MessageList but with forum enhancements */}
        <MessageList
          messages={enhancedComments}
          currentUserId={currentUserId}
          onDeleteMessage={onDeleteComment}
          onEditMessage={onEditComment}
          onReply={handleReply}
          onReaction={onReaction}
          userNames={userNames}
          isAdmin={isAdmin}
          isForumPost={true}
          postAuthorId={post.authorId}
          solvedCommentId={post.solvedCommentId}
          onMarkSolution={canModify ? onMarkSolutionComment : undefined}
        />

        {/* Comment input */}
        <MessageInput
          onSendMessage={onSendComment}
          channelName="this post"
          disabled={isCommentingDisabled}
          disabledReason={commentDisabledReason}
          onTyping={onTyping}
          generateUploadUrl={generateUploadUrl}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          mentionUsers={mentionUsers}
          placeholder="Write a comment..."
        />
      </div>
    </div>
  )
}
