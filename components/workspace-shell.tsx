"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePathname } from "next/navigation";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspaceNotFound } from "@/components/workspace-not-found";
import { WorkspaceProvider } from "@/components/workspace-context";
import { DotLoader } from "@/components/ui/dot-loader";
import { useMobileSidebar } from "@/components/mobile-sidebar-context";
import { NotificationPrompt } from "@/components/notification-prompt";
import { useMentionNotifications } from "@/components/use-mention-notifications";

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
  const { isOpen, close } = useMobileSidebar();

  const base = `/w/${slug}`;
  const subPath = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const showSidebar = !NO_SIDEBAR_ROUTES.some((r) => subPath.startsWith(r));

  // Close mobile sidebar on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Browser notifications for mentions
  useMentionNotifications(workspace?._id);

  if (workspace === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center h-[calc(100dvh-57px)]">
        <DotLoader />
      </div>
    );
  }

  if (workspace === null) {
    return <WorkspaceNotFound slug={slug} />;
  }

  return (
    <WorkspaceProvider workspace={workspace}>
      <NotificationPrompt />
      <div className="flex h-[calc(100dvh-57px)]">
        {/* Desktop sidebar */}
        {showSidebar && (
          <div className="hidden md:block">
            <WorkspaceSidebar
              slug={slug}
              organizationId={workspace._id}
              role={workspace.role}
            />
          </div>
        )}

        {/* Mobile sidebar drawer */}
        {showSidebar && (
          <>
            {/* Backdrop */}
            {isOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                onClick={close}
              />
            )}
            {/* Drawer */}
            <div
              className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-200 ease-out md:hidden ${
                isOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <WorkspaceSidebar
                slug={slug}
                organizationId={workspace._id}
                role={workspace.role}
                isMobileDrawer
              />
            </div>
          </>
        )}

        <main className="flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  );
}
