"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { UsersIcon, Spinner } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "@/lib/theme-provider";
import { analytics } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JoinWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinWorkspaceDialog({ open, onOpenChange }: JoinWorkspaceDialogProps) {
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
      onOpenChange(false);
      router.push(`/w/${result.slug}`);
    } catch (error) {
      console.error("Failed to join workspace:", error);
      setJoiningOrgId(null);
    }
  };

  const hasPublicOrgs = publicOrgs && publicOrgs.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a workspace</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {hasPublicOrgs && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
          )}

          {publicOrgs && publicOrgs.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No public workspaces available to join.
            </p>
          )}

          {publicOrgs === undefined && (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
