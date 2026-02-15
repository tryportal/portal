"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";
import { Facehash } from "facehash";

interface JoinStepProps {
  onBack: () => void;
  onJoinedSlug: (slug: string) => void;
}

export function JoinStep({ onBack, onJoinedSlug }: JoinStepProps) {
  const workspaces = useQuery(api.organizations.listPublicWorkspaces);
  const joinWorkspace = useMutation(api.organizations.joinWorkspace);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const handleJoin = async (orgId: string, slug: string) => {
    setJoiningId(orgId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await joinWorkspace({ organizationId: orgId as any });
      onJoinedSlug(slug);
    } catch (error) {
      console.error("Failed to join workspace:", error);
      setJoiningId(null);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-xl font-medium tracking-tight">
          Join a workspace
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Browse public workspaces and join one.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {workspaces === undefined ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-muted-foreground">
              No public workspaces available.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try creating your own workspace instead.
            </p>
          </div>
        ) : (
          workspaces.map((workspace) => (
            <div
              key={workspace._id}
              className="flex items-center gap-3 border border-border p-3"
            >
              {workspace.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={workspace.logoUrl}
                  alt={workspace.name}
                  className="size-10 object-cover"
                />
              ) : (
                <Facehash
                  name={workspace.slug}
                  size={40}
                  interactive={false}
                  showInitial={false}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{workspace.name}</p>
                {workspace.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {workspace.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {workspace.memberCount} {workspace.memberCount === 1 ? "member" : "members"}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleJoin(workspace._id, workspace.slug)}
                disabled={joiningId !== null}
              >
                {joiningId === workspace._id ? "Joining..." : "Join"}
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back
        </button>
      </div>
    </div>
  );
}
