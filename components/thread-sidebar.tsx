"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, ChatCircle } from "@phosphor-icons/react";
import { MessageItem, type MessageData } from "@/components/message-item";
import { MessageInput, type PendingMessage } from "@/components/message-input";
import { type OptimisticMessage } from "@/components/message-list";
import { DotLoader } from "@/components/ui/dot-loader";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

interface ThreadSidebarProps {
  parentMessage?: MessageData;
  parentMessageId: Id<"messages">;
  channelId: Id<"channels">;
  isAdmin: boolean;
  onClose: () => void;
  onEmojiPickerOpen: (messageId: Id<"messages">, rect: DOMRect) => void;
}

function shouldGroupMessages(
  current: MessageData,
  previous: MessageData | undefined
): boolean {
  if (!previous) return false;
  if (current.userId !== previous.userId) return false;
  if (current.forwardedFrom) return false;
  const timeDiff = current.createdAt - previous.createdAt;
  return timeDiff < 2 * 60 * 1000;
}

export function ThreadSidebar({
  parentMessage: parentMessageProp,
  parentMessageId,
  channelId,
  isAdmin,
  onClose,
  onEmojiPickerOpen,
}: ThreadSidebarProps) {
  const { user } = useUser();

  // Optimistic messages for instant thread reply feedback
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);

  const handleMessageSending = useCallback(
    (pending: PendingMessage) => {
      setOptimisticMessages((prev) => [
        ...prev,
        {
          id: pending.id,
          content: pending.content,
          userName: user?.fullName ?? user?.username ?? "You",
          userImageUrl: user?.imageUrl ?? null,
          parentMessage: null,
          attachments: pending.attachments,
        },
      ]);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    },
    [user]
  );

  // Fetch parent message if not provided with full data
  const fetchedParent = useQuery(
    api.messages.getMessage,
    parentMessageProp?.userName ? "skip" : { messageId: parentMessageId }
  );

  const parentMessage = parentMessageProp?.userName
    ? parentMessageProp
    : (fetchedParent as MessageData | null | undefined);

  const replies = useQuery(api.messages.getThreadReplies, {
    parentMessageId,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const replyMessages = useMemo(
    () => (replies as MessageData[] | undefined) ?? [],
    [replies]
  );

  // Auto-scroll to bottom when new replies arrive & clear optimistic messages
  useEffect(() => {
    const count = replyMessages.length;
    if (count > prevCountRef.current) {
      if (optimisticMessages.length) {
        setOptimisticMessages([]);
      }
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = count;
  }, [replyMessages.length, optimisticMessages.length]);

  const noopReply = () => {};
  const noopCancel = () => {};

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-1.5">
          <ChatCircle size={14} weight="bold" className="text-muted-foreground" />
          <span className="text-xs font-semibold">Thread</span>
        </div>
        <button
          onClick={onClose}
          className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Parent message */}
        {parentMessage ? (
          <div className="border-b border-border pb-2">
            <MessageItem
              message={parentMessage}
              isAdmin={isAdmin}
              onReply={noopReply}
              onEmojiPickerOpen={onEmojiPickerOpen}
              showAvatar
              hideThreadIndicator
            />
          </div>
        ) : (
          <div className="flex justify-center py-6 border-b border-border">
            <DotLoader />
          </div>
        )}

        {/* Reply count divider */}
        {replyMessages.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {replyMessages.length} {replyMessages.length === 1 ? "reply" : "replies"}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Loading */}
        {replies === undefined && (
          <div className="flex justify-center py-6">
            <DotLoader />
          </div>
        )}

        {/* Thread replies */}
        <div className="pb-2">
          {replyMessages.map((msg, idx) => {
            const prevMsg = idx > 0 ? replyMessages[idx - 1] : undefined;
            return (
              <MessageItem
                key={msg._id}
                message={msg}
                isAdmin={isAdmin}
                onReply={noopReply}
                onEmojiPickerOpen={onEmojiPickerOpen}
                showAvatar={!shouldGroupMessages(msg, prevMsg)}
                hideThreadIndicator
              />
            );
          })}

          {/* Optimistic pending replies */}
          {optimisticMessages.map((opt) => {
            const lastMsg = replyMessages[replyMessages.length - 1];
            const fakeMsg: MessageData = {
              _id: opt.id as Id<"messages">,
              userId: "pending",
              content: opt.content,
              createdAt: Date.now(),
              userName: opt.userName,
              userImageUrl: opt.userImageUrl,
              parentMessage: null,
              isSaved: false,
              isOwn: true,
              attachments: opt.attachments?.map((a) => ({
                storageId: "pending" as Id<"_storage">,
                name: a.name,
                size: a.size,
                type: a.type,
                url: null,
                previewUrl: a.previewUrl,
              })),
            };
            const shouldGroup =
              lastMsg &&
              lastMsg.isOwn &&
              Date.now() - lastMsg.createdAt < 2 * 60 * 1000;

            return (
              <MessageItem
                key={opt.id}
                message={fakeMsg}
                isAdmin={isAdmin}
                onReply={noopReply}
                onEmojiPickerOpen={onEmojiPickerOpen}
                showAvatar={!shouldGroup}
                hideThreadIndicator
                pending
              />
            );
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Thread input */}
      <MessageInput
        channelId={channelId}
        replyTo={null}
        onCancelReply={noopCancel}
        onMessageSending={handleMessageSending}
        parentMessageId={parentMessageId}
      />
    </div>
  );
}
