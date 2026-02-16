"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check } from "@phosphor-icons/react";
import { WorkspaceIcon } from "@/components/workspace-icon";
import { DotLoader } from "@/components/ui/dot-loader";

export default function SettingsPage() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const currentUser = useQuery(api.users.currentUser);
  const workspaces = useQuery(api.organizations.getUserWorkspaces);
  const setPrimaryWorkspace = useMutation(api.users.setPrimaryWorkspace);

  if (!user || !currentUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <DotLoader />
      </div>
    );
  }

  const fullName =
    [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
    user.fullName ||
    "User";

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      {/* Account tab header */}
      <h1 className="text-sm font-bold">Account</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Manage your profile and preferences
      </p>

      <Separator className="my-6" />

      {/* Profile section */}
      <div className="flex items-center gap-4">
        <img
          src={user.imageUrl}
          alt={fullName}
          className="size-16 object-cover"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">{fullName}</span>
          <span className="text-xs text-muted-foreground">
            {currentUser.email}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => openUserProfile()}
      >
        Manage Account
      </Button>

      <Separator className="my-6" />

      {/* Default workspace section */}
      <div>
        <h2 className="text-sm font-bold">Default Workspace</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose which workspace opens when you launch Portal
        </p>

        <div className="mt-4 flex flex-col gap-1">
          {workspaces?.map((ws) => {
            if (!ws) return null;
            const isDefault =
              currentUser.primaryWorkspaceId === ws._id;

            return (
              <button
                key={ws._id}
                onClick={() => {
                  if (!isDefault) {
                    setPrimaryWorkspace({
                      workspaceId: ws._id as Id<"organizations">,
                    });
                  }
                }}
                className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs hover:bg-muted ${
                  isDefault
                    ? "border-foreground bg-muted font-bold"
                    : "border-border"
                }`}
              >
                <WorkspaceIcon
                  logoUrl={ws.logoUrl}
                  name={ws.name}
                  slug={ws.slug}
                  size={20}
                />
                <span className="flex-1 truncate">{ws.name}</span>
                {isDefault && (
                  <Check
                    size={14}
                    weight="bold"
                    className="text-foreground"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
