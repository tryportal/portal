"use client";

import * as React from "react";

interface WorkspaceContextType {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeChannel: string | null;
  setActiveChannel: React.Dispatch<React.SetStateAction<string | null>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

const WorkspaceContext = React.createContext<WorkspaceContextType | undefined>(
  undefined
);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeChannel, setActiveChannel] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("home");

  return (
    <WorkspaceContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        activeChannel,
        setActiveChannel,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = React.useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
