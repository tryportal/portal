"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePathname } from "next/navigation";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspaceNotFound } from "@/components/workspace-not-found";
import { WorkspaceProvider } from "@/components/workspace-context";
import { DotLoader } from "@/components/ui/dot-loader";

/** Routes that do NOT show the sidebar */
const NO_SIDEBAR_ROUTES = ["/inbox", "/saved"];

export function WorkspaceShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const workspace = useQuery(api.organizations.getWorkspaceBySlug, { slug });

  const base = `/w/${slug}`;
  const subPath = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const showSidebar = !NO_SIDEBAR_ROUTES.some((r) => subPath.startsWith(r));

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
    <WorkspaceProvider workspace={workspace}>
      <div className="flex" style={{ height: "calc(100vh - 57px)" }}>
        {showSidebar && (
          <WorkspaceSidebar
            slug={slug}
            organizationId={workspace._id}
            role={workspace.role}
          />
        )}
        <main className="flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  );
}
