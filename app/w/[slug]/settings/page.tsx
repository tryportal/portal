"use client";

import { useWorkspaceData } from "@/components/workspace-context";
import { WorkspaceSettingsPage } from "@/components/preview/workspace-settings-page";
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePageTitle } from "@/lib/use-page-title";

export default function SettingsPage() {
  const { organization, isLoading } = useWorkspaceData();
  
  usePageTitle("Settings - Portal");

  // Show loading spinner while loading
  if (isLoading || !organization?._id) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <main className="flex-1 overflow-hidden">
      <WorkspaceSettingsPage organizationId={organization._id} />
    </main>
  );
}
