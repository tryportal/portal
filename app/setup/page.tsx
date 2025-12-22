"use client";

import { useOrganizationList, useAuth, useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner, X } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { OrganizationForm } from "@/components/setup/organization-form";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { organization } = useOrganization();
  const { userMemberships, isLoaded: orgListLoaded, createOrganization, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const firstOrg = userMemberships?.data?.[0]?.organization;
  const clerkOrgId = firstOrg?.id;

  // Check setup status for all organizations the user is a member of
  const allOrgIds = userMemberships?.data?.map((m) => m.organization.id) || [];
  const orgSetupChecks = useQuery(
    api.organizations.checkMultipleOrganizationsSetup,
    allOrgIds.length > 0 ? { clerkOrgIds: allOrgIds } : "skip"
  );

  const isOrgSetup = useQuery(
    api.organizations.isOrganizationSetup,
    clerkOrgId ? { clerkOrgId } : "skip"
  );

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Redirect if user is already a member of a fully set up organization
  useEffect(() => {
    if (
      orgListLoaded &&
      isSignedIn &&
      orgSetupChecks &&
      userMemberships?.data
    ) {
      // Find the first organization that is fully set up
      for (const membership of userMemberships.data) {
        const orgId = membership.organization.id;
        const orgSlug = membership.organization.slug;
        const isSetup = orgSetupChecks[orgId];

        if (isSetup && orgSlug) {
          // User is already a member of a fully set up organization, redirect them
          router.replace(`/${orgSlug}`);
          return;
        }
      }
    }
  }, [
    orgListLoaded,
    isSignedIn,
    orgSetupChecks,
    userMemberships?.data,
    router,
  ]);

  // If user has no organization, create one for them
  useEffect(() => {
    const createDefaultOrg = async () => {
      if (!orgListLoaded || !isSignedIn) return;
      if (userMemberships?.data?.length === 0 && !isCreatingOrg) {
        setIsCreatingOrg(true);
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
          try {
            // Generate a more unique slug using timestamp + random string
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const uniqueSlug = `org-${Date.now()}-${randomSuffix}`;
            
            await createOrganization({
              name: "My Organization",
              slug: uniqueSlug,
            });
            break; // Success, exit loop
          } catch (error: unknown) {
            attempts++;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // If it's a slug conflict and we have attempts left, retry
            if (errorMessage.includes("slug") || errorMessage.includes("taken")) {
              if (attempts >= maxAttempts) {
                console.error("Failed to create organization after multiple attempts:", error);
                // Don't throw - let the user manually create one
                break;
              }
              // Wait a bit before retrying (exponential backoff)
              await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
              continue;
            }
            
            // For other errors, log and break
            console.error("Failed to create organization:", error);
            break;
          }
        }
        
        setIsCreatingOrg(false);
      }
    };
    createDefaultOrg();
  }, [orgListLoaded, isSignedIn, userMemberships?.data?.length, isCreatingOrg, createOrganization]);

  // Check if user has other organizations (excluding current one being set up)
  // This determines if they're creating a new org vs onboarding
  const otherOrganizations = orgListLoaded && userMemberships?.data && organization
    ? userMemberships.data.filter(
        (membership) => membership.organization.id !== organization.id
      )
    : [];
  const hasOtherOrganizations = otherOrganizations.length > 0;

  // Handle exit - navigate to first existing organization
  const handleExit = async () => {
    if (hasOtherOrganizations && otherOrganizations[0] && setActive) {
      const targetOrg = otherOrganizations[0].organization;
      const orgSlug = targetOrg.slug;
      if (orgSlug) {
        try {
          // Switch to the target organization first
          await setActive({ organization: targetOrg.id });
          router.push(`/${orgSlug}`);
        } catch (error) {
          console.error("Failed to switch organization:", error);
          // Still try to navigate even if switch fails
          router.push(`/${orgSlug}`);
        }
      }
    }
  };

  // Loading state
  if (
    !authLoaded ||
    !orgListLoaded ||
    isCreatingOrg ||
    !isSignedIn ||
    (allOrgIds.length > 0 && orgSetupChecks === undefined)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="size-12 rounded-xl bg-[#26251E] flex items-center justify-center shadow-lg">
             <img src="/portal.svg" alt="Portal" className="size-6 invert opacity-90" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Spinner className="size-5 animate-spin text-[#26251E]/40" />
            <p className="text-sm font-medium text-[#26251E]/60">
              {isCreatingOrg ? "Setting up your workspace..." : "Loading..."}
            </p>
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
        <OrganizationForm />
      </main>
    </div>
  );
}
