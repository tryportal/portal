"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/portal.svg" alt="Portal" width={24} height={24} />
            <span className="text-sm font-semibold">Portal</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/features"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/channels"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Channels
            </Link>
            <Link
              href="/pricing"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Sign in
          </Link>
          <Link
            href="/get-started"
            className={buttonVariants({ size: "sm" })}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
