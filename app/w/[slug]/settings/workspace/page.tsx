"use client";

import { useWorkspaceData } from "@/components/workspace-context";
import { WorkspaceSettingsSection } from "@/components/preview/workspace-settings-section";
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePageTitle } from "@/lib/use-page-title";
import { WarningCircleIcon } from "@phosphor-icons/react";

export default function WorkspaceSettingsPage() {
    const { organization, membership, isLoading } = useWorkspaceData();


    usePageTitle("Workspace Settings - Portal");

    // Show loading spinner while loading
    if (isLoading || !organization?._id) {
        return <LoadingSpinner fullScreen />;
    }

    // Check if user is admin
    const isAdmin = membership?.role === "admin";

    // Redirect non-admins to customization
    if (!isAdmin) {
        return (
            <div className="flex h-full items-center justify-center bg-background p-6">
                <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-sm border border-border text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                        <WarningCircleIcon className="size-6" weight="fill" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        Access Denied
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Only workspace admins can access workspace settings.
                    </p>
                </div>
            </div>
        );
    }

    return <WorkspaceSettingsSection organizationId={organization._id} />;
}
