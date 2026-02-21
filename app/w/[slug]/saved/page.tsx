"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/components/workspace-context";
import { BookmarkSimple } from "@phosphor-icons/react";
import { DotLoader } from "@/components/ui/dot-loader";

export default function SavedMessagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const workspace = useWorkspace();
  const base = `/w/${slug}`;

  const savedMessages = useQuery(api.overview.getAllSavedMessages, {
    organizationId: workspace._id,
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-center gap-2">
          <BookmarkSimple size={16} className="text-muted-foreground" />
          <h1 className="text-sm font-medium">Saved Messages</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Messages you&apos;ve saved for later.
        </p>

        <div className="mt-6 flex flex-col">
          {savedMessages === undefined && (
            <div className="py-8">
              <DotLoader dotCount={7} dotSize={4} gap={5} />
            </div>
          )}
          {savedMessages && savedMessages.length === 0 && (
            <div className="border border-border bg-card px-4 py-10 text-center">
              <BookmarkSimple
                size={24}
                className="mx-auto text-muted-foreground/50"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                No saved messages yet. Bookmark a message to save it here.
              </p>
            </div>
          )}
          {savedMessages && savedMessages.length > 0 && (
            <div className="divide-y divide-border overflow-hidden border border-border bg-card">
              {savedMessages.map((saved) => {
                const senderName = saved.sender
                  ? [saved.sender.firstName, saved.sender.lastName]
                      .filter(Boolean)
                      .join(" ") || "Unknown"
                  : "Unknown";

                const href =
                  saved.channelName && saved.categorySlug
                    ? `${base}/c/${saved.categorySlug}/${saved.channelName}`
                    : base;

                return (
                  <Link
                    key={saved._id}
                    href={href}
                    className="group flex gap-3 px-3 py-2.5 hover:bg-muted"
                  >
                    <div className="flex-shrink-0">
                      {saved.sender?.imageUrl ? (
                        <img
                          src={saved.sender.imageUrl}
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
                        {saved.channelName && (
                          <span className="text-[10px] text-muted-foreground">
                            in #{saved.channelName}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {saved.content}
                      </p>
                      <span className="mt-1 block text-[10px] text-muted-foreground/60">
                        {formatRelativeTime(saved.createdAt)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
