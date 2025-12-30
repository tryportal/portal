"use client";

import { useWorkspace, useWorkspaceData } from "@/components/workspace-context";
import { OverviewPage } from "@/components/preview/overview-page";
import { usePageTitle } from "@/lib/use-page-title";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function WorkspacePage() {
  const data = useWorkspaceData();
  const organization = data?.organization;
  
  usePageTitle(organization?.name ? `${organization.name} - Portal` : "Home - Portal");

  // Show overview page when no channel is selected
  // The actual channel view is handled by the [category]/[channel] route
  // Remove the loading spinner - render immediately for instant navigation
  return (
    <main className="flex-1 overflow-hidden">
      <OverviewPage organizationId={organization?._id || ("" as any)} />
    </main>
  );
}
