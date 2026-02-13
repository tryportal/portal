"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Facehash } from "facehash";

interface JoinWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinWorkspaceDialog({
  open,
  onOpenChange,
}: JoinWorkspaceDialogProps) {
  const router = useRouter();
  const workspaces = useQuery(api.organizations.listPublicWorkspaces);
  const userWorkspaces = useQuery(api.organizations.getUserWorkspaces);
  const joinWorkspace = useMutation(api.organizations.joinWorkspace);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const memberOfIds = new Set(userWorkspaces?.map((ws) => ws!._id) ?? []);

  const handleJoin = async (orgId: string, slug: string) => {
    setJoiningId(orgId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await joinWorkspace({ organizationId: orgId as any });
      onOpenChange(false);
      router.push(`/w/${slug}`);
    } catch (error) {
      console.error("Failed to join workspace:", error);
      setJoiningId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a workspace</DialogTitle>
          <DialogDescription>
            Browse public workspaces and join one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {workspaces === undefined ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-xs text-muted-foreground">
                No public workspaces available.
              </p>
            </div>
          ) : (
            workspaces.map((workspace) => {
              const alreadyMember = memberOfIds.has(workspace._id);
              return (
                <div
                  key={workspace._id}
                  className="flex items-center gap-3 border border-border p-2.5"
                >
                  {workspace.logoUrl ? (
                    <img
                      src={workspace.logoUrl}
                      alt={workspace.name}
                      className="size-8 object-cover"
                    />
                  ) : (
                    <Facehash
                      name={workspace.slug}
                      size={32}
                      interactive={false}
                      showInitial={false}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {workspace.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {workspace.memberCount}{" "}
                      {workspace.memberCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                  {alreadyMember ? (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        router.push(`/w/${workspace.slug}`);
                      }}
                    >
                      Open
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      onClick={() => handleJoin(workspace._id, workspace.slug)}
                      disabled={joiningId !== null}
                    >
                      {joiningId === workspace._id ? "Joining..." : "Join"}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
