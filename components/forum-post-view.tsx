"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  DotsThree,
  PushPin,
  CheckCircle,
  Circle,
  XCircle,
  Trash,
  PencilSimple,
  Paperclip,
  PaperPlaneRight,
  X,
  File,
  ChatCircle,
  DownloadSimple,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShikiCode } from "@/components/shiki-code";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { useMentionSuggestion } from "@/components/mention-suggestion";
import { DotLoader } from "@/components/ui/dot-loader";
import Image from "next/image";

interface ForumPostViewProps {
  postId: Id<"forumPosts">;
  channelId: Id<"channels">;
  onBack: () => void;
  onEdit: () => void;
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
    }
  });

  return { text: text.trim(), mentions };
}

function preprocessMentions(content: string): string {
  return content.replace(/<@([^|]+)\|([^>]+)>/g, "**@$2**");
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: days > 365 ? "numeric" : undefined,
  });
}

const statusConfig = {
  open: { label: "Open", icon: Circle, className: "text-blue-600 bg-blue-50 border-blue-200" },
  solved: { label: "Solved", icon: CheckCircle, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  closed: { label: "Closed", icon: XCircle, className: "text-stone-500 bg-stone-50 border-stone-200" },
};

type Attachment = {
  storageId: string;
  name: string;
  size: number;
  type: string;
  url?: string | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageLightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex size-8 items-center justify-center text-white/70 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="max-h-[85vh] max-w-[90vw] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  const [lightboxSrc, setLightboxSrc] = useState<{ src: string; name: string } | null>(null);

  const images = attachments.filter((a) => a.type.startsWith("image/"));
  const videos = attachments.filter((a) => a.type.startsWith("video/"));
  const files = attachments.filter((a) => !a.type.startsWith("image/") && !a.type.startsWith("video/"));

  const handleDownload = async (att: Attachment) => {
    if (!att.url) return;
    const response = await fetch(att.url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc.src} name={lightboxSrc.name} onClose={() => setLightboxSrc(null)} />
      )}
      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((att, i) =>
            att.url ? (
              <button
                key={i}
                onClick={() => setLightboxSrc({ src: att.url!, name: att.name })}
                className="block overflow-hidden border border-border hover:border-foreground/20 transition-colors cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.url}
                  alt={att.name}
                  className="max-h-60 max-w-full object-contain bg-muted/20 md:max-w-72"
                  loading="lazy"
                />
              </button>
            ) : null
          )}
        </div>
      )}
      {videos.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {videos.map((att, i) =>
            att.url ? (
              <div key={i} className="max-w-full overflow-hidden border border-border md:max-w-96">
                <video src={att.url} controls preload="metadata" className="max-h-72 w-full bg-black">
                  <track kind="captions" />
                </video>
              </div>
            ) : null
          )}
        </div>
      )}
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((att, i) => (
            <div key={i} className="flex items-center gap-2.5 border border-border bg-muted/30 px-3 py-2">
              <File size={14} className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium truncate block max-w-48">{att.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</span>
              </div>
              {att.url && (
                <button
                  onClick={() => handleDownload(att)}
                  className="flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Download"
                >
                  <DownloadSimple size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ForumPostView({
  postId,
  channelId,
  onBack,
  onEdit,
}: ForumPostViewProps) {
  const post = useQuery(api.forumPosts.getForumPost, { postId });
  const {
    results: comments,
    status: commentsStatus,
    loadMore,
  } = usePaginatedQuery(
    api.forumPosts.getForumComments,
    { postId },
    { initialNumItems: 50 }
  );

  const deletePost = useMutation(api.forumPosts.deleteForumPost);
  const updateStatus = useMutation(api.forumPosts.updatePostStatus);
  const togglePin = useMutation(api.forumPosts.togglePinPost);
  const markSolved = useMutation(api.forumPosts.markSolvedComment);
  const sendComment = useMutation(api.forumPosts.sendForumComment);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const [isSending, setIsSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mentionSuggestion = useMentionSuggestion(channelId);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: mentionSuggestion,
        renderText: ({ node }) => `<@${node.attrs.id}|${node.attrs.label}>`,
      }),
      Placeholder.configure({
        placeholder: "Write a comment...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm leading-relaxed outline-none md:text-xs min-h-[36px] max-h-[120px] overflow-y-auto",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          const mentionPopup = document.querySelector("[data-tippy-root]");
          if (mentionPopup) return false;
          event.preventDefault();
          handleSendRef.current();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length > 0) {
          event.preventDefault();
          setPendingFiles((prev) => [...prev, ...files]);
          return true;
        }
        return false;
      },
    },
    editable: true,
    immediatelyRender: false,
  });

  const handleSendRef = useRef<() => void>(() => {});

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
        attachments.push({ storageId, name: file.name, size: file.size, type: file.type });
      }
      return attachments;
    },
    [generateUploadUrl]
  );

  const handleSendComment = useCallback(async () => {
    if (!editor || isSending) return;
    const { text: content, mentions } = getContentFromEditor(editor);
    if (!content.trim() && pendingFiles.length === 0) return;

    setIsSending(true);
    try {
      const attachments = pendingFiles.length > 0 ? await uploadFiles(pendingFiles) : undefined;
      await sendComment({
        postId,
        content: content || `Sent ${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""}`,
        attachments,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      editor.commands.clearContent();
      setPendingFiles([]);
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } finally {
      setIsSending(false);
    }
  }, [editor, isSending, pendingFiles, postId, sendComment, uploadFiles]);

  handleSendRef.current = handleSendComment;

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this post and all comments?")) return;
    await deletePost({ postId });
    onBack();
  }, [deletePost, postId, onBack]);

  if (post === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <DotLoader />
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium">Post not found</p>
          <button onClick={onBack} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[post.status];
  const canManage = post.isOwn || post.isAdmin;
  const hasContent = editor ? !editor.isEmpty : false;
  const canSend = hasContent || pendingFiles.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 md:px-4">
        <button
          onClick={onBack}
          className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {post.isPinned && <PushPin size={12} weight="fill" className="shrink-0 text-muted-foreground" />}
          <div className={`flex items-center gap-1 border px-1.5 py-0.5 ${statusInfo.className}`}>
            <statusInfo.icon size={10} weight="fill" />
            <span className="text-[10px] font-medium">{statusInfo.label}</span>
          </div>
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground outline-none cursor-pointer transition-colors">
              <DotsThree size={16} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" sideOffset={4} align="end">
              {post.isOwn && (
                <DropdownMenuItem onClick={onEdit}>
                  <PencilSimple size={14} />
                  Edit post
                </DropdownMenuItem>
              )}
              {post.isAdmin && (
                <DropdownMenuItem onClick={() => togglePin({ postId })}>
                  <PushPin size={14} />
                  {post.isPinned ? "Unpin post" : "Pin post"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {post.status !== "open" && (
                <DropdownMenuItem onClick={() => updateStatus({ postId, status: "open" })}>
                  <Circle size={14} />
                  Reopen
                </DropdownMenuItem>
              )}
              {post.status !== "closed" && (
                <DropdownMenuItem onClick={() => updateStatus({ postId, status: "closed" })}>
                  <XCircle size={14} />
                  Close
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                <Trash size={14} />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Post content */}
        <div className="border-b border-border px-4 py-4 md:px-6">
          <h1 className="text-base font-bold md:text-sm">{post.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            {post.authorImageUrl ? (
              <Image
                src={post.authorImageUrl}
                alt={post.authorName}
                width={20}
                height={20}
                className="size-5 object-cover"
              />
            ) : (
              <div className="flex size-5 items-center justify-center bg-muted text-[9px] font-medium text-muted-foreground">
                {post.authorName[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium">{post.authorName}</span>
            <span className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
          </div>

          <div className="prose-forum mt-4 text-sm md:text-xs">
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
              {preprocessMentions(post.content)}
            </Markdown>
          </div>

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <AttachmentList attachments={post.attachments} />
          )}
        </div>

        {/* Comments section */}
        <div className="px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 mb-3">
            <ChatCircle size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">
              {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
            </span>
          </div>

          {commentsStatus === "LoadingFirstPage" ? (
            <div className="flex justify-center py-6">
              <DotLoader />
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {comments.map((comment) => {
                const isSolvedComment = post.solvedCommentId === comment._id;
                return (
                  <div
                    key={comment._id}
                    className={`group/comment relative border-l-2 py-3 pl-4 pr-2 ${
                      isSolvedComment
                        ? "border-l-emerald-500 bg-emerald-50/50"
                        : "border-l-transparent hover:border-l-border"
                    }`}
                  >
                    {isSolvedComment && (
                      <div className="mb-2 flex items-center gap-1 text-emerald-600">
                        <CheckCircle size={12} weight="fill" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Accepted answer</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      {comment.userImageUrl ? (
                        <Image
                          src={comment.userImageUrl}
                          alt={comment.userName}
                          width={20}
                          height={20}
                          className="size-5 shrink-0 object-cover mt-0.5"
                        />
                      ) : (
                        <div className="flex size-5 shrink-0 items-center justify-center bg-muted text-[9px] font-medium text-muted-foreground mt-0.5">
                          {comment.userName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{comment.userName}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <div className="prose-chat mt-1 text-sm md:text-xs">
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
                            {preprocessMentions(comment.content)}
                          </Markdown>
                        </div>

                        {/* Comment attachments */}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <AttachmentList attachments={comment.attachments} />
                        )}
                      </div>

                      {/* Comment actions */}
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                        {canManage && !isSolvedComment && (
                          <button
                            onClick={() => markSolved({ postId, commentId: comment._id })}
                            className="flex size-6 items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors"
                            title="Mark as solution"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {canManage && isSolvedComment && (
                          <button
                            onClick={() => markSolved({ postId, commentId: comment._id })}
                            className="flex size-6 items-center justify-center text-emerald-600 hover:text-muted-foreground transition-colors"
                            title="Unmark solution"
                          >
                            <CheckCircle size={14} weight="fill" />
                          </button>
                        )}
                        {(comment.isOwn || (post.isAdmin)) && (
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this comment?")) return;
                              await deleteMessage({ messageId: comment._id });
                            }}
                            className="flex size-6 items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete comment"
                          >
                            <Trash size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {commentsStatus === "CanLoadMore" && (
                <button
                  onClick={() => loadMore(50)}
                  className="w-full py-2 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Load more comments
                </button>
              )}

              <div ref={commentsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Comment input */}
      <div className="shrink-0 px-3 pb-3 md:px-4 md:pb-4">
        {/* Pending files */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {pendingFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-1.5 border border-border bg-muted/30 px-2 py-1"
              >
                <Paperclip size={12} className="shrink-0 text-muted-foreground" />
                <span className="text-[11px] truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border border-border bg-background">
          <EditorContent editor={editor} />

          <div className="flex items-center justify-between px-1 pb-1 md:px-1.5 md:pb-1.5">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:size-7"
                title="Attach file"
              >
                <Paperclip size={18} className="md:size-4" />
              </button>
            </div>
            <button
              onClick={handleSendComment}
              disabled={!canSend || isSending}
              className={`flex size-9 items-center justify-center transition-colors md:size-7 ${
                canSend
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground/30 cursor-default"
              }`}
              title="Send comment"
            >
              <PaperPlaneRight
                size={18}
                weight={canSend ? "fill" : "regular"}
                className="md:size-4"
              />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (!e.target.files?.length) return;
            setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
