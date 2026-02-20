"use client";

import { memo, useState, useCallback } from "react";
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
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  }[];
}

interface MessageItemProps {
  message: MessageData;
  isAdmin: boolean;
  onReply: (message: MessageData) => void;
  onEmojiPickerOpen: (messageId: Id<"messages">, rect: DOMRect) => void;
  showAvatar: boolean;
  pending?: boolean;
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

function MessageItemInner({
  message,
  isAdmin,
  onReply,
  onEmojiPickerOpen,
  showAvatar,
  pending,
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

  const handleDelete = useCallback(async () => {
    await deleteMessage({ messageId: message._id });
  }, [deleteMessage, message._id]);

  const handlePin = useCallback(async () => {
    await pinMessage({ messageId: message._id });
  }, [pinMessage, message._id]);

  const handleSave = useCallback(async () => {
    await toggleSaveMessage({ messageId: message._id });
  }, [toggleSaveMessage, message._id]);

  const handleEditSubmit = useCallback(async () => {
    if (!editContent.trim() || editContent === message.content) {
      setEditing(false);
      return;
    }
    await editMessage({ messageId: message._id, content: editContent });
    setEditing(false);
  }, [editMessage, message._id, editContent, message.content]);

  const handleReactionClick = useCallback(
    async (emoji: string) => {
      await toggleReaction({ messageId: message._id, emoji });
    },
    [toggleReaction, message._id]
  );

  const reactions = message.reactions ? groupReactions(message.reactions) : [];

  return (
    <div
      className={`group relative flex gap-3 px-4 py-0.5 ${
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
            className="flex h-5 items-center justify-end whitespace-nowrap text-[10px] leading-none text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
        ) : (
          <div className="prose-chat text-xs leading-relaxed [&_p]:my-0">
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
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

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-2 border border-border bg-muted/30 px-2.5 py-1.5"
              >
                <span className="text-xs font-medium truncate max-w-40">
                  {att.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatFileSize(att.size)}
                </span>
              </div>
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
      </div>

      {/* Hover toolbar */}
      {!editing && (
        <div className="absolute -top-3 right-4 flex items-center border border-border bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onReply(message)}
            className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Reply"
          >
            <ArrowBendUpLeft size={14} />
          </button>
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onEmojiPickerOpen(message._id, rect);
            }}
            className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Add reaction"
          >
            <Smiley size={14} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground outline-none cursor-pointer transition-colors">
              <DotsThree size={14} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" sideOffset={4} align="end">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy size={14} />
                Copy text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReply(message)}>
                <ArrowBendUpLeft size={14} />
                Reply
              </DropdownMenuItem>
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
  );
}

export const MessageItem = memo(MessageItemInner);
