"use client"

import Link from "next/link"
import { TwitterLogo } from "@phosphor-icons/react"
import { GitHubLogo } from "./icons/github-logo"

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M150 0C232.843 0 300 67.1573 300 150C300 232.843 232.843 300 150 300C67.1573 300 0 232.843 0 150C0 67.1573 67.1573 0 150 0ZM68.1621 187.5C82.3823 218.483 113.678 240 150 240C163.384 240 176.084 237.077 187.5 231.837V187.5H68.1621ZM150 60C136.617 60 123.916 62.9225 112.5 68.1621V112.5H231.838C217.618 81.5174 186.322 60 150 60Z"
                fill="#26251E"
              />
            </svg>
            <span className="font-semibold text-foreground">Portal</span>
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

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Portal. Open source under MIT License.</p>
        </div>
      </div>
    </footer>
  )
}

