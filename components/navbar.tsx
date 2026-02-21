"use client";

import Image from "next/image";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserMenu } from "@/components/user-menu";
import { ChevronDown } from "lucide-react";

export function Navbar() {
  const firstWorkspace = useQuery(api.organizations.getUserFirstWorkspace);
  const dashboardHref = firstWorkspace
    ? `/w/${firstWorkspace.slug}`
    : "/onboarding";

  return (
    <header className="flex justify-center px-4 pt-0">
      <div className="flex h-14 w-full max-w-3xl items-center gap-1 rounded-b-2xl bg-muted/60 px-5 shadow-sm">
        <Link href="/" className="mr-4 flex items-center">
          <Image
            src="/portal.svg"
            alt="Portal"
            width={24}
            height={24}
            className="dark:invert"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
            Products
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
            Resources
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <Link
            href="/integration"
            className="flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Integration
          </Link>
        </nav>

        <div className="flex-1" />

        <div className="flex items-center">
          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Log in
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href={dashboardHref}
              className="mr-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Dashboard
            </Link>
            <UserMenu />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
