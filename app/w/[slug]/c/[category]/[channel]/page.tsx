"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspaceNotFound } from "@/components/workspace-not-found";
import { ChannelChat } from "@/components/channel-chat";
import { DotLoader } from "@/components/ui/dot-loader";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; category: string; channel: string }>;
}) {
  const { slug, category, channel: channelName } = use(params);

  const workspace = useQuery(api.organizations.getWorkspaceBySlug, { slug });
  const channelData = useQuery(api.messages.getChannelByName, {
    slug,
    categoryName: category,
    channelName,
  });

  if (workspace === undefined || channelData === undefined) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ height: "calc(100vh - 57px)" }}
      >
        <DotLoader />
      </div>
    );
  }

  if (workspace === null) {
    return <WorkspaceNotFound slug={slug} />;
  }

  if (channelData === null) {
    return (
      <div className="flex" style={{ height: "calc(100vh - 57px)" }}>
        <WorkspaceSidebar
          slug={slug}
          organizationId={workspace._id}
          role={workspace.role}
        />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Channel not found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This channel may have been deleted or you don&apos;t have access.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: "calc(100vh - 57px)" }}>
      <WorkspaceSidebar
        slug={slug}
        organizationId={workspace._id}
        role={workspace.role}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChannelChat
          channel={channelData}
          slug={slug}
        />
      </main>
    </div>
  );
}
