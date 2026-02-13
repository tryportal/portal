"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WorkspaceNavbar } from "@/components/workspace-navbar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const firstWorkspace = useQuery(api.organizations.getUserFirstWorkspace);

  return (
    <div className="min-h-screen">
      {firstWorkspace?.slug && <WorkspaceNavbar slug={firstWorkspace.slug} />}
      {children}
    </div>
  );
}
