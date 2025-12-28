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
  CheckIcon,
  XIcon,
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
import { Textarea } from "@/components/ui/textarea"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Context for attachment URLs (batch loaded at MessageList level)
const AttachmentUrlContext = React.createContext<Record<string, string | null>>({})

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
  createdAt?: number // Raw timestamp for grouping logic
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
  
  // Get URL from batch-loaded context instead of individual query
  const attachmentUrls = React.useContext(AttachmentUrlContext)
  const url = attachmentUrls[attachment.storageId] || null
  
  if (isImage && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs rounded-md overflow-hidden border border-[#26251E]/10 hover:border-[#26251E]/20 transition-all hover:shadow-sm"
      >
        <img
          src={url}
          alt={attachment.name}
          className="max-h-64 w-auto object-contain bg-[#26251E]/[0.02]"
        />
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#26251E]/[0.04] text-xs text-[#26251E]/70">
          <ImageIcon className="size-3.5 flex-shrink-0" />
          <span className="truncate flex-1 font-medium">{attachment.name}</span>
          <span className="text-[#26251E]/50 font-medium">{formatFileSize(attachment.size)}</span>
        </div>
      </a>
    )
  }

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-md border border-[#26251E]/10 px-2.5 py-2 hover:border-[#26251E]/20 hover:bg-[#26251E]/[0.02] transition-all hover:shadow-sm max-w-xs"
    >
      <FileIcon className="size-8 text-[#26251E]/40 flex-shrink-0" weight="duotone" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#26251E] truncate">{attachment.name}</div>
        <div className="text-xs text-[#26251E]/50 font-medium">{formatFileSize(attachment.size)}</div>
      </div>
      <DownloadSimpleIcon className="size-4 text-[#26251E]/40 flex-shrink-0" />
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
      className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
    >
      {children}
    </a>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => {
    if (inline) {
      return (
        <code className="px-1 py-0.5 bg-[#26251E]/8 rounded text-[13px] font-mono text-[#26251E]/95">
          {children}
        </code>
      )
    }
    return (
      <pre className="p-2 bg-[#26251E]/6 rounded-md overflow-x-auto my-1.5 border border-[#26251E]/8">
        <code className="text-[13px] font-mono text-[#26251E]/90">{children}</code>
      </pre>
    )
  },
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-[#26251E]">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-[#26251E]/85">{children}</em>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="pl-2.5 py-0.5 my-1 border-l-2 border-[#26251E]/20 text-[#26251E]/70 italic">
      {children}
    </blockquote>
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
  onEditMessage,
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
  isGrouped,
}: { 
  message: Message
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
  isSaved?: boolean
  userNames?: Record<string, string>
  isAdmin?: boolean
  isGrouped?: boolean
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(message.content)
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

  const handleEditClick = () => {
    setIsEditing(true)
    setEditContent(message.content)
  }

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEditMessage?.(message.id, editContent)
    }
    setIsEditing(false)
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditContent(message.content)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleEditCancel()
    }
  }

  // Process content to highlight mentions
  const processedContent = highlightMentions(message.content, message.mentions, userNames)

  return (
    <div
      className="group relative px-4 hover:bg-[#26251E]/[0.03] transition-colors"
      style={{ paddingTop: isGrouped ? "1px" : "6px", paddingBottom: isGrouped ? "1px" : "6px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Reply indicator */}
      {message.parentMessage && (
        <div className="flex items-center gap-2 mb-1 ml-[44px] text-xs text-[#26251E]/50">
          <ArrowBendUpLeftIcon className="size-3" />
          <span>Replying to</span>
          <span className="font-medium text-[#26251E]/70">{message.parentMessage.userName}</span>
          <span className="truncate max-w-[200px]">{message.parentMessage.content}</span>
        </div>
      )}

      {/* Pin indicator */}
      {message.pinned && (
        <div className="flex items-center gap-1.5 mb-1 ml-[44px] text-xs text-amber-600 font-medium">
          <PushPinIcon className="size-3" weight="fill" />
          <span>Pinned message</span>
        </div>
      )}

      <div className="flex gap-2.5">
        {/* Avatar - hidden when grouped */}
        {!isGrouped ? (
          <Avatar 
            className="size-8 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            onClick={() => onAvatarClick?.(message.user.id)}
          >
            {message.user.avatar ? (
              <AvatarImage src={message.user.avatar} alt={message.user.name} />
            ) : null}
            <AvatarFallback className="bg-[#26251E]/10 text-[#26251E] text-[11px] font-medium">
              {message.user.initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 flex-shrink-0 flex items-start justify-center pt-[2px]">
            <span className="text-[8px] text-[#26251E]/0 group-hover:text-[#26251E]/50 transition-colors font-medium tabular-nums">
              {message.timestamp}
            </span>
          </div>
        )}

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {!isGrouped && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <button
                onClick={() => onNameClick?.(message.user.id)}
                className="font-semibold text-sm text-[#26251E] hover:underline"
              >
                {message.user.name}
              </button>
              <span className="text-[11px] text-[#26251E]/50 font-medium tabular-nums">
                {message.timestamp}
              </span>
              {message.editedAt && (
                <span className="text-[10px] text-[#26251E]/40 font-medium">(edited)</span>
              )}
            </div>
          )}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="min-h-[80px] text-sm"
                autoFocus
              />
              <div className="flex gap-2 text-xs text-[#26251E]/70">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#26251E]/5 rounded border border-[#26251E]/10">Enter</kbd>
                  <span>to save</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#26251E]/5 rounded border border-[#26251E]/10">Esc</kbd>
                  <span>to cancel</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEditSave}
                  disabled={!editContent.trim() || editContent === message.content}
                >
                  <CheckIcon className="size-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditCancel}
                >
                  <XIcon className="size-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {message.content && (
                <div className="text-sm text-[#26251E]/90 leading-[1.46] prose prose-sm max-w-none" style={{ marginTop: isGrouped ? "0" : "0" }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {processedContent}
                  </ReactMarkdown>
                </div>
              )}
            </>
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
        <div className="absolute -top-3 right-4 flex items-center gap-0.5 rounded-lg border border-[#26251E]/10 bg-white p-0.5 shadow-md">
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
                <DropdownMenuItem onClick={handleEditClick}>
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

// Helper function to check if a message should be grouped with the previous one
function shouldGroupMessages(current: Message, previous: Message | undefined): boolean {
  if (!previous) return false
  
  // Don't group if different users
  if (current.user.id !== previous.user.id) return false
  
  // Don't group if there's a parent message (reply)
  if (current.parentMessageId || previous.parentMessageId) return false
  
  // Don't group if either message is pinned
  if (current.pinned || previous.pinned) return false
  
  // Check if within 1 minute (60000 milliseconds)
  if (current.createdAt && previous.createdAt) {
    const timeDiff = current.createdAt - previous.createdAt
    return timeDiff <= 60000 // 1 minute in milliseconds
  }
  
  // If no timestamps available, don't group
  return false
}

export function MessageList({ 
  messages, 
  currentUserId, 
  onDeleteMessage,
  onEditMessage,
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
  const viewportRef = React.useRef<HTMLElement | null>(null)
  const previousMessageCount = React.useRef(0)
  const hasInitialScrolled = React.useRef(false)

  // Collect all storage IDs from message attachments for batch loading
  const storageIds = React.useMemo(() => {
    const ids: Id<"_storage">[] = []
    messages.forEach((msg) => {
      msg.attachments?.forEach((att) => {
        ids.push(att.storageId as Id<"_storage">)
      })
    })
    return ids
  }, [messages])

  // Batch load all attachment URLs in a single query
  const attachmentUrls = useQuery(
    api.messages.getBatchStorageUrls,
    storageIds.length > 0 ? { storageIds } : "skip"
  ) ?? {}

  // Callback to scroll to bottom
  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      // Direct scroll on the container
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Use MutationObserver and ResizeObserver to keep scroll at bottom during content loading
  // This handles async-loaded images and attachments that change content height
  const hasMessages = messages.length > 0
  React.useEffect(() => {
    if (!scrollRef.current || !hasMessages) return

    const container = scrollRef.current

    // Track if we're in the initial loading phase (first 5 seconds after mount)
    let isInitialLoadPhase = true
    const initialLoadTimeout = setTimeout(() => {
      isInitialLoadPhase = false
    }, 5000)

    // Force scroll function
    const forceScroll = () => {
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }

    // Observe DOM mutations and scroll to bottom when content changes
    const mutationObserver = new MutationObserver(() => {
      forceScroll()
    })

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class'],
    })

    // Observe resize changes to scroll when content height changes
    const resizeObserver = new ResizeObserver(() => {
      if (isInitialLoadPhase) {
        forceScroll()
      }
    })

    resizeObserver.observe(container)

    // Initial scroll
    forceScroll()

    return () => {
      mutationObserver.disconnect()
      resizeObserver.disconnect()
      clearTimeout(initialLoadTimeout)
    }
  }, [hasMessages])

  // Scroll to bottom on mount and when messages change
  React.useLayoutEffect(() => {
    if (messages.length > 0) {
      // Always scroll to bottom when messages change
      scrollToBottom()
      
      // Multiple scroll attempts to handle async content
      requestAnimationFrame(() => {
        scrollToBottom()
        requestAnimationFrame(() => {
          scrollToBottom()
        })
      })
      
      previousMessageCount.current = messages.length
      if (!hasInitialScrolled.current) {
        hasInitialScrolled.current = true
      }
    }
  }, [messages.length, scrollToBottom])

  // Additional effect to ensure scroll to bottom after component is fully rendered
  React.useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      // Function to attempt scroll with retries
      const attemptScroll = (attempts = 0) => {
        if (attempts > 10) return // Max 10 attempts
        scrollToBottom()
        
        // Check if we're actually at the bottom
        const viewport = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
        if (viewport) {
          const isAtBottom = Math.abs(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight) < 5
          if (!isAtBottom && attempts < 10) {
            // Retry after a short delay
            setTimeout(() => attemptScroll(attempts + 1), 50)
          }
        }
      }
      
      // Use multiple timeouts to ensure DOM is fully ready and layout is complete
      const timeout1 = setTimeout(() => attemptScroll(), 50)
      const timeout2 = setTimeout(() => attemptScroll(), 200)
      const timeout3 = setTimeout(() => attemptScroll(), 500)
      
      // Also use requestAnimationFrame for immediate scroll after paint
      requestAnimationFrame(() => {
        attemptScroll()
        requestAnimationFrame(() => {
          attemptScroll()
        })
      })
      
      return () => {
        clearTimeout(timeout1)
        clearTimeout(timeout2)
        clearTimeout(timeout3)
      }
    }
  }, [messages.length, scrollToBottom])

  // Show empty state if no messages
  if (messages.length === 0 && channelName) {
    return (
      <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden flex flex-col">
        <EmptyChannelState
          channelName={channelName}
          channelDescription={channelDescription}
          channelIcon={channelIcon}
        />
      </div>
    )
  }

  const lastMessageRef = React.useRef<HTMLDivElement>(null)

  // Aggressive scroll to bottom when messages change
  React.useEffect(() => {
    if (messages.length > 0) {
      const forceScrollToBottom = () => {
        // Try scrolling the container
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
        
        // Also try scrolling the last message into view
        if (lastMessageRef.current) {
          lastMessageRef.current.scrollIntoView({ behavior: 'auto', block: 'end' })
        }
      }
      
      // Immediate scroll
      forceScrollToBottom()
      
      // Multiple attempts with different timings
      requestAnimationFrame(() => {
        forceScrollToBottom()
        requestAnimationFrame(() => {
          forceScrollToBottom()
          requestAnimationFrame(() => {
            forceScrollToBottom()
          })
        })
      })
      
      const timeout1 = setTimeout(forceScrollToBottom, 10)
      const timeout2 = setTimeout(forceScrollToBottom, 50)
      const timeout3 = setTimeout(forceScrollToBottom, 100)
      const timeout4 = setTimeout(forceScrollToBottom, 200)
      const timeout5 = setTimeout(forceScrollToBottom, 500)
      
      return () => {
        clearTimeout(timeout1)
        clearTimeout(timeout2)
        clearTimeout(timeout3)
        clearTimeout(timeout4)
        clearTimeout(timeout5)
      }
    }
  }, [messages.length])

  // Callback ref to get direct access to viewport
  const scrollAreaRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node && messages.length > 0) {
      // Find viewport and scroll immediately
      const viewport = node.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
      if (viewport) {
        // Use setTimeout to ensure content is rendered
        setTimeout(() => {
          viewport.scrollTop = viewport.scrollHeight
        }, 0)
      }
    }
  }, [messages.length])

  return (
    <AttachmentUrlContext.Provider value={attachmentUrls}>
      <div 
        ref={scrollRef} 
        className="h-full overflow-y-auto overflow-x-hidden flex flex-col"
        style={{ scrollBehavior: 'auto' }}
      >
        {/* Spacer pushes messages to bottom when content doesn't fill viewport */}
        <div className="flex-1" />
        <div className="py-4">
          <div className="space-y-0">
            {messages.map((message, index) => {
              const previousMessage = index > 0 ? messages[index - 1] : undefined
              const isGrouped = shouldGroupMessages(message, previousMessage)
              const isLastMessage = index === messages.length - 1
              
              return (
                <div key={message.id} ref={isLastMessage ? lastMessageRef : undefined}>
                  <MessageItem 
                    message={message} 
                    currentUserId={currentUserId}
                    onDeleteMessage={onDeleteMessage}
                    onEditMessage={onEditMessage}
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
                    isGrouped={isGrouped}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AttachmentUrlContext.Provider>
  )
}
