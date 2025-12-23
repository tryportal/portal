"use client";

import { useWorkspaceData } from "@/components/workspace-context";
import { WorkspaceSettingsPage } from "@/components/preview/workspace-settings-page";
import { SettingsPageSkeleton } from "@/components/skeletons";

export default function SettingsPage() {
  const { organization, isLoading } = useWorkspaceData();

  // Show skeleton while loading - Next.js loading.tsx handles initial transition
  if (isLoading || !organization?._id) {
    return <SettingsPageSkeleton />;
  }

  return (
    <main className="flex-1 overflow-hidden">
      <WorkspaceSettingsPage organizationId={organization._id} />
    </main>
  );
}
