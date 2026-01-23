"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Heartbeat, TwitterLogo } from "@phosphor-icons/react";
import { useTheme } from "@/lib/theme-provider";
import { GitHubLogo } from "./icons/github-logo";

export function Footer() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <footer className="font-[family-name:var(--font-jetbrains-mono)] shrink-0">
      <div className="max-w-xl mx-auto w-full px-6 py-4 space-y-4">
        {/* Top row: Copyright and links */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()}</span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <ShieldCheck size={12} />
              <span>privacy</span>
            </Link>
            <Link
              href="https://status.tryportal.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Heartbeat size={12} />
              <span>status</span>
            </Link>
            <Link
              href="https://x.com/portalmessage"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <TwitterLogo size={12} />
              <span>twitter</span>
            </Link>
          </div>
        </div>

        {/* Bottom row: Attribution and source */}
        <div className="pt-4 border-t border-border">
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
                  className={`h-4 w-auto inline-block opacity-60 hover:opacity-100 transition-opacity ${
                    isDark ? "invert" : ""
                  }`}
                />
              </Link>
            </span>
            <Link
              href="https://github.com/tryportal/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <GitHubLogo size={14} />
              <span>source</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
