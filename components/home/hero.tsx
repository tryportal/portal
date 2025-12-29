"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GitHubLogo } from "./icons/github-logo";

export function Hero() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  // Get the first organization or admin org for signed-in users
  const targetOrg =
    userOrgs?.find((org: { role: string }) => org.role === "admin") ||
    userOrgs?.[0];
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null;

  return (
    <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Now in Alpha
          </motion.div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.1] text-balance">
            Team chat that respects{" "}
            <span className="text-muted-foreground">your privacy.</span>
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance font-light leading-relaxed px-2 sm:px-0">
            Portal is the open-source alternative to Slack. Real-time messaging,
            organized channels, and seamless collaboration — without the
            surveillance.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-full font-medium hover:opacity-90 transition-all hover:scale-105 active:scale-95"
                  >
                    Go to Workspace
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-full font-medium hover:opacity-90 transition-all hover:scale-105 active:scale-95"
                  >
                    Get Started Free
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground/80">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ShieldCheck
                size={16}
                weight="fill"
                className="text-foreground sm:size-[18px]"
              />
              <span>Privacy-first</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <GitHubLogo className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-foreground" />
              <span>Open Source</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-foreground font-semibold">$0</span>
              <span>Completely free</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 sm:mt-20 relative mx-2 sm:mx-0"
        >
          <div className="relative rounded-lg sm:rounded-xl overflow-hidden border border-border/50 shadow-xl sm:shadow-2xl bg-card ring-1 ring-white/10">
            <Image
              src="/images/portal-main.png"
              alt="Portal chat interface showing real-time messaging"
              width={1200}
              height={700}
              className="w-full h-auto"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none h-16 sm:h-32 bottom-0 top-auto" />
        </motion.div>
      </div>
    </section>
  );
}
