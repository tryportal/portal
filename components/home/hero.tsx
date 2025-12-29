"use client"

import { motion } from "framer-motion"
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { GitHubLogo } from "./icons/github-logo"

export function Hero() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  
  // Get the first organization or admin org for signed-in users
  const targetOrg = userOrgs?.find((org: { role: string }) => org.role === "admin") || userOrgs?.[0]
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Currently in Alpha
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
            Team chat that respects your privacy.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
            Portal is a modern, open-source alternative to Slack. Real-time messaging, organized channels, and seamless
            collaboration — all while keeping your data yours.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Go to Workspace
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Get Started Free
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} weight="fill" className="text-foreground" />
              <span>Privacy-first</span>
            </div>
            <div className="flex items-center gap-2">
              <GitHubLogo className="w-[18px] h-[18px] text-foreground" />
              <span>Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-semibold">$0</span>
              <span>Completely free</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 relative"
        >
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
            <Image
              src="/images/portal-main.png"
              alt="Portal chat interface showing real-time messaging"
              width={1200}
              height={700}
              className="w-full h-auto"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  )
}

