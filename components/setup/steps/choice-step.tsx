"use client";

import { useRouter } from "next/navigation";
import { PlusIcon, UsersIcon } from "@phosphor-icons/react";

interface ChoiceStepProps {
  onCreateNew: () => void;
  onJoinWorkspace: (slug: string) => void;
}

export function ChoiceStep({ onCreateNew }: ChoiceStepProps) {
  const router = useRouter();

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

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or
            </span>
          </div>
        </div>

        {/* Join Public Workspace Button */}
        <button
          onClick={() => router.push('/setup/public-workspaces')}
          className="w-full p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left group"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <UsersIcon className="size-5" weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground group-hover:text-foreground">
                Browse public workspaces
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Join an existing public workspace
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
