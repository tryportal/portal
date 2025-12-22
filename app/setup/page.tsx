"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner, X } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { OrganizationForm } from "@/components/setup/organization-form";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded, userId } = useAuth();
  
  // Debug: Check authentication status in Convex
  const authStatus = useQuery(api.organizations.checkAuth);

  // Get user's organizations from Convex
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  // Check setup status for all organizations the user is a member of
  const allOrgIds = userOrgs?.map((org: { _id: Id<"organizations"> }) => org._id) || [];
  const orgSetupChecks = useQuery(
    api.organizations.checkMultipleOrganizationsSetup,
    allOrgIds.length > 0 ? { organizationIds: allOrgIds as Id<"organizations">[] } : "skip"
  );

  // Debug: Log authentication status
  useEffect(() => {
    if (authStatus) {
      console.log("[Setup Page] Convex Auth Status:", authStatus);
      if (!authStatus.authenticated) {
        console.error("[Setup Page] ⚠ Convex authentication failed!");
        console.error("  Clerk signed in:", isSignedIn);
        console.error("  Clerk user ID:", userId);
        console.error("  Convex authenticated:", authStatus.authenticated);
        console.error("  Convex user ID:", authStatus.userId);
        console.error("  Convex issuer:", authStatus.issuer);
      }
    }
  }, [authStatus, isSignedIn, userId]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Redirect if user is already a member of a fully set up organization
  useEffect(() => {
    if (!authLoaded || !isSignedIn || userOrgs === undefined || orgSetupChecks === undefined) return;

    // Find the first organization that is fully set up
    for (const org of userOrgs) {
      const isSetup = orgSetupChecks[org._id];
      if (isSetup && org.slug) {
        // User is already a member of a fully set up organization, redirect them
        router.replace(`/${org.slug}`);
        return;
      }
    }
  }, [authLoaded, isSignedIn, userOrgs, orgSetupChecks, router]);

  // Check if user has other fully set up organizations (for exit button)
  const otherSetupOrgs = userOrgs?.filter((org: { _id: Id<"organizations">; slug?: string }) => {
    const isSetup = orgSetupChecks?.[org._id];
    return isSetup && org.slug;
  }) || [];
  const hasOtherOrganizations = otherSetupOrgs.length > 0;

  // Handle exit - navigate to first existing organization
  const handleExit = () => {
    if (hasOtherOrganizations && otherSetupOrgs[0]?.slug) {
      router.push(`/${otherSetupOrgs[0].slug}`);
    }
  };

  // Loading state
  if (!authLoaded || !isSignedIn || userOrgs === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="size-12 rounded-xl bg-[#26251E] flex items-center justify-center shadow-lg">
            <img src="/portal.svg" alt="Portal" className="size-6 invert opacity-90" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Spinner className="size-5 animate-spin text-[#26251E]/40" />
            <p className="text-sm font-medium text-[#26251E]/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F4] text-[#26251E] selection:bg-[#26251E]/10">
      {/* Header - Minimal & Clean */}
      <header className="fixed top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="size-8 rounded-lg bg-[#26251E] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 duration-300">
            <img src="/portal.svg" alt="Portal" className="size-4 invert opacity-90" />
          </div>
          <span className="font-semibold tracking-tight text-lg opacity-90">Portal</span>
        </div>
        <div className="flex items-center gap-4">
          {hasOtherOrganizations && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleExit}
              className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5 rounded-full"
              aria-label="Exit setup"
            >
              <X className="size-5" weight="bold" />
            </Button>
          )}
          <div className="text-xs font-medium text-[#26251E]/40 uppercase tracking-widest">
            Setup
          </div>
        </div>
      </header>

      {/* Main Content - Centered & Focused */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-0 w-full max-w-5xl mx-auto">
        <OrganizationForm onExit={hasOtherOrganizations ? handleExit : undefined} />
      </main>
    </div>
  );
}
