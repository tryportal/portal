"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceData } from "@/components/workspace-context";
import { useUserSettings } from "@/lib/user-settings";
import { PearlChat } from "@/components/pearl/pearl-chat";
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePageTitle } from "@/lib/use-page-title";

export default function PearlPage() {
  usePageTitle("Pearl - AI Assistant");

  const router = useRouter();
  const { organization, isLoading, slug } = useWorkspaceData();
  const { settings } = useUserSettings();

  // Redirect if AI is disabled
  if (!settings.aiEnabled) {
    router.push(`/w/${slug}/messages`);
    return null;
  }

  if (isLoading || !organization) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner text="Loading Pearl..." />
      </div>
    );
  }

  return (
    <PearlChat
      onBack={() => router.push(`/w/${slug}/messages`)}
    />
  );
}
