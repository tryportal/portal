"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowsLeftRight, Hash, Users } from "@phosphor-icons/react";
import { WorkspaceIcon } from "@/components/workspace-icon";
import { ChannelChat } from "@/components/channel-chat";
import { DotLoader } from "@/components/ui/dot-loader";
import { ResizableSidebar } from "@/components/resizable-sidebar";
import Image from "next/image";

interface SelectedChannel {
  channelId: string;
  workspaceSlug: string;
  categorySlug: string;
  channelName: string;
}

function SharedChannelChat({ selected }: { selected: SelectedChannel }) {
  const channelData = useQuery(api.messages.getChannelByName, {
    slug: selected.workspaceSlug,
    categoryName: selected.categorySlug,
    channelName: selected.channelName,
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

  return <ChannelChat channel={channelData} slug={selected.workspaceSlug} />;
}

function SharedMembers({ channelId }: { channelId: Id<"channels"> }) {
  const members = useQuery(api.sharedChannels.getSharedMembers, { channelId });

  if (!members || members.length === 0) return null;

  return (
    <div className="border-t border-border px-3 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Users size={12} className="text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Shared members
        </span>
      </div>
      <div className="space-y-1">
        {members.map((member) => (
          <div key={member._id} className="flex items-center gap-2 py-1">
            {member.userImageUrl ? (
              <Image
                src={member.userImageUrl}
                alt={member.userName}
                width={20}
                height={20}
                className="rounded-full"
              />
            ) : (
              <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                {member.userName[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs truncate">{member.userName}</p>
              {member.sourceOrgName && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {member.sourceOrgName}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SharedChannelsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const sharedChannels = useQuery(api.sharedChannels.getMySharedChannels);
  const [selected, setSelected] = useState<SelectedChannel | null>(null);

  if (sharedChannels === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <DotLoader />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <ResizableSidebar storageKey="shared-sidebar-width" className="hidden md:flex">
      <aside className="flex h-full w-full flex-col border-r border-border bg-background">
        <header className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0">
          <ArrowsLeftRight size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold">Shared Channels</h2>
        </header>

        <div className="flex-1 overflow-y-auto py-1">
          {sharedChannels.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <ArrowsLeftRight
                size={32}
                className="mx-auto mb-2 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                No shared channels yet
              </p>
            </div>
          ) : (
            sharedChannels.map((workspace) => (
              <div key={workspace.orgId}>
                <div className="flex items-center gap-2 px-3 py-1.5 mt-1">
                  <WorkspaceIcon
                    logoUrl={workspace.logoUrl}
                    name={workspace.name}
                    slug={workspace.slug}
                    size={16}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground truncate">
                    {workspace.name}
                  </span>
                </div>
                {workspace.channels.map((channel) => {
                  const isSelected =
                    selected?.channelId === channel._id;
                  return (
                    <button
                      key={channel._id}
                      onClick={() =>
                        setSelected({
                          channelId: channel._id,
                          workspaceSlug: workspace.slug,
                          categorySlug: channel.categorySlug,
                          channelName: channel.name,
                        })
                      }
                      className={`flex w-full items-center gap-2 px-3 py-1.5 pl-7 text-xs hover:bg-muted ${
                        isSelected
                          ? "bg-muted text-foreground font-medium"
                          : "text-foreground/70"
                      }`}
                    >
                      <Hash size={12} className="flex-shrink-0" />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Shared members for selected channel */}
        {selected && (
          <SharedMembers
            channelId={selected.channelId as Id<"channels">}
          />
        )}
      </aside>
      </ResizableSidebar>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <SharedChannelChat key={selected.channelId} selected={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <ArrowsLeftRight
                size={48}
                className="mx-auto mb-3 text-muted-foreground"
              />
              <p className="text-sm font-medium text-foreground">
                Select a shared channel
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a channel from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
