"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "@phosphor-icons/react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function CTA() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const userOrgs = useQuery(api.organizations.getUserOrganizations)
  
  const targetOrg = userOrgs?.find((org: { role: string }) => org.role === "admin") || userOrgs?.[0]
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-foreground text-background rounded-2xl p-8 sm:p-12 md:p-16 text-center relative overflow-hidden shadow-xl"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight relative z-10">
            Make Portal your home base.
          </h2>
          
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-background/70 max-w-md mx-auto relative z-10">
            Free forever. Open source. Ready when you are.
          </p>
          
          <div className="mt-8 relative z-10">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="inline-flex items-center gap-2 bg-background text-foreground px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-all shadow-md"
                  >
                    Go to Workspace
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-background text-foreground px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-all shadow-md"
                  >
                    Get Started
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
