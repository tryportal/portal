"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Facehash } from "facehash";
import {
  At,
  BookmarkSimple,
  Hash,
  CaretRight,
  ChatCircle,
  CaretDown,
} from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface WorkspaceOverviewProps {
  slug: string;
  organizationId: Id<"organizations">;
  workspace: {
    _id: Id<"organizations">;
    name: string;
    slug: string;
    description?: string;
    logoUrl: string | null;
    role: string;
  };
}

export function WorkspaceOverview({
  slug,
  organizationId,
  workspace,
}: WorkspaceOverviewProps) {
  const mentions = useQuery(api.overview.getRecentMentions, {
    organizationId,
  });
  const savedMessages = useQuery(api.overview.getRecentSavedMessages, {
    organizationId,
  });
  const channelsData = useQuery(api.channels.getChannelsAndCategories, {
    organizationId,
  });

  const base = `/w/${slug}`;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Welcome Header */}
        <div className="flex items-center gap-4">
          {workspace.logoUrl ? (
            <img
              src={workspace.logoUrl}
              alt={workspace.name}
              className="size-14 object-cover"
            />
          ) : (
            <Facehash
              name={workspace.slug}
              size={56}
              interactive={false}
              showInitial={false}
            />
          )}
          <div>
            <h1 className="text-xl font-medium tracking-tight">
              Welcome to {workspace.name}
            </h1>
            {workspace.description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {workspace.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Separator />
        </div>

        {/* Mentions & Saved Messages Side by Side */}
        <div className="mt-8 grid grid-cols-2 gap-6">
          {/* Recent Mentions */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <At size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Mentions
                </span>
              </div>
              <Link href={`${base}/inbox`}>
                <Button variant="ghost" size="xs">
                  Show all
                  <CaretRight size={12} />
                </Button>
              </Link>
            </div>

            <div className="mt-3 flex flex-col gap-px">
              {mentions === undefined && (
                <p className="py-6 text-center text-[11px] text-muted-foreground">
                  Loading...
                </p>
              )}
              {mentions && mentions.length === 0 && (
                <div className="border border-border bg-card px-4 py-6 text-center">
                  <At
                    size={20}
                    className="mx-auto text-muted-foreground/50"
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    No mentions yet
                  </p>
                </div>
              )}
              {mentions?.map((mention) => (
                <MentionItem
                  key={mention._id}
                  mention={mention}
                  base={base}
                />
              ))}
            </div>
          </div>

          {/* Saved Messages */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkSimple
                  size={14}
                  className="text-muted-foreground"
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved Messages
                </span>
              </div>
              <Button variant="ghost" size="xs">
                Show all
                <CaretRight size={12} />
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-px">
              {savedMessages === undefined && (
                <p className="py-6 text-center text-[11px] text-muted-foreground">
                  Loading...
                </p>
              )}
              {savedMessages && savedMessages.length === 0 && (
                <div className="border border-border bg-card px-4 py-6 text-center">
                  <BookmarkSimple
                    size={20}
                    className="mx-auto text-muted-foreground/50"
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    No saved messages yet
                  </p>
                </div>
              )}
              {savedMessages?.map((saved) => (
                <SavedItem key={saved._id} saved={saved} base={base} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Separator />
        </div>

        {/* Channels List */}
        <div className="mt-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Channels
          </span>

          <div className="mt-4 flex flex-col gap-4">
            {channelsData === undefined && (
              <p className="py-6 text-center text-[11px] text-muted-foreground">
                Loading...
              </p>
            )}
            {channelsData && channelsData.length === 0 && (
              <div className="border border-border bg-card px-4 py-8 text-center">
                <Hash
                  size={20}
                  className="mx-auto text-muted-foreground/50"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  No channels yet. Create one from the sidebar.
                </p>
              </div>
            )}
            {channelsData?.map((category) => (
              <CategoryGroup
                key={category._id}
                category={category}
                base={base}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function MentionItem({
  mention,
  base,
}: {
  mention: {
    _id: Id<"messages">;
    content: string;
    createdAt: number;
    channelName: string | null;
    channelId: string | null;
    isRead: boolean;
    sender: {
      firstName: string | null;
      lastName: string | null;
      imageUrl: string | null;
    } | null;
  };
  base: string;
}) {
  const senderName = mention.sender
    ? [mention.sender.firstName, mention.sender.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown"
    : "Unknown";

  const href = mention.channelId
    ? `${base}/channels/${mention.channelName}`
    : base;

  return (
    <Link
      href={href}
      className="group flex gap-3 border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted"
    >
      {/* Avatar */}
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
          <span className="text-xs font-medium">{senderName}</span>
          {mention.channelName && (
            <span className="text-[10px] text-muted-foreground">
              in #{mention.channelName}
            </span>
          )}
          {!mention.isRead && (
            <span className="size-1.5 rounded-full bg-foreground" />
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {mention.content}
        </p>
        <span className="mt-1 block text-[10px] text-muted-foreground/60">
          {formatRelativeTime(mention.createdAt)}
        </span>
      </div>
    </Link>
  );
}

function SavedItem({
  saved,
  base,
}: {
  saved: {
    _id: Id<"messages">;
    content: string;
    createdAt: number;
    savedAt: number;
    channelName: string | null;
    channelId: Id<"channels">;
    sender: {
      firstName: string | null;
      lastName: string | null;
      imageUrl: string | null;
    } | null;
  };
  base: string;
}) {
  const senderName = saved.sender
    ? [saved.sender.firstName, saved.sender.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown"
    : "Unknown";

  const href = saved.channelName
    ? `${base}/channels/${saved.channelName}`
    : base;

  return (
    <Link
      href={href}
      className="group flex gap-3 border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted"
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
          <span className="text-xs font-medium">{senderName}</span>
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
}

function CategoryGroup({
  category,
  base,
}: {
  category: {
    _id: Id<"channelCategories">;
    name: string;
    channels: {
      _id: Id<"channels">;
      name: string;
      description?: string;
      channelType?: "chat" | "forum";
    }[];
  };
  base: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        {collapsed ? (
          <CaretRight size={12} weight="bold" />
        ) : (
          <CaretDown size={12} weight="bold" />
        )}
        <span>{category.name}</span>
        <span className="ml-1 font-normal">({category.channels.length})</span>
      </button>

      {!collapsed && (
        <div className="mt-2 flex flex-col gap-px">
          {category.channels.map((channel) => {
            const Icon = channel.channelType === "forum" ? ChatCircle : Hash;
            return (
              <Link
                key={channel._id}
                href={`${base}/channels/${channel.name}`}
                className="group flex items-center gap-2.5 border border-border bg-card px-3 py-2 transition-colors hover:bg-muted"
              >
                <Icon
                  size={14}
                  className="flex-shrink-0 text-muted-foreground"
                />
                <span className="text-xs font-medium">{channel.name}</span>
                {channel.description && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    — {channel.description}
                  </span>
                )}
              </Link>
            );
          })}
          {category.channels.length === 0 && (
            <p className="py-2 pl-5 text-[11px] text-muted-foreground">
              No channels in this category
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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
