"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserMenu } from "@/components/user-menu";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const firstWorkspace = useQuery(api.organizations.getUserFirstWorkspace);
  const backHref = firstWorkspace ? `/w/${firstWorkspace.slug}` : "/";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="flex h-14 items-stretch">
          <Link
            href="/"
            className="flex w-14 items-center justify-center border-r border-border hover:bg-muted"
          >
            <Image src="/portal.svg" alt="Portal" width={24} height={24} />
          </Link>
          <Link
            href={backHref}
            className="flex items-center gap-2 border-r border-border px-4 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <div className="flex items-center px-4 text-xs font-bold">
            Settings
          </div>
          <div className="flex flex-1" />
          <UserMenu />
        </div>
      </header>
      {children}
    </div>
  );
}
