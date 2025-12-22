"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { OrganizationForm } from "@/components/setup/organization-form";

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

  // Check if user has fully set up organizations (for redirect and exit button)
  const setupOrgs = userOrgs?.filter((org: { _id: Id<"organizations">; slug?: string; role?: string }) => {
    const isSetup = orgSetupChecks?.[org._id];
    return isSetup && org.slug;
  }) || [];
  
  // Prioritize organizations where user is admin, then member organizations
  const prioritizedSetupOrgs = setupOrgs.sort((a: { role?: string }, b: { role?: string }) => {
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (a.role !== "admin" && b.role === "admin") return 1;
    return 0;
  });
  
  const hasSetupOrganizations = prioritizedSetupOrgs.length > 0;

  // Redirect users who are members of set up organizations (even if not owners)
  useEffect(() => {
    // Wait for all data to load
    if (!authLoaded || !isSignedIn || userOrgs === undefined || orgSetupChecks === undefined) {
      return;
    }

    // If user has any set up organizations, redirect them to the first one
    if (hasSetupOrganizations && prioritizedSetupOrgs[0]?.slug) {
      router.replace(`/${prioritizedSetupOrgs[0].slug}`);
    }
  }, [authLoaded, isSignedIn, userOrgs, orgSetupChecks, hasSetupOrganizations, prioritizedSetupOrgs, router]);

  // Loading state - also wait for orgSetupChecks to load
  if (!authLoaded || !isSignedIn || userOrgs === undefined || orgSetupChecks === undefined) {
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

  // If user has set up organizations, show nothing while redirecting
  // (This prevents flash of setup form before redirect)
  if (hasSetupOrganizations) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="size-12 rounded-xl bg-[#26251E] flex items-center justify-center shadow-lg">
            <img src="/portal.svg" alt="Portal" className="size-6 invert opacity-90" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Spinner className="size-5 animate-spin text-[#26251E]/40" />
            <p className="text-sm font-medium text-[#26251E]/60">Redirecting...</p>
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
          <div className="text-xs font-medium text-[#26251E]/40 uppercase tracking-widest">
            Setup
          </div>
        </div>
      </header>

      {/* Main Content - Centered & Focused */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-0 w-full max-w-5xl mx-auto">
        <OrganizationForm />
      </main>
    </div>
  );
}
