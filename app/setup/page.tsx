"use client";

import { useOrganizationList, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { OrganizationForm } from "@/components/setup/organization-form";

export default function SetupPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { userMemberships, isLoaded: orgListLoaded, createOrganization } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const firstOrg = userMemberships?.data?.[0]?.organization;
  const clerkOrgId = firstOrg?.id;

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

  // Redirect to home if organization is already set up
  useEffect(() => {
    if (isOrgSetup === true) {
      router.replace("/");
    }
  }, [isOrgSetup, router]);

  // Loading state
  if (!authLoaded || !orgListLoaded || isCreatingOrg || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="size-8 animate-spin text-[#26251E]/40" />
          <p className="text-sm text-[#26251E]/60">
            {isCreatingOrg ? "Setting up your organization..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Waiting for organization setup check
  if (isOrgSetup === undefined && clerkOrgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <Spinner className="size-8 animate-spin text-[#26251E]/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F4]">
      {/* Header */}
      <header className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-[#26251E]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#26251E]">
            <img src="/portal.svg" alt="Portal" className="size-5 invert" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Portal</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <OrganizationForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-[#26251E]/40">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </footer>
    </div>
  );
}

