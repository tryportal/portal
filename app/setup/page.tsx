"use client";

import { Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { UserDataCacheProvider } from "@/components/user-data-cache";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";
import { LoadingSpinner } from "@/components/loading-spinner";

function SetupContent() {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Get user's organizations from Convex
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  // Check setup status for all organizations
  const allOrgIds =
    userOrgs?.map((org: { _id: Id<"organizations"> }) => org._id) || [];
  const orgSetupChecks = useQuery(
    api.organizations.checkMultipleOrganizationsSetup,
    allOrgIds.length > 0
      ? { organizationIds: allOrgIds as Id<"organizations">[] }
      : "skip"
  );

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Find fully set up organizations (prioritize admin orgs)
  const setupOrgs =
    userOrgs
      ?.filter((org: { _id: Id<"organizations">; slug?: string }) => {
        const isSetup = orgSetupChecks?.[org._id];
        return isSetup && org.slug;
      })
      .sort(
        (a: { role?: string }, b: { role?: string }) =>
          (a.role === "admin" ? -1 : 1) - (b.role === "admin" ? -1 : 1)
      ) || [];

  const hasSetupOrganizations = setupOrgs.length > 0;
  const defaultRedirectSlug = setupOrgs[0]?.slug;

  // Check URL params for new org or mid-setup state
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const isCreatingNew = searchParams.get("new") === "true";
  const setupOrgId = searchParams.get("org");
  const isInSetupFlow = isCreatingNew || setupOrgId;

  // Redirect if user has set up orgs and isn't explicitly in setup flow
  useEffect(() => {
    if (
      !authLoaded ||
      !isSignedIn ||
      userOrgs === undefined ||
      (userOrgs.length > 0 && orgSetupChecks === undefined)
    ) {
      return;
    }

    if (hasSetupOrganizations && !isInSetupFlow && defaultRedirectSlug) {
      router.replace(`/w/${defaultRedirectSlug}`);
    }
  }, [
    authLoaded,
    isSignedIn,
    userOrgs,
    orgSetupChecks,
    hasSetupOrganizations,
    isInSetupFlow,
    defaultRedirectSlug,
    router,
  ]);

  // Loading states
  if (!authLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  // Show loading only if:
  // 1. userOrgs is still loading (undefined), OR
  // 2. We have organizations but their setup status is still loading
  // If userOrgs is an empty array and orgSetupChecks is undefined (query was skipped),
  // that means the user has no orgs and we should proceed to show the setup wizard
  if (
    userOrgs === undefined ||
    (userOrgs.length > 0 && orgSetupChecks === undefined)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  // Show loading while redirecting
  if (hasSetupOrganizations && !isInSetupFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  // Show exit button for users with existing orgs
  const canExit = hasSetupOrganizations && defaultRedirectSlug;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm z-50"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="size-8 rounded-lg bg-primary flex items-center justify-center"
          >
            <img
              src={isDark ? "/portal.svg" : "/portal-dark.svg"}
              alt="Portal"
              className="size-4"
            />
          </motion.div>
          <span className="font-semibold text-sm">Portal</span>
        </div>

        <div className="flex items-center gap-3">
          {canExit && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.replace(`/w/${defaultRedirectSlug}`)}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" weight="bold" />
                Exit
              </Button>
            </motion.div>
          )}
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1 rounded-full bg-muted/50">
            Setup
          </span>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <UserDataCacheProvider>
          <SetupWizard organizationId={setupOrgId ?? undefined} />
        </UserDataCacheProvider>
      </main>

      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl" />
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <LoadingSpinner size="sm" />
        </div>
      }
    >
      <NuqsAdapter>
        <SetupContent />
      </NuqsAdapter>
    </Suspense>
  );
}
