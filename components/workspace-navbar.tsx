"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ChatCircle, Tray, List } from "@phosphor-icons/react";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { UserMenu } from "@/components/user-menu";
import { useMobileSidebar } from "@/components/mobile-sidebar-context";

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
        </nav>
        <div className="flex flex-1" />
        <div className="flex items-stretch">
          <WorkspaceSwitcher slug={slug} />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
