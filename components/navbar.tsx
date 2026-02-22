"use client";

import Image from "next/image";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserMenu } from "@/components/user-menu";


export function Navbar() {
  const firstWorkspace = useQuery(api.organizations.getUserFirstWorkspace);
  const dashboardHref = firstWorkspace
    ? `/w/${firstWorkspace.slug}`
    : "/onboarding";

  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-0 backdrop-blur-md">
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
          <Link href="/home" className="flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
            Home
          </Link>
          <Link href="/features" className="flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
            Features
          </Link>
          <Link href="/pricing" className="flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
            Pricing
          </Link>
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
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
              className="rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Go to workspace
            </Link>
            <UserMenu compact />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
