"use client";

import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/workspace-context";
import { WorkspaceOptions } from "@/components/workspace-options";

export default function OptionsPage() {
  const router = useRouter();
  const workspace = useWorkspace();

  // Redirect non-admins back to workspace
  if (workspace.role !== "admin") {
    router.push(`/w/${workspace.slug}`);
    return null;
  }

  return <WorkspaceOptions workspace={workspace} />;
}
