"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CaretUpDown, Plus, SignIn, Check } from "@phosphor-icons/react";
import { WorkspaceIcon } from "@/components/workspace-icon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { JoinWorkspaceDialog } from "@/components/join-workspace-dialog";

export function WorkspaceSwitcher({ slug }: { slug: string }) {
  const router = useRouter();
  const workspaces = useQuery(api.organizations.getUserWorkspaces);
  const currentWorkspace = useQuery(api.organizations.getWorkspaceBySlug, {
    slug,
  });
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 border-l border-border px-3 text-xs hover:bg-muted cursor-pointer outline-none">
          <WorkspaceIcon
            logoUrl={currentWorkspace?.logoUrl}
            name={currentWorkspace?.name ?? "Workspace"}
            slug={currentWorkspace?.slug ?? slug}
            size={20}
          />
          <span className="max-w-24 truncate">
            {currentWorkspace?.name ?? "Workspace"}
          </span>
          <CaretUpDown size={14} className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={0} className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces?.map((ws) => {
              const isCurrent = ws!.slug === slug;
              return (
                <DropdownMenuItem
                  key={ws!._id}
                  onClick={() => {
                    if (!isCurrent) router.push(`/w/${ws!.slug}`);
                  }}
                  className={isCurrent ? "font-bold" : ""}
                >
                  <WorkspaceIcon
                    logoUrl={ws!.logoUrl}
                    name={ws!.name}
                    slug={ws!.slug}
                    size={16}
                  />
                  <span className="truncate">{ws!.name}</span>
                  {isCurrent && (
                    <Check
                      size={12}
                      weight="bold"
                      className="ml-auto text-foreground"
                    />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/onboarding?step=create")}>
            <Plus size={14} />
            Create workspace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setJoinOpen(true)}>
            <SignIn size={14} />
            Join workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JoinWorkspaceDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </>
  );
}
