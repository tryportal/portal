"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChannelHeader } from "@/components/channel-header";
import {
  MessageList,
  type MessageListHandle,
  type OptimisticMessage,
} from "@/components/message-list";
import { MessageInput, type PendingMessage } from "@/components/message-input";
import { PinnedMessages } from "@/components/pinned-messages";
import type { MessageData } from "@/components/message-item";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface ChannelData {
  _id: Id<"channels">;
  name: string;
  categoryName: string;
  role: string;
  isMuted: boolean;
  organizationId: Id<"organizations">;
  permissions: "open" | "readOnly";
  description?: string;
}

interface ChannelChatProps {
  channel: ChannelData;
  slug?: string;
}

export function ChannelChat({ channel }: ChannelChatProps) {
  const [replyTo, setReplyTo] = useState<MessageData | null>(null);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const messageListRef = useRef<MessageListHandle>(null);
  const { user } = useUser();

  // Optimistic messages for instant feedback
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
          parentMessage: pending.replyTo
            ? {
                content: pending.replyTo.content,
                userId: pending.replyTo.userId,
                userName: pending.replyTo.userName,
              }
            : null,
          attachments: pending.attachments,
        },
      ]);
      // Scroll to bottom immediately
      requestAnimationFrame(() => {
        messageListRef.current?.scrollToBottom();
      });
    },
    [user]
  );

  // Clear optimistic messages when real messages arrive matching the content
  const clearOptimistic = useCallback(() => {
    setOptimisticMessages([]);
  }, []);

  // Emoji picker state for message reactions
  const [emojiPickerState, setEmojiPickerState] = useState<{
    messageId: Id<"messages">;
    position: { top: number; left: number };
  } | null>(null);
  const emojiReactionRef = useRef<HTMLDivElement>(null);

  const toggleReaction = useMutation(api.messages.toggleReaction);
  const markChannelRead = useMutation(api.messages.markChannelRead);

  const isAdmin = channel.role === "admin";
  const isReadOnly = channel.permissions === "readOnly" && !isAdmin;

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Search query (only when debounced search has value)
  const searchResults = useQuery(
    api.messages.searchMessages,
    debouncedSearch.trim()
      ? { channelId: channel._id, searchQuery: debouncedSearch.trim() }
      : "skip"
  );

  // Mark channel as read when entering
  useEffect(() => {
    markChannelRead({ channelId: channel._id });
  }, [channel._id, markChannelRead]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerState) return;
    const handleClick = (e: MouseEvent) => {
      if (
        emojiReactionRef.current &&
        !emojiReactionRef.current.contains(e.target as Node)
      ) {
        setEmojiPickerState(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [emojiPickerState]);

  const handleReply = useCallback((message: MessageData) => {
    setReplyTo(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleEmojiPickerOpen = useCallback(
    (messageId: Id<"messages">, rect: DOMRect) => {
      setEmojiPickerState({
        messageId,
        position: {
          top: rect.top - 350,
          left: Math.min(rect.left, window.innerWidth - 360),
        },
      });
    },
    []
  );

  const handleReactionEmojiSelect = useCallback(
    async (emoji: { native: string }) => {
      if (!emojiPickerState) return;
      await toggleReaction({
        messageId: emojiPickerState.messageId,
        emoji: emoji.native,
      });
      setEmojiPickerState(null);
    },
    [emojiPickerState, toggleReaction]
  );

  return (
    <div className="flex h-full flex-col">
      <ChannelHeader
        channelName={channel.name}
        channelId={channel._id}
        isMuted={channel.isMuted}
        role={channel.role}
        onOpenPinned={() => setPinnedOpen(true)}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
      />

      <MessageList
        ref={messageListRef}
        channelId={channel._id}
        isAdmin={isAdmin}
        onReply={handleReply}
        onEmojiPickerOpen={handleEmojiPickerOpen}
        searchResults={
          debouncedSearch.trim() && searchResults
            ? (searchResults as MessageData[])
            : null
        }
        optimisticMessages={optimisticMessages}
        onOptimisticClear={clearOptimistic}
      />

      {!isReadOnly && (
        <MessageInput
          channelId={channel._id}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          onMessageSending={handleMessageSending}
        />
      )}

      {isReadOnly && (
        <div className="shrink-0 px-4 pb-4">
          <div className="border border-border bg-muted/30 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              This channel is read-only. Only admins can send messages.
            </p>
          </div>
        </div>
      )}

      {/* Pinned messages dialog */}
      <PinnedMessages
        open={pinnedOpen}
        onOpenChange={setPinnedOpen}
        channelId={channel._id}
        channelName={channel.name}
      />

      {/* Floating emoji picker for reactions */}
      {emojiPickerState && (
        <div
          ref={emojiReactionRef}
          className="fixed z-50 max-md:inset-x-0 max-md:bottom-0 max-md:flex max-md:justify-center max-md:p-2"
          style={
            window.innerWidth >= 768
              ? {
                  top: Math.max(10, emojiPickerState.position.top),
                  left: emojiPickerState.position.left,
                }
              : undefined
          }
        >
          <Picker
            data={data}
            onEmojiSelect={handleReactionEmojiSelect}
            theme="light"
            previewPosition="none"
            skinTonePosition="search"
            maxFrequentRows={2}
          />
        </div>
      )}
    </div>
  );
}
