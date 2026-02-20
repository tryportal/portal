"use client";

import { createContext, useContext } from "react";
import { Id } from "@/convex/_generated/dataModel";

export interface WorkspaceData {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  description?: string;
  logoUrl: string | null;
  role: string;
  createdBy: string;
  isPublic: boolean;
}

const WorkspaceContext = createContext<WorkspaceData | null>(null);

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: WorkspaceData;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceData {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
