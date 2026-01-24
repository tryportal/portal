"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { SunIcon, MoonIcon, ArrowRightIcon, GithubLogoIcon } from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { useTheme } from "@/lib/theme-provider"

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
    <nav className="px-6 fixed top-0 left-0 right-0 z-50 font-[family-name:var(--font-jetbrains-mono)]">
      <div className="py-4 mx-auto max-w-3xl flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-3 group">
          <Image
            src={isDark ? "/portal-dark.svg" : "/portal.svg"}
            alt="Portal"
            width={24}
            height={24}
            className="w-5 h-5"
            priority
          />
        </Link>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={toggleTheme}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
          
          <Link
            href="https://github.com/tryportal/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <GithubLogoIcon size={16} />
          </Link>

          {authLoaded && (
            <>
              {isSignedIn && workspaceUrl ? (
                <Link
                  href={workspaceUrl}
                  className="flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors"
                >
                  <span>open</span>
                  <ArrowRightIcon size={14} />
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="flex items-center gap-1.5 bg-foreground text-background px-2 py-1"
                >
                  <span>enter</span>
                  <ArrowRightIcon size={14} />
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
