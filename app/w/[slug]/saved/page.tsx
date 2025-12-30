"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SavedMessagesPage } from "@/components/preview/saved-messages-page";
import { usePageTitle } from "@/lib/use-page-title";
import { LoadingSpinner } from "@/components/loading-spinner";

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

  // Set page title
  usePageTitle("Saved Messages - Portal");

  // Loading state
  if (!routeParams || organization === undefined) {
    return <LoadingSpinner fullScreen />;
  }

  // Organization not found
  if (organization === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <SavedMessagesPage organizationId={organization._id} />
    </div>
  );
}
