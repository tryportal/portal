"use client"

import { memo, useState, useCallback, useEffect, useRef } from "react"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { LinkPreview } from "@/components/preview/link-preview"

import { useIsMessageHovered, setHoveredMessageId } from "./hover-coordinator"
import { useMessageCallbacks } from "./message-list-context"
import { MessageIndicators } from "./message-indicators"
import {
  MessageAvatar,
  MessageHeader,
  GroupedTimestamp,
  AvatarPlaceholder,
} from "./message-header"
import { MessageContent } from "./message-content"
import { MessageAttachments } from "./message-attachments"
import { EditMode } from "./edit-mode"
import { ReactionDisplay } from "./reaction-display"
import { HoverActions } from "./hover-actions"
import { MessageContextMenuContent } from "./context-menu-content"

import type { Message } from "./utils"

/**
 * Message Item
 * 
 * Unified message component that handles both compact and bubble layouts.
 * Uses a shared core composition with style-specific wrappers.
 * 
 * Key optimizations:
 * - External hover store via useSyncExternalStore
 * - Custom memo comparator for fine-grained updates
 * - Ref-based callbacks for stable identity
 * - CSS content-visibility for virtualization
 */

// =============================================================================
// PROPS
// =============================================================================

export interface MessageItemProps {
  message: Message
  currentUserId?: string
  isGrouped?: boolean
  isHighlighted?: boolean
  searchQuery?: string
  isSaved?: boolean
  isAdmin?: boolean
  style?: "compact" | "bubble"
  userNames?: Record<string, string>
  attachmentUrls?: Record<string, string | null>
  // Forum-specific
  isForumPost?: boolean
  canMarkSolution?: boolean
}

// =============================================================================
// LAYOUT: COMPACT
// =============================================================================

interface CompactLayoutProps {
  message: Message
  isGrouped: boolean
  isEditing: boolean
  searchQuery?: string
  userNames?: Record<string, string>
  attachmentUrls?: Record<string, string | null>
  onEditSave: (content: string) => void
  onEditCancel: () => void
  onAvatarClick?: (userId: string) => void
  onNameClick?: (userId: string) => void
}

const CompactLayout = memo(function CompactLayout({
  message,
  isGrouped,
  isEditing,
  searchQuery,
  userNames,
  attachmentUrls,
  onEditSave,
  onEditCancel,
  onAvatarClick,
  onNameClick,
}: CompactLayoutProps) {
  return (
    <div className="flex gap-3">
      {/* Avatar or grouped timestamp */}
      {!isGrouped ? (
        <MessageAvatar
          userId={message.user.id}
          name={message.user.name}
          avatar={message.user.avatar}
          initials={message.user.initials}
          size="md"
          onAvatarClick={onAvatarClick}
        />
      ) : (
        <GroupedTimestamp
          timestamp={message.timestamp}
          createdAt={message.createdAt}
        />
      )}

      {/* Message content area */}
      <div className="flex-1 min-w-0">
        {/* Header: Name + timestamp (not shown for grouped) */}
        {!isGrouped && (
          <MessageHeader
            userId={message.user.id}
            userName={message.user.name}
            timestamp={message.timestamp}
            createdAt={message.createdAt}
            editedAt={message.editedAt}
            isOP={message.isOP}
            viaPearl={message.viaPearl}
            onNameClick={onNameClick}
          />
        )}

        {/* Content: Edit mode or regular content */}
        {isEditing ? (
          <EditMode
            initialContent={message.content}
            onSave={onEditSave}
            onCancel={onEditCancel}
          />
        ) : (
          <>
            {message.content && (
              <MessageContent
                content={message.content}
                mentions={message.mentions}
                userNames={userNames}
                searchQuery={searchQuery}
              />
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments
                attachments={message.attachments}
                attachmentUrls={attachmentUrls}
                className="mt-1.5"
              />
            )}

            {/* Link embed */}
            {message.linkEmbed && (
              <div className="mt-2 max-w-md">
                <LinkPreview embed={message.linkEmbed} compact={false} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})

// =============================================================================
// LAYOUT: BUBBLE
// =============================================================================

interface BubbleLayoutProps {
  message: Message
  isGrouped: boolean
  isEditing: boolean
  isOwn: boolean
  searchQuery?: string
  userNames?: Record<string, string>
  attachmentUrls?: Record<string, string | null>
  onEditSave: (content: string) => void
  onEditCancel: () => void
  onAvatarClick?: (userId: string) => void
  onNameClick?: (userId: string) => void
}

const BubbleLayout = memo(function BubbleLayout({
  message,
  isGrouped,
  isEditing,
  isOwn,
  searchQuery,
  userNames,
  attachmentUrls,
  onEditSave,
  onEditCancel,
  onAvatarClick,
  onNameClick,
}: BubbleLayoutProps) {
  // Bubble styles based on ownership
  const bubbleClass = isOwn
    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
    : "bg-muted text-foreground rounded-2xl rounded-bl-md"

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar (not shown for grouped or own messages) */}
      {!isGrouped && !isOwn ? (
        <MessageAvatar
          userId={message.user.id}
          name={message.user.name}
          avatar={message.user.avatar}
          initials={message.user.initials}
          size="sm"
          onAvatarClick={onAvatarClick}
        />
      ) : !isOwn ? (
        <AvatarPlaceholder size="sm" />
      ) : null}

      {/* Bubble container */}
      <div
        className={`max-w-[70%] ${bubbleClass} px-3 py-2 ${
          isGrouped ? (isOwn ? "mr-0" : "ml-0") : ""
        }`}
      >
        {/* Header: Name (not shown for grouped or own messages) */}
        {!isGrouped && !isOwn && (
          <div className="flex items-center gap-1.5 mb-1">
            <button
              onClick={() => onNameClick?.(message.user.id)}
              className="font-semibold text-xs text-foreground/80 hover:underline block"
            >
              {message.user.name}
            </button>
            {message.viaPearl && (
              <span className="text-[9px] font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1 py-0.5 rounded">
                via Pearl
              </span>
            )}
          </div>
        )}
        {/* via Pearl badge for own messages */}
        {!isGrouped && isOwn && message.viaPearl && (
          <div className="flex justify-end mb-1">
            <span className="text-[9px] font-medium text-violet-300 bg-violet-500/10 px-1 py-0.5 rounded">
              via Pearl
            </span>
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <EditMode
            initialContent={message.content}
            onSave={onEditSave}
            onCancel={onEditCancel}
          />
        ) : (
          <>
            {message.content && (
              <MessageContent
                content={message.content}
                mentions={message.mentions}
                userNames={userNames}
                searchQuery={searchQuery}
                isOwn={isOwn}
              />
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments
                attachments={message.attachments}
                attachmentUrls={attachmentUrls}
                className="mt-1.5"
              />
            )}

            {/* Link embed */}
            {message.linkEmbed && (
              <div className="mt-2 max-w-xs">
                <LinkPreview embed={message.linkEmbed} compact />
              </div>
            )}

            {/* Timestamp */}
            <div
              className={`text-[10px] mt-1 ${
                isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
              } text-right`}
            >
              {message.timestamp}
              {message.editedAt && " (edited)"}
            </div>
          </>
        )}
      </div>
    </div>
  )
})

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function MessageItemInner({
  message,
  currentUserId,
  isGrouped = false,
  isHighlighted = false,
  searchQuery,
  isSaved = false,
  isAdmin = false,
  style = "compact",
  userNames = {},
  attachmentUrls = {},
  isForumPost = false,
  canMarkSolution = false,
}: MessageItemProps) {
  // Local state
  const [isEditing, setIsEditing] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // External hover state - optimized to only re-render when THIS message's hover changes
  const isHovered = useIsMessageHovered(message.id)

  // Derived state
  const isOwner = currentUserId === message.user.id
  const showHoverActions = (isHovered || isMenuOpen) && !message.isPending

  // Get callbacks from context (stable refs)
  const callbacks = useMessageCallbacks()

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    setHoveredMessageId(message.id)
  }, [message.id])

  const handleMouseLeave = useCallback(() => {
    // Only clear if we're still the hovered message
    setHoveredMessageId(null)
  }, [])

  // Edit handlers
  const handleEditSave = useCallback(
    (content: string) => {
      callbacks.editMessage(message.id, content)
      setIsEditing(false)
    },
    [callbacks.editMessage, message.id]
  )

  const handleEditCancel = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleEditClick = useCallback(() => {
    setIsEditing(true)
  }, [])

  // Container classes
  const containerClasses = [
    "group relative transition-colors",
    style === "compact" ? "px-4 hover:bg-muted/50" : "px-4",
    isHighlighted ? "animate-highlight-message" : "",
    message.isSolvedAnswer
      ? "bg-emerald-500/5 border-l-2 border-emerald-500"
      : "",
    message.isPending ? "opacity-50" : "",
  ]
    .filter(Boolean)
    .join(" ")

  // CSS virtualization styles
  const virtualizationStyle = {
    contentVisibility: "auto" as const,
    containIntrinsicSize: "auto 60px",
    paddingTop: isGrouped ? "2px" : "8px",
    paddingBottom: "2px",
  }

  // Indicator margin based on style
  const indicatorMargin = style === "compact" ? "ml-[48px]" : ""

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            className={containerClasses}
            style={virtualizationStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        }
      >
        {/* Indicators (reply, forward, pin, solution) */}
        <MessageIndicators
          parentMessageId={message.parentMessageId}
          parentMessage={message.parentMessage}
          forwardedFrom={message.forwardedFrom}
          pinned={message.pinned}
          isSolvedAnswer={message.isSolvedAnswer}
          isGrouped={isGrouped}
          indicatorClassName={indicatorMargin}
        />

        {/* Layout-specific rendering */}
        {style === "compact" ? (
          <CompactLayout
            message={message}
            isGrouped={isGrouped}
            isEditing={isEditing}
            searchQuery={searchQuery}
            userNames={userNames}
            attachmentUrls={attachmentUrls}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
            onAvatarClick={callbacks.avatarClick}
            onNameClick={callbacks.nameClick}
          />
        ) : (
          <BubbleLayout
            message={message}
            isGrouped={isGrouped}
            isEditing={isEditing}
            isOwn={isOwner}
            searchQuery={searchQuery}
            userNames={userNames}
            attachmentUrls={attachmentUrls}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
            onAvatarClick={callbacks.avatarClick}
            onNameClick={callbacks.nameClick}
          />
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={style === "compact" ? "ml-[48px]" : ""}>
            <ReactionDisplay
              reactions={message.reactions}
              currentUserId={currentUserId}
              onToggleReaction={(emoji) =>
                callbacks.reaction(message.id, emoji)
              }
              userNames={userNames}
            />
          </div>
        )}

        {/* Hover actions */}
        {showHoverActions && (
          <HoverActions
            messageId={message.id}
            messageContent={message.content}
            isPinned={message.pinned}
            isSaved={isSaved}
            isOwner={isOwner}
            isAdmin={isAdmin}
            onReply={callbacks.reply}
            onForward={callbacks.forward}
            onReaction={callbacks.reaction}
            onPin={callbacks.pin}
            onSave={callbacks.save}
            onUnsave={callbacks.unsave}
            onEdit={isOwner ? handleEditClick : undefined}
            onDelete={isOwner ? callbacks.deleteMessage : undefined}
            onMenuOpenChange={setIsMenuOpen}
          />
        )}
      </ContextMenuTrigger>

      {/* Context menu (right-click) */}
      <MessageContextMenuContent
        messageId={message.id}
        messageContent={message.content}
        isPinned={message.pinned}
        isSaved={isSaved}
        isSolvedAnswer={message.isSolvedAnswer}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isForumPost={isForumPost}
        canMarkSolution={canMarkSolution}
        onReply={callbacks.reply}
        onForward={callbacks.forward}
        onPin={callbacks.pin}
        onSave={callbacks.save}
        onUnsave={callbacks.unsave}
        onEdit={isOwner ? handleEditClick : undefined}
        onDelete={isOwner ? callbacks.deleteMessage : undefined}
        onMarkSolution={callbacks.markSolution}
      />
    </ContextMenu>
  )
}

// =============================================================================
// CUSTOM MEMO COMPARATOR
// =============================================================================

function areMessagePropsEqual(
  prev: MessageItemProps,
  next: MessageItemProps
): boolean {
  // Fast path: reference equality
  if (prev === next) return true

  // Check message identity and content
  if (prev.message.id !== next.message.id) return false
  if (prev.message.content !== next.message.content) return false
  if (prev.message.editedAt !== next.message.editedAt) return false

  // Check user info (for lazy-loaded Clerk data)
  if (prev.message.user.name !== next.message.user.name) return false
  if (prev.message.user.avatar !== next.message.user.avatar) return false
  if (prev.message.user.initials !== next.message.user.initials) return false

  // Check rendering context
  if (prev.isGrouped !== next.isGrouped) return false
  if (prev.isHighlighted !== next.isHighlighted) return false
  if (prev.searchQuery !== next.searchQuery) return false
  if (prev.isSaved !== next.isSaved) return false
  if (prev.style !== next.style) return false

  // Check reactions (shallow array comparison)
  const prevReactions = prev.message.reactions
  const nextReactions = next.message.reactions
  if (prevReactions?.length !== nextReactions?.length) return false
  if (prevReactions && nextReactions) {
    for (let i = 0; i < prevReactions.length; i++) {
      if (
        prevReactions[i].emoji !== nextReactions[i].emoji ||
        prevReactions[i].userId !== nextReactions[i].userId
      ) {
        return false
      }
    }
  }

  // Check attachments (shallow array comparison)
  const prevAttachments = prev.message.attachments
  const nextAttachments = next.message.attachments
  if (prevAttachments?.length !== nextAttachments?.length) return false

  // Check flags
  if (prev.message.pinned !== next.message.pinned) return false
  if (prev.message.isSolvedAnswer !== next.message.isSolvedAnswer) return false
  if (prev.message.isPending !== next.message.isPending) return false

  // Check attachment URLs - critical for lazy-loaded URLs from Convex
  if (prevAttachments && prevAttachments.length > 0) {
    for (const att of prevAttachments) {
      const prevUrl = prev.attachmentUrls?.[att.storageId]
      const nextUrl = next.attachmentUrls?.[att.storageId]
      if (prevUrl !== nextUrl) return false
    }
  }

  return true
}

export const MessageItem = memo(MessageItemInner, areMessagePropsEqual)
