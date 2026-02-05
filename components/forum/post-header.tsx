"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { PostStatusBadge } from "./post-status-badge"
import { OPBadge } from "./op-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PearlAvatar } from "@/components/pearl/pearl-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DotsThreeIcon,
  LockIcon,
  LockOpenIcon,
  CheckCircleIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react"
import type { Id } from "@/convex/_generated/dataModel"

interface PostHeaderProps {
  title: string
  author: {
    userId: string
    name: string
    avatar?: string
    initials: string
  }
  status: "open" | "closed" | "solved"
  isPinned?: boolean
  viaPearl?: boolean
  createdAt: number
  canModify: boolean
  isAdmin: boolean
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
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function PostHeader({
  title,
  author,
  status,
  isPinned,
  viaPearl,
  createdAt,
  canModify,
  isAdmin,
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
}: PostHeaderProps) {
  return (
    <div className="border-b border-border bg-background px-4 py-3">
      {/* Top row: Back button (mobile) + Title + Actions */}
      <div className="flex items-start gap-3">
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="shrink-0 -ml-1"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isPinned && (
              <PushPinIcon className="size-4 text-muted-foreground shrink-0" weight="fill" />
            )}
            <h1 className="text-lg font-semibold text-foreground truncate">
              {title}
            </h1>
          </div>

          {/* Author and metadata row */}
          <div className="flex items-center gap-2 flex-wrap">
            {viaPearl ? (
              <PearlAvatar size="xs" />
            ) : (
              <Avatar className="size-5">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback className="text-[0.5rem]">{author.initials}</AvatarFallback>
              </Avatar>
            )}
            <span className="text-sm text-muted-foreground">{viaPearl ? "Pearl" : author.name}</span>
            <OPBadge />
            <span className="text-xs text-muted-foreground">
              · {formatDate(createdAt)}
            </span>
            <PostStatusBadge status={status} size="sm" />
          </div>
        </div>

        {/* Actions dropdown */}
        {canModify && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="shrink-0" />
              }
            >
              <DotsThreeIcon className="size-5" weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Status actions */}
              {status === "open" && (
                <>
                  <DropdownMenuItem onClick={onMarkSolved}>
                    <CheckCircleIcon className="size-4" />
                    Mark as Solved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onClose}>
                    <LockIcon className="size-4" />
                    Close Post
                  </DropdownMenuItem>
                </>
              )}
              {status === "closed" && (
                <DropdownMenuItem onClick={onReopen}>
                  <LockOpenIcon className="size-4" />
                  Reopen Post
                </DropdownMenuItem>
              )}
              {status === "solved" && (
                <DropdownMenuItem onClick={onMarkUnsolved}>
                  <CheckCircleIcon className="size-4" />
                  Remove Solved
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Edit */}
              <DropdownMenuItem onClick={onEdit}>
                <PencilIcon className="size-4" />
                Edit Post
              </DropdownMenuItem>

              {/* Pin/Unpin (admin only) */}
              {isAdmin && (
                <>
                  {isPinned ? (
                    <DropdownMenuItem onClick={onUnpin}>
                      <PushPinSlashIcon className="size-4" />
                      Unpin Post
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onPin}>
                      <PushPinIcon className="size-4" />
                      Pin Post
                    </DropdownMenuItem>
                  )}
                </>
              )}

              <DropdownMenuSeparator />

              {/* Delete */}
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <TrashIcon className="size-4" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
