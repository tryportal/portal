"use client"

import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { useState, useEffect } from "react"
import * as React from "react"
import { List, X, ArrowRight } from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { GitHubLogo } from "./icons/github-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/lib/theme-provider"

export function Navbar() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { resolvedTheme, mounted } = useTheme()
  const isDark = resolvedTheme === "dark"
  
  // Track client-side mount to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const targetOrg = userOrgs?.find((org: { role: string }) => org.role === "admin") || userOrgs?.[0]
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null
  
  // Only show auth-dependent content after mount and auth is loaded
  const showAuthContent = isMounted && authLoaded

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
      suppressHydrationWarning
    >
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/home" className="flex items-center gap-2">
            {mounted ? (
              <Image
                src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
                alt="Portal"
                width={80}
                height={24}
                className="h-5 w-auto"
                priority
              />
            ) : (
              <Image
                src="/portal-full.svg"
                alt="Portal"
                width={80}
                height={24}
                className="h-5 w-auto"
                priority
              />
            )}
          </Link>
          <Link
            href="https://macis.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>a</span>
            {mounted ? (
              <Image
                src={isDark ? "/macis-white.svg" : "/macis-black.svg"}
                alt="Macis"
                width={40}
                height={16}
                className="h-4 w-auto"
              />
            ) : (
              <Image
                src="/macis-black.svg"
                alt="Macis"
                width={40}
                height={16}
                className="h-4 w-auto"
              />
            )}
            <span>project</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-3">
          <ThemeToggle variant="icon" />
          <Link
            href="https://github.com/tryportal/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GitHubLogo size={16} />
          </Link>
          {showAuthContent ? (
            <>
              {isSignedIn && workspaceUrl ? (
                <Link
                  href={workspaceUrl}
                  className="inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded-md font-medium text-xs hover:opacity-90 transition-opacity"
                >
                  Open App
                  <ArrowRight size={12} weight="bold" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-muted-foreground hover:text-foreground transition-colors text-xs font-medium px-2 py-1.5"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded-md font-medium text-xs hover:opacity-90 transition-opacity"
                  >
                    Get Started
                    <ArrowRight size={12} weight="bold" />
                  </Link>
                </>
              )}
            </>
          ) : null}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-1.5 text-foreground"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X size={18} weight="bold" />
          ) : (
            <List size={18} weight="bold" />
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
            transition={{ duration: 0.15 }}
            className="sm:hidden border-t border-border bg-background"
          >
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-medium text-muted-foreground">Theme</span>
                <ThemeToggle variant="dropdown" />
              </div>
              <Link
                href="https://github.com/tryportal/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <GitHubLogo size={14} />
                <span className="text-xs font-medium">GitHub</span>
              </Link>
              {showAuthContent ? (
                <>
                  {isSignedIn && workspaceUrl ? (
                    <Link
                      href={workspaceUrl}
                      className="flex items-center justify-center gap-1.5 w-full bg-foreground text-background px-3 py-2 rounded-md font-medium text-xs hover:opacity-90 transition-opacity"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Open App
                      <ArrowRight size={12} weight="bold" />
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className="block py-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="flex items-center justify-center gap-1.5 w-full bg-foreground text-background px-3 py-2 rounded-md font-medium text-xs hover:opacity-90 transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get Started
                        <ArrowRight size={12} weight="bold" />
                      </Link>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
