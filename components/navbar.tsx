"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <div className="flex h-14 items-stretch">
        <Link
          href="/"
          className="flex w-14 items-center justify-center border-r border-border transition-colors hover:bg-muted"
        >
          <Image src="/portal.svg" alt="Portal" width={24} height={24} />
        </Link>
        <nav className="hidden items-stretch md:flex">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center border-r border-border px-5 text-xs transition-colors hover:bg-muted hover:text-foreground ${
                  isActive
                    ? "font-bold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-1" />
        <div className="flex items-stretch">
          <SignedOut>
            <Link
              href="/sign-in"
              className="flex items-center border-l border-border px-5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/get-started"
              className="flex items-center border-l border-border px-5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/onboarding"
              className={`flex items-center border-l border-border px-5 text-xs transition-colors hover:bg-muted hover:text-foreground ${
                pathname.startsWith("/onboarding")
                  ? "font-bold text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Dashboard
            </Link>
            <div className="flex w-14 items-center justify-center border-l border-border">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "size-7 rounded-none",
                  },
                }}
              />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
