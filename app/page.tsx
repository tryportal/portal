"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export default function Page() {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

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

    // If not signed in, redirect to sign-in
    if (!isSignedIn) {
      router.replace("/sign-in");
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
      router.replace(`/${targetOrg.slug}`);
      return;
    }
  }, [authLoaded, isSignedIn, userOrgs, targetOrg, isOrgSetup, router]);

  // Show nothing while checking - the page is empty as requested
  return null;
}
