"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ArrowLeft, UsersThree, Spinner, Buildings } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "@/lib/theme-provider";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm z-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" weight="bold" />
          Back
        </button>

        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1 rounded-full bg-muted/50">
          Join Workspace
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-24 pb-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Public Workspaces
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Join an existing public workspace and start collaborating with the team.
            </p>
          </div>

          {/* Loading State */}
          {publicOrgs === undefined && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading workspaces...</p>
            </div>
          )}

          {/* Empty State */}
          {publicOrgs && publicOrgs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
                <Buildings className="size-8 text-muted-foreground" weight="duotone" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No public workspaces available
                </p>
                <p className="text-xs text-muted-foreground">
                  Check back later or create your own workspace
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Create a workspace instead
              </button>
            </div>
          )}

          {/* Workspaces List */}
          {publicOrgs && publicOrgs.length > 0 && (
            <div className="space-y-3">
              {publicOrgs.map((org) => (
                <button
                  key={org._id}
                  onClick={() => handleJoinOrg(org._id)}
                  disabled={joiningOrgId !== null}
                  className={cn(
                    "group relative w-full p-5 rounded-xl border border-border bg-card text-left",
                    "transition-all duration-150 hover:shadow-sm hover:border-primary/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  )}
                >
                  <div className="relative flex items-center gap-4">
                    {/* Logo */}
                    <div className="shrink-0">
                      {org.logoUrl ? (
                        <Image
                          src={org.logoUrl}
                          alt={org.name}
                          width={48}
                          height={48}
                          className="rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                          <Image
                            src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                            alt="Workspace"
                            width={24}
                            height={24}
                          />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base">
                        {org.name}
                      </h3>
                      {org.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {org.description}
                        </p>
                      )}
                    </div>

                    {/* Join indicator */}
                    {joiningOrgId === org._id ? (
                      <Spinner className="size-5 animate-spin text-primary" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <UsersThree className="size-4" weight="bold" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl" />
      </div>
    </div>
  );
}
