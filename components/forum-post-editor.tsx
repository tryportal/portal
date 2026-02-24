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
} from "@phosphor-icons/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { useMentionSuggestion } from "@/components/mention-suggestion";
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

function getContentFromEditor(editor: ReturnType<typeof useEditor>): {
  text: string;
  mentions: string[];
} {
  if (!editor) return { text: "", mentions: [] };

  const mentions: string[] = [];
  let text = "";

  editor.state.doc.descendants((node) => {
    if (node.type.name === "mention") {
      const id = node.attrs.id as string;
      const label = node.attrs.label as string;
      text += `<@${id}|${label}>`;
      if (!mentions.includes(id)) mentions.push(id);
    } else if (node.isText) {
      text += node.text;
    } else if (node.type.name === "paragraph") {
      if (text.length > 0) text += "\n";
    } else if (node.type.name === "hardBreak") {
      text += "\n";
    } else if (node.type.name === "codeBlock") {
      if (text.length > 0) text += "\n";
    } else if (node.type.name === "bulletList" || node.type.name === "orderedList") {
      if (text.length > 0 && !text.endsWith("\n")) text += "\n";
    } else if (node.type.name === "listItem") {
      // handled by children
    } else if (node.type.name === "blockquote") {
      if (text.length > 0) text += "\n";
    }
  });

  return { text: text.trim(), mentions };
}

export function ForumPostEditor({
  channelId,
  onPostCreated,
  onCancel,
  editPost,
}: ForumPostEditorProps) {
  const [title, setTitle] = useState(editPost?.title ?? "");
  const [preview, setPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const createPost = useMutation(api.forumPosts.createForumPost);
  const updatePost = useMutation(api.forumPosts.updateForumPost);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

  const mentionSuggestion = useMentionSuggestion();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "code-block" } },
      }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: mentionSuggestion,
        renderText: ({ node }) => `<@${node.attrs.id}|${node.attrs.label}>`,
      }),
      Placeholder.configure({
        placeholder: "Write your post content... (Markdown supported)",
      }),
    ],
    content: editPost?.content ?? "",
    editorProps: {
      attributes: {
        class:
          "w-full min-h-[200px] max-h-[500px] overflow-y-auto resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none md:text-xs",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length > 0) {
          event.preventDefault();
          addFiles(files);
          return true;
        }
        return false;
      },
    },
    editable: true,
    immediatelyRender: false,
  });

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
    if (!editor || !title.trim()) return;

    const { text: content } = getContentFromEditor(editor);
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
          content: content || editPost.content,
        });
        onPostCreated(editPost.postId);
      } else {
        const postId = await createPost({
          channelId,
          title: title.trim(),
          content: content || "",
          attachments,
        });
        onPostCreated(postId);
      }
    } finally {
      setIsSending(false);
    }
  }, [editor, title, pendingFiles, channelId, createPost, updatePost, editPost, onPostCreated, uploadFiles]);

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

  const { text: currentContent } = editor ? getContentFromEditor(editor) : { text: "" };
  const canSubmit = title.trim().length > 0 && (currentContent.trim().length > 0 || pendingFiles.length > 0);

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
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-0.5">
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
              {currentContent}
            </Markdown>
          </div>
        ) : (
          <EditorContent editor={editor} />
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
