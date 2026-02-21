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
  onOpenSettings?: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function ChannelHeader({
  channelName,
  channelId,
  isMuted,
  role,
  onOpenPinned,
  onOpenSettings,
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
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3 md:px-4">
      {/* Channel name */}
      <div className="flex min-w-0 items-center gap-1.5">
        <Hash size={14} weight="bold" className="shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-semibold">{channelName}</span>
        {isMuted && (
          <BellSlash
            size={12}
            className="shrink-0 text-muted-foreground"
            weight="fill"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        {searchOpen ? (
          <div className="flex h-8 items-center border border-border bg-background md:h-7">
            <MagnifyingGlass
              size={14}
              className="ml-2 shrink-0 text-muted-foreground"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search..."
              className="h-full w-28 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground md:w-44 md:text-xs"
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
              className="flex h-full items-center px-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setSearchOpen(true)}
          >
            <MagnifyingGlass size={14} />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground outline-none cursor-pointer transition-colors">
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
            {isAdmin && onOpenSettings && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenSettings}>
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
