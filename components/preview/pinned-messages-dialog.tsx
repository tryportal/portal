"use client"

import * as React from "react"
import { PushPinIcon, XIcon } from "@phosphor-icons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"


function formatFullDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export interface PinnedMessage {
  id: string
  content: string
  timestamp: string
  createdAt?: number
  user: {
    id: string
    name: string
    avatar?: string
    initials: string
  }
}

interface PinnedMessagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pinnedMessages: PinnedMessage[]
  onMessageClick?: (messageId: string) => void
  onUnpin?: (messageId: string) => void
  isAdmin?: boolean
}

export function PinnedMessagesDialog({
  open,
  onOpenChange,
  pinnedMessages,
  onMessageClick,
  onUnpin,
  isAdmin = false,
}: PinnedMessagesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <PushPinIcon className="size-4" />
              Pinned Messages
            </DialogTitle>
            <DialogClose
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <XIcon className="size-4" />
            </DialogClose>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          {pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <PushPinIcon className="size-10 text-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No pinned messages</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pin important messages to find them easily
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {pinnedMessages.map((message) => (
                <div
                  key={message.id}
                  className="group relative rounded-lg border border-border bg-card p-3 hover:border-border/80 transition-colors cursor-pointer"
                  onClick={() => onMessageClick?.(message.id)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="size-8 flex-shrink-0">
                      {message.user.avatar && (
                        <AvatarImage src={message.user.avatar} alt={message.user.name} />
                      )}
                      <AvatarFallback className="text-xs bg-secondary text-foreground">
                        {message.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {message.user.name}
                        </span>
                        <span 
                          className="text-xs text-muted-foreground cursor-default"
                          title={message.createdAt ? formatFullDateTime(message.createdAt) : undefined}
                        >
                          {message.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/70 line-clamp-3">
                        {message.content}
                      </p>
                    </div>
                  </div>

                  {isAdmin && onUnpin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUnpin(message.id)
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                    >
                      <PushPinIcon className="size-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
