"use client";

import { use, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/components/workspace-context";
import { At, ChatCircle, Tray, X } from "@phosphor-icons/react";
import { DotLoader } from "@/components/ui/dot-loader";

export default function InboxPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const workspace = useWorkspace();
  const base = `/w/${slug}`;

  const mentions = useQuery(api.overview.getAllMentions, {
    organizationId: workspace._id,
  });

  const conversations = useQuery(api.conversations.listConversations);
  const unreadDMs = conversations?.filter((c) => c.hasUnread) ?? [];

  const markAllRead = useMutation(api.overview.markAllMentionsRead);
  const clearAll = useMutation(api.overview.clearAllNotifications);

  // Auto-mark all mentions as read on mount
  const hasMarkedRead = useRef(false);
  useEffect(() => {
    if (mentions && !hasMarkedRead.current) {
      const hasUnread = mentions.some((m) => !m.isRead);
      if (hasUnread) {
        hasMarkedRead.current = true;
        markAllRead({ organizationId: workspace._id });
      }
    }
  }, [mentions, markAllRead, workspace._id]);

  const isLoading = mentions === undefined || conversations === undefined;
  const isEmpty =
    !isLoading && mentions.length === 0 && unreadDMs.length === 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tray size={16} className="text-muted-foreground" />
            <h1 className="text-sm font-medium">Inbox</h1>
          </div>
          {!isEmpty && !isLoading && (
            <button
              onClick={() => clearAll({ organizationId: workspace._id })}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
              Clear all
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Messages and mentions across this workspace.
        </p>

        {isLoading && (
          <div className="py-8">
            <DotLoader dotCount={7} dotSize={4} gap={5} />
          </div>
        )}

        {isEmpty && (
          <div className="mt-6 border border-border bg-card px-4 py-10 text-center">
            <Tray size={24} className="mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">
              You&apos;re all caught up. No new messages or mentions.
            </p>
          </div>
        )}

        {!isLoading && !isEmpty && (
          <div className="mt-6 flex flex-col gap-6">
            {/* Unread DMs */}
            {unreadDMs.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 pb-2">
                  <ChatCircle
                    size={12}
                    className="text-muted-foreground/60"
                  />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Messages
                  </span>
                </div>
                <div className="divide-y divide-border overflow-hidden border border-border bg-card">
                  {unreadDMs.map((conv) => {
                    const name = conv.otherUser
                      ? [conv.otherUser.firstName, conv.otherUser.lastName]
                          .filter(Boolean)
                          .join(" ") || "Unknown"
                      : "Unknown";

                    return (
                      <Link
                        key={conv._id}
                        href={`/chat/${conv._id}`}
                        className="group flex gap-3 px-3 py-2.5 hover:bg-muted"
                      >
                        <div className="flex-shrink-0">
                          {conv.otherUser?.imageUrl ? (
                            <img
                              src={conv.otherUser.imageUrl}
                              alt={name}
                              className="size-7 object-cover"
                            />
                          ) : (
                            <div className="flex size-7 items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{name}</span>
                            <span className="size-1.5 rounded-full bg-foreground" />
                          </div>
                          {conv.lastMessagePreview && (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {conv.lastMessagePreview}
                            </p>
                          )}
                          <span className="mt-1 block text-[10px] text-muted-foreground/60">
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mentions */}
            {mentions.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 pb-2">
                  <At size={12} className="text-muted-foreground/60" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Mentions
                  </span>
                </div>
                <div className="divide-y divide-border overflow-hidden border border-border bg-card">
                  {mentions.map((mention) => {
                    const senderName = mention.sender
                      ? [mention.sender.firstName, mention.sender.lastName]
                          .filter(Boolean)
                          .join(" ") || "Unknown"
                      : "Unknown";

                    const href =
                      mention.channelId &&
                      mention.channelName &&
                      mention.categorySlug
                        ? `${base}/c/${mention.categorySlug}/${mention.channelName}`
                        : base;

                    return (
                      <Link
                        key={mention._id}
                        href={href}
                        className="group flex gap-3 px-3 py-2.5 hover:bg-muted"
                      >
                        <div className="flex-shrink-0">
                          {mention.sender?.imageUrl ? (
                            <img
                              src={mention.sender.imageUrl}
                              alt={senderName}
                              className="size-7 object-cover"
                            />
                          ) : (
                            <div className="flex size-7 items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
                              {senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {senderName}
                            </span>
                            {mention.channelName && (
                              <span className="text-[10px] text-muted-foreground">
                                in #{mention.channelName}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {stripMentions(mention.content)}
                          </p>
                          <span className="mt-1 block text-[10px] text-muted-foreground/60">
                            {formatRelativeTime(mention.createdAt)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function stripMentions(content: string): string {
  return content.replace(/<@[^|>]+\|([^>]+)>/g, "@$1");
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
