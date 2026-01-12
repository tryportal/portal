"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CaretDownIcon,
  CaretRightIcon,
  DotsThreeIcon,
  SignOutIcon,
  BuildingsIcon,
} from "@phosphor-icons/react";
import { getIconComponent } from "@/components/icon-picker";

interface SharedChannel {
  _id: Id<"channels">;
  name: string;
  icon: string;
  description?: string;
  categoryName: string;
  organization: {
    _id: Id<"organizations">;
    name: string;
    slug: string;
  };
  addedAt: number;
}

interface SharedChannelsSectionProps {
  onChannelSelect?: (
    channelId: string,
    organizationSlug: string,
    categoryName: string,
    channelName: string
  ) => void;
}

export function SharedChannelsSection({ onChannelSelect }: SharedChannelsSectionProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const sharedChannels = useQuery(api.sharedChannels.getSharedChannelsForUser);
  const unreadChannels = useQuery(api.sharedChannels.getUnreadSharedChannels);
  const leaveChannel = useMutation(api.sharedChannels.leaveSharedChannel);

  // Parse active shared channel from URL
  const activeSharedChannelId = React.useMemo(() => {
    if (!pathname || !sharedChannels) return null;
    
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 4 && parts[0] === "w") {
      const orgSlug = parts[1];
      const categoryName = decodeURIComponent(parts[2]);
      const channelName = decodeURIComponent(parts[3]);
      
      // Find a matching shared channel
      for (const channel of sharedChannels) {
        if (
          channel.organization.slug.toLowerCase() === orgSlug.toLowerCase() &&
          channel.categoryName.toLowerCase() === categoryName.toLowerCase() &&
          channel.name.toLowerCase() === channelName.toLowerCase()
        ) {
          return channel._id;
        }
      }
    }
    return null;
  }, [pathname, sharedChannels]);

  const handleChannelSelect = (channel: SharedChannel) => {
    const encodedCategory = encodeURIComponent(channel.categoryName.toLowerCase());
    const encodedChannel = encodeURIComponent(channel.name.toLowerCase());
    
    if (onChannelSelect) {
      onChannelSelect(
        channel._id,
        channel.organization.slug,
        channel.categoryName,
        channel.name
      );
    } else {
      router.push(`/w/${channel.organization.slug}/${encodedCategory}/${encodedChannel}`);
    }
  };

  const handleLeaveChannel = async (channelId: Id<"channels">) => {
    try {
      await leaveChannel({ channelId });
    } catch (error) {
      console.error("Failed to leave shared channel:", error);
    }
  };

  // Group channels by organization
  const channelsByOrg = React.useMemo(() => {
    if (!sharedChannels) return [];
    
    const grouped: Record<string, { org: SharedChannel["organization"]; channels: SharedChannel[] }> = {};
    
    for (const channel of sharedChannels) {
      const orgId = channel.organization._id;
      if (!grouped[orgId]) {
        grouped[orgId] = {
          org: channel.organization,
          channels: [],
        };
      }
      grouped[orgId].channels.push(channel);
    }
    
    return Object.values(grouped);
  }, [sharedChannels]);

  // Don't render if no shared channels
  if (!sharedChannels || sharedChannels.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? (
          <CaretDownIcon className="size-3" />
        ) : (
          <CaretRightIcon className="size-3" />
        )}
        <span className="uppercase tracking-wider">Shared with me</span>
        <span className="ml-auto text-xs text-muted-foreground/60">
          {sharedChannels.length}
        </span>
      </button>

      {/* Channels grouped by organization */}
      {isExpanded && (
        <div className="mt-1 space-y-3">
          {channelsByOrg.map(({ org, channels }) => (
            <div key={org._id} className="space-y-0.5">
              {/* Organization name */}
              <div className="flex items-center gap-1.5 px-2 py-1">
                <BuildingsIcon className="size-3 text-muted-foreground/60" weight="bold" />
                <span className="text-xs font-medium text-muted-foreground/80 truncate">
                  {org.name}
                </span>
              </div>
              
              {/* Channels */}
              <div className="pl-1 space-y-0.5">
                {channels.map((channel) => {
                   const Icon = getIconComponent(channel.icon);
                   const isActive = activeSharedChannelId === channel._id;
                   const hasUnread = unreadChannels?.[channel._id] || false;
                   
                   return (
                     <div key={channel._id} className="group relative">
                       <Button
                         variant={isActive ? "secondary" : "ghost"}
                         className={`w-full justify-start gap-2 pr-8 ${
                           isActive
                             ? "bg-secondary text-foreground"
                             : hasUnread && !isActive
                               ? "text-foreground hover:bg-muted font-medium"
                               : "text-muted-foreground hover:bg-muted hover:text-foreground"
                         }`}
                         onClick={() => handleChannelSelect(channel)}
                       >
                         {React.createElement(Icon, {
                           className: "size-4",
                           weight: isActive ? "fill" : "regular",
                         })}
                         <span className="truncate min-w-0">{channel.name}</span>
                         {hasUnread && !isActive && (
                           <span className="ml-auto w-2 h-2 rounded-full bg-foreground shrink-0" />
                         )}
                      </Button>

                      {/* More button on hover */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                            />
                          }
                        >
                          <DotsThreeIcon className="size-4" weight="bold" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleLeaveChannel(channel._id)}
                          >
                            <SignOutIcon className="size-4" />
                            Leave channel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
