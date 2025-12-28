"use client";

import { useWorkspaceData } from "@/components/workspace-context";
import { InboxPage } from "@/components/preview/inbox-page";
import { usePageTitle } from "@/lib/use-page-title";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function InboxPageRoute() {
  const data = useWorkspaceData();
  const organization = data?.organization;
  
  usePageTitle("Inbox - Portal");

  if (!organization?._id) {
    return (
      <main className="flex-1 overflow-hidden">
        <LoadingSpinner fullScreen />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-hidden">
      <InboxPage organizationId={organization._id} />
    </main>
  );
}

