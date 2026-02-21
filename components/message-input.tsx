"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type DragEvent,
  type ClipboardEvent,
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
  Image as ImageIcon,
} from "@phosphor-icons/react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { MessageData } from "@/components/message-item";

export interface PendingMessageAttachment {
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface PendingMessage {
  id: string;
  content: string;
  parentMessageId?: Id<"messages">;
  replyTo: MessageData | null;
  attachments?: PendingMessageAttachment[];
}

interface MessageInputProps {
  channelId: Id<"channels">;
  replyTo: MessageData | null;
  onCancelReply: () => void;
  onMessageSending?: (pending: PendingMessage) => void;
}

export function MessageInput({
  channelId,
  replyTo,
  onCancelReply,
  onMessageSending,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const dragCounterRef = useRef(0);

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

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const attachments: {
        storageId: Id<"_storage">;
        name: string;
        size: number;
        type: string;
      }[] = [];

      for (const file of files) {
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

      return attachments;
    },
    [generateUploadUrl]
  );

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    const hasFiles = pendingFiles.length > 0;
    if ((!trimmed && !hasFiles) || isSending) return;

    const filesToUpload = [...pendingFiles];

    // Create preview URLs for optimistic display
    const optimisticAttachments = filesToUpload.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl:
        file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : undefined,
    }));

    // Clear input immediately for instant feedback
    const pendingId = `pending-${Date.now()}`;
    setContent("");
    setPendingFiles([]);
    onCancelReply();

    onMessageSending?.({
      id: pendingId,
      content: trimmed || (hasFiles ? `Sent ${filesToUpload.length} file${filesToUpload.length > 1 ? "s" : ""}` : ""),
      parentMessageId: replyTo?._id,
      replyTo,
      attachments: hasFiles ? optimisticAttachments : undefined,
    });

    setIsSending(true);
    try {
      const attachments = hasFiles ? await uploadFiles(filesToUpload) : undefined;
      await sendMessage({
        channelId,
        content: trimmed || `Sent ${filesToUpload.length} file${filesToUpload.length > 1 ? "s" : ""}`,
        attachments,
        parentMessageId: replyTo?._id,
      });
    } finally {
      setIsSending(false);
      // Revoke preview URLs
      for (const att of optimisticAttachments) {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      }
    }
  }, [content, pendingFiles, isSending, sendMessage, channelId, replyTo, onCancelReply, onMessageSending, uploadFiles]);

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

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setPendingFiles((prev) => [...prev, ...files]);
    textareaRef.current?.focus();
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFileAttach = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      if (!input.files?.length) return;
      addFiles(Array.from(input.files));
    };
    input.click();
  }, [addFiles]);

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.clipboardData.files);
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles]
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      addFiles(files);
    },
    [addFiles]
  );

  const canSend = content.trim() || pendingFiles.length > 0;

  return (
    <div
      className="relative shrink-0 px-3 pb-3 md:px-4 md:pb-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`border bg-background transition-colors ${isDragging ? "border-foreground/40 bg-foreground/[0.02]" : "border-border"}`}>
        {/* Drag overlay */}
        {isDragging && (
          <div className="flex items-center justify-center gap-2 px-3 py-3 border-b border-border">
            <ImageIcon size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Drop files here</span>
          </div>
        )}

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

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-2.5">
            {pendingFiles.map((file, i) =>
              file.type.startsWith("image/") ? (
                <div
                  key={`${file.name}-${i}`}
                  className="group/file relative size-20 border border-border bg-muted/20 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="size-full object-cover"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                  <button
                    onClick={() => removePendingFile(i)}
                    className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : file.type.startsWith("video/") ? (
                <div
                  key={`${file.name}-${i}`}
                  className="group/file relative size-20 border border-border bg-black overflow-hidden"
                >
                  <video
                    src={URL.createObjectURL(file)}
                    className="size-full object-cover"
                    muted
                    onLoadedData={(e) => URL.revokeObjectURL((e.target as HTMLVideoElement).src)}
                  />
                  <button
                    onClick={() => removePendingFile(i)}
                    className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={10} />
                  </button>
                  <div className="absolute bottom-0.5 left-0.5 px-1 py-px bg-black/60 text-[8px] text-white">
                    VIDEO
                  </div>
                </div>
              ) : (
                <div
                  key={`${file.name}-${i}`}
                  className="group/file flex items-center gap-1.5 border border-border bg-muted/30 px-2 py-1"
                >
                  <Paperclip size={12} className="shrink-0 text-muted-foreground" />
                  <span className="text-[11px] truncate max-w-32">{file.name}</span>
                  <button
                    onClick={() => removePendingFile(i)}
                    className="flex size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Send a message..."
          className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground md:text-xs"
          rows={1}
          style={{ maxHeight: 160 }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-1 pb-1 md:px-1.5 md:pb-1.5">
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleFileAttach}
              className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:size-7"
              title="Attach file"
            >
              <Paperclip size={18} className="md:size-4" />
            </button>
            <button
              ref={emojiButtonRef}
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:size-7"
              title="Emoji"
            >
              <Smiley size={18} className="md:size-4" />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend || isSending}
            className={`flex size-9 items-center justify-center transition-colors md:size-7 ${
              canSend
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground/30 cursor-default"
            }`}
            title="Send message"
          >
            <PaperPlaneRight
              size={18}
              weight={canSend ? "fill" : "regular"}
              className="md:size-4"
            />
          </button>
        </div>
      </div>

      {/* Emoji picker popup */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-0 right-0 z-50 mb-2 flex justify-center md:left-4 md:right-auto md:justify-start"
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
