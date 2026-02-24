"use client";

import {
  useState,
  useRef,
  useCallback,
  type DragEvent,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Paperclip,
  X,
  Image as ImageIcon,
  PaperPlaneRight,
  Eye,
  PencilSimple,
  File,
  TextB,
  TextItalic,
  TextStrikethrough,
  Code,
  CodeBlock,
  Link,
  ListBullets,
  ListNumbers,
  Quotes,
} from "@phosphor-icons/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShikiCode } from "@/components/shiki-code";

interface ForumPostEditorProps {
  channelId: Id<"channels">;
  onPostCreated: (postId: Id<"forumPosts">) => void;
  onCancel: () => void;
  editPost?: {
    postId: Id<"forumPosts">;
    title: string;
    content: string;
  };
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  setValue: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);
  const replacement = `${before}${selected || "text"}${after}`;
  const newValue = text.slice(0, start) + replacement + text.slice(end);
  setValue(newValue);
  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    textarea.focus();
    const cursorPos = selected
      ? start + replacement.length
      : start + before.length;
    const cursorEnd = selected
      ? start + replacement.length
      : start + before.length + "text".length;
    textarea.setSelectionRange(cursorPos, cursorEnd);
  });
}

function prefixLines(
  textarea: HTMLTextAreaElement,
  prefix: string,
  setValue: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  // Find the start of the first selected line
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.indexOf("\n", end);
  const selectedLines = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const prefixed = selectedLines
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
  const newValue = text.slice(0, lineStart) + prefixed + (lineEnd === -1 ? "" : text.slice(lineEnd));
  setValue(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
  });
}

export function ForumPostEditor({
  channelId,
  onPostCreated,
  onCancel,
  editPost,
}: ForumPostEditorProps) {
  const [title, setTitle] = useState(editPost?.title ?? "");
  const [content, setContent] = useState(editPost?.content ?? "");
  const [preview, setPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);

  const createPost = useMutation(api.forumPosts.createForumPost);
  const updatePost = useMutation(api.forumPosts.updateForumPost);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

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

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    if (!content.trim() && pendingFiles.length === 0) return;

    setIsSending(true);
    try {
      const attachments = pendingFiles.length > 0
        ? await uploadFiles(pendingFiles)
        : undefined;

      if (editPost) {
        await updatePost({
          postId: editPost.postId,
          title: title.trim(),
          content,
        });
        onPostCreated(editPost.postId);
      } else {
        const postId = await createPost({
          channelId,
          title: title.trim(),
          content,
          attachments,
        });
        onPostCreated(postId);
      }
    } finally {
      setIsSending(false);
    }
  }, [title, content, pendingFiles, channelId, createPost, updatePost, editPost, onPostCreated, uploadFiles]);

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

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

  const handleToolbar = useCallback(
    (action: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      switch (action) {
        case "bold":
          wrapSelection(ta, "**", "**", setContent);
          break;
        case "italic":
          wrapSelection(ta, "_", "_", setContent);
          break;
        case "strikethrough":
          wrapSelection(ta, "~~", "~~", setContent);
          break;
        case "code":
          wrapSelection(ta, "`", "`", setContent);
          break;
        case "codeblock": {
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const text = ta.value;
          const selected = text.slice(start, end);
          const replacement = `\n\`\`\`\n${selected || "code"}\n\`\`\`\n`;
          setContent(text.slice(0, start) + replacement + text.slice(end));
          requestAnimationFrame(() => {
            ta.focus();
          });
          break;
        }
        case "link":
          wrapSelection(ta, "[", "](url)", setContent);
          break;
        case "ul":
          prefixLines(ta, "- ", setContent);
          break;
        case "ol":
          prefixLines(ta, "1. ", setContent);
          break;
        case "quote":
          prefixLines(ta, "> ", setContent);
          break;
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts two spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        setContent(text.slice(0, start) + "  " + text.slice(end));
        requestAnimationFrame(() => {
          ta.setSelectionRange(start + 2, start + 2);
        });
      }
      // Cmd/Ctrl+B for bold
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        handleToolbar("bold");
      }
      // Cmd/Ctrl+I for italic
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        handleToolbar("italic");
      }
      // Cmd/Ctrl+K for link
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleToolbar("link");
      }
      // Cmd/Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleToolbar, handleSubmit]
  );

  const canSubmit = title.trim().length > 0 && (content.trim().length > 0 || pendingFiles.length > 0);

  const toolbarButtons = [
    { action: "bold", icon: TextB, title: "Bold (Ctrl+B)" },
    { action: "italic", icon: TextItalic, title: "Italic (Ctrl+I)" },
    { action: "strikethrough", icon: TextStrikethrough, title: "Strikethrough" },
    null, // separator
    { action: "code", icon: Code, title: "Inline code" },
    { action: "codeblock", icon: CodeBlock, title: "Code block" },
    { action: "link", icon: Link, title: "Link (Ctrl+K)" },
    null,
    { action: "ul", icon: ListBullets, title: "Bulleted list" },
    { action: "ol", icon: ListNumbers, title: "Numbered list" },
    { action: "quote", icon: Quotes, title: "Quote" },
  ];

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Title input */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground md:text-sm"
          autoFocus
        />
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1">
        <div className="flex items-center gap-0">
          {toolbarButtons.map((btn, i) =>
            btn === null ? (
              <div key={i} className="mx-1 h-4 w-px bg-border" />
            ) : (
              <button
                key={btn.action}
                onClick={() => handleToolbar(btn.action)}
                className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={btn.title}
              >
                <btn.icon size={14} />
              </button>
            )
          )}

          <div className="mx-1 h-4 w-px bg-border" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Attach file"
          >
            <Paperclip size={14} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPreview(!preview)}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] transition-colors ${
              preview ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {preview ? <PencilSimple size={12} /> : <Eye size={12} />}
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="flex items-center justify-center gap-2 border-b border-border px-3 py-3">
          <ImageIcon size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Drop files here</span>
        </div>
      )}

      {/* Editor / Preview */}
      <div className="flex-1 overflow-y-auto">
        {preview ? (
          <div className="prose-forum px-4 py-3 text-sm md:text-xs">
            {content.trim() ? (
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = !match && !className;
                    if (isInline) {
                      return <code className={className} {...props}>{children}</code>;
                    }
                    return (
                      <ShikiCode
                        code={String(children).replace(/\n$/, "")}
                        language={match?.[1] || "text"}
                      />
                    );
                  },
                }}
              >
                {content}
              </Markdown>
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your post content... (Markdown supported)"
            className="size-full min-h-[200px] resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground md:text-xs font-mono"
          />
        )}
      </div>

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-3 py-2">
          {pendingFiles.map((file, i) =>
            file.type.startsWith("image/") ? (
              <div
                key={`${file.name}-${i}`}
                className="group/file relative size-16 border border-border bg-muted/20 overflow-hidden"
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
            ) : (
              <div
                key={`${file.name}-${i}`}
                className="group/file flex items-center gap-1.5 border border-border bg-muted/30 px-2 py-1"
              >
                <File size={12} className="shrink-0 text-muted-foreground" />
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

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3">
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSending}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            canSubmit && !isSending
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          <PaperPlaneRight size={12} weight={canSubmit ? "fill" : "regular"} />
          {isSending ? "Posting..." : editPost ? "Save changes" : "Create post"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (!e.target.files?.length) return;
          addFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
