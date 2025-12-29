"use client"

import Link from "next/link"
import Image from "next/image"
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
          <Image
            src="/portal-full.svg"
            alt="Portal"
            width={100}
            height={32}
            className="h-8 w-auto dark:invert"
            priority
          />
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="https://github.com/tryportal/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GitHubLogo size={20} />
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

