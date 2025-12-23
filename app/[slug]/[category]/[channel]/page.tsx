"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { CircleNotchIcon, HashIcon } from "@phosphor-icons/react";
import { getIconComponent } from "@/components/icon-picker";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; category: string; channel: string }>;
}) {
  const router = useRouter();
  const [routeParams, setRouteParams] = React.useState<{
    slug: string;
    category: string;
    channel: string;
  } | null>(null);

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setRouteParams(resolved));
    } else {
      setRouteParams(params);
    }
  }, [params]);

  // Get channel data by route
  const channelData = useQuery(
    api.channels.getChannelByRoute,
    routeParams
      ? {
          orgSlug: routeParams.slug,
          categoryName: decodeURIComponent(routeParams.category),
          channelName: decodeURIComponent(routeParams.channel),
        }
      : "skip"
  );

  // Redirect if channel not found (after data is loaded)
  React.useEffect(() => {
    if (channelData === null && routeParams) {
      router.replace(`/${routeParams.slug}`);
    }
  }, [channelData, routeParams, router]);

  // Loading state
  if (!routeParams || channelData === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <CircleNotchIcon className="size-6 animate-spin text-[#26251E]/20" />
      </div>
    );
  }

  // Redirecting state
  if (channelData === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <CircleNotchIcon className="size-6 animate-spin text-[#26251E]/20" />
      </div>
    );
  }

  const { channel, category, membership } = channelData;
  const Icon = channel.icon ? getIconComponent(channel.icon) : HashIcon;
  const isReadOnly = channel.permissions === "readOnly";
  const isAdmin = membership?.role === "admin";

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Channel Header */}
      <div className="flex h-12 items-center gap-2 border-b border-[#26251E]/10 px-4">
        <Icon className="size-5 text-[#26251E]/60" />
        <h1 className="text-sm font-medium text-[#26251E]">{channel.name}</h1>
        {isReadOnly && (
          <span className="rounded bg-[#26251E]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#26251E]/60">
            Read-only
          </span>
        )}
        {channel.description && (
          <>
            <span className="text-[#26251E]/20">|</span>
            <span className="text-xs text-[#26251E]/50">{channel.description}</span>
          </>
        )}
      </div>

      {/* Channel Content - Placeholder */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#26251E]/5">
          <Icon className="size-8 text-[#26251E]/40" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-medium text-[#26251E]">
            Welcome to #{channel.name}
          </h2>
          <p className="mt-1 text-sm text-[#26251E]/60">
            {channel.description || `This is the beginning of the #${channel.name} channel.`}
          </p>
        </div>
        <div className="text-xs text-[#26251E]/40">
          Category: {category.name}
          {isReadOnly && !isAdmin && (
            <span className="ml-2">
              This channel is read-only. Only admins can post messages.
            </span>
          )}
        </div>
      </div>

      {/* Message Input Placeholder */}
      <div className="border-t border-[#26251E]/10 p-4">
        <div className="flex items-center gap-2 rounded-lg bg-[#26251E]/5 px-4 py-3">
          <input
            type="text"
            placeholder={
              isReadOnly && !isAdmin
                ? "This channel is read-only"
                : `Message #${channel.name}`
            }
            disabled={isReadOnly && !isAdmin}
            className="flex-1 bg-transparent text-sm placeholder-[#26251E]/40 outline-none disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
