"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { SavedMessagesPage } from "@/components/preview/saved-messages-page";

export default function SavedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [routeParams, setRouteParams] = React.useState<{ slug: string } | null>(null);

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setRouteParams(resolved));
    } else {
      setRouteParams(params);
    }
  }, [params]);

  // Get organization by slug
  const organization = useQuery(
    api.organizations.getOrganizationBySlug,
    routeParams ? { slug: routeParams.slug } : "skip"
  );

  // Loading state
  if (!routeParams || organization === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F7F7F4]">
        <CircleNotchIcon className="size-6 animate-spin text-[#26251E]/20" />
      </div>
    );
  }

  // Organization not found
  if (organization === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F7F7F4]">
        <p className="text-sm text-[#26251E]/60">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F7F7F4]">
      <SavedMessagesPage organizationId={organization._id} />
    </div>
  );
}
