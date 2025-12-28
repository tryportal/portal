"use client";

import { useWorkspace, useWorkspaceData } from "@/components/workspace-context";
import { OverviewPage } from "@/components/preview/overview-page";

export default function WorkspacePage() {
  const data = useWorkspaceData();
  const organization = data?.organization;

  // Show overview page when no channel is selected
  // The actual channel view is handled by the [category]/[channel] route
  if (!organization?._id) {
    return (
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-[#26251E]/60">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-hidden">
      <OverviewPage organizationId={organization._id} />
    </main>
  );
}
