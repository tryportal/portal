"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageItem, type MessageData } from "@/components/message-item";
import { DotLoader } from "@/components/ui/dot-loader";
import { ArrowDown, ChatCircle } from "@phosphor-icons/react";

export interface MessageListHandle {
  scrollToBottom: () => void;
}

export interface OptimisticMessage {
  id: string;
  content: string;
  userName: string;
  userImageUrl: string | null;
  parentMessage: { content: string; userId: string; userName: string } | null;
}

interface MessageListProps {
  channelId: Id<"channels">;
  isAdmin: boolean;
  onReply: (message: MessageData) => void;
  onEmojiPickerOpen: (messageId: Id<"messages">, rect: DOMRect) => void;
  searchResults: MessageData[] | null;
  optimisticMessages?: OptimisticMessage[];
  onOptimisticClear?: () => void;
}

const BATCH_SIZE = 50;

/**
 * Check if two messages should be grouped (same user, within 2 minutes).
 */
function shouldGroupMessages(
  current: MessageData,
  previous: MessageData | undefined
): boolean {
  if (!previous) return false;
  if (current.userId !== previous.userId) return false;
  if (current.parentMessage) return false;
  if (current.forwardedFrom) return false;
  const timeDiff = current.createdAt - previous.createdAt;
  return timeDiff < 2 * 60 * 1000;
}

/**
 * Insert date separator labels between messages from different days.
 */
function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year:
      date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList(
    { channelId, isAdmin, onReply, onEmojiPickerOpen, searchResults, optimisticMessages, onOptimisticClear },
    ref
  ) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getMessages,
    { channelId },
    { initialNumItems: BATCH_SIZE }
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);
  const prevMessageCountRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // Messages come in desc order from query, reverse for chronological display
  const messages = useMemo(() => {
    if (searchResults) return searchResults;
    return [...(results ?? [])].reverse();
  }, [results, searchResults]);

  // Detect when user scrolls away from bottom
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 50;
    setIsAtBottom(atBottom);

    if (atBottom && showNewMessagePill) {
      setShowNewMessagePill(false);
    }
  }, [showNewMessagePill]);

  // Infinite scroll: load more when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          status === "CanLoadMore" &&
          !isLoadingMoreRef.current
        ) {
          isLoadingMoreRef.current = true;

          const prevScrollHeight = container.scrollHeight;
          const prevScrollTop = container.scrollTop;

          loadMore(BATCH_SIZE);

          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight;
            const heightDiff = newScrollHeight - prevScrollHeight;
            container.scrollTop = prevScrollTop + heightDiff;
            isLoadingMoreRef.current = false;
          });
        }
      },
      { root: container, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [status, loadMore]);

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && prevMessageCountRef.current === 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [messages.length]);

  // When new messages arrive and user is at bottom, scroll down
  const messageCount = messages.length;
  useEffect(() => {
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = messageCount;

    if (prev === 0 || messageCount <= prev) return;

    // Clear optimistic messages since real ones have arrived
    if (optimisticMessages?.length) {
      onOptimisticClear?.();
    }

    if (isAtBottom) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      setShowNewMessagePill(true);
    }
  }, [messageCount, isAtBottom, optimisticMessages?.length, onOptimisticClear]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessagePill(false);
  }, []);

  useImperativeHandle(ref, () => ({ scrollToBottom }), [scrollToBottom]);

  if (!results || results.length === 0) {
    if (status === "LoadingFirstPage") {
      return (
        <div className="flex flex-1 items-center justify-center">
          <DotLoader />
        </div>
      );
    }

    if (searchResults !== null && searchResults.length === 0) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">No messages found</p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <ChatCircle
            size={32}
            className="mx-auto text-muted-foreground/40"
          />
          <p className="mt-3 text-sm font-medium">No messages yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Be the first to send a message in this channel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* Flex container that pushes content to bottom */}
        <div className="flex min-h-full flex-col justify-end">
          {/* Sentinel for infinite scroll (top of list) */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading indicator for older messages */}
          {status === "LoadingMore" && (
            <div className="flex justify-center py-3">
              <DotLoader dotCount={3} dotSize={3} gap={3} duration={1000} />
            </div>
          )}

          {status === "Exhausted" && messages.length > BATCH_SIZE && (
            <div className="flex justify-center py-4">
              <span className="text-[10px] text-muted-foreground">
                Beginning of conversation
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="pb-2">
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : undefined;
              const showDateSeparator =
                !prevMsg ||
                new Date(msg.createdAt).toDateString() !==
                  new Date(prevMsg.createdAt).toDateString();

              return (
                <div key={msg._id}>
                  {showDateSeparator && (
                    <div className="my-4 flex items-center gap-3 px-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MessageItem
                    message={msg}
                    isAdmin={isAdmin}
                    onReply={onReply}
                    onEmojiPickerOpen={onEmojiPickerOpen}
                    showAvatar={
                      showDateSeparator || !shouldGroupMessages(msg, prevMsg)
                    }
                  />
                </div>
              );
            })}

            {/* Optimistic pending messages */}
            {optimisticMessages?.map((opt) => {
              const lastMsg = messages[messages.length - 1];
              const fakeMsg: MessageData = {
                _id: opt.id as Id<"messages">,
                userId: "pending",
                content: opt.content,
                createdAt: Date.now(),
                userName: opt.userName,
                userImageUrl: opt.userImageUrl,
                parentMessage: opt.parentMessage,
                isSaved: false,
                isOwn: true,
              };
              const shouldGroup =
                lastMsg &&
                lastMsg.isOwn &&
                !fakeMsg.parentMessage &&
                Date.now() - lastMsg.createdAt < 2 * 60 * 1000;

              return (
                <div key={opt.id}>
                  <MessageItem
                    message={fakeMsg}
                    isAdmin={isAdmin}
                    onReply={onReply}
                    onEmojiPickerOpen={onEmojiPickerOpen}
                    showAvatar={!shouldGroup}
                    pending
                  />
                </div>
              );
            })}
          </div>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* New messages pill */}
      {showNewMessagePill && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-muted"
        >
          <ArrowDown size={12} />
          New messages
        </button>
      )}
    </div>
  );
});
