"use client";

import { use } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { WorkspaceOverview } from "@/components/workspace-overview";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const workspace = useWorkspace();

  return (
    <WorkspaceOverview
      slug={slug}
      organizationId={workspace._id}
      workspace={workspace}
    />
  );
}
