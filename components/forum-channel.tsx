"use client";

import { useState, useCallback } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  ChatCircle,
  CheckCircle,
  Circle,
  XCircle,
  PushPin,
  MagnifyingGlass,
  Funnel,
  CaretDown,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ForumPostView } from "@/components/forum-post-view";
import { ForumPostEditor } from "@/components/forum-post-editor";
import { DotLoader } from "@/components/ui/dot-loader";
import Image from "next/image";

type ForumView = "list" | "create" | "view" | "edit";
type StatusFilter = "all" | "open" | "closed" | "solved";

interface ForumChannelProps {
  channel: {
    _id: Id<"channels">;
    name: string;
    categoryName: string;
    role: string;
    isMuted: boolean;
    organizationId: Id<"organizations">;
    permissions: "open" | "readOnly";
    description?: string;
    channelType?: "chat" | "forum";
    forumSettings?: { whoCanPost: "everyone" | "admins" };
  };
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

const filterLabels: Record<StatusFilter, string> = {
  all: "All posts",
  open: "Open",
  solved: "Solved",
  closed: "Closed",
};

export function ForumChannel({ channel }: ForumChannelProps) {
  const [view, setView] = useState<ForumView>("list");
  const [activePostId, setActivePostId] = useState<Id<"forumPosts"> | null>(null);
  const [editPost, setEditPost] = useState<{ postId: Id<"forumPosts">; title: string; content: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = channel.role === "admin";
  const canPost =
    channel.forumSettings?.whoCanPost === "admins"
      ? isAdmin
      : channel.permissions !== "readOnly" || isAdmin;

  const {
    results: posts,
    status: postsStatus,
    loadMore,
  } = usePaginatedQuery(
    api.forumPosts.getForumPosts,
    {
      channelId: channel._id,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { initialNumItems: 25 }
  );

  const filteredPosts = searchQuery.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  // Sort: pinned first, then by lastActivityAt
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0; // Already sorted by lastActivityAt from query
  });

  const handleViewPost = useCallback((postId: Id<"forumPosts">) => {
    setActivePostId(postId);
    setView("view");
  }, []);

  const handlePostCreated = useCallback((postId: Id<"forumPosts">) => {
    setActivePostId(postId);
    setView("view");
    setEditPost(null);
  }, []);

  const handleBackToList = useCallback(() => {
    setView("list");
    setActivePostId(null);
    setEditPost(null);
  }, []);

  const handleEditPost = useCallback(() => {
    if (!activePostId) return;
    const post = posts.find((p) => p._id === activePostId);
    if (post) {
      setEditPost({ postId: post._id, title: post.title, content: post.content });
      setView("edit");
    }
  }, [activePostId, posts]);

  // Show the post view
  if (view === "view" && activePostId) {
    return (
      <div className="flex h-full flex-col">
        <ForumPostView
          postId={activePostId}
          channelId={channel._id}
          onBack={handleBackToList}
          onEdit={handleEditPost}
        />
      </div>
    );
  }

  // Show the post editor (create or edit)
  if (view === "create" || view === "edit") {
    return (
      <div className="flex h-full flex-col">
        {/* Editor header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3 md:px-4">
          <div className="flex items-center gap-1.5">
            <ChatCircle size={14} weight="bold" className="text-muted-foreground" />
            <span className="text-xs font-semibold">
              {editPost ? "Edit post" : "New post"}
            </span>
          </div>
        </div>
        <ForumPostEditor
          channelId={channel._id}
          onPostCreated={handlePostCreated}
          onCancel={handleBackToList}
          editPost={editPost ?? undefined}
        />
      </div>
    );
  }

  // Post list view
  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <ChatCircle size={14} weight="bold" className="shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-semibold">{channel.name}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Search */}
          <div className="hidden md:flex h-7 items-center border border-border bg-background">
            <MagnifyingGlass size={12} className="ml-2 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="h-full w-36 bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-7 items-center gap-1 border border-border px-2 text-xs text-muted-foreground hover:text-foreground outline-none cursor-pointer transition-colors">
              <Funnel size={12} />
              <span className="hidden md:inline">{filterLabels[statusFilter]}</span>
              <CaretDown size={10} />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" sideOffset={4} align="end">
              {(Object.entries(filterLabels) as [StatusFilter, string][]).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={statusFilter === key ? "bg-muted" : ""}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {canPost && (
            <button
              onClick={() => setView("create")}
              className="flex h-7 items-center gap-1 bg-foreground px-2.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              <Plus size={12} weight="bold" />
              <span className="hidden md:inline">New post</span>
            </button>
          )}
        </div>
      </div>

      {/* Post list */}
      <div className="flex-1 overflow-y-auto">
        {postsStatus === "LoadingFirstPage" ? (
          <div className="flex items-center justify-center py-16">
            <DotLoader />
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ChatCircle size={32} weight="light" className="text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery.trim()
                ? "No posts match your search"
                : statusFilter !== "all"
                  ? `No ${statusFilter} posts yet`
                  : "No posts yet"}
            </p>
            {canPost && !searchQuery.trim() && statusFilter === "all" && (
              <button
                onClick={() => setView("create")}
                className="mt-3 flex items-center gap-1.5 bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors"
              >
                <Plus size={12} weight="bold" />
                Create the first post
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedPosts.map((post) => {
              const status = statusConfig[post.status];
              return (
                <button
                  key={post._id}
                  onClick={() => handleViewPost(post._id)}
                  className="group flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors md:px-6"
                >
                  {/* Author avatar */}
                  {post.authorImageUrl ? (
                    <Image
                      src={post.authorImageUrl}
                      alt={post.authorName}
                      width={28}
                      height={28}
                      className="size-7 shrink-0 object-cover mt-0.5"
                    />
                  ) : (
                    <div className="flex size-7 shrink-0 items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground mt-0.5">
                      {post.authorName[0]?.toUpperCase()}
                    </div>
                  )}

                  {/* Post info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {post.isPinned && (
                        <PushPin size={10} weight="fill" className="shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate text-xs font-semibold group-hover:text-foreground">
                        {post.title}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {post.authorName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {timeAgo(post.lastActivityAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground/70">
                      {post.content.slice(0, 150)}
                    </p>
                  </div>

                  {/* Right side: status + comment count */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5 mt-0.5">
                    <div className={`flex items-center gap-1 border px-1.5 py-0.5 ${status.className}`}>
                      <status.icon size={10} weight="fill" />
                      <span className="text-[10px] font-medium">{status.label}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ChatCircle size={10} />
                      <span className="text-[10px]">{post.commentCount}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            {postsStatus === "CanLoadMore" && (
              <button
                onClick={() => loadMore(25)}
                className="w-full py-3 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Load more posts
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
