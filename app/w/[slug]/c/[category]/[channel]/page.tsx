"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/components/workspace-context";
import { ChannelChat } from "@/components/channel-chat";
import { ForumChannel } from "@/components/forum-channel";
import { DotLoader } from "@/components/ui/dot-loader";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; category: string; channel: string }>;
}) {
  const { slug, category, channel: channelName } = use(params);
  useWorkspace();

  const channelData = useQuery(api.messages.getChannelByName, {
    slug,
    categoryName: category,
    channelName,
  });

  if (channelData === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <DotLoader />
      </div>
    );
  }

  if (channelData === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Channel not found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This channel may have been deleted or you don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  if (channelData.channelType === "forum") {
    return <ForumChannel channel={channelData} />;
  }

  return <ChannelChat channel={channelData} slug={slug} />;
}
