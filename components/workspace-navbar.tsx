"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  House,
  ChatCircle,
  Tray,
  List,
  MagnifyingGlass,
  ArrowsLeftRight,
  Hash,
} from "@phosphor-icons/react";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { UserMenu } from "@/components/user-menu";
import { useMobileSidebar } from "@/components/mobile-sidebar-context";
import { WorkspaceIcon } from "@/components/workspace-icon";

interface NavItem {
  icon: typeof House;
  href: string;
  global?: boolean;
}

const navItems: NavItem[] = [
  { icon: House, href: "" },
  { icon: ChatCircle, href: "/chat", global: true },
  { icon: Tray, href: "/inbox" },
];

export function WorkspaceNavbar({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/w/${slug}`;
  const { toggle } = useMobileSidebar();
  const [sharedOpen, setSharedOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const sharedChannels = useQuery(api.sharedChannels.getMySharedChannels);
  const hasSharedChannels = sharedChannels && sharedChannels.length > 0;

  // Close popover on outside click
  useEffect(() => {
    if (!sharedOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSharedOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sharedOpen]);

  return (
    <header className="border-b border-border">
      <div className="flex h-14 items-stretch">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={toggle}
          className="flex w-12 items-center justify-center border-r border-border hover:bg-muted md:hidden"
          aria-label="Toggle sidebar"
        >
          <List size={20} />
        </button>

        <Link
          href="/home"
          className="hidden w-14 items-center justify-center border-r border-border hover:bg-muted md:flex"
        >
          <Image src="/portal.svg" alt="Portal" width={24} height={24} className="dark:invert" />
        </Link>
        <nav className="flex items-stretch">
          {navItems.map(({ icon: Icon, href, global }) => {
            const fullHref = global ? href : base + href;
            const otherHrefs = navItems
              .filter((n) => n.href !== "" && !n.global)
              .map((n) => n.href);
            const isActive = global
              ? pathname.startsWith(href)
              : href === ""
                ? pathname.startsWith(base) &&
                  !otherHrefs.some((h) => pathname.startsWith(base + h))
                : pathname.startsWith(base + href);

            return (
              <Link
                key={href}
                href={fullHref}
                className={`flex w-12 items-center justify-center border-r border-border hover:bg-muted md:w-14 ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon size={22} weight={isActive ? "fill" : "regular"} className="md:size-6" />
              </Link>
            );
          })}

          {/* Shared channels indicator */}
          {hasSharedChannels && (
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setSharedOpen(!sharedOpen)}
                className={`flex w-12 items-center justify-center border-r border-border hover:bg-muted md:w-14 ${
                  sharedOpen ? "text-foreground" : "text-muted-foreground"
                }`}
                title="Shared channels"
              >
                <ArrowsLeftRight size={22} weight={sharedOpen ? "fill" : "regular"} className="md:size-6" />
              </button>

              {sharedOpen && (
                <div className="absolute left-0 top-full z-50 mt-px w-72 border border-border bg-popover shadow-lg">
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Shared channels
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-1">
                    {sharedChannels.map((workspace) => (
                      <div key={workspace.orgId}>
                        <div className="flex items-center gap-2 px-3 py-1.5">
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
                        {workspace.channels.map((channel) => (
                          <Link
                            key={channel._id}
                            href={`/w/${workspace.slug}/c/${channel.categorySlug}/${channel.name}`}
                            onClick={() => setSharedOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 pl-7 text-xs text-foreground/70 hover:bg-muted hover:text-foreground"
                          >
                            <Hash size={12} className="flex-shrink-0" />
                            <span className="truncate">{channel.name}</span>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="flex flex-1 items-center justify-end px-2 md:justify-center">
          <button
            onClick={() =>
              document.dispatchEvent(new Event("open-command-palette"))
            }
            className="flex h-8 items-center gap-2 rounded-none border border-border bg-muted/50 px-2 text-xs text-muted-foreground hover:bg-muted md:w-60"
          >
            <MagnifyingGlass size={16} />
            <span className="hidden md:inline">Search</span>
            <kbd className="pointer-events-none ml-auto hidden select-none rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline">
              ⌘K
            </kbd>
          </button>
        </div>
        <div className="flex items-stretch">
          <WorkspaceSwitcher slug={slug} />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
