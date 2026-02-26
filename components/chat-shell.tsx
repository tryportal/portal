"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DmSidebar } from "@/components/dm-sidebar";
import { ResizableSidebar } from "@/components/resizable-sidebar";
import { useMobileSidebar } from "@/components/mobile-sidebar-context";
import { CommandPalette } from "@/components/command-palette";

export function ChatShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isOpen, close } = useMobileSidebar();

  const workspace = useQuery(api.organizations.getWorkspaceBySlug, { slug });

  // Close mobile sidebar on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      {workspace && (
        <CommandPalette
          slug={workspace.slug}
          organizationId={workspace._id}
          role={workspace.role}
        />
      )}
      <div className="flex h-[calc(100dvh-57px)]">
        {/* Desktop sidebar */}
        <ResizableSidebar storageKey="dm-sidebar-width" className="hidden md:flex">
          <DmSidebar />
        </ResizableSidebar>

        {/* Mobile sidebar drawer */}
        <>
          {isOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={close}
            />
          )}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-200 ease-out md:hidden ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <DmSidebar />
          </div>
        </>

        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </>
  );
}
