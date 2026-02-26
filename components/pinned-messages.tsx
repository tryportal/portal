"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PushPin } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DotLoader } from "@/components/ui/dot-loader";

interface PinnedMessagesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: Id<"channels">;
  channelName: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PinnedMessages({
  open,
  onOpenChange,
  channelId,
  channelName,
}: PinnedMessagesProps) {
  const pinned = useQuery(
    api.messages.getPinnedMessages,
    open ? { channelId } : "skip"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PushPin size={14} />
            Pinned messages
          </DialogTitle>
          <DialogDescription>
            Pinned messages in #{channelName}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto">
          {pinned === undefined && (
            <div className="flex justify-center py-6">
              <DotLoader />
            </div>
          )}

          {pinned && pinned.length === 0 && (
            <div className="py-8 text-center">
              <PushPin
                size={24}
                className="mx-auto text-muted-foreground/40"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                No pinned messages yet
              </p>
            </div>
          )}

          {pinned && pinned.length > 0 && (
            <div className="flex flex-col gap-px">
              {pinned.map((msg) => (
                <div
                  key={msg._id}
                  className="flex gap-3 border border-border bg-card px-3 py-2.5"
                >
                  <div className="w-7 shrink-0">
                    {msg.userImageUrl ? (
                      <Image
                        src={msg.userImageUrl}
                        alt={msg.userName}
                        width={28}
                        height={28}
                        className="size-7 object-cover"
                      />
                    ) : (
                      <div className="flex size-7 items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
                        {msg.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold">
                        {msg.userName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className="prose-chat mt-0.5 text-xs leading-relaxed text-foreground/90 [&_p]:my-0">
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </Markdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
