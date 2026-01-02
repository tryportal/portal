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
    <section className="py-10 sm:py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-foreground text-background rounded-xl p-6 sm:p-10 text-center relative overflow-hidden"
        >
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
          }} />
          
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight relative z-10">
            Ready to try something better?
          </h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-background/70 max-w-md mx-auto relative z-10">
            Join teams who value privacy and simplicity. Get started today — it&apos;s free, forever.
          </p>
          <div className="mt-5 relative z-10">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="inline-flex items-center gap-1.5 bg-background text-foreground px-5 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
                  >
                    Go to Workspace
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 bg-background text-foreground px-5 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
                  >
                    Get Started
                    <ArrowRight size={14} weight="bold" />
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
