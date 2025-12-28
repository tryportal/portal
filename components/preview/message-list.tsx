"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  ArrowBendUpLeftIcon,
  ShareIcon,
  DotsThreeIcon,
  CopyIcon,
  PushPinIcon,
  BookmarkIcon,
  TrashIcon,
  PencilIcon,
  FileIcon,
  DownloadSimpleIcon,
  ImageIcon,
  BookmarkSimpleIcon,
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
import { ReactionPicker, ReactionDisplay } from "./reaction-picker"
import { EmptyChannelState } from "./empty-channel-state"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export interface Attachment {
  storageId: string
  name: string
  size: number
  type: string
}

export interface Reaction {
  userId: string
  emoji: string
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
  parentMessageId?: string
  parentMessage?: {
    content: string
    userName: string
  }
  reactions?: Reaction[]
  pinned?: boolean
  mentions?: string[]
}

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
  onDeleteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, content: string) => void
  onReply?: (messageId: string) => void
  onForward?: (messageId: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onAvatarClick?: (userId: string) => void
  onNameClick?: (userId: string) => void
  savedMessageIds?: Set<string>
  userNames?: Record<string, string>
  channelName?: string
  channelDescription?: string
  channelIcon?: React.ElementType
  isAdmin?: boolean
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

// Markdown renderer components
const MarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-1 last:mb-0">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => {
    if (inline) {
      return (
        <code className="px-1 py-0.5 bg-[#26251E]/5 rounded text-sm font-mono">
          {children}
        </code>
      )
    }
    return (
      <pre className="p-2 bg-[#26251E]/5 rounded-md overflow-x-auto my-1">
        <code className="text-sm font-mono">{children}</code>
      </pre>
    )
  },
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside my-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside my-1">{children}</ol>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
}

// Highlight mentions in content
function highlightMentions(content: string, mentions?: string[], userNames?: Record<string, string>): string {
  if (!mentions || mentions.length === 0) return content
  
  let highlighted = content
  for (const userId of mentions) {
    const userName = userNames?.[userId] || userId
    const mentionPattern = new RegExp(`@${userId}`, "g")
    highlighted = highlighted.replace(mentionPattern, `**@${userName}**`)
  }
  return highlighted
}

function MessageItem({ 
  message, 
  currentUserId,
  onDeleteMessage,
  onReply,
  onForward,
  onReaction,
  onPin,
  onSave,
  onUnsave,
  onAvatarClick,
  onNameClick,
  isSaved,
  userNames,
  isAdmin,
}: { 
  message: Message
  currentUserId?: string
  onDeleteMessage?: (messageId: string) => void
  onReply?: (messageId: string) => void
  onForward?: (messageId: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onAvatarClick?: (userId: string) => void
  onNameClick?: (userId: string) => void
  isSaved?: boolean
  userNames?: Record<string, string>
  isAdmin?: boolean
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const isOwner = currentUserId === message.user.id

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleSaveToggle = () => {
    if (isSaved) {
      onUnsave?.(message.id)
    } else {
      onSave?.(message.id)
    }
  }

  // Process content to highlight mentions
  const processedContent = highlightMentions(message.content, message.mentions, userNames)

  return (
    <div
      className="group relative rounded-lg px-4 py-2 hover:bg-[#26251E]/[0.03] transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Reply indicator */}
      {message.parentMessage && (
        <div className="flex items-center gap-2 mb-1 ml-11 text-xs text-[#26251E]/50">
          <ArrowBendUpLeftIcon className="size-3" />
          <span>Replying to</span>
          <span className="font-medium text-[#26251E]/70">{message.parentMessage.userName}</span>
          <span className="truncate max-w-[200px]">{message.parentMessage.content}</span>
        </div>
      )}

      {/* Pin indicator */}
      {message.pinned && (
        <div className="flex items-center gap-1.5 mb-1 ml-11 text-xs text-amber-600">
          <PushPinIcon className="size-3" weight="fill" />
          <span>Pinned</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar 
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onAvatarClick?.(message.user.id)}
        >
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
            <button
              onClick={() => onNameClick?.(message.user.id)}
              className="font-semibold text-sm text-[#26251E] hover:underline"
            >
              {message.user.name}
            </button>
            <span className="text-xs text-[#26251E]/40">
              {message.timestamp}
            </span>
            {message.editedAt && (
              <span className="text-[10px] text-[#26251E]/30">(edited)</span>
            )}
          </div>
          {message.content && (
            <div className="text-sm text-[#26251E]/80 mt-0.5 leading-relaxed prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          )}
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((attachment, index) => (
                <AttachmentItem key={`${attachment.storageId}-${index}`} attachment={attachment} />
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <ReactionDisplay
              reactions={message.reactions}
              currentUserId={currentUserId}
              onToggleReaction={(emoji) => onReaction?.(message.id, emoji)}
              userNames={userNames}
            />
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
                onClick={() => onReply?.(message.id)}
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
                onClick={() => onForward?.(message.id)}
              />}
            >
              <ShareIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>

          <ReactionPicker
            onSelectReaction={(emoji) => onReaction?.(message.id, emoji)}
            existingReactions={
              message.reactions
                ? Object.entries(
                    message.reactions.reduce((acc, r) => {
                      acc[r.emoji] = acc[r.emoji] || { count: 0, hasReacted: false }
                      acc[r.emoji].count++
                      if (r.userId === currentUserId) acc[r.emoji].hasReacted = true
                      return acc
                    }, {} as Record<string, { count: number; hasReacted: boolean }>)
                  ).map(([emoji, data]) => ({ emoji, ...data }))
                : []
            }
          />

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
              <DropdownMenuItem onClick={handleCopy}>
                <CopyIcon className="size-4" />
                Copy text
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                  <PushPinIcon className="size-4" />
                  {message.pinned ? "Unpin message" : "Pin message"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSaveToggle}>
                {isSaved ? (
                  <>
                    <BookmarkSimpleIcon className="size-4" />
                    Unsave message
                  </>
                ) : (
                  <>
                    <BookmarkIcon className="size-4" />
                    Save message
                  </>
                )}
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem>
                  <PencilIcon className="size-4" />
                  Edit message
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {isOwner && (
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

export function MessageList({ 
  messages, 
  currentUserId, 
  onDeleteMessage,
  onReply,
  onForward,
  onReaction,
  onPin,
  onSave,
  onUnsave,
  onAvatarClick,
  onNameClick,
  savedMessageIds = new Set(),
  userNames = {},
  channelName,
  channelDescription,
  channelIcon,
  isAdmin,
}: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const previousMessageCount = React.useRef(0)
  const hasInitialScrolled = React.useRef(false)

  // Callback to scroll viewport to bottom
  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [])

  // Use MutationObserver to keep scroll at bottom during initial content loading
  // This handles async-loaded images and attachments that change content height
  const hasMessages = messages.length > 0
  React.useEffect(() => {
    if (!scrollRef.current || !hasMessages) return

    const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]')
    if (!viewport) return

    // Track if we're in the initial loading phase (first 2 seconds after mount)
    let isInitialLoadPhase = true
    const initialLoadTimeout = setTimeout(() => {
      isInitialLoadPhase = false
    }, 2000)

    // Observe DOM mutations and scroll to bottom when content changes during initial load
    const observer = new MutationObserver(() => {
      if (isInitialLoadPhase) {
        scrollToBottom()
      }
    })

    observer.observe(viewport, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class'],
    })

    // Initial scroll
    scrollToBottom()

    return () => {
      observer.disconnect()
      clearTimeout(initialLoadTimeout)
    }
  }, [hasMessages, scrollToBottom])

  // Scroll to bottom on mount and when messages change
  React.useLayoutEffect(() => {
    // On initial mount, scroll multiple times to handle content loading
    if (!hasInitialScrolled.current && messages.length > 0) {
      hasInitialScrolled.current = true
      
      // Immediate scroll
      scrollToBottom()
      
      // Scroll again after a short delay to catch any late-rendering content
      requestAnimationFrame(() => {
        scrollToBottom()
        
        // One more scroll after another frame to be absolutely sure
        requestAnimationFrame(() => {
          scrollToBottom()
        })
      })
      
      previousMessageCount.current = messages.length
    }
    // Scroll when new messages arrive
    else if (messages.length > previousMessageCount.current) {
      scrollToBottom()
      previousMessageCount.current = messages.length
    }
  }, [messages, scrollToBottom])

  // Show empty state if no messages
  if (messages.length === 0 && channelName) {
    return (
      <div ref={scrollRef} className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <EmptyChannelState
            channelName={channelName}
            channelDescription={channelDescription}
            channelIcon={channelIcon}
          />
        </ScrollArea>
      </div>
    )
  }

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
                onReply={onReply}
                onForward={onForward}
                onReaction={onReaction}
                onPin={onPin}
                onSave={onSave}
                onUnsave={onUnsave}
                onAvatarClick={onAvatarClick}
                onNameClick={onNameClick}
                isSaved={savedMessageIds.has(message.id)}
                userNames={userNames}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
