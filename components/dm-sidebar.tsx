"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Plus, MagnifyingGlass } from "@phosphor-icons/react";
import { DotLoader } from "@/components/ui/dot-loader";
import { NewDmDialog } from "@/components/new-dm-dialog";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export function DmSidebar() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const conversations = useQuery(api.conversations.listConversations);

  const filtered = conversations?.filter((conv) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = [conv.otherUser?.firstName, conv.otherUser?.lastName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return name.includes(s);
  });

  return (
    <>
      <aside className="flex h-full w-full flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="text-xs font-semibold">Messages</span>
          <button
            onClick={() => setComposeOpen(true)}
            className="flex size-6 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="New message"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-2 pb-2">
          <div className="flex h-7 items-center border border-border bg-background text-xs">
            <span className="flex h-full items-center px-2 text-muted-foreground">
              <MagnifyingGlass size={12} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="h-full flex-1 bg-transparent pr-2 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto pl-2">
          {conversations === undefined && (
            <div className="flex justify-center py-4">
              <DotLoader dotCount={3} dotSize={3} gap={3} duration={1000} />
            </div>
          )}

          {filtered?.length === 0 && conversations !== undefined && (
            <div className="px-2 py-4 text-center">
              <p className="text-[11px] text-muted-foreground">
                {search.trim() ? "No conversations found" : "No conversations yet"}
              </p>
            </div>
          )}

          {filtered?.map((conv) => {
            const isActive = pathname === `/chat/${conv._id}`;
            const displayName = conv.otherUser
              ? [conv.otherUser.firstName, conv.otherUser.lastName]
                  .filter(Boolean)
                  .join(" ") || "Unknown"
              : "Unknown";
            const initials = conv.otherUser
              ? (conv.otherUser.firstName?.[0] ?? "?").toUpperCase()
              : "?";

            return (
              <Link
                key={conv._id}
                href={`/chat/${conv._id}`}
                className={`flex items-center gap-2.5 rounded-l-[6px] border-r-[3px] px-2.5 py-1.5 text-xs ${
                  isActive
                    ? "border-foreground/30 bg-muted font-medium text-sidebar-foreground"
                    : "border-transparent text-sidebar-foreground/60 hover:bg-muted hover:text-sidebar-foreground"
                }`}
              >
                {/* Avatar */}
                {conv.otherUser?.imageUrl ? (
                  <img
                    src={conv.otherUser.imageUrl}
                    alt=""
                    className="size-7 shrink-0 object-cover"
                  />
                ) : (
                  <div className="flex size-7 shrink-0 items-center justify-center bg-muted text-[10px] font-medium">
                    {initials}
                  </div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-medium">
                      {displayName}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatRelativeTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  {conv.lastMessagePreview && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {conv.lastMessagePreview}
                    </p>
                  )}
                </div>

                {/* Unread dot */}
                {conv.hasUnread && (
                  <div className="size-1.5 shrink-0 rounded-full bg-foreground" />
                )}
              </Link>
            );
          })}
        </div>
      </aside>

      <NewDmDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </>
  );
}
