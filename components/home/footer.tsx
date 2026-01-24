"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheckIcon, HeartbeatIcon, TwitterLogoIcon, GithubLogoIcon, SunIcon, MoonIcon } from "@phosphor-icons/react";
import { useTheme } from "@/lib/theme-provider";

export function Footer() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <footer className="font-jetbrains shrink-0">
      <div className="max-w-xl mx-auto w-full px-6 py-4 space-y-4">
        {/* Top row: Copyright and links */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Link
              href="https://macis.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Image
                src="/macis-full.svg"
                alt="Macis"
                width={411}
                height={128}
                className={`h-5 w-auto inline-block opacity-60 hover:opacity-100 transition-opacity ${
                  isDark ? "invert" : ""
                }`}
              />
            </Link>
          </span>
          <div className="flex items-center">
            {[
              { href: "/privacy", Icon: ShieldCheckIcon, label: "privacy" },
              { href: "https://status.tryportal.app", Icon: HeartbeatIcon, label: "status", external: true },
              { href: "https://x.com/portalmessage", Icon: TwitterLogoIcon, label: "twitter", external: true },
              { href: "https://github.com/tryportal/portal", Icon: GithubLogoIcon, label: "source", external: true },
            ].map(({ href, Icon, label, external }) => (
              <Link
                key={href}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="p-2 flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Icon size={14} />
                <span className="hidden sm:block">{label}</span>
              </Link>
            ))}
            <button
              onClick={toggleTheme}
              className="cursor-pointer p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
