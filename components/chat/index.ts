/**
 * Chat Components - Public API
 * 
 * This module exports all the components and hooks for the optimized chat rendering engine.
 * 
 * Key Features:
 * - CSS content-visibility virtualization for large message lists
 * - useSyncExternalStore for hover coordination (no re-render cascade)
 * - Stable callback refs via MessageListProvider
 * - Custom memo comparators for fine-grained updates
 * - Lazy-loaded Prism syntax highlighter
 * 
 * Basic Usage:
 * ```tsx
 * import { MessageList } from "@/components/chat"
 * 
 * <MessageList
 *   messages={messages}
 *   currentUserId={userId}
 *   style="compact"
 *   onReply={handleReply}
 *   onReaction={handleReaction}
 *   // ... other callbacks
 * />
 * ```
 * 
 * For full chat interface with state management:
 * ```tsx
 * import { ChatInterface, useChatState } from "@/components/chat"
 * 
 * const { replyingTo, handleReply, handleCancelReply } = useChatState(messages)
 * 
 * <ChatInterface
 *   messages={messages}
 *   onReplyStart={(reply) => setReplyingTo(reply)}
 *   // ... other props
 * />
 * ```
 */

// =============================================================================
// MAIN COMPONENTS
// =============================================================================

export { MessageList, type MessageListProps } from "./message-list"
export { ChatInterface, useChatState, type ChatInterfaceProps, type ReplyingTo, type ForwardingMessage } from "./chat-interface"
export { MessageItem, type MessageItemProps } from "./message-item"

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

export { MessageContent } from "./message-content"
export { MessageAttachments } from "./message-attachments"
export { MessageIndicators, ReplyIndicator, ForwardIndicator, PinIndicator, SolutionIndicator } from "./message-indicators"
export { MessageAvatar, MessageHeader, GroupedTimestamp, AvatarPlaceholder } from "./message-header"
export { EditMode } from "./edit-mode"
export { ReactionDisplay } from "./reaction-display"
export { HoverActions } from "./hover-actions"
export { MessageContextMenuContent } from "./context-menu-content"
export { ScrollToBottom } from "./scroll-to-bottom"
export { DateSeparator } from "./date-separator"
export { AttachmentItem } from "./attachment-item"
export { MarkdownRenderer, HighlightedText } from "./markdown-renderer"

// =============================================================================
// CONTEXT & PROVIDERS
// =============================================================================

export {
  MessageListProvider,
  useMessageListContext,
  useMessageCallbacks,
  useMessageListData,
  useIsMessageSaved,
  useGetAttachmentUrl,
  type MessageListCallbacks,
  type MessageListData,
} from "./message-list-context"

// =============================================================================
// HOVER COORDINATION
// =============================================================================

export {
  useHoveredMessageId,
  useIsMessageHovered,
  useSetHoveredMessage,
  useMessageHover,
  getHoveredMessageId,
  setHoveredMessageId,
} from "./hover-coordinator"

// =============================================================================
// UTILITIES
// =============================================================================

export {
  // Types
  type Message,
  type Attachment,
  type Reaction,
  type GroupedReaction,
  // File utilities
  formatFileSize,
  isImageType,
  isVideoType,
  // Date utilities
  formatFullDateTime,
  formatDateForSeparator,
  isDifferentDay,
  // Message utilities
  shouldGroupMessages,
  isEmojiOnlyMessage,
  processMentions,
  groupReactions,
  // Search utilities
  escapeRegex,
  splitBySearchQuery,
} from "./utils"
