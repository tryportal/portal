"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { api } from "@/convex/_generated/api"
import { GitHubLogo } from "./icons/github-logo"

export function Navbar() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const router = useRouter()
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  
  // Get the first organization or admin org for signed-in users
  const targetOrg = userOrgs?.find((org: { role: string }) => org.role === "admin") || userOrgs?.[0]
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M150 0C232.843 0 300 67.1573 300 150C300 232.843 232.843 300 150 300C67.1573 300 0 232.843 0 150C0 67.1573 67.1573 0 150 0ZM68.1621 187.5C82.3823 218.483 113.678 240 150 240C163.384 240 176.084 237.077 187.5 231.837V187.5H68.1621ZM150 60C136.617 60 123.916 62.9225 112.5 68.1621V112.5H231.838C217.618 81.5174 186.322 60 150 60Z"
              fill="#26251E"
            />
          </svg>
          <span className="font-semibold text-lg text-foreground">Portal</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="https://github.com/tryportal/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GitHubLogo size={20} />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
          {authLoaded && (
            <>
              {isSignedIn && workspaceUrl ? (
                <Link
                  href={workspaceUrl}
                  className="bg-foreground text-background px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Go to Workspace
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="bg-foreground text-background px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </motion.nav>
  )
}

