"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Hash,
  MagnifyingGlass,
  DotsThree,
  BellSlash,
  Bell,
  PushPin,
  GearSix,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ChannelHeaderProps {
  channelName: string;
  channelId: Id<"channels">;
  isMuted: boolean;
  role: string;
  onOpenPinned: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function ChannelHeader({
  channelName,
  channelId,
  isMuted,
  role,
  onOpenPinned,
  onSearch,
  searchQuery,
}: ChannelHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const muteChannel = useMutation(api.messages.muteChannel);
  const unmuteChannel = useMutation(api.messages.unmuteChannel);

  const isAdmin = role === "admin";

  const handleMuteToggle = useCallback(async () => {
    if (isMuted) {
      await unmuteChannel({ channelId });
    } else {
      await muteChannel({ channelId });
    }
  }, [isMuted, channelId, muteChannel, unmuteChannel]);

  return (
    <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
      {/* Channel name */}
      <div className="flex items-center gap-1.5">
        <Hash size={16} weight="bold" className="text-muted-foreground" />
        <span className="text-sm font-medium">{channelName}</span>
        {isMuted && (
          <BellSlash
            size={12}
            className="text-muted-foreground"
            weight="fill"
          />
        )}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="flex items-center gap-1">
        {searchOpen ? (
          <div className="flex h-7 items-center border border-border bg-background">
            <MagnifyingGlass
              size={14}
              className="ml-2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search messages..."
              className="h-full w-48 bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  onSearch("");
                }
              }}
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                onSearch("");
              }}
              className="flex h-full items-center px-1.5 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setSearchOpen(true)}
          >
            <MagnifyingGlass size={16} />
          </Button>
        )}

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-6 items-center justify-center hover:bg-muted outline-none cursor-pointer">
            <DotsThree size={16} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" sideOffset={4} align="end">
            <DropdownMenuItem onClick={handleMuteToggle}>
              {isMuted ? <Bell size={14} /> : <BellSlash size={14} />}
              {isMuted ? "Unmute channel" : "Mute channel"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenPinned}>
              <PushPin size={14} />
              Pinned messages
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <GearSix size={14} />
                  Channel settings
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
