"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  ArrowBendUpLeftIcon,
  ShareIcon,
  SmileyIcon,
  DotsThreeIcon,
  CopyIcon,
  PushPinIcon,
  BookmarkIcon,
  TrashIcon,
  PencilIcon,
  FileIcon,
  DownloadSimpleIcon,
  ImageIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface Attachment {
  storageId: string
  name: string
  size: number
  type: string
}

export interface Message {
  id: string
  content: string
  timestamp: string
  user: {
    id: string
    name: string
    avatar?: string
    initials: string
  }
  attachments?: Attachment[]
  editedAt?: number
}

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
  onDeleteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, content: string) => void
}

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

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const isImage = isImageType(attachment.type)
  
  // Fetch the URL for this attachment
  const url = useQuery(api.messages.getStorageUrl, { 
    storageId: attachment.storageId as Id<"_storage"> 
  })
  
  if (isImage && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs rounded-lg overflow-hidden border border-[#26251E]/10 hover:border-[#26251E]/20 transition-colors"
      >
        <img
          src={url}
          alt={attachment.name}
          className="max-h-64 w-auto object-contain"
        />
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[#26251E]/5 text-xs text-[#26251E]/60">
          <ImageIcon className="size-3.5" />
          <span className="truncate flex-1">{attachment.name}</span>
          <span>{formatFileSize(attachment.size)}</span>
        </div>
      </a>
    )
  }

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-[#26251E]/10 px-3 py-2 hover:border-[#26251E]/20 hover:bg-[#26251E]/[0.02] transition-colors max-w-xs"
    >
      <FileIcon className="size-8 text-[#26251E]/40" weight="duotone" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#26251E] truncate">{attachment.name}</div>
        <div className="text-xs text-[#26251E]/50">{formatFileSize(attachment.size)}</div>
      </div>
      <DownloadSimpleIcon className="size-4 text-[#26251E]/40" />
    </a>
  )
}

function MessageItem({ 
  message, 
  currentUserId,
  onDeleteMessage,
}: { 
  message: Message
  currentUserId?: string
  onDeleteMessage?: (messageId: string) => void
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const isOwner = currentUserId === message.user.id

  return (
    <div
      className="group relative rounded-lg px-4 py-2 hover:bg-[#26251E]/[0.03] transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar>
          {message.user.avatar ? (
            <AvatarImage src={message.user.avatar} alt={message.user.name} />
          ) : null}
          <AvatarFallback className="bg-[#26251E]/10 text-[#26251E] text-xs">
            {message.user.initials}
          </AvatarFallback>
        </Avatar>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-[#26251E]">
              {message.user.name}
            </span>
            <span className="text-xs text-[#26251E]/40">
              {message.timestamp}
            </span>
            {message.editedAt && (
              <span className="text-[10px] text-[#26251E]/30">(edited)</span>
            )}
          </div>
          {message.content && (
            <p className="text-sm text-[#26251E]/80 mt-0.5 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((attachment, index) => (
                <AttachmentItem key={`${attachment.storageId}-${index}`} attachment={attachment} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      {isHovered && (
        <div className="absolute -top-3 right-4 flex items-center gap-0.5 rounded-md border border-[#26251E]/10 bg-[#F7F7F4] p-0.5 shadow-sm">
          <Tooltip>
            <TooltipTrigger
              render={<Button
                variant="ghost"
                size="icon-xs"
                className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
              />}
            >
              <ArrowBendUpLeftIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={<Button
                variant="ghost"
                size="icon-xs"
                className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
              />}
            >
              <ShareIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={<Button
                variant="ghost"
                size="icon-xs"
                className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
              />}
            >
              <SmileyIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Add reaction</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={<DropdownMenuTrigger
                  render={<Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
                  />}
                />}
              >
                <DotsThreeIcon className="size-3.5" weight="bold" />
              </TooltipTrigger>
              <TooltipContent>More options</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>
                <CopyIcon className="size-4" />
                Copy text
              </DropdownMenuItem>
              <DropdownMenuItem>
                <PushPinIcon className="size-4" />
                Pin message
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BookmarkIcon className="size-4" />
                Save message
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem>
                  <PencilIcon className="size-4" />
                  Edit message
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {(isOwner || true) && ( // TODO: Add admin check
                <DropdownMenuItem 
                  variant="destructive"
                  onClick={() => onDeleteMessage?.(message.id)}
                >
                  <TrashIcon className="size-4" />
                  Delete message
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

export function MessageList({ messages, currentUserId, onDeleteMessage }: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [messages])

  return (
    <div ref={scrollRef} className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex flex-col justify-end min-h-full py-4">
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageItem 
                key={message.id} 
                message={message} 
                currentUserId={currentUserId}
                onDeleteMessage={onDeleteMessage}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

