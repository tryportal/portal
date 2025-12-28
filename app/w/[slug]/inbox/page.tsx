"use client";

import { useWorkspaceData } from "@/components/workspace-context";
import { InboxPage } from "@/components/preview/inbox-page";

export default function InboxPageRoute() {
  const data = useWorkspaceData();
  const organization = data?.organization;

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
      <InboxPage organizationId={organization._id} />
    </main>
  );
}

