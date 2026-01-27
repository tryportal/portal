"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  ArrowBendUpLeftIcon,
  ArrowBendDoubleUpRightIcon,
  ArrowDownIcon,
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
  VideoCameraIcon,
  BookmarkSimpleIcon,
  CheckIcon,
  XIcon,
  MagnifyingGlassIcon,
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
import { ReactionPicker, ReactionDisplay } from "./reaction-picker"
import { EmptyChannelState } from "./empty-channel-state"
import { Textarea } from "@/components/ui/textarea"
import { useUserSettings } from "@/lib/user-settings"
import { CompactMessageItem, BubbleMessageItem, AttachmentUrlContext } from "./message-styles"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { replaceMentionsInText } from "./mention"
import { LinkPreview, type LinkEmbedData } from "./link-preview"
import { sanitizeSchema } from "@/lib/markdown-config"

export type { LinkEmbedData as LinkEmbed }

// Context for coordinating hover state across messages without causing re-renders
// Uses a ref + callback pattern so setting hover doesn't trigger parent re-render
type HoverCoordinatorContextType = {
  hoveredIdRef: React.MutableRefObject<string | null>
  setHoveredId: (id: string | null) => void
  subscribe: (callback: () => void) => () => void
}

const HoverCoordinatorContext = React.createContext<HoverCoordinatorContextType | null>(null)

export const useHoverCoordinator = () => {
  return React.useContext(HoverCoordinatorContext)
}

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
  linkEmbed?: LinkEmbedData
  editedAt?: number
  parentMessageId?: string
  parentMessage?: {
    content: string
    userName: string
  }
  reactions?: Reaction[]
  pinned?: boolean
  mentions?: string[]
  forwardedFrom?: {
    channelName?: string
    userName?: string
  }
  // Forum-specific fields
  isOP?: boolean // Is original poster (for forum posts)
  isSolvedAnswer?: boolean // Is the accepted answer (for forum posts)
  // Optimistic update state
  isPending?: boolean // Message is being sent (not yet confirmed by server)
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
  searchQuery?: string
  isDirectMessage?: boolean
  // Loading state to prevent empty channel flash during transitions
  isLoading?: boolean
  // Forum-specific props
  isForumPost?: boolean
  postAuthorId?: string
  solvedCommentId?: string
  onMarkSolution?: (messageId: string) => void
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

function isVideoType(type: string): boolean {
  return type.startsWith("video/")
}

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

function formatDateForSeparator(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Reset hours to compare dates only
  today.setHours(0, 0, 0, 0)
  yesterday.setHours(0, 0, 0, 0)
  const messageDate = new Date(date)
  messageDate.setHours(0, 0, 0, 0)

  if (messageDate.getTime() === today.getTime()) {
    return "Today"
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }
}

function isDifferentDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1)
  const date2 = new Date(timestamp2)
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  )
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-4 px-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/60 min-w-[60px]" />
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap px-1">
          {date}
        </span>
        <div className="flex-1 h-px bg-border/60 min-w-[60px]" />
      </div>
    </div>
  )
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const isImage = isImageType(attachment.type)
  const isVideo = isVideoType(attachment.type)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [videoLoaded, setVideoLoaded] = React.useState(false)

  // Get URL from batch-loaded context instead of individual query
  const attachmentUrls = React.useContext(AttachmentUrlContext)
  const url = attachmentUrls[attachment.storageId] || null

  if (isImage && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs rounded-md overflow-hidden border border-border hover:border-border/80 transition-all hover:shadow-sm"
      >
        {/* Fixed aspect ratio container to prevent layout shifts */}
        <div
          className="relative bg-muted/30"
          style={{
            minHeight: imageLoaded ? 'auto' : '120px',
            maxHeight: '256px',
          }}
        >
          <img
            src={url}
            alt={attachment.name}
            className={`max-h-64 w-auto object-contain transition-opacity duration-150 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 text-xs text-foreground">
          <ImageIcon className="size-3.5 flex-shrink-0" />
          <span className="truncate flex-1 font-medium min-w-0">{attachment.name}</span>
          <span className="text-muted-foreground font-medium">{formatFileSize(attachment.size)}</span>
        </div>
      </a>
    )
  }

  if (isVideo && url) {
    return (
      <div className="block max-w-md rounded-md overflow-hidden border border-border hover:border-border/80 transition-all hover:shadow-sm">
        {/* Fixed aspect ratio container for video to prevent layout shifts */}
        <div
          className="relative bg-black"
          style={{
            minHeight: videoLoaded ? 'auto' : '180px',
            maxHeight: '320px',
          }}
        >
          <video
            src={url}
            controls
            preload="metadata"
            className={`max-h-80 w-auto transition-opacity duration-150 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoadedMetadata={() => setVideoLoaded(true)}
          >
            Your browser does not support the video tag.
          </video>
          {/* Loading placeholder */}
          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 text-xs text-foreground">
          <VideoCameraIcon className="size-3.5 flex-shrink-0" />
          <span className="truncate flex-1 font-medium min-w-0">{attachment.name}</span>
          <span className="text-muted-foreground font-medium">{formatFileSize(attachment.size)}</span>
          <a
            href={url}
            download={attachment.name}
            className="hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <DownloadSimpleIcon className="size-3.5 flex-shrink-0" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2 hover:border-border/80 hover:bg-muted/30 transition-all hover:shadow-sm max-w-xs"
    >
      <FileIcon className="size-8 text-muted-foreground flex-shrink-0" weight="duotone" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate min-w-0">{attachment.name}</div>
        <div className="text-xs text-muted-foreground font-medium">{formatFileSize(attachment.size)}</div>
      </div>
      <DownloadSimpleIcon className="size-4 text-muted-foreground flex-shrink-0" />
    </a>
  )
}

// Markdown renderer components
const MarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-1 last:mb-0 [overflow-wrap:anywhere]">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium break-words"
    >
      {children}
    </a>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold mb-2 mt-3 first:mt-0 text-foreground">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-bold mb-1.5 mt-2.5 first:mt-0 text-foreground">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-semibold mb-1 mt-2 first:mt-0 text-foreground">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-base font-semibold mb-1 mt-1.5 first:mt-0 text-foreground">{children}</h4>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="text-sm font-semibold mb-0.5 mt-1 first:mt-0 text-foreground">{children}</h5>
  ),
  h6: ({ children }: { children?: React.ReactNode }) => (
    <h6 className="text-sm font-medium mb-0.5 mt-1 first:mt-0 text-foreground/90">{children}</h6>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="rounded-md overflow-x-auto my-1.5 [&>code]:p-0 [&>code]:bg-transparent [&>code]:rounded-none">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    // Check if this is a code block (has language-* class from markdown)
    const match = /language-(\w+)/.exec(className || "")
    const codeString = String(children).replace(/\n$/, "")

    // If it has a language class, it's a code block - use syntax highlighting
    if (match) {
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "0.5rem",
            fontSize: "13px",
            borderRadius: "0.375rem",
            border: "1px solid hsl(var(--border))",
          }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      )
    }

    // Inline code styling
    return (
      <code className="px-1 py-0.5 bg-muted rounded text-[13px] font-mono text-foreground/90" {...props}>
        {children}
      </code>
    )
  },
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children, start }: { children?: React.ReactNode; start?: number }) => (
    <ol start={start} className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => {
    // Check if this is a mention (starts with @)
    const text = typeof children === 'string' ? children : String(children)
    if (text.startsWith('@')) {
      return (
        <span className="inline-flex items-center rounded px-1 py-0.5 font-medium bg-primary/10 text-foreground/80 hover:bg-primary/15 transition-colors">
          {children}
        </span>
      )
    }
    return <strong className="font-semibold text-foreground">{children}</strong>
  },
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-foreground/85">{children}</em>
  ),
  del: ({ children }: { children?: React.ReactNode }) => (
    <del className="line-through text-foreground/70">{children}</del>
  ),
  u: ({ children }: { children?: React.ReactNode }) => (
    <u className="underline underline-offset-2 text-foreground">{children}</u>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="pl-2.5 py-0.5 my-1 border-l-2 border-border text-muted-foreground italic">
      {children}
    </blockquote>
  ),
}

// Check if content is only emojis (1-3 emojis with optional whitespace)
function isEmojiOnlyMessage(content: string): boolean {
  // Remove all whitespace
  const trimmed = content.replace(/\s/g, '')
  if (!trimmed) return false

  // Regex to match emoji sequences (including compound emojis with ZWJ, skin tones, etc.)
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji}(?:\u200D\p{Emoji})+)+$/u

  // Split by grapheme clusters to properly count emojis
  const graphemes = typeof Intl.Segmenter !== 'undefined'
    ? [...new Intl.Segmenter().segment(trimmed)].map(s => s.segment)
    : [...trimmed]

  // Must be 1-3 graphemes and each must be an emoji
  if (graphemes.length < 1 || graphemes.length > 3) return false

  return graphemes.every(g => emojiRegex.test(g))
}

// Replace mention user IDs with user names in content
function processMentions(content: string, mentions?: string[], userNames?: Record<string, string>): string {
  if (!mentions || mentions.length === 0 || !userNames) return content

  // Build a map of userId -> userName for quick lookup
  const mentionMap: Record<string, string> = {}
  mentions.forEach(userId => {
    const userName = userNames[userId]
    if (userName) {
      mentionMap[userId] = userName
    }
  })

  // First replace @userId with @userName
  let processedContent = replaceMentionsInText(content, mentionMap)

  // Then wrap each @userName mention in ** for markdown bold styling
  // We need to match exact display names, not greedy patterns
  // Sort display names by length (longest first) to avoid partial matches
  const displayNames = Object.values(mentionMap).sort((a, b) => b.length - a.length)

  for (const displayName of displayNames) {
    // Escape special regex characters in the display name
    const escapedName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match @displayName and ensure it's followed by either:
    // - End of string ($)
    // - A non-word character (space, punctuation, etc.)
    // This prevents matching "@greg heffley hello" when we only want "@greg heffley"
    // The negative lookahead (?!\w) ensures we don't continue matching into the next word
    const pattern = new RegExp(`@${escapedName}(?=\\s|$|[^\\w])`, 'g')
    processedContent = processedContent.replace(pattern, `**@${displayName}**`)
  }

  return processedContent
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
  onScrollToMessage,
  isSaved,
  userNames,
  isAdmin,
  isGrouped,
  searchQuery,
  isHighlighted,
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
  onScrollToMessage?: (messageId: string) => void
  isSaved?: boolean
  userNames?: Record<string, string>
  isAdmin?: boolean
  isGrouped?: boolean
  searchQuery?: string
  isHighlighted?: boolean
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(message.content)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const isOwner = currentUserId === message.user.id

  // Keep hover actions visible when hovered OR when a menu/popover is open
  const showHoverActions = isHovered || isMenuOpen

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

  // Process content to replace mention IDs with names
  const processedContent = processMentions(message.content, message.mentions, userNames)

  return (
    <div
      className={`group relative px-4 hover:bg-muted/50 transition-colors ${isHighlighted ? "animate-highlight-message" : ""}`}
      style={{ paddingTop: isGrouped ? "2px" : "8px", paddingBottom: "2px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Reply indicator */}
      {message.parentMessage && message.parentMessageId && (
        <button
          onClick={() => onScrollToMessage?.(message.parentMessageId!)}
          className="flex items-center gap-2 mb-1 ml-[48px] text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowBendUpLeftIcon className="size-3" />
          <span>Replying to</span>
          <span className="font-medium text-foreground/70">{message.parentMessage.userName}</span>
          <span className="truncate max-w-[200px] break-words">{message.parentMessage.content}</span>
        </button>
      )}

      {/* Forwarded indicator */}
      {message.forwardedFrom && (
        <div className="flex items-center gap-1.5 mb-1 ml-[48px] text-xs text-muted-foreground">
          <ArrowBendDoubleUpRightIcon className="size-3" />
          <span>Forwarded from</span>
          <span className="font-medium text-foreground/70">
            {message.forwardedFrom.channelName 
              ? `#${message.forwardedFrom.channelName}` 
              : message.forwardedFrom.userName 
                ? `@${message.forwardedFrom.userName}` 
                : "unknown"}
          </span>
        </div>
      )}

      {/* Pin indicator */}
      {message.pinned && (
        <div className="flex items-center gap-1.5 mb-1 ml-[48px] text-xs text-amber-600 font-medium">
          <PushPinIcon className="size-3" weight="fill" />
          <span>Pinned message</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar - hidden when grouped */}
        {!isGrouped ? (
          <Avatar
            className="size-9 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            onClick={() => onAvatarClick?.(message.user.id)}
          >
            {message.user.avatar ? (
              <AvatarImage src={message.user.avatar} alt={message.user.name} />
            ) : null}
            <AvatarFallback className="bg-muted text-foreground text-[11px] font-medium">
              {message.user.initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-9 flex-shrink-0 flex items-start justify-center pt-[2px]">
            <span 
              className="text-[8px] leading-none whitespace-nowrap text-transparent group-hover:text-muted-foreground transition-colors font-medium tabular-nums cursor-default"
              title={message.createdAt ? formatFullDateTime(message.createdAt) : undefined}
            >
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
                className="font-semibold text-sm text-foreground hover:underline"
              >
                {message.user.name}
              </button>
              <span 
                className="text-[10px] leading-none text-muted-foreground font-medium tabular-nums cursor-default"
                title={message.createdAt ? formatFullDateTime(message.createdAt) : undefined}
              >
                {message.timestamp}
              </span>
              {message.editedAt && (
                <span className="text-[10px] text-muted-foreground/70 font-medium">(edited)</span>
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
              <div className="flex gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Enter</kbd>
                  <span>to save</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Esc</kbd>
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
                isEmojiOnlyMessage(message.content) ? (
                  // Emoji-only messages (1-3 emojis) - render larger
                  <div className="text-4xl leading-tight">
                    {message.content}
                  </div>
                ) : (
                  <div className="text-sm text-foreground/90 leading-[1.46] prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [overflow-wrap:anywhere]" style={{ marginTop: isGrouped ? "0" : "0" }}>
                    {searchQuery && searchQuery.trim() ? (
                      // When searching, render with highlights (no markdown)
                      <p className="mb-1 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {renderWithHighlights(processedContent, searchQuery)}
                      </p>
                    ) : (
                      // When not searching, render with full markdown support
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                        components={MarkdownComponents}
                      >
                        {processedContent}
                      </ReactMarkdown>
                    )}
                  </div>
                )
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

          {/* Link Embed */}
          {message.linkEmbed && (
            <div className="mt-2 max-w-md">
              <LinkPreview embed={message.linkEmbed} compact={false} />
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
      {showHoverActions && (
        <div className="absolute top-1 right-4 flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-md z-50">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onReply?.(message.id)}
            title="Reply"
          >
            <ArrowBendUpLeftIcon className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onForward?.(message.id)}
            title="Forward"
          >
            <ShareIcon className="size-3.5" />
          </Button>

          <ReactionPicker
            onSelectReaction={(emoji) => onReaction?.(message.id, emoji)}
            onOpenChange={setIsMenuOpen}
          />

          <DropdownMenu onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger
              render={<Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
                title="More options"
              />}
            >
              <DotsThreeIcon className="size-3.5" weight="bold" />
            </DropdownMenuTrigger>
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
                <>
                  <DropdownMenuItem onClick={handleEditClick}>
                    <PencilIcon className="size-4" />
                    Edit message
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDeleteMessage?.(message.id)}
                  >
                    <TrashIcon className="size-4" />
                    Delete message
                  </DropdownMenuItem>
                </>
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

// Helper function to render text with search highlights as React nodes
function renderWithHighlights(text: string, searchQuery: string): React.ReactNode {
  if (!searchQuery || !searchQuery.trim()) {
    return text;
  }

  // Escape special regex characters in the search query
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create case-insensitive regex with global flag
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  // Split text by matches
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    // Check if this part matches the search query (case-insensitive)
    if (part.toLowerCase() === searchQuery.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/40 text-foreground rounded px-0.5">
          {part}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
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
  searchQuery = "",
  isDirectMessage = false,
  isLoading = false,
  // Forum-specific props
  isForumPost = false,
  postAuthorId,
  solvedCommentId,
  onMarkSolution,
}: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const messageRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const previousMessageCount = React.useRef(0)
  const hasInitialScrolled = React.useRef(false)
  // Track if user is near the bottom - only auto-scroll if they are
  const isUserNearBottom = React.useRef(true)
  // Track if this is the initial load
  const isInitialLoad = React.useRef(true)
  // Track the last message ID to detect new messages from current user
  const lastMessageId = React.useRef<string | null>(null)
  // Track the last message ID seen at bottom (for new message indicator)
  const lastSeenMessageId = React.useRef<string | null>(null)
  // State for showing the scroll-to-bottom button
  const [showScrollButton, setShowScrollButton] = React.useState(false)
  // State for tracking new message count while scrolled up
  const [newMessageCount, setNewMessageCount] = React.useState(0)
  // State for highlighting a message after scrolling to it
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<string | null>(null)

  // Hover coordination system - uses refs and subscriptions to avoid re-renders
  const hoveredIdRef = React.useRef<string | null>(null)
  const hoverSubscribersRef = React.useRef<Set<() => void>>(new Set())
  
  const hoverCoordinator = React.useMemo<HoverCoordinatorContextType>(() => ({
    hoveredIdRef,
    setHoveredId: (id: string | null) => {
      hoveredIdRef.current = id
      // Notify all subscribers that hover state changed
      hoverSubscribersRef.current.forEach(callback => callback())
    },
    subscribe: (callback: () => void) => {
      hoverSubscribersRef.current.add(callback)
      return () => {
        hoverSubscribersRef.current.delete(callback)
      }
    }
  }), [])

  // Get user message style settings
  const { settings } = useUserSettings()
  const messageStyle = isDirectMessage 
   ? settings.messageStyles.directMessages 
   : settings.messageStyles.channels

  // Choose the appropriate message component based on style
  const MessageItemComponent = messageStyle === "bubble" ? BubbleMessageItem : CompactMessageItem

  // Memoize messages array to prevent unnecessary re-renders
  const memoizedMessages = React.useMemo(() => messages, [messages])

  // Collect all storage IDs from message attachments for batch loading
  const storageIds = React.useMemo(() => {
   const ids: Id<"_storage">[] = []
   memoizedMessages.forEach((msg) => {
     msg.attachments?.forEach((att) => {
       ids.push(att.storageId as Id<"_storage">)
     })
   })
   return ids
  }, [memoizedMessages])

  // Batch load all attachment URLs in a single query
  const attachmentUrls = useQuery(
    api.messages.getBatchStorageUrls,
    storageIds.length > 0 ? { storageIds } : "skip"
  ) ?? {}

  // Check if user is near the bottom of the scroll container
  const checkIfNearBottom = React.useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      // Consider "near bottom" if within 150px of the bottom
      const threshold = 150
      const nearBottom = scrollHeight - scrollTop - clientHeight < threshold
      isUserNearBottom.current = nearBottom
      // Show scroll button when user is NOT near bottom (and not during initial load)
      if (!isInitialLoad.current) {
        setShowScrollButton(!nearBottom)
      }
      // When user scrolls to bottom, mark all messages as seen
      if (nearBottom && messages.length > 0) {
        const latestId = messages[messages.length - 1].id
        if (lastSeenMessageId.current !== latestId) {
          lastSeenMessageId.current = latestId
          setNewMessageCount(0)
        }
      }
    }
  }, [messages])

  // Callback to scroll to bottom
  const scrollToBottom = React.useCallback((smooth = false) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
      isUserNearBottom.current = true
      setShowScrollButton(false)
      setNewMessageCount(0)
      // Mark all messages as seen
      if (messages.length > 0) {
        lastSeenMessageId.current = messages[messages.length - 1].id
      }
    }
  }, [messages])

  // Callback to scroll to a specific message
  const scrollToMessage = React.useCallback((messageId: string) => {
    const messageElement = messageRefs.current.get(messageId)
    if (messageElement && scrollRef.current) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the message briefly
      setHighlightedMessageId(messageId)
      // Clear highlight after animation completes
      setTimeout(() => {
        setHighlightedMessageId(null)
      }, 1500)
    }
  }, [])

  // Track scroll position to determine if user has scrolled up - throttled to reduce overhead
  React.useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let rafId: number | null = null
    let isThrottled = false

    const handleScroll = () => {
      // Throttle using requestAnimationFrame to reduce scroll event overhead
      if (isThrottled) return
      isThrottled = true
      
      rafId = requestAnimationFrame(() => {
        checkIfNearBottom()
        isThrottled = false
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [checkIfNearBottom])

  // ResizeObserver to detect content height changes (e.g., when images/videos load)
  // and auto-scroll if user is near bottom - with debouncing to prevent flickering
  React.useEffect(() => {
    const content = contentRef.current
    if (!content) return

    let lastHeight = content.scrollHeight
    let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null
    let pendingScroll = false

    // Debounced scroll function to batch multiple height changes
    const debouncedScrollToBottom = () => {
      if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer)
      }
      pendingScroll = true
      scrollDebounceTimer = setTimeout(() => {
        if (pendingScroll && (isInitialLoad.current || isUserNearBottom.current)) {
          scrollToBottom()
        }
        pendingScroll = false
      }, 50) // 50ms debounce to batch rapid height changes from multiple images loading
    }

    const resizeObserver = new ResizeObserver(() => {
      const newHeight = content.scrollHeight
      // Only trigger scroll if height actually increased (content loaded)
      if (newHeight > lastHeight) {
        debouncedScrollToBottom()
      }
      lastHeight = newHeight
    })

    resizeObserver.observe(content)

    return () => {
      resizeObserver.disconnect()
      if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer)
      }
    }
  }, [scrollToBottom])

  // ResizeObserver to detect scroll container size changes (e.g., when message input grows/shrinks)
  // and maintain scroll position at bottom if user was at bottom - with debouncing
  React.useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let lastClientHeight = container.clientHeight
    let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null

    const resizeObserver = new ResizeObserver(() => {
      const newClientHeight = container.clientHeight
      // If container shrunk (message input grew) and user was near bottom, scroll to bottom
      if (newClientHeight < lastClientHeight && isUserNearBottom.current) {
        // Debounce to avoid rapid scroll attempts
        if (scrollDebounceTimer) {
          clearTimeout(scrollDebounceTimer)
        }
        scrollDebounceTimer = setTimeout(() => {
          scrollToBottom()
        }, 16) // ~1 frame debounce
      }
      lastClientHeight = newClientHeight
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer)
      }
    }
  }, [scrollToBottom])

  // Derive the latest message ID safely to avoid dependency issues with empty arrays
  const latestMessageId = memoizedMessages.length > 0 
    ? memoizedMessages[memoizedMessages.length - 1].id 
    : null;

  // Scroll to bottom on initial load and when new messages arrive (if user is near bottom or sent by current user)
  React.useLayoutEffect(() => {
    if (memoizedMessages.length > 0 && latestMessageId) {
      const latestMessage = memoizedMessages[memoizedMessages.length - 1]
      const isNewMessage = latestMessageId !== lastMessageId.current
      const isFromCurrentUser = latestMessage.user.id === currentUserId

      // Always scroll on initial load, when current user sends a message, or when new messages arrive and user is near bottom
      if (isInitialLoad.current || (isNewMessage && (isFromCurrentUser || isUserNearBottom.current))) {
        // Use single requestAnimationFrame to ensure DOM has updated before scrolling
        // Additional scroll attempts are handled by the debounced ResizeObserver
        requestAnimationFrame(() => {
          scrollToBottom()
        })
      } else if (isNewMessage && !isUserNearBottom.current && !isFromCurrentUser) {
        // User is scrolled up and new message arrived from someone else - increment counter
        setNewMessageCount(prev => prev + 1)
      }

      previousMessageCount.current = memoizedMessages.length
      lastMessageId.current = latestMessageId
      
      // Initialize lastSeenMessageId on first load
      if (!lastSeenMessageId.current && isInitialLoad.current) {
        lastSeenMessageId.current = latestMessageId
      }

      if (!hasInitialScrolled.current) {
        hasInitialScrolled.current = true
        // Mark initial load as complete after a delay to allow images/videos to load
        // The debounced ResizeObserver will handle scrolling during this period
        setTimeout(() => {
          isInitialLoad.current = false
        }, 2000) // Reduced from 3000ms since we have better image loading handling now
      }
    }
  }, [memoizedMessages.length, latestMessageId, scrollToBottom, currentUserId, memoizedMessages])

  // Simplified initial load effect - only one scroll attempt needed now
  // The debounced ResizeObserver handles subsequent scrolls as content loads
  React.useEffect(() => {
    if (memoizedMessages.length > 0 && isInitialLoad.current && scrollRef.current) {
      // Single delayed scroll for any images that load very quickly
      const timeout = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timeout)
    }
  }, [memoizedMessages.length, scrollToBottom])

  // Show empty state only if no messages AND not loading
  // This prevents the empty channel state from flashing during channel transitions
  if (messages.length === 0 && channelName && !isLoading) {
    return (
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden flex flex-col">
          <EmptyChannelState
            channelName={channelName}
            channelDescription={channelDescription}
            channelIcon={channelIcon}
          />
        </div>
      </div>
    )
  }

  return (
    <HoverCoordinatorContext.Provider value={hoverCoordinator}>
      <AttachmentUrlContext.Provider value={attachmentUrls}>
        <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overflow-x-hidden flex flex-col"
          style={{ scrollBehavior: 'auto' }}
        >
          {/* Search Results Indicator */}
          {searchQuery && searchQuery.trim() && (
            <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border px-4 py-2 text-sm text-muted-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MagnifyingGlassIcon className="size-4" />
                <span>
                  {messages.length === 0 ? (
                    "No results found"
                  ) : messages.length === 1 ? (
                    "1 result found"
                  ) : (
                    `${messages.length} results found`
                  )}
                </span>
              </div>
              <span className="text-xs text-muted-foreground/70">
                Searching for: <span className="font-medium">&quot;{searchQuery}&quot;</span>
              </span>
            </div>
          )}
          
          {/* Spacer pushes messages to bottom when content doesn't fill viewport */}
          <div className="flex-1" />
          <div ref={contentRef} className="py-4">
            <div className="space-y-0">
              {messages.map((message, index) => {
                const previousMessage = index > 0 ? messages[index - 1] : undefined
                const isGrouped = shouldGroupMessages(message, previousMessage)

                // Check if we need a date separator
                const showDateSeparator =
                  message.createdAt &&
                  previousMessage?.createdAt &&
                  isDifferentDay(message.createdAt, previousMessage.createdAt)

                return (
                  <React.Fragment key={message.id}>
                    {showDateSeparator && message.createdAt && (
                      <DateSeparator date={formatDateForSeparator(message.createdAt)} />
                    )}
                    <div
                      ref={(el) => {
                        if (el) {
                          messageRefs.current.set(message.id, el)
                        } else {
                          messageRefs.current.delete(message.id)
                        }
                      }}
                    >
                      <MessageItemComponent
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
                        onScrollToMessage={scrollToMessage}
                        isSaved={savedMessageIds.has(message.id)}
                        userNames={userNames}
                        isAdmin={isAdmin}
                        isGrouped={isGrouped}
                        searchQuery={searchQuery}
                        isHighlighted={highlightedMessageId === message.id}
                        isForumPost={isForumPost}
                        canMarkSolution={!!onMarkSolution}
                        onMarkSolution={onMarkSolution}
                      />
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {/* Scroll to bottom button with new message indicator */}
        {showScrollButton && (
          <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-2">
            {newMessageCount > 0 && (
              <Button
                onClick={() => scrollToBottom(true)}
                variant="default"
                size="sm"
                className="rounded-full shadow-lg border border-border hover:shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 px-3 gap-1.5"
              >
                <ArrowDownIcon className="size-3.5" />
                <span className="text-xs font-medium">
                  {newMessageCount} new {newMessageCount === 1 ? 'message' : 'messages'}
                </span>
              </Button>
            )}
            {newMessageCount === 0 && (
              <Button
                onClick={() => scrollToBottom(true)}
                size="icon"
                variant="secondary"
                className="rounded-full shadow-lg border border-border hover:shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
                aria-label="Scroll to bottom"
              >
                <ArrowDownIcon className="size-4" />
              </Button>
            )}
          </div>
        )}
        </div>
      </AttachmentUrlContext.Provider>
    </HoverCoordinatorContext.Provider>
  )
}
