"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UsersThree, Spinner, Buildings } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "@/lib/theme-provider";
import { analytics } from "@/lib/analytics";

export default function PublicWorkspacesPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [joiningOrgId, setJoiningOrgId] = useState<Id<"organizations"> | null>(null);

  const publicOrgs = useQuery(api.organizations.getPublicOrganizations);
  const joinOrg = useMutation(api.organizations.joinPublicOrganization);

  const handleJoinOrg = async (orgId: Id<"organizations">) => {
    setJoiningOrgId(orgId);
    try {
      const result = await joinOrg({ organizationId: orgId });
      analytics.workspaceJoined({ slug: result.slug });
      router.push(`/w/${result.slug}`);
      setJoiningOrgId(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to join workspace:", error);
      toast.error(`Failed to join workspace: ${errorMessage}`);
      setJoiningOrgId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm z-50"
      >
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" weight="bold" />
          Back
        </motion.button>

        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1 rounded-full bg-muted/50">
          Join Workspace
        </span>
      </motion.header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-24 pb-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Public Workspaces
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Join an existing public workspace and start collaborating with the team.
            </p>
          </motion.div>

          {/* Loading State */}
          <AnimatePresence mode="wait">
            {publicOrgs === undefined && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-3"
              >
                <Spinner className="size-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading workspaces...</p>
              </motion.div>
            )}

            {/* Empty State */}
            {publicOrgs && publicOrgs.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="size-16 rounded-2xl bg-muted flex items-center justify-center"
                >
                  <Buildings className="size-8 text-muted-foreground" weight="duotone" />
                </motion.div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No public workspaces available
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check back later or create your own workspace
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.back()}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Create a workspace instead
                </motion.button>
              </motion.div>
            )}

            {/* Workspaces List */}
            {publicOrgs && publicOrgs.length > 0 && (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {publicOrgs.map((org, index) => (
                  <motion.button
                    key={org._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: 0.15 + index * 0.05, 
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => handleJoinOrg(org._id)}
                    disabled={joiningOrgId !== null}
                    className="group relative w-full p-5 rounded-xl border border-border bg-card text-left transition-all duration-200 hover:shadow-md hover:border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    {/* Background highlight on hover */}
                    <div className="absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    <div className="relative flex items-center gap-4">
                      {/* Logo */}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="shrink-0"
                      >
                        {org.logoUrl ? (
                          <Image
                            src={org.logoUrl}
                            alt={org.name}
                            width={48}
                            height={48}
                            className="rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                            <Image
                              src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                              alt="Workspace"
                              width={24}
                              height={24}
                            />
                          </div>
                        )}
                      </motion.div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate text-base">
                          {org.name}
                        </h3>
                        {org.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {org.description}
                          </p>
                        )}
                      </div>

                      {/* Join indicator */}
                      <AnimatePresence mode="wait">
                        {joiningOrgId === org._id ? (
                          <motion.div
                            key="spinner"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Spinner className="size-5 animate-spin text-primary" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="icon"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 5 }}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          >
                            <UsersThree className="size-4" weight="bold" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl" />
      </div>
    </div>
  );
}
