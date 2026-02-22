"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { ChatCircle } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DotLoader } from "@/components/ui/dot-loader";

interface ThreadsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: Id<"channels">;
  channelName: string;
  onSelectThread: (threadId: Id<"messages">) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function ThreadsList({
  open,
  onOpenChange,
  channelId,
  channelName,
  onSelectThread,
}: ThreadsListProps) {
  const threads = useQuery(
    api.messages.getChannelThreads,
    open ? { channelId } : "skip"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChatCircle size={14} />
            Threads
          </DialogTitle>
          <DialogDescription>
            Active threads in #{channelName}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto">
          {threads === undefined && (
            <div className="flex justify-center py-6">
              <DotLoader />
            </div>
          )}

          {threads && threads.length === 0 && (
            <div className="py-8 text-center">
              <ChatCircle
                size={24}
                className="mx-auto text-muted-foreground/40"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                No threads yet
              </p>
            </div>
          )}

          {threads && threads.length > 0 && (
            <div className="flex flex-col gap-px">
              {threads.map((thread) => (
                <button
                  key={thread._id}
                  onClick={() => {
                    onSelectThread(thread._id);
                    onOpenChange(false);
                  }}
                  className="flex gap-3 border border-border bg-card px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="w-7 shrink-0">
                    {thread.userImageUrl ? (
                      <Image
                        src={thread.userImageUrl}
                        alt={thread.userName}
                        width={28}
                        height={28}
                        className="size-7 object-cover"
                      />
                    ) : (
                      <div className="flex size-7 items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
                        {thread.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold truncate">
                        {thread.userName}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeTime(thread.lastReplyAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-foreground/80">
                      {thread.content.slice(0, 100)}
                      {thread.content.length > 100 ? "..." : ""}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ChatCircle size={10} />
                      {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
