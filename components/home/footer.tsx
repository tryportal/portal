"use client"

import Link from "next/link"
import Image from "next/image"
import { TwitterLogo } from "@phosphor-icons/react"
import { GitHubLogo } from "./icons/github-logo"

export function Footer() {
  return (
    <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/portal-full.svg"
              alt="Portal"
              width={100}
              height={32}
              className="h-5 sm:h-6 w-auto dark:invert"
            />
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/tryportal/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <GitHubLogo size={20} />
            </Link>
            <Link
              href="https://x.com/portalmessage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <TwitterLogo size={20} weight="fill" />
            </Link>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border text-center text-xs sm:text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Portal. Open source under MIT License.</p>
        </div>
      </div>
    </footer>
  )
}

