"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { PostStatusBadge } from "./post-status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PearlAvatar } from "@/components/pearl/pearl-avatar"
import { ChatCircleIcon, PushPinIcon } from "@phosphor-icons/react"
import type { Id } from "@/convex/_generated/dataModel"

export interface ForumPost {
  _id: Id<"forumPosts">
  title: string
  content: string
  authorId: string
  status: "open" | "closed" | "solved"
  isPinned?: boolean
  viaPearl?: boolean
  createdAt: number
  lastActivityAt: number
  commentCount: number
}

export interface PostAuthor {
  userId: string
  name: string
  avatar?: string
  initials: string
}

interface PostItemProps {
  post: ForumPost
  author: PostAuthor
  isSelected?: boolean
  onClick?: () => void
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function truncateContent(content: string, maxLength = 80): string {
  // Remove markdown and get plain text
  const plainText = content.replace(/[#*_`~\[\]]/g, "").trim()
  if (plainText.length <= maxLength) return plainText
  return plainText.slice(0, maxLength).trim() + "..."
}

export function PostItem({ post, author, isSelected, onClick }: PostItemProps) {
  return (
    <button
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        "hover:bg-muted/50",
        isSelected
          ? "bg-secondary border-primary/20"
          : "bg-card border-border hover:border-border/80"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Author avatar */}
        {post.viaPearl ? (
          <PearlAvatar size="sm" className="shrink-0" />
        ) : (
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback className="text-xs">{author.initials}</AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          {/* Title row with pins and status */}
          <div className="flex items-center gap-2 mb-1">
            {post.isPinned && (
              <PushPinIcon className="size-3 text-muted-foreground shrink-0" weight="fill" />
            )}
            <h3 className="text-sm font-medium text-foreground truncate flex-1">
              {post.title}
            </h3>
            <PostStatusBadge status={post.status} showIcon={false} />
          </div>

          {/* Content preview */}
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {truncateContent(post.content)}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate">{post.viaPearl ? "Pearl" : author.name}</span>
            <span className="flex items-center gap-1">
              <ChatCircleIcon className="size-3" />
              {post.commentCount}
            </span>
            <span>{getRelativeTime(post.lastActivityAt)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
