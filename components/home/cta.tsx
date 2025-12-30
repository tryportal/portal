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
  
  // Get the first organization or admin org for signed-in users
  const targetOrg = userOrgs?.find((org: { role: string }) => org.role === "admin") || userOrgs?.[0]
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null

  return (
    <section className="py-16 sm:py-32 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="bg-foreground text-background rounded-2xl sm:rounded-[2.5rem] p-8 sm:p-12 md:p-24 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute -top-24 -right-24 w-32 sm:w-64 h-32 sm:h-64 bg-card/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-32 sm:w-64 h-32 sm:h-64 bg-card/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight relative z-10">Ready to try something better?</h2>
          <p className="mt-4 sm:mt-6 text-base sm:text-xl text-background/80 max-w-2xl mx-auto font-light relative z-10 px-2">
            Join teams who value privacy and simplicity. Get started with Portal today — it's free, forever.
          </p>
          <div className="mt-8 sm:mt-10 relative z-10">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="inline-flex items-center gap-2 bg-background text-foreground px-8 py-4 rounded-full font-medium hover:scale-105 transition-transform"
                  >
                    Go to Workspace
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-background text-foreground px-8 py-4 rounded-full font-medium hover:scale-105 transition-transform"
                  >
                    Get Started
                    <ArrowRight size={18} weight="bold" />
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

