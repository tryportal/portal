"use client";

import { memo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowBendUpLeft,
  Smiley,
  DotsThree,
  Copy,
  PushPin,
  BookmarkSimple,
  PencilSimple,
  Trash,
  ArrowSquareRight,
  DownloadSimple,
  Link,
  File,
  X,
  ChatCircle,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

export interface MessageData {
  _id: Id<"messages">;
  userId: string;
  content: string;
  createdAt: number;
  editedAt?: number;
  userName: string;
  userImageUrl: string | null;
  parentMessage: {
    content: string;
    userId: string;
    userName: string;
  } | null;
  reactions?: { userId: string; emoji: string }[];
  pinned?: boolean;
  isSaved: boolean;
  isOwn: boolean;
  forwardedFrom?: {
    messageId: Id<"messages">;
    channelId?: Id<"channels">;
    conversationId?: Id<"conversations">;
    channelName?: string;
    userName?: string;
  };
  attachments?: {
    storageId: Id<"_storage">;
    name: string;
    size: number;
    type: string;
    url?: string | null;
    previewUrl?: string;
  }[];
  threadReplyCount?: number;
  threadLatestRepliers?: { imageUrl?: string; name: string }[];
  isSharedMember?: boolean;
  sharedFromWorkspace?: string | null;
}

interface MessageItemProps {
  message: MessageData;
  isAdmin: boolean;
  onReply: (message: MessageData) => void;
  onEmojiPickerOpen: (messageId: Id<"messages">, rect: DOMRect) => void;
  showAvatar: boolean;
  pending?: boolean;
  onOpenThread?: (message: MessageData) => void;
  hideThreadIndicator?: boolean;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Check if a message contains only emoji characters (up to ~10) */
const EMOJI_ONLY_RE = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\s*(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 40) return false;
  return EMOJI_ONLY_RE.test(trimmed);
}

/** Pre-process content to replace mention tokens with styled text for markdown */
function preprocessMentions(content: string): string {
  return content.replace(/<@([^|>]+)\|([^>]+)>/g, '**@$2**');
}

function groupReactions(
  reactions: { userId: string; emoji: string }[]
): { emoji: string; count: number; userIds: string[] }[] {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    if (!map.has(r.emoji)) map.set(r.emoji, []);
    map.get(r.emoji)!.push(r.userId);
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }));
}

// ============================================================================
// Image Lightbox
// ============================================================================

function ImageLightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleDownload = useCallback(async () => {
    const response = await fetch(src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, [src, name]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(src);
  }, [src]);

  const handleCopyImage = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch {
      // Fallback: copy link instead
      navigator.clipboard.writeText(src);
    }
  }, [src]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
        <span className="text-sm font-medium text-white/90 truncate max-w-[50%]">
          {name}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyLink();
            }}
            className="flex size-8 items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Copy link"
          >
            <Link size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyImage();
            }}
            className="flex size-8 items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Copy image"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="flex size-8 items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Download"
          >
            <DownloadSimple size={16} />
          </button>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-2"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="max-h-[85vh] max-w-[90vw] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );
}

// ============================================================================
// Attachment renderers
// ============================================================================

function ImageAttachment({
  att,
}: {
  att: NonNullable<MessageData["attachments"]>[0];
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const displayUrl = att.url || att.previewUrl;

  if (!displayUrl) return null;

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className="block overflow-hidden border border-border hover:border-foreground/20 transition-colors cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayUrl}
          alt={att.name}
          className="max-h-72 max-w-full object-contain bg-muted/20 md:max-w-80"
          loading="lazy"
        />
      </button>
      {lightboxOpen && (
        <ImageLightbox
          src={displayUrl}
          name={att.name}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

function VideoAttachment({
  att,
}: {
  att: NonNullable<MessageData["attachments"]>[0];
}) {
  const displayUrl = att.url || att.previewUrl;
  if (!displayUrl) return null;

  return (
    <div className="max-w-full overflow-hidden border border-border md:max-w-96">
      <video
        src={displayUrl}
        controls
        preload="metadata"
        className="max-h-80 w-full bg-black"
      >
        <track kind="captions" />
      </video>
    </div>
  );
}

function FileAttachment({
  att,
}: {
  att: NonNullable<MessageData["attachments"]>[0];
}) {
  const handleDownload = useCallback(async () => {
    if (!att.url) return;
    const response = await fetch(att.url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [att.url, att.name]);

  return (
    <div className="flex items-center gap-2.5 border border-border bg-muted/30 px-3 py-2">
      <File size={18} className="shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium truncate block max-w-60">
          {att.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatFileSize(att.size)}
        </span>
      </div>
      {att.url && (
        <button
          onClick={handleDownload}
          className="flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Download"
        >
          <DownloadSimple size={14} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MessageItem
// ============================================================================

function MessageItemInner({
  message,
  isAdmin,
  onReply,
  onEmojiPickerOpen,
  showAvatar,
  pending,
  onOpenThread,
  hideThreadIndicator,
}: MessageItemProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const pinMessage = useMutation(api.messages.pinMessage);
  const toggleSaveMessage = useMutation(api.messages.toggleSaveMessage);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
  }, [message.content]);

  const isPending = (message._id as string).startsWith("pending-");

  const handleDelete = useCallback(async () => {
    if (isPending) return;
    await deleteMessage({ messageId: message._id });
  }, [deleteMessage, message._id, isPending]);

  const handlePin = useCallback(async () => {
    if (isPending) return;
    await pinMessage({ messageId: message._id });
  }, [pinMessage, message._id, isPending]);

  const handleSave = useCallback(async () => {
    if (isPending) return;
    await toggleSaveMessage({ messageId: message._id });
  }, [toggleSaveMessage, message._id, isPending]);

  const handleEditSubmit = useCallback(async () => {
    if (isPending) return;
    if (!editContent.trim() || editContent === message.content) {
      setEditing(false);
      return;
    }
    await editMessage({ messageId: message._id, content: editContent });
    setEditing(false);
  }, [editMessage, message._id, editContent, message.content, isPending]);

  const handleReactionClick = useCallback(
    async (emoji: string) => {
      if (isPending) return;
      await toggleReaction({ messageId: message._id, emoji });
    },
    [toggleReaction, message._id, isPending]
  );

  const reactions = message.reactions ? groupReactions(message.reactions) : [];

  // Categorize attachments
  const images = message.attachments?.filter((a) => a.type.startsWith("image/")) ?? [];
  const videos = message.attachments?.filter((a) => a.type.startsWith("video/")) ?? [];
  const files = message.attachments?.filter(
    (a) => !a.type.startsWith("image/") && !a.type.startsWith("video/")
  ) ?? [];

  const contextMenuContent = (
    <>
      <ContextMenuItem onClick={handleCopy}>
        <Copy size={14} />
        Copy text
      </ContextMenuItem>
      {onOpenThread ? (
        <ContextMenuItem onClick={() => onOpenThread(message)}>
          <ChatCircle size={14} />
          Reply in Thread
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={() => onReply(message)}>
          <ArrowBendUpLeft size={14} />
          Reply
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      {isAdmin && (
        <ContextMenuItem onClick={handlePin}>
          <PushPin size={14} />
          {message.pinned ? "Unpin message" : "Pin message"}
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={handleSave}>
        <BookmarkSimple size={14} />
        {message.isSaved ? "Unsave message" : "Save message"}
      </ContextMenuItem>
      {message.isOwn && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              setEditing(true);
              setEditContent(message.content);
            }}
          >
            <PencilSimple size={14} />
            Edit message
          </ContextMenuItem>
          <ContextMenuItem
            className="text-destructive hover:text-destructive focus:text-destructive"
            onClick={handleDelete}
          >
            <Trash size={14} />
            Delete message
          </ContextMenuItem>
        </>
      )}
    </>
  );

  return (
    <ContextMenu content={contextMenuContent}>
    <div
      className={`group relative flex gap-2.5 px-3 py-0.5 md:gap-3 md:px-4 ${
        showAvatar ? "mt-2.5" : "mt-px"
      } ${pending ? "opacity-50" : ""}`}
    >
      {/* Avatar column */}
      <div className="w-8 shrink-0 pt-0.5">
        {showAvatar ? (
          message.userImageUrl ? (
            <Image
              src={message.userImageUrl}
              alt={message.userName}
              width={32}
              height={32}
              className="size-8 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-8 items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
              {message.userName.charAt(0).toUpperCase()}
            </div>
          )
        ) : (
          <span
            className="flex h-5 items-center justify-end whitespace-nowrap text-[10px] leading-none text-muted-foreground opacity-0 group-hover:opacity-100"
            title={formatFullDate(message.createdAt)}
          >
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        {/* Name + timestamp row */}
        {showAvatar && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold">{message.userName}</span>
            {message.isSharedMember && message.sharedFromWorkspace && (
              <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground leading-none">
                {message.sharedFromWorkspace}
              </span>
            )}
            <span
              className="text-[10px] text-muted-foreground"
              title={formatFullDate(message.createdAt)}
            >
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}

        {/* Forwarded indicator */}
        {message.forwardedFrom && (
          <div className="mb-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowSquareRight size={12} />
            <span>
              Forwarded from{" "}
              {message.forwardedFrom.channelName
                ? `#${message.forwardedFrom.channelName}`
                : message.forwardedFrom.userName ?? "unknown"}
            </span>
          </div>
        )}

        {/* Reply preview */}
        {message.parentMessage && (
          <div className="mb-0.5 flex items-center gap-2 border-l-2 border-border pl-2">
            <span className="text-[10px] font-medium text-muted-foreground">
              {message.parentMessage.userName}
            </span>
            <span className="truncate text-[10px] text-muted-foreground/70">
              {message.parentMessage.content.slice(0, 100)}
              {message.parentMessage.content.length > 100 ? "..." : ""}
            </span>
          </div>
        )}

        {/* Message content */}
        {editing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border border-border bg-background px-2.5 py-1.5 text-xs leading-relaxed outline-none focus:border-ring resize-none"
              rows={Math.min(editContent.split("\n").length + 1, 8)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSubmit();
                }
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditContent(message.content);
                }
              }}
            />
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>
                Escape to{" "}
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditContent(message.content);
                  }}
                  className="text-foreground hover:underline"
                >
                  cancel
                </button>
              </span>
              <span>&middot;</span>
              <span>
                Enter to{" "}
                <button
                  onClick={handleEditSubmit}
                  className="text-foreground hover:underline"
                >
                  save
                </button>
              </span>
            </div>
          </div>
        ) : isEmojiOnly(message.content) ? (
          <div className="text-3xl leading-snug">
            {message.content}
            {message.editedAt && (
              <span
                className="ml-1 text-[10px] text-muted-foreground"
                title={`Edited ${formatFullDate(message.editedAt)}`}
              >
                (edited)
              </span>
            )}
          </div>
        ) : (
          <div className="prose-chat text-xs leading-relaxed [&_p]:my-0">
            <Markdown remarkPlugins={[remarkGfm]}>{preprocessMentions(message.content)}</Markdown>
            {message.editedAt && (
              <span
                className="ml-1 text-[10px] text-muted-foreground"
                title={`Edited ${formatFullDate(message.editedAt)}`}
              >
                (edited)
              </span>
            )}
          </div>
        )}

        {/* Image attachments */}
        {images.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {images.map((att, i) => (
              <ImageAttachment key={i} att={att} />
            ))}
          </div>
        )}

        {/* Video attachments */}
        {videos.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1.5">
            {videos.map((att, i) => (
              <VideoAttachment key={i} att={att} />
            ))}
          </div>
        )}

        {/* File attachments */}
        {files.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {files.map((att, i) => (
              <FileAttachment key={i} att={att} />
            ))}
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleReactionClick(r.emoji)}
                className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-xs transition-colors ${
                  r.userIds.includes(message.userId)
                    ? "border-foreground/20 bg-foreground/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] text-muted-foreground">
                  {r.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Thread reply count indicator */}
        {!hideThreadIndicator && (message.threadReplyCount ?? 0) > 0 && (
          <button
            onClick={() => onOpenThread?.(message)}
            className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            <div className="flex -space-x-1.5">
              {message.threadLatestRepliers?.slice(0, 3).map((r, i) =>
                r.imageUrl ? (
                  <Image
                    key={i}
                    src={r.imageUrl}
                    alt={r.name}
                    width={16}
                    height={16}
                    className="size-4 border border-background object-cover"
                  />
                ) : (
                  <div
                    key={i}
                    className="flex size-4 items-center justify-center border border-background bg-muted text-[7px] font-medium text-muted-foreground"
                  >
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                )
              )}
            </div>
            <span className="font-medium">
              {message.threadReplyCount} {message.threadReplyCount === 1 ? "reply" : "replies"}
            </span>
          </button>
        )}
      </div>

      {/* Action toolbar - hover on desktop, always-visible dots on mobile */}
      {!editing && (
        <div className="absolute -top-3 right-3 flex items-center border border-border bg-background shadow-sm opacity-0 transition-opacity group-hover:opacity-100 md:right-4 max-md:opacity-0 max-md:group-active:opacity-100 max-md:has-[*[data-state=open]]:opacity-100">
          <button
            onClick={() => onOpenThread ? onOpenThread(message) : onReply(message)}
            className="hidden size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:flex"
            title={onOpenThread ? "Reply in Thread" : "Reply"}
          >
            {onOpenThread ? <ChatCircle size={14} /> : <ArrowBendUpLeft size={14} />}
          </button>
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onEmojiPickerOpen(message._id, rect);
            }}
            className="hidden size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:flex"
            title="Add reaction"
          >
            <Smiley size={14} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground outline-none cursor-pointer transition-colors md:size-7">
              <DotsThree size={14} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" sideOffset={4} align="end">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy size={14} />
                Copy text
              </DropdownMenuItem>
              {onOpenThread ? (
                <DropdownMenuItem onClick={() => onOpenThread(message)}>
                  <ChatCircle size={14} />
                  Reply in Thread
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <ArrowBendUpLeft size={14} />
                  Reply
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  onEmojiPickerOpen(message._id, rect);
                }}
              >
                <Smiley size={14} />
                Add reaction
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={handlePin}>
                  <PushPin size={14} />
                  {message.pinned ? "Unpin message" : "Pin message"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSave}>
                <BookmarkSimple size={14} />
                {message.isSaved ? "Unsave message" : "Save message"}
              </DropdownMenuItem>
              {message.isOwn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(true);
                      setEditContent(message.content);
                    }}
                  >
                    <PencilSimple size={14} />
                    Edit message
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash size={14} />
                    Delete message
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
    </ContextMenu>
  );
}

export const MessageItem = memo(MessageItemInner);
