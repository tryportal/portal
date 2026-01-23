"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { Sun, Moon, ArrowRight } from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { useTheme } from "@/lib/theme-provider"
import { GitHubLogo } from "./icons/github-logo"

export function Navbar() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  
  const targetOrg = userOrgs?.find((org: { role: string }) => org.role === "admin") || userOrgs?.[0]
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 font-[family-name:var(--font-jetbrains-mono)]">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-3 group">
          <Image
            src={isDark ? "/portal-dark.svg" : "/portal.svg"}
            alt="Portal"
            width={24}
            height={24}
            className="w-5 h-5"
            priority
          />
          <span className="text-sm text-foreground tracking-tight">portal</span>
        </Link>

        <div className="flex items-center gap-5 text-xs">
          <button
            onClick={toggleTheme}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <Link
            href="https://github.com/tryportal/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <GitHubLogo size={16} />
          </Link>

          {authLoaded && (
            <>
              {isSignedIn && workspaceUrl ? (
                <Link
                  href={workspaceUrl}
                  className="flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors"
                >
                  <span>open</span>
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors"
                >
                  <span>enter</span>
                  <ArrowRight size={14} />
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
