"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  MessageList,
  type MessageListHandle,
  type OptimisticMessage,
} from "@/components/message-list";
import { MessageInput, type PendingMessage } from "@/components/message-input";
import { ThreadSidebar } from "@/components/thread-sidebar";
import type { MessageData } from "@/components/message-item";
import { DotLoader } from "@/components/ui/dot-loader";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface DmChatProps {
  conversationId: Id<"conversations">;
}

export function DmChat({ conversationId }: DmChatProps) {
  const [replyTo, setReplyTo] = useState<MessageData | null>(null);
  const [activeThread, setActiveThread] = useState<MessageData | null>(null);

  const messageListRef = useRef<MessageListHandle>(null);
  const { user } = useUser();

  const conversation = useQuery(api.conversations.getConversation, {
    conversationId,
  });
  const markConversationRead = useMutation(
    api.conversations.markConversationRead
  );
  const toggleReaction = useMutation(api.messages.toggleReaction);

  // Optimistic messages
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
      requestAnimationFrame(() => {
        messageListRef.current?.scrollToBottom();
      });
    },
    [user]
  );

  const clearOptimistic = useCallback(() => {
    setOptimisticMessages([]);
  }, []);

  // Emoji picker for reactions
  const [emojiPickerState, setEmojiPickerState] = useState<{
    messageId: Id<"messages">;
    position: { top: number; left: number };
  } | null>(null);
  const emojiReactionRef = useRef<HTMLDivElement>(null);

  // Mark conversation as read on mount
  useEffect(() => {
    markConversationRead({ conversationId });
  }, [conversationId, markConversationRead]);

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

  const handleOpenThread = useCallback((message: MessageData) => {
    setActiveThread(message);
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

  if (conversation === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <DotLoader />
      </div>
    );
  }

  if (conversation === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs text-muted-foreground">Conversation not found</p>
      </div>
    );
  }

  const otherUserName = conversation.otherUser
    ? [conversation.otherUser.firstName, conversation.otherUser.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown"
    : "Unknown";

  const otherUserInitials = conversation.otherUser
    ? (conversation.otherUser.firstName?.[0] ?? "?").toUpperCase()
    : "?";

  return (
    <div className="flex h-full flex-row">
      {/* Main chat area */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-4">
          {conversation.otherUser?.imageUrl ? (
            <img
              src={conversation.otherUser.imageUrl}
              alt=""
              className="size-6 object-cover"
            />
          ) : (
            <div className="flex size-6 items-center justify-center bg-muted text-[10px] font-medium">
              {otherUserInitials}
            </div>
          )}
          <span className="text-xs font-semibold">{otherUserName}</span>
        </div>

        <MessageList
          ref={messageListRef}
          conversationId={conversationId}
          isAdmin={false}
          onReply={handleReply}
          onEmojiPickerOpen={handleEmojiPickerOpen}
          searchResults={null}
          optimisticMessages={optimisticMessages}
          onOptimisticClear={clearOptimistic}
          onOpenThread={handleOpenThread}
        />

        <MessageInput
          conversationId={conversationId}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          onMessageSending={handleMessageSending}
        />
      </div>

      {/* Thread sidebar */}
      {activeThread && (
        <ThreadSidebar
          parentMessage={activeThread.userName ? activeThread : undefined}
          parentMessageId={activeThread._id}
          conversationId={conversationId}
          isAdmin={false}
          onClose={() => setActiveThread(null)}
          onEmojiPickerOpen={handleEmojiPickerOpen}
        />
      )}

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
