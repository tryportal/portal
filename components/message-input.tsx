"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Paperclip,
  Smiley,
  PaperPlaneRight,
  X,
  ArrowBendUpLeft,
} from "@phosphor-icons/react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { MessageData } from "@/components/message-item";

interface MessageInputProps {
  channelId: Id<"channels">;
  replyTo: MessageData | null;
  onCancelReply: () => void;
}

export function MessageInput({
  channelId,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const sendMessage = useMutation(api.messages.sendMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [content]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  // Focus textarea when reply changes
  useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus();
    }
  }, [replyTo]);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({
        channelId,
        content: trimmed,
        parentMessageId: replyTo?._id,
      });
      setContent("");
      onCancelReply();
    } finally {
      setIsSending(false);
    }
  }, [content, isSending, sendMessage, channelId, replyTo, onCancelReply]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleEmojiSelect = useCallback(
    (emoji: { native: string }) => {
      setContent((prev) => prev + emoji.native);
      setShowEmojiPicker(false);
      textareaRef.current?.focus();
    },
    []
  );

  const handleFileAttach = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files?.length) return;

      const attachments: {
        storageId: Id<"_storage">;
        name: string;
        size: number;
        type: string;
      }[] = [];

      for (const file of Array.from(input.files)) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        attachments.push({
          storageId,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }

      if (attachments.length > 0) {
        await sendMessage({
          channelId,
          content:
            content.trim() ||
            `Sent ${attachments.length} file${attachments.length > 1 ? "s" : ""}`,
          attachments,
          parentMessageId: replyTo?._id,
        });
        setContent("");
        onCancelReply();
      }
    };
    input.click();
  }, [
    generateUploadUrl,
    sendMessage,
    channelId,
    content,
    replyTo,
    onCancelReply,
  ]);

  return (
    <div className="shrink-0 px-4 pb-4">
      <div className="border border-border bg-background">
        {/* Reply banner */}
        {replyTo && (
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <ArrowBendUpLeft
              size={12}
              className="shrink-0 text-muted-foreground"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-muted-foreground">
                Replying to{" "}
                <span className="font-medium text-foreground">
                  {replyTo.userName}
                </span>
              </span>
              <p className="truncate text-[11px] text-muted-foreground/70">
                {replyTo.content.slice(0, 120)}
                {replyTo.content.length > 120 ? "..." : ""}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-xs leading-relaxed outline-none placeholder:text-muted-foreground"
          rows={1}
          style={{ maxHeight: 160 }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleFileAttach}
              className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Attach file"
            >
              <Paperclip size={16} />
            </button>
            <button
              ref={emojiButtonRef}
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Emoji"
            >
              <Smiley size={16} />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!content.trim() || isSending}
            className={`flex size-7 items-center justify-center transition-colors ${
              content.trim()
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground/30 cursor-default"
            }`}
            title="Send message"
          >
            <PaperPlaneRight
              size={16}
              weight={content.trim() ? "fill" : "regular"}
            />
          </button>
        </div>
      </div>

      {/* Emoji picker popup */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-4 mb-2 z-50"
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
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
