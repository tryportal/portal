"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ArrowLeft, UsersIcon, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "@/lib/theme-provider";
import { analytics } from "@/lib/analytics";

export default function PublicWorkspacesPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [joiningOrgId, setJoiningOrgId] = useState<Id<"organizations"> | null>(null);

  const publicOrgs = useQuery(api.organizations.getPublicOrganizations);
  const joinOrg = useMutation(api.organizations.joinPublicOrganization);

  const handleJoinOrg = async (orgId: Id<"organizations">) => {
    setJoiningOrgId(orgId);
    try {
      const result = await joinOrg({ organizationId: orgId });
      analytics.workspaceJoined({ slug: result.slug });
      router.push(`/w/${result.slug}`);
      setJoiningOrgId(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to join workspace:", error);
      toast.error(`Failed to join workspace: ${errorMessage}`);
      setJoiningOrgId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <h1 className="text-xl font-semibold tracking-tight">
            Public Workspaces
          </h1>
          <p className="text-sm text-muted-foreground">
            Join an existing public workspace to get started.
          </p>
        </div>

        {/* Workspaces List */}
        {publicOrgs === undefined && (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {publicOrgs && publicOrgs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No public workspaces available to join.
            </p>
          </div>
        )}

        {publicOrgs && publicOrgs.length > 0 && (
          <div className="space-y-2">
            {publicOrgs.map((org) => (
              <button
                key={org._id}
                onClick={() => handleJoinOrg(org._id)}
                disabled={joiningOrgId !== null}
                className="w-full p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  {org.logoUrl ? (
                    <Image
                      src={org.logoUrl}
                      alt={org.name}
                      width={40}
                      height={40}
                      className="rounded"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-foreground">
                      <Image
                        src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                        alt="Workspace"
                        width={20}
                        height={20}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {org.name}
                    </h3>
                    {org.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {org.description}
                      </p>
                    )}
                  </div>
                  {joiningOrgId === org._id ? (
                    <Spinner className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    <UsersIcon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
