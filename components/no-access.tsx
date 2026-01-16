"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { LockKey, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface NoAccessProps {
  slug: string;
  organizationExists: boolean;
  organization?: {
    _id: Id<"organizations">;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    isPublic?: boolean;
  } | null;
}

export function NoAccess({ slug, organizationExists, organization }: NoAccessProps) {
  const router = useRouter();
  const userOrgs = useQuery(api.organizations.getUserOrganizations);
  const joinPublicOrganization = useMutation(api.organizations.joinPublicOrganization);
  const [isJoining, setIsJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoToOrganization = (orgSlug: string) => {
    router.push(`/w/${orgSlug}`);
  };

  const handleSetup = () => {
    router.push("/setup");
  };

  const handleJoinWorkspace = async () => {
    if (!organization?._id) return;
    
    setIsJoining(true);
    setError(null);
    
    try {
      const result = await joinPublicOrganization({ organizationId: organization._id });
      if (result.slug) {
        router.push(`/w/${result.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join workspace");
      setIsJoining(false);
    }
  };

  // If the organization is public, show the join UI
  const isPublicWorkspace = organizationExists && organization?.isPublic;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card shadow-sm">
        <div className="flex flex-col items-center space-y-4 text-center">
          {isPublicWorkspace ? (
            <>
              {/* Public workspace - show join UI */}
              <WorkspaceIcon
                name={organization?.name || "Workspace"}
                logoUrl={organization?.logoUrl}
                size="xl"
                className="rounded-lg"
              />
              
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground break-words">
                  Join {organization?.name}
                </h1>
                <p className="text-sm text-muted-foreground break-words">
                  {organization?.description || `This is a public workspace. Click below to join and start collaborating.`}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Private workspace or not found */}
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <LockKey className="w-8 h-8 text-muted-foreground" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">
                  {organizationExists ? "No Access" : "Workspace Not Found"}
                </h1>
                <p className="text-sm text-muted-foreground break-words">
                  {organizationExists
                    ? `You don't have access to the workspace "${slug}". Please contact an admin to get an invitation.`
                    : `The workspace "${slug}" doesn't exist or has been removed.`
                  }
                </p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          {isPublicWorkspace ? (
            <>
              {/* Join button for public workspace */}
              <Button
                onClick={handleJoinWorkspace}
                disabled={isJoining}
                className="w-full bg-foreground hover:bg-foreground/90 text-background"
              >
                {isJoining ? "Joining..." : "Join Workspace"}
              </Button>
              
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
              
              {userOrgs && userOrgs.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Or go to your workspaces
                  </div>
                  <div className="space-y-2">
                    {userOrgs.slice(0, 3).map((org) => (
                      <button
                        key={org._id}
                        onClick={() => handleGoToOrganization(org.slug)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {org.logoUrl ? (
                            <img
                              src={org.logoUrl}
                              alt={org.name}
                              className="w-8 h-8 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-foreground">
                                {org.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground truncate">
                              {org.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              /{org.slug}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : userOrgs && userOrgs.length > 0 ? (
            <>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Your Workspaces
              </div>
              <div className="space-y-2">
                {userOrgs.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => handleGoToOrganization(org.slug)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-foreground">
                            {org.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {org.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          /{org.slug}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Get Started
              </div>
              <Button
                onClick={handleSetup}
                className="w-full bg-foreground hover:bg-foreground/90 text-background"
              >
                Create a Workspace
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
