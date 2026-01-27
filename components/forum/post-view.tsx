"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import { PostHeader } from "./post-header"
import { OPBadge } from "./op-badge"
import { SolvedBadge } from "./solved-badge"
import { MessageList, type Message } from "@/components/chat"
import { MessageInput, type ReplyingTo } from "@/components/preview/message-input"
import type { MentionUser } from "@/components/preview/mention-autocomplete"
import type { LinkEmbedData } from "@/components/preview/link-preview"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, LockIcon, ImageIcon, VideoCameraIcon, FileIcon, DownloadSimpleIcon, Spinner } from "@phosphor-icons/react"
import { ResizableVerticalPanel } from "@/components/ui/resizable-vertical-panel"

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
  attachmentUrls?: Record<string, string | null>
}

// Utility functions for attachments
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function isImageType(type: string): boolean {
  return type.startsWith("image/")
}

function isVideoType(type: string): boolean {
  return type.startsWith("video/")
}

// Attachment display component
function PostAttachmentItem({ 
  attachment, 
  url 
}: { 
  attachment: { storageId: string; name: string; size: number; type: string }
  url: string | null 
}) {
  const isImage = isImageType(attachment.type)
  const isVideo = isVideoType(attachment.type)

  if (isImage && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs rounded-md overflow-hidden border border-border hover:border-border/80 transition-all hover:shadow-sm"
      >
        <img
          src={url}
          alt={attachment.name}
          className="max-h-64 w-auto object-contain bg-muted/30"
        />
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5 shrink-0" />
          <span className="truncate flex-1 font-medium min-w-0">{attachment.name}</span>
          <span className="text-muted-foreground/70 font-medium">{formatFileSize(attachment.size)}</span>
        </div>
      </a>
    )
  }

  if (isVideo && url) {
    return (
      <div className="block max-w-md rounded-md overflow-hidden border border-border hover:border-border/80 transition-all hover:shadow-sm">
        <video
          src={url}
          controls
          preload="metadata"
          className="max-h-80 w-auto bg-black"
        >
          Your browser does not support the video tag.
        </video>
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 text-xs text-muted-foreground">
          <VideoCameraIcon className="size-3.5 shrink-0" />
          <span className="truncate flex-1 font-medium min-w-0">{attachment.name}</span>
          <span className="text-muted-foreground/70 font-medium">{formatFileSize(attachment.size)}</span>
          <a
            href={url}
            download={attachment.name}
            className="hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <DownloadSimpleIcon className="size-3.5 shrink-0" />
          </a>
        </div>
      </div>
    )
  }

  if (!url) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2 opacity-60 cursor-not-allowed max-w-xs"
        aria-disabled="true"
        tabIndex={-1}
        title="Attachment loading..."
      >
        <FileIcon className="size-8 text-muted-foreground shrink-0" weight="duotone" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate min-w-0">{attachment.name}</div>
          <div className="text-xs text-muted-foreground font-medium">{formatFileSize(attachment.size)}</div>
        </div>
        <Spinner className="size-4 text-muted-foreground shrink-0 animate-spin" />
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2 hover:border-border/80 hover:bg-muted/30 transition-all hover:shadow-sm max-w-xs"
    >
      <FileIcon className="size-8 text-muted-foreground shrink-0" weight="duotone" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate min-w-0">{attachment.name}</div>
        <div className="text-xs text-muted-foreground font-medium">{formatFileSize(attachment.size)}</div>
      </div>
      <DownloadSimpleIcon className="size-4 text-muted-foreground shrink-0" />
    </a>
  )
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
  attachmentUrls = {},
}: PostViewProps) {
  const [replyingTo, setReplyingTo] = React.useState<ReplyingTo | null>(null)

  // Fetch attachment URLs for post attachments
  const postAttachmentStorageIds = React.useMemo(() => {
    if (!post.attachments || post.attachments.length === 0) return []
    return post.attachments.map(att => att.storageId)
  }, [post.attachments])

  const postAttachmentUrls = useQuery(
    api.messages.getBatchStorageUrls,
    postAttachmentStorageIds.length > 0 ? { storageIds: postAttachmentStorageIds } : "skip"
  ) ?? {}

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

      {/* Post content and comments header - resizable */}
      <ResizableVerticalPanel
        storageKey="portal-forum-post-content-height"
        defaultHeight={220}
        minHeight={120}
        maxHeight={500}
        className="overflow-hidden flex flex-col"
      >
        {/* Post content */}
        <div className="flex-1 min-h-0 overflow-auto px-4 py-4 border-b border-border bg-muted/30">
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
              {/* Post attachments */}
              {post.attachments && post.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.attachments.map((attachment, index) => (
                    <PostAttachmentItem
                      key={`${attachment.storageId}-${index}`}
                      attachment={attachment}
                      url={postAttachmentUrls[attachment.storageId] || null}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closed post banner */}
        {post.status === "closed" && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border text-sm text-muted-foreground shrink-0">
            <LockIcon className="size-4" />
            This post is closed. No new comments can be added.
          </div>
        )}

        {/* Solved banner with solution link */}
        {post.status === "solved" && post.solvedCommentId && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircleIcon className="size-4" weight="fill" />
            This post has been marked as solved
          </div>
        )}

        {/* Comments counter */}
        <div className="px-4 py-2 border-b border-border bg-muted/20 shrink-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {post.commentCount} {post.commentCount === 1 ? "Comment" : "Comments"}
          </span>
        </div>
      </ResizableVerticalPanel>

      {/* Comments section */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
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
          canMarkSolution={canModify}
          onMarkSolution={canModify ? onMarkSolutionComment : undefined}
          attachmentUrls={attachmentUrls}
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
