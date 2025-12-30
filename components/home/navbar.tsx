"use client"

import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { List, X } from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { GitHubLogo } from "./icons/github-logo"
import { ThemeToggle } from "@/components/theme-toggle"

export function Navbar() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const router = useRouter()
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-2">
          <Image
            src="/portal-full.svg"
            alt="Portal"
            width={100}
            height={32}
            className="h-7 sm:h-8 w-auto dark:invert"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-6">
          <ThemeToggle variant="icon" />
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

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 -mr-2 text-foreground"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X size={24} weight="bold" />
          ) : (
            <List size={24} weight="bold" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden border-t border-border bg-background/95 backdrop-blur-md"
          >
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-muted-foreground">Theme</span>
                <ThemeToggle variant="dropdown" />
              </div>
              <Link
                href="https://github.com/tryportal/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <GitHubLogo size={20} />
                <span className="text-sm font-medium">GitHub</span>
              </Link>
              {authLoaded && (
                <>
                  {isSignedIn && workspaceUrl ? (
                    <Link
                      href={workspaceUrl}
                      className="block w-full bg-foreground text-background px-4 py-3 rounded-lg font-medium text-sm text-center hover:opacity-90 transition-opacity"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Go to Workspace
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className="block py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="block w-full bg-foreground text-background px-4 py-3 rounded-lg font-medium text-sm text-center hover:opacity-90 transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

