"use client";

import Link from "next/link";
import Image from "next/image";
import { TwitterLogo } from "@phosphor-icons/react";
import { GitHubLogo } from "./icons/github-logo";
import { useTheme } from "@/lib/theme-provider";

export function Footer() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <footer className="py-6 px-4 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
              alt="Portal"
              width={72}
              height={20}
              className="h-4 w-auto"
            />
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link
              href="https://autochangelog.com/changelog/portal/alpha"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Changelog
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="https://status.tryportal.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Status
            </Link>
            <div className="flex items-center gap-3 ml-2">
              <Link
                href="https://github.com/tryportal/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <GitHubLogo size={14} />
              </Link>
              <Link
                href="https://x.com/portalmessage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <TwitterLogo size={14} weight="fill" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
