"use client";

import { use } from "react";
import { WorkspaceNavbar } from "@/components/workspace-navbar";

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <div className="min-h-screen">
      <WorkspaceNavbar slug={slug} />
      {children}
    </div>
  );
}
