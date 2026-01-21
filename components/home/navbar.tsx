"use client"

import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { useState } from "react"
import { List, X, ArrowRight } from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { GitHubLogo } from "./icons/github-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/lib/theme-provider"

export function Navbar() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  
  const targetOrg = userOrgs?.find((org: { role: string }) => org.role === "admin") || userOrgs?.[0]
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Logo and Macis attribution */}
        <div className="flex items-center gap-4">
          <Link href="/home" className="flex items-center">
            <Image
              src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
              alt="Portal"
              width={88}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-border">|</span>
            <span>a</span>
            <Link
              href="https://macis.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Image
                src={isDark ? "/macis-white.svg" : "/macis-black.svg"}
                alt="Macis"
                width={40}
                height={16}
                className="h-3.5 w-auto opacity-70 hover:opacity-100 transition-opacity"
              />
            </Link>
            <span>project</span>
          </div>
        </div>

        {/* Right: Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-2">
          <ThemeToggle variant="icon" />
          <Link
            href="https://github.com/tryportal/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          >
            <GitHubLogo size={18} />
          </Link>
          {authLoaded && (
            <div className="flex items-center gap-2 ml-2">
              {isSignedIn && workspaceUrl ? (
                <Link
                  href={workspaceUrl}
                  className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-all shadow-sm"
                >
                  Open Portal
                  <ArrowRight size={14} weight="bold" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium px-3 py-2"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-all shadow-sm"
                  >
                    Get started
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 text-foreground rounded-md hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X size={20} weight="bold" />
          ) : (
            <List size={20} weight="bold" />
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
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="sm:hidden border-t border-border bg-background"
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
                className="flex items-center gap-2.5 py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <GitHubLogo size={16} />
                <span className="text-sm font-medium">GitHub</span>
              </Link>
              <div className="pt-2 border-t border-border">
                {authLoaded && (
                  <>
                    {isSignedIn && workspaceUrl ? (
                      <Link
                        href={workspaceUrl}
                        className="flex items-center justify-center gap-2 w-full bg-foreground text-background px-4 py-2.5 rounded-md font-medium text-sm hover:opacity-90 transition-all shadow-sm"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Open Portal
                        <ArrowRight size={14} weight="bold" />
                      </Link>
                    ) : (
                      <div className="space-y-2">
                        <Link
                          href="/sign-in"
                          className="block text-center py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Sign in
                        </Link>
                        <Link
                          href="/sign-up"
                          className="flex items-center justify-center gap-2 w-full bg-foreground text-background px-4 py-2.5 rounded-md font-medium text-sm hover:opacity-90 transition-all shadow-sm"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Get started
                          <ArrowRight size={14} weight="bold" />
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
