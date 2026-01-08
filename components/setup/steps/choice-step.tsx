"use client";

import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { PlusIcon, UsersIcon, Spinner } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "@/lib/theme-provider";

interface ChoiceStepProps {
  onCreateNew: () => void;
  onJoinWorkspace: (slug: string) => void;
}

export function ChoiceStep({ onCreateNew, onJoinWorkspace }: ChoiceStepProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [joiningOrgId, setJoiningOrgId] = useState<Id<"organizations"> | null>(null);

  const publicOrgs = useQuery(api.organizations.getPublicOrganizations);
  const joinOrg = useMutation(api.organizations.joinPublicOrganization);

  const handleJoinOrg = async (orgId: Id<"organizations">) => {
    setJoiningOrgId(orgId);
    try {
      const result = await joinOrg({ organizationId: orgId });
      onJoinWorkspace(result.slug);
    } catch (error) {
      console.error("Failed to join workspace:", error);
      setJoiningOrgId(null);
    }
  };

  const hasPublicOrgs = publicOrgs && publicOrgs.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Get started with Portal
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a new workspace for your team or join an existing one.
        </p>
      </div>

      <div className="space-y-3">
        {/* Create New Workspace Option */}
        <button
          onClick={onCreateNew}
          className="w-full p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left group"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PlusIcon className="size-5" weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground group-hover:text-foreground">
                Create a new workspace
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Start fresh with your own workspace for your team
              </p>
            </div>
          </div>
        </button>

        {/* Join Public Workspace Section */}
        {hasPublicOrgs && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or join a public workspace
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {publicOrgs.map((org) => (
                <button
                  key={org._id}
                  onClick={() => handleJoinOrg(org._id)}
                  disabled={joiningOrgId !== null}
                  className="w-full p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    {org.logoUrl ? (
                      <Image
                        src={org.logoUrl}
                        alt={org.name}
                        width={32}
                        height={32}
                        className="rounded"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-foreground">
                        <Image
                          src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                          alt="Workspace"
                          width={16}
                          height={16}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm truncate">
                        {org.name}
                      </h3>
                      {org.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {org.description}
                        </p>
                      )}
                    </div>
                    {joiningOrgId === org._id ? (
                      <Spinner className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <UsersIcon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* No public workspaces available */}
        {publicOrgs && publicOrgs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No public workspaces available to join.
          </p>
        )}

        {/* Loading state */}
        {publicOrgs === undefined && (
          <div className="flex items-center justify-center py-4">
            <Spinner className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
