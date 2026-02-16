"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspacePeople } from "@/components/workspace-people";
import { WorkspaceNotFound } from "@/components/workspace-not-found";
import { DotLoader } from "@/components/ui/dot-loader";

export default function PeoplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const workspace = useQuery(api.organizations.getWorkspaceBySlug, { slug });

  if (workspace === undefined) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ height: "calc(100vh - 57px)" }}
      >
        <DotLoader />
      </div>
    );
  }

  if (workspace === null) {
    return <WorkspaceNotFound slug={slug} />;
  }

  return (
    <div className="flex" style={{ height: "calc(100vh - 57px)" }}>
      <WorkspaceSidebar slug={slug} organizationId={workspace._id} role={workspace.role} />
      <main className="flex flex-1">
        <WorkspacePeople organizationId={workspace._id} workspace={workspace} />
      </main>
    </div>
  );
}
