"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspacePeople } from "@/components/workspace-people";

export default function PeoplePage({
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
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (workspace === null) {
    router.push("/onboarding");
    return null;
  }

  return (
    <div className="flex" style={{ height: "calc(100vh - 57px)" }}>
      <WorkspaceSidebar slug={slug} organizationId={workspace._id} />
      <main className="flex flex-1">
        <WorkspacePeople organizationId={workspace._id} workspace={workspace} />
      </main>
    </div>
  );
}
