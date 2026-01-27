"use client"

import * as React from "react"
import {
  ArrowBendUpLeftIcon,
  ArrowBendDoubleUpRightIcon,
  ShareIcon,
  DotsThreeIcon,
  CopyIcon,
  PushPinIcon,
  BookmarkIcon,
  TrashIcon,
  PencilIcon,
  BookmarkSimpleIcon,
  CheckIcon,
  CheckCircleIcon,
  XIcon,
  FileIcon,
  DownloadSimpleIcon,
  ImageIcon,
  VideoCameraIcon,
  Spinner,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ReactionPicker, ReactionDisplay } from "./reaction-picker"
import { Textarea } from "@/components/ui/textarea"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { replaceMentionsInText } from "./mention"
import { LinkPreview, type LinkEmbedData } from "./link-preview"
import type { Message, Attachment } from "./message-list"
import { useHoverCoordinator } from "./message-list"
import { sanitizeSchema } from "@/lib/markdown-config"
import { SolvedBadge } from "@/components/forum/solved-badge"

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

// Props interface shared by both message style components
export interface MessageItemProps {
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
  // Forum-specific props
  isForumPost?: boolean
  canMarkSolution?: boolean
  onMarkSolution?: (messageId: string) => void
}

// Attachment context for getting URLs
export const AttachmentUrlContext = React.createContext<Record<string, string | null>>({})

// Attachment rendering component with optimized loading to prevent layout shifts
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
              <Spinner className="size-5 text-muted-foreground animate-spin" />
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
              <Spinner className="size-5 text-muted-foreground animate-spin" />
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

  if (!url) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2 opacity-60 cursor-not-allowed max-w-xs"
        aria-disabled="true"
        tabIndex={-1}
        title="Attachment loading..."
      >
        <FileIcon className="size-8 text-muted-foreground flex-shrink-0" weight="duotone" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate min-w-0">{attachment.name}</div>
          <div className="text-xs text-muted-foreground font-medium">{formatFileSize(attachment.size)}</div>
        </div>
        <Spinner className="size-4 text-muted-foreground flex-shrink-0 animate-spin" />
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
      <FileIcon className="size-8 text-muted-foreground flex-shrink-0" weight="duotone" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate min-w-0">{attachment.name}</div>
        <div className="text-xs text-muted-foreground font-medium">{formatFileSize(attachment.size)}</div>
      </div>
      <DownloadSimpleIcon className="size-4 text-muted-foreground flex-shrink-0" />
    </a>
  )
}

// Helper function to format full date time
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

// Markdown renderer components - function to generate components based on context
function getMarkdownComponents(isOwn?: boolean) {
  return {
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-1 last:mb-0 [overflow-wrap:anywhere]">{children}</p>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={isOwn 
          ? "text-primary-foreground/90 hover:text-primary-foreground hover:underline font-medium break-words underline-offset-2"
          : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium break-words"
        }
      >
        {children}
      </a>
    ),
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className={`text-2xl font-bold mb-2 mt-3 first:mt-0 ${isOwn ? "text-primary-foreground" : "text-foreground"}`}>
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className={`text-xl font-bold mb-1.5 mt-2.5 first:mt-0 ${isOwn ? "text-primary-foreground" : "text-foreground"}`}>
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className={`text-lg font-semibold mb-1 mt-2 first:mt-0 ${isOwn ? "text-primary-foreground" : "text-foreground"}`}>
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className={`text-base font-semibold mb-1 mt-1.5 first:mt-0 ${isOwn ? "text-primary-foreground" : "text-foreground"}`}>
        {children}
      </h4>
    ),
    h5: ({ children }: { children?: React.ReactNode }) => (
      <h5 className={`text-sm font-semibold mb-0.5 mt-1 first:mt-0 ${isOwn ? "text-primary-foreground" : "text-foreground"}`}>
        {children}
      </h5>
    ),
    h6: ({ children }: { children?: React.ReactNode }) => (
      <h6 className={`text-sm font-medium mb-0.5 mt-1 first:mt-0 ${isOwn ? "text-primary-foreground" : "text-foreground/90"}`}>
        {children}
      </h6>
    ),
    pre: ({ children }: { children?: React.ReactNode }) => (
      <pre className="rounded-md overflow-x-auto my-1.5 [&>code]:p-0 [&>code]:bg-transparent [&>code]:rounded-none">
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
      const match = /language-(\w+)/.exec(className || "")
      const codeString = String(children).replace(/\n$/, "")

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

      return (
        <code 
          className={isOwn
            ? "px-1 py-0.5 bg-primary-foreground/20 rounded text-[13px] font-mono text-primary-foreground"
            : "px-1 py-0.5 bg-muted rounded text-[13px] font-mono text-foreground/90"
          }
          {...props}
        >
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
      const text = typeof children === 'string' ? children : String(children)
      if (text.startsWith('@')) {
        return (
          <span className={isOwn
            ? "inline-flex items-center rounded px-1 py-0.5 font-medium bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 transition-colors"
            : "inline-flex items-center rounded px-1 py-0.5 font-medium bg-primary/10 text-foreground/80 hover:bg-primary/15 transition-colors"
          }>
            {children}
          </span>
        )
      }
      return <strong className={isOwn ? "font-semibold text-primary-foreground" : "font-semibold text-foreground"}>{children}</strong>
    },
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className={isOwn ? "italic text-primary-foreground/90" : "italic text-foreground/85"}>{children}</em>
    ),
    del: ({ children }: { children?: React.ReactNode }) => (
      <del className={isOwn ? "line-through text-primary-foreground/70" : "line-through text-foreground/70"}>{children}</del>
    ),
    u: ({ children }: { children?: React.ReactNode }) => (
      <u className={isOwn ? "underline underline-offset-2 text-primary-foreground" : "underline underline-offset-2 text-foreground"}>{children}</u>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className={isOwn
        ? "pl-2.5 py-0.5 my-1 border-l-2 border-primary-foreground/30 text-primary-foreground/80 italic"
        : "pl-2.5 py-0.5 my-1 border-l-2 border-border text-muted-foreground italic"
      }>
        {children}
      </blockquote>
    ),
  }
}

// Check if content is only emojis (1-3 emojis)
function isEmojiOnlyMessage(content: string): boolean {
  const trimmed = content.replace(/\s/g, '')
  if (!trimmed) return false

  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji}(?:\u200D\p{Emoji})+)+$/u

  // Split into grapheme clusters using Intl.Segmenter (widely supported)
  // Fallback uses regex to match emoji sequences for environments without Intl.Segmenter
  let graphemes: string[]
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined') {
    graphemes = [...new Intl.Segmenter().segment(trimmed)].map(s => s.segment)
  } else {
    // Regex fallback that matches multi-codepoint emojis (ZWJ sequences, modifiers, etc.)
    const emojiMatchRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji}(?:\u200D\p{Emoji})+/gu
    graphemes = trimmed.match(emojiMatchRegex) ?? []
  }

  if (graphemes.length < 1 || graphemes.length > 3) return false

  return graphemes.every(g => emojiRegex.test(g))
}

// Replace mention user IDs with user names in content
function processMentions(content: string, mentions?: string[], userNames?: Record<string, string>): string {
  if (!mentions || mentions.length === 0 || !userNames) return content

  const mentionMap: Record<string, string> = {}
  mentions.forEach(userId => {
    if (userId === "everyone") {
      mentionMap[userId] = "everyone"
    } else {
      const userName = userNames[userId]
      if (userName) {
        mentionMap[userId] = userName
      }
    }
  })

  let processedContent = replaceMentionsInText(content, mentionMap)

  // Handle @everyone with special styling (amber/gold highlight)
  if (mentions.includes("everyone")) {
    processedContent = processedContent.replace(
      /@everyone(?=\s|$|[^\w])/g,
      '<span class="mention-everyone">@everyone</span>'
    )
  }

  // Handle regular user mentions
  const displayNames = Object.entries(mentionMap)
    .filter(([userId]) => userId !== "everyone")
    .map(([, name]) => name)
    .sort((a, b) => b.length - a.length)

  for (const displayName of displayNames) {
    const escapedName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`@${escapedName}(?=\\s|$|[^\\w])`, 'g')
    processedContent = processedContent.replace(pattern, `**@${displayName}**`)
  }

  return processedContent
}

// Helper function to render text with search highlights
function renderWithHighlights(text: string, searchQuery: string): React.ReactNode {
  if (!searchQuery || !searchQuery.trim()) {
    return text
  }

  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (part.toLowerCase() === searchQuery.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/40 text-foreground rounded px-0.5">
          {part}
        </mark>
      )
    }
    return <React.Fragment key={index}>{part}</React.Fragment>
  })
}

// Shared message content renderer
function MessageContent({
  message,
  processedContent,
  searchQuery,
  isEditing,
  editContent,
  setEditContent,
  handleEditKeyDown,
  handleEditSave,
  handleEditCancel,
  isGrouped,
  isOwn,
  userNames,
  currentUserId,
  onReaction,
}: {
  message: Message
  processedContent: string
  searchQuery?: string
  isEditing: boolean
  editContent: string
  setEditContent: (content: string) => void
  handleEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleEditSave: () => void
  handleEditCancel: () => void
  isGrouped?: boolean
  isOwn?: boolean
  userNames?: Record<string, string>
  currentUserId?: string
  onReaction?: (messageId: string, emoji: string) => void
}) {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleEditKeyDown}
          className={`min-h-[80px] text-sm ${
            isOwn 
              ? "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 placeholder:text-primary-foreground/50" 
              : ""
          }`}
          autoFocus
        />
        <div className={`flex gap-2 text-xs ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          <div className="flex items-center gap-1">
            <kbd className={`px-1.5 py-0.5 rounded border ${
              isOwn 
                ? "bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground" 
                : "bg-muted border-border"
            }`}>Enter</kbd>
            <span>to save</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className={`px-1.5 py-0.5 rounded border ${
              isOwn 
                ? "bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground" 
                : "bg-muted border-border"
            }`}>Esc</kbd>
            <span>to cancel</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleEditSave}
            disabled={!editContent.trim() || editContent === message.content}
            className={isOwn ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}
          >
            <CheckIcon className="size-4 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleEditCancel}
            className={isOwn ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" : ""}
          >
            <XIcon className="size-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {message.content && (
        isEmojiOnlyMessage(message.content) ? (
          <div className="text-4xl leading-tight">
            {message.content}
          </div>
        ) : (
          <div 
            className={`text-sm leading-[1.46] prose prose-sm max-w-none break-words overflow-hidden [overflow-wrap:anywhere] ${
              isOwn ? "text-primary-foreground prose-invert" : "text-foreground/90 dark:prose-invert"
            }`}
          >
            {searchQuery && searchQuery.trim() ? (
              <p className="mb-1 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {renderWithHighlights(processedContent, searchQuery)}
              </p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                components={getMarkdownComponents(isOwn)}
              >
                {processedContent}
              </ReactMarkdown>
            )}
          </div>
        )
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
    </>
  )
}

// Hover actions toolbar shared by both styles
function HoverActions({
  message,
  isOwner,
  isAdmin,
  isSaved,
  onReply,
  onForward,
  onReaction,
  onPin,
  onSave,
  onUnsave,
  onDeleteMessage,
  handleEditClick,
  handleCopy,
  setIsMenuOpen,
  position = "right",
  // Forum-specific props
  isForumPost,
  canMarkSolution,
  onMarkSolution,
}: {
  message: Message
  isOwner: boolean
  isAdmin?: boolean
  isSaved?: boolean
  onReply?: (messageId: string) => void
  onForward?: (messageId: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onDeleteMessage?: (messageId: string) => void
  handleEditClick: () => void
  handleCopy: () => void
  setIsMenuOpen: (open: boolean) => void
  position?: "left" | "right"
  // Forum-specific props
  isForumPost?: boolean
  canMarkSolution?: boolean
  onMarkSolution?: (messageId: string) => void
}) {
  const handleSaveToggle = () => {
    if (isSaved) {
      onUnsave?.(message.id)
    } else {
      onSave?.(message.id)
    }
  }

  // Check if this message is currently the solution
  const isSolvedAnswer = message.isSolvedAnswer

  return (
    <div 
      className={`absolute top-1 ${position === "left" ? "left-4" : "right-4"} flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-md z-50`}
    >
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
        <DropdownMenuContent align="end" className="w-48">
          {/* Forum: Mark as Solution option */}
          {isForumPost && canMarkSolution && onMarkSolution && (
            <>
              <DropdownMenuItem 
                onClick={() => onMarkSolution(message.id)}
                className={isSolvedAnswer ? "text-emerald-600 dark:text-emerald-400" : ""}
              >
                <CheckCircleIcon className="size-4" weight={isSolvedAnswer ? "fill" : "regular"} />
                {isSolvedAnswer ? "Unmark as solution" : "Mark as solution"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
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
  )
}

// Shared context menu content for messages (right-click menu)
function MessageContextMenuContent({
  message,
  isOwner,
  isAdmin,
  isSaved,
  onReply,
  onForward,
  onPin,
  onSave,
  onUnsave,
  onDeleteMessage,
  handleEditClick,
  handleCopy,
  // Forum-specific props
  isForumPost,
  canMarkSolution,
  onMarkSolution,
}: {
  message: Message
  isOwner: boolean
  isAdmin?: boolean
  isSaved?: boolean
  onReply?: (messageId: string) => void
  onForward?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onSave?: (messageId: string) => void
  onUnsave?: (messageId: string) => void
  onDeleteMessage?: (messageId: string) => void
  handleEditClick: () => void
  handleCopy: () => void
  // Forum-specific props
  isForumPost?: boolean
  canMarkSolution?: boolean
  onMarkSolution?: (messageId: string) => void
}) {
  const handleSaveToggle = () => {
    if (isSaved) {
      onUnsave?.(message.id)
    } else {
      onSave?.(message.id)
    }
  }

  const isSolvedAnswer = message.isSolvedAnswer

  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem onClick={() => onReply?.(message.id)}>
        <ArrowBendUpLeftIcon className="size-4" />
        Reply
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onForward?.(message.id)}>
        <ShareIcon className="size-4" />
        Forward
      </ContextMenuItem>
      <ContextMenuSeparator />
      {/* Forum: Mark as Solution option */}
      {isForumPost && canMarkSolution && onMarkSolution && (
        <>
          <ContextMenuItem 
            onClick={() => onMarkSolution(message.id)}
            className={isSolvedAnswer ? "text-emerald-600 dark:text-emerald-400" : ""}
          >
            <CheckCircleIcon className="size-4" weight={isSolvedAnswer ? "fill" : "regular"} />
            {isSolvedAnswer ? "Unmark as solution" : "Mark as solution"}
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      <ContextMenuItem onClick={handleCopy}>
        <CopyIcon className="size-4" />
        Copy text
      </ContextMenuItem>
      {isAdmin && (
        <ContextMenuItem onClick={() => onPin?.(message.id)}>
          <PushPinIcon className="size-4" />
          {message.pinned ? "Unpin message" : "Pin message"}
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={handleSaveToggle}>
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
      </ContextMenuItem>
      {isOwner && (
        <>
          <ContextMenuItem onClick={handleEditClick}>
            <PencilIcon className="size-4" />
            Edit message
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => onDeleteMessage?.(message.id)}
          >
            <TrashIcon className="size-4" />
            Delete message
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  )
}

// ============================================
// COMPACT MESSAGE STYLE
// ============================================
function CompactMessageItemInner({
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
  // Forum-specific props
  isForumPost,
  canMarkSolution,
  onMarkSolution,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(message.content)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const isOwner = currentUserId === message.user.id
  
  // Use hover coordinator to ensure only one message shows hover actions
  // Optimized to avoid unnecessary re-renders using ref comparison
  const hoverCoordinator = useHoverCoordinator()
  const wasHoveredRef = React.useRef(false)
  
  // Subscribe to hover changes and update local state only when THIS message's hover status changes
  React.useEffect(() => {
    if (!hoverCoordinator) return
    
    const unsubscribe = hoverCoordinator.subscribe(() => {
      const shouldBeHovered = hoverCoordinator.hoveredIdRef.current === message.id
      // Only update state if the hover status actually changed for THIS message
      // This prevents re-renders when OTHER messages' hover states change
      if (shouldBeHovered !== wasHoveredRef.current) {
        wasHoveredRef.current = shouldBeHovered
        setIsHovered(shouldBeHovered)
      }
    })
    
    return unsubscribe
  }, [hoverCoordinator, message.id])
  
  const handleMouseEnter = React.useCallback(() => {
    hoverCoordinator?.setHoveredId(message.id)
  }, [hoverCoordinator, message.id])
  
  const handleMouseLeave = React.useCallback(() => {
    // Only clear if we're still the hovered message
    if (hoverCoordinator?.hoveredIdRef.current === message.id) {
      hoverCoordinator.setHoveredId(null)
    }
  }, [hoverCoordinator, message.id])

  // Don't show hover actions for pending messages (they don't exist on server yet)
  const showHoverActions = (isHovered || isMenuOpen) && !message.isPending

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
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

  const processedContent = processMentions(message.content, message.mentions, userNames)

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            className={`group relative px-4 hover:bg-muted/50 transition-colors ${isHighlighted ? "animate-highlight-message" : ""} ${message.isSolvedAnswer ? "bg-emerald-500/5 border-l-2 border-emerald-500" : ""} ${message.isPending ? "opacity-50" : ""}`}
            style={{ paddingTop: isGrouped ? "2px" : "8px", paddingBottom: "2px" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        }
      >
        {/* Solution indicator */}
        {message.isSolvedAnswer && !isGrouped && (
          <div className="flex items-center gap-1.5 mb-1 ml-[48px] text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircleIcon className="size-3" weight="fill" />
            <span>Accepted Answer</span>
          </div>
        )}

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
            <div className="w-9 shrink-0 flex items-start justify-center pt-[2px]">
              <span 
                className="text-[8px] leading-none whitespace-nowrap text-transparent group-hover:text-muted-foreground transition-colors font-medium tabular-nums cursor-default select-none"
                title={message.createdAt ? formatFullDateTime(message.createdAt) : undefined}
              >
                {message.timestamp}
              </span>
            </div>
          )}

          {/* Message content */}
          <div className="flex-1 min-w-0">
            {!isGrouped && (
              <div className="flex items-center gap-2 mb-0.5">
                <button
                  onClick={() => onNameClick?.(message.user.id)}
                  className="font-semibold text-sm text-foreground hover:underline"
                >
                  {message.user.name}
                </button>
                <span 
                  className="text-[10px] leading-none text-muted-foreground font-medium tabular-nums cursor-default select-none"
                  title={message.createdAt ? formatFullDateTime(message.createdAt) : undefined}
                >
                  {message.timestamp}
                </span>
                {message.editedAt && (
                  <span className="text-[10px] text-muted-foreground/70 font-medium">(edited)</span>
                )}
              </div>
            )}

            <MessageContent
              message={message}
              processedContent={processedContent}
              searchQuery={searchQuery}
              isEditing={isEditing}
              editContent={editContent}
              setEditContent={setEditContent}
              handleEditKeyDown={handleEditKeyDown}
              handleEditSave={handleEditSave}
              handleEditCancel={handleEditCancel}
              isGrouped={isGrouped}
              userNames={userNames}
              currentUserId={currentUserId}
              onReaction={onReaction}
            />

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
        {showHoverActions && (
          <HoverActions
            message={message}
            isOwner={isOwner}
            isAdmin={isAdmin}
            isSaved={isSaved}
            onReply={onReply}
            onForward={onForward}
            onReaction={onReaction}
            onPin={onPin}
            onSave={onSave}
            onUnsave={onUnsave}
            onDeleteMessage={onDeleteMessage}
            handleEditClick={handleEditClick}
            handleCopy={handleCopy}
            setIsMenuOpen={setIsMenuOpen}
            position="right"
            isForumPost={isForumPost}
            canMarkSolution={canMarkSolution}
            onMarkSolution={onMarkSolution}
          />
        )}
      </ContextMenuTrigger>
      <MessageContextMenuContent
        message={message}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isSaved={isSaved}
        onReply={onReply}
        onForward={onForward}
        onPin={onPin}
        onSave={onSave}
        onUnsave={onUnsave}
        onDeleteMessage={onDeleteMessage}
        handleEditClick={handleEditClick}
        handleCopy={handleCopy}
        isForumPost={isForumPost}
        canMarkSolution={canMarkSolution}
        onMarkSolution={onMarkSolution}
      />
    </ContextMenu>
  )
}

export const CompactMessageItem = React.memo(CompactMessageItemInner)

// ============================================
// BUBBLE MESSAGE STYLE
// ============================================
function BubbleMessageItemInner({
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
  // Forum-specific props
  isForumPost,
  canMarkSolution,
  onMarkSolution,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(message.content)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const isOwner = currentUserId === message.user.id
  const isOwn = isOwner

  // Use hover coordinator to ensure only one message shows hover actions
  // Optimized to avoid unnecessary re-renders using ref comparison
  const hoverCoordinator = useHoverCoordinator()
  const wasHoveredRef = React.useRef(false)
  
  // Subscribe to hover changes and update local state only when THIS message's hover status changes
  React.useEffect(() => {
    if (!hoverCoordinator) return
    
    const unsubscribe = hoverCoordinator.subscribe(() => {
      const shouldBeHovered = hoverCoordinator.hoveredIdRef.current === message.id
      // Only update state if the hover status actually changed for THIS message
      // This prevents re-renders when OTHER messages' hover states change
      if (shouldBeHovered !== wasHoveredRef.current) {
        wasHoveredRef.current = shouldBeHovered
        setIsHovered(shouldBeHovered)
      }
    })
    
    return unsubscribe
  }, [hoverCoordinator, message.id])
  
  const handleMouseEnter = React.useCallback(() => {
    hoverCoordinator?.setHoveredId(message.id)
  }, [hoverCoordinator, message.id])
  
  const handleMouseLeave = React.useCallback(() => {
    // Only clear if we're still the hovered message
    if (hoverCoordinator?.hoveredIdRef.current === message.id) {
      hoverCoordinator.setHoveredId(null)
    }
  }, [hoverCoordinator, message.id])

  // Don't show hover actions for pending messages (they don't exist on server yet)
  const showHoverActions = (isHovered || isMenuOpen) && !message.isPending

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
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

  const processedContent = processMentions(message.content, message.mentions, userNames)

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            className={`group relative ${isHighlighted ? "animate-highlight-message" : ""} ${message.isPending ? "opacity-50" : ""}`}
            style={{ marginTop: isGrouped ? "2px" : "12px" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        }
      >
        {/* Solution indicator */}
        {message.isSolvedAnswer && !isGrouped && (
          <div className={`flex items-center gap-1.5 mb-1 px-4 text-xs text-emerald-600 dark:text-emerald-400 font-medium ${isOwn ? "justify-end" : "justify-start ml-11"}`}>
            <CheckCircleIcon className="size-3" weight="fill" />
            <span>Accepted Answer</span>
          </div>
        )}

        {/* Reply indicator */}
        {message.parentMessage && message.parentMessageId && (
          <button
            onClick={() => onScrollToMessage?.(message.parentMessageId!)}
            className={`flex items-center gap-2 mb-1 px-4 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${isOwn ? "justify-end" : "justify-start ml-11"}`}
          >
            <ArrowBendUpLeftIcon className="size-3" />
            <span>Replying to</span>
            <span className="font-medium text-foreground/70">{message.parentMessage.userName}</span>
            <span className="truncate max-w-[200px] break-words">{message.parentMessage.content}</span>
          </button>
        )}

        {/* Forwarded indicator */}
        {message.forwardedFrom && (
          <div className={`flex items-center gap-1.5 mb-1 px-4 text-xs text-muted-foreground ${isOwn ? "justify-end" : "justify-start ml-11"}`}>
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
          <div className={`flex items-center gap-1.5 mb-1 px-4 text-xs text-amber-600 font-medium ${isOwn ? "justify-end" : "justify-start ml-11"}`}>
            <PushPinIcon className="size-3" weight="fill" />
            <span>Pinned message</span>
          </div>
        )}

        <div className={`flex px-3 ${isOwn ? "justify-end" : "justify-start"}`}>
          <div className={`flex gap-2 max-w-[75%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar - hidden when grouped */}
            {!isGrouped ? (
              <Avatar
                className="size-8 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                onClick={() => onAvatarClick?.(message.user.id)}
              >
                {message.user.avatar ? (
                  <AvatarImage src={message.user.avatar} alt={message.user.name} />
                ) : null}
                <AvatarFallback className="bg-muted text-foreground text-[10px] font-medium">
                  {message.user.initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-8 shrink-0" />
            )}

            {/* Bubble */}
            <div className="flex flex-col">
              {!isGrouped && !isOwn && (
                <button
                  onClick={() => onNameClick?.(message.user.id)}
                  className="text-[11px] font-medium text-muted-foreground mb-0.5 ml-3 hover:underline text-left"
                >
                  {message.user.name}
                </button>
              )}
              
              <div
                className={`relative px-3 py-2 ${
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                    : message.isSolvedAnswer
                      ? "bg-emerald-500/10 text-foreground rounded-2xl rounded-bl-md ring-1 ring-emerald-500/30"
                      : "bg-muted text-foreground rounded-2xl rounded-bl-md"
                }`}
              >
                <MessageContent
                  message={message}
                  processedContent={processedContent}
                  searchQuery={searchQuery}
                  isEditing={isEditing}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  handleEditKeyDown={handleEditKeyDown}
                  handleEditSave={handleEditSave}
                  handleEditCancel={handleEditCancel}
                  isGrouped={isGrouped}
                  isOwn={isOwn}
                  userNames={userNames}
                  currentUserId={currentUserId}
                  onReaction={onReaction}
                />
                
                <div
                  className={`text-[10px] mt-1 flex items-center gap-1.5 ${
                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  <span>{message.timestamp}</span>
                  {message.editedAt && <span>(edited)</span>}
                </div>
              </div>

              {/* Attachments - rendered outside the bubble */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.attachments.map((attachment, index) => (
                    <AttachmentItem key={`${attachment.storageId}-${index}`} attachment={attachment} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover actions */}
        {showHoverActions && (
          <HoverActions
            message={message}
            isOwner={isOwner}
            isAdmin={isAdmin}
            isSaved={isSaved}
            onReply={onReply}
            onForward={onForward}
            onReaction={onReaction}
            onPin={onPin}
            onSave={onSave}
            onUnsave={onUnsave}
            onDeleteMessage={onDeleteMessage}
            handleEditClick={handleEditClick}
            handleCopy={handleCopy}
            setIsMenuOpen={setIsMenuOpen}
            position={isOwn ? "left" : "right"}
            isForumPost={isForumPost}
            canMarkSolution={canMarkSolution}
            onMarkSolution={onMarkSolution}
          />
        )}
      </ContextMenuTrigger>
      <MessageContextMenuContent
        message={message}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isSaved={isSaved}
        onReply={onReply}
        onForward={onForward}
        onPin={onPin}
        onSave={onSave}
        onUnsave={onUnsave}
        onDeleteMessage={onDeleteMessage}
        handleEditClick={handleEditClick}
        handleCopy={handleCopy}
        isForumPost={isForumPost}
        canMarkSolution={canMarkSolution}
        onMarkSolution={onMarkSolution}
      />
    </ContextMenu>
  )
}

export const BubbleMessageItem = React.memo(BubbleMessageItemInner)
