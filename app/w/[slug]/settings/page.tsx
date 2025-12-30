"use client";

import { useWorkspaceData } from "@/components/workspace-context";
import { WorkspaceSettingsPage } from "@/components/preview/workspace-settings-page";
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePageTitle } from "@/lib/use-page-title";

export default function SettingsPage() {
  const { organization, isLoading } = useWorkspaceData();
  
  usePageTitle("Settings - Portal");

  // Render immediately for instant navigation - handle loading in child component
  return (
    <main className="flex-1 overflow-hidden">
      <WorkspaceSettingsPage organizationId={organization?._id || ("" as any)} />
    </main>
  );
}
