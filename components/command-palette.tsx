"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  House,
  Tray,
  BookmarkSimple,
  Users,
  ChatCircle,
  Gear,
  GearSix,
  Hash,
  Sun,
  Moon,
  Desktop,
  Link as LinkIcon,
} from "@phosphor-icons/react";

interface CommandPaletteProps {
  slug: string;
  organizationId: Id<"organizations">;
  role: string;
}

export function CommandPalette({
  slug,
  organizationId,
  role,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const categories = useQuery(
    api.channels.getChannelsAndCategories,
    open ? { organizationId } : "skip"
  );
  const members = useQuery(
    api.organizations.getWorkspaceMembers,
    open ? { organizationId } : "skip"
  );

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Listen for custom event from navbar search button
  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener("open-command-palette", handler);
    return () => document.removeEventListener("open-command-palette", handler);
  }, []);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  const base = `/w/${slug}`;

  const cycleTheme = () => {
    const next = theme === "light" ? "system" : theme === "system" ? "dark" : "light";
    setTheme(next);
  };

  const themeIcon =
    theme === "light" ? Sun : theme === "dark" ? Moon : Desktop;
  const ThemeIcon = themeIcon;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands, channels, people..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push(`${base}`))}>
            <House />
            <span>Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${base}/inbox`))}>
            <Tray />
            <span>Inbox</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${base}/saved`))}>
            <BookmarkSimple />
            <span>Saved</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${base}/people`))}>
            <Users />
            <span>People</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/chat"))}>
            <ChatCircle />
            <span>Direct Messages</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <Gear />
            <span>Settings</span>
          </CommandItem>
          {role === "admin" && (
            <CommandItem onSelect={() => runCommand(() => router.push(`${base}/options`))}>
              <GearSix />
              <span>Workspace Options</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {categories && categories.length > 0 && (
          <>
            <CommandGroup heading="Channels">
              {categories.flatMap((category) => {
                const categorySlug = category.name
                  .toLowerCase()
                  .replace(/\s+/g, "-");
                return category.channels.map((channel) => (
                  <CommandItem
                    key={channel._id}
                    onSelect={() =>
                      runCommand(() =>
                        router.push(
                          `${base}/c/${categorySlug}/${channel.name}`
                        )
                      )
                    }
                  >
                    <Hash />
                    <span>{channel.name}</span>
                    <span className="ml-auto text-muted-foreground">
                      {category.name}
                    </span>
                  </CommandItem>
                ));
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {members && members.length > 0 && (
          <>
            <CommandGroup heading="People">
              {members.map((member) => {
                const name = [member.firstName, member.lastName]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <CommandItem
                    key={member._id}
                    onSelect={() =>
                      runCommand(() => router.push(`${base}/people`))
                    }
                  >
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt=""
                        className="size-5 rounded-full"
                      />
                    ) : (
                      <Users />
                    )}
                    <span>{name || "Unknown"}</span>
                    {member.email && (
                      <span className="ml-auto text-muted-foreground">
                        {member.email}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(cycleTheme)}>
            <ThemeIcon />
            <span>Toggle theme ({theme})</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                navigator.clipboard.writeText(window.location.href);
              })
            }
          >
            <LinkIcon />
            <span>Copy current page link</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
