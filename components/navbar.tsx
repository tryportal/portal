"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="border-b border-border">
      <div className="flex h-14 items-stretch">
        <Link
          href="/"
          className="flex items-center justify-center border-r border-border px-5"
        >
          <Image src="/portal.svg" alt="Portal" width={24} height={24} />
        </Link>
        <nav className="hidden items-stretch md:flex">
          <Link
            href="/features"
            className="flex items-center border-r border-border px-5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="/channels"
            className="flex items-center border-r border-border px-5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Channels
          </Link>
          <Link
            href="/pricing"
            className="flex items-center border-r border-border px-5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="flex items-center border-r border-border px-5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
        </nav>
        <div className="flex flex-1" />
        <div className="flex items-stretch">
          <Link
            href="/sign-in"
            className="flex items-center border-l border-border px-5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/get-started"
            className={buttonVariants({
              size: "sm",
              className: "my-auto ml-2 mr-4",
            })}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
