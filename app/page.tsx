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

  const firstOrg = userMemberships?.data?.[0]?.organization;
  const clerkOrgId = firstOrg?.id;

  const isOrgSetup = useQuery(
    api.organizations.isOrganizationSetup,
    clerkOrgId ? { clerkOrgId } : "skip"
  );

  useEffect(() => {
    if (!orgListLoaded) return;

    // If user has no organization, redirect to setup
    if (!firstOrg) {
      router.replace("/setup");
      return;
    }

    // If organization setup check is complete and org is not set up, redirect
    if (isOrgSetup === false) {
      router.replace("/setup");
      return;
    }
  }, [orgListLoaded, firstOrg, isOrgSetup, router]);

  // Show nothing while checking - the page is empty as requested
  return null;
}
