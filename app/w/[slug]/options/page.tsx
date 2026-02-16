"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspaceOptions } from "@/components/workspace-options";
import { WorkspaceNotFound } from "@/components/workspace-not-found";
import { DotLoader } from "@/components/ui/dot-loader";

export default function OptionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
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

  // Redirect non-admins back to workspace
  if (workspace.role !== "admin") {
    router.push(`/w/${slug}`);
    return null;
  }

  return (
    <div className="flex" style={{ height: "calc(100vh - 57px)" }}>
      <WorkspaceSidebar slug={slug} organizationId={workspace._id} role={workspace.role} />
      <main className="flex flex-1">
        <WorkspaceOptions workspace={workspace} />
      </main>
    </div>
  );
}
