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
    <section className="py-24 px-6 bg-foreground">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-background">Ready to try something better?</h2>
          <p className="mt-4 text-lg text-background/70 max-w-xl mx-auto">
            Join teams who value privacy and simplicity. Get started with Portal today — it's free, forever.
          </p>
          <div className="mt-8">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="inline-flex items-center gap-2 bg-background text-foreground px-8 py-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Go to Workspace
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-background text-foreground px-8 py-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
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

