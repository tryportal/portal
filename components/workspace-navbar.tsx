"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { House, ChatCircle, Tray } from "@phosphor-icons/react";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

const navItems = [
  { icon: House, href: "" },
  { icon: ChatCircle, href: "/chat" },
  { icon: Tray, href: "/inbox" },
];

export function WorkspaceNavbar({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/w/${slug}`;

  return (
    <header className="border-b border-border">
      <div className="flex h-14 items-stretch">
        <Link
          href="/"
          className="flex w-14 items-center justify-center border-r border-border transition-colors hover:bg-muted"
        >
          <Image src="/portal.svg" alt="Portal" width={24} height={24} />
        </Link>
        <nav className="flex items-stretch">
          {navItems.map(({ icon: Icon, href }) => {
            const fullHref = base + href;
            const isActive =
              href === ""
                ? pathname === base || pathname === base + "/"
                : pathname.startsWith(fullHref);

            return (
              <Link
                key={href}
                href={fullHref}
                className={`flex w-14 items-center justify-center border-r border-border transition-colors hover:bg-muted ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon size={24} weight={isActive ? "fill" : "regular"} />
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-1" />
        <div className="flex items-stretch">
          <WorkspaceSwitcher slug={slug} />
          <div className="flex w-14 items-center justify-center border-l border-border">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-6 rounded-none",
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
