"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export default function Page() {
  const router = useRouter();
  const { userMemberships, isLoaded: orgListLoaded } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  // Prioritize organization where user is owner, otherwise use first org
  const targetMembership = userMemberships?.data?.find(
    (m) => m.role === "org:admin" || m.role === "org:owner"
  ) || userMemberships?.data?.[0];
  
  const targetOrg = targetMembership?.organization;
  const clerkOrgId = targetOrg?.id;

  const isOrgSetup = useQuery(
    api.organizations.isOrganizationSetup,
    clerkOrgId ? { clerkOrgId } : "skip"
  );

  useEffect(() => {
    if (!orgListLoaded) return;

    // If user has no organization, redirect to setup
    if (!targetOrg) {
      router.replace("/setup");
      return;
    }

    // If organization setup check is still loading, wait
    if (isOrgSetup === undefined) {
      return;
    }

    // If organization setup check is complete and org is not set up, redirect
    if (isOrgSetup === false) {
      router.replace("/setup");
      return;
    }

    // If organization is set up, redirect to the org's slug
    if (isOrgSetup === true && targetOrg.slug) {
      router.replace(`/${targetOrg.slug}`);
      return;
    }
  }, [orgListLoaded, targetOrg, isOrgSetup, router]);

  // Show nothing while checking - the page is empty as requested
  return null;
}
