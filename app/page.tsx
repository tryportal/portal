"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import { useTheme } from "@/lib/theme-provider";

export default function Page() {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Get user's organizations from Convex
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  // Prioritize organization where user is admin, otherwise use first org
  const targetOrg = userOrgs?.find((org: { role: string }) => org.role === "admin") || userOrgs?.[0];

  // Check setup status for the target organization
  const isOrgSetup = useQuery(
    api.organizations.isOrganizationSetup,
    targetOrg?._id ? { organizationId: targetOrg._id } : "skip"
  );

  useEffect(() => {
    if (!authLoaded) return;

    // If not signed in, redirect to landing page
    if (!isSignedIn) {
      router.replace("/home");
      return;
    }

    // Wait for organizations to load
    if (userOrgs === undefined) return;

    // If user has no organization, redirect to setup
    if (userOrgs.length === 0) {
      router.replace("/setup");
      return;
    }

    // If organization setup check is still loading, wait
    if (isOrgSetup === undefined) {
      return;
    }

    // If organization is not set up, redirect to setup
    if (isOrgSetup === false) {
      router.replace("/setup");
      return;
    }

    // If organization is set up, redirect to the org's slug
    if (isOrgSetup === true && targetOrg?.slug) {
      router.replace(`/w/${targetOrg.slug}`);
      return;
    }
  }, [authLoaded, isSignedIn, userOrgs, targetOrg, isOrgSetup, router]);

  // Show branded loading while redirecting
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <Image
          src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
          alt="Portal"
          width={120}
          height={32}
          className="h-8 w-auto"
          priority
        />
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground/40" />
      </div>
    </div>
  );
}
