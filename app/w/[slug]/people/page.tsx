"use client";

import { useWorkspace } from "@/components/workspace-context";
import { WorkspacePeople } from "@/components/workspace-people";

export default function PeoplePage() {
  const workspace = useWorkspace();

  return (
    <WorkspacePeople organizationId={workspace._id} workspace={workspace} />
  );
}
