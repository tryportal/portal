"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageItem, type MessageData } from "@/components/message-item";
import { DotLoader } from "@/components/ui/dot-loader";
import { ArrowDown } from "@phosphor-icons/react";

interface MessageListProps {
  channelId: Id<"channels">;
  isAdmin: boolean;
  onReply: (message: MessageData) => void;
  onEmojiPickerOpen: (messageId: Id<"messages">, rect: DOMRect) => void;
  searchResults: MessageData[] | null;
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
  if (current.parentMessage) return false; // Replies always show avatar
  if (current.forwardedFrom) return false; // Forwards always show avatar
  const timeDiff = current.createdAt - previous.createdAt;
  return timeDiff < 2 * 60 * 1000; // 2 minutes
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

export function MessageList({
  channelId,
  isAdmin,
  onReply,
  onEmojiPickerOpen,
  searchResults,
}: MessageListProps) {
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

          // Save scroll position before loading more
          const prevScrollHeight = container.scrollHeight;
          const prevScrollTop = container.scrollTop;

          loadMore(BATCH_SIZE);

          // Restore scroll position after DOM updates
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
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // When new messages arrive and user is at bottom, scroll down
  useEffect(() => {
    if (!results) return;
    const currentCount = results.length;
    if (
      currentCount > prevMessageCountRef.current &&
      prevMessageCountRef.current > 0
    ) {
      if (isAtBottom) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      } else {
        setShowNewMessagePill(true);
      }
    }
  }, [results?.length, isAtBottom, results]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessagePill(false);
  }, []);

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
          <p className="text-sm font-medium">No messages yet</p>
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
            <div className="flex justify-center py-3">
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
                    <div className="my-4 flex items-center gap-3 px-5">
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
                    showAvatar={showDateSeparator || !shouldGroupMessages(msg, prevMsg)}
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
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-md transition-colors hover:bg-muted"
        >
          <ArrowDown size={12} />
          New messages
        </button>
      )}
    </div>
  );
}
