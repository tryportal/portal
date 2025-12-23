"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  logoUrl?: string;
}

interface Membership {
  role: "admin" | "member";
}

interface UserOrganization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  logoUrl?: string;
  role: "admin" | "member";
}

interface WorkspaceDataContextType {
  organization: Organization | null | undefined;
  membership: Membership | null | undefined;
  userOrganizations: UserOrganization[] | undefined;
  isLoading: boolean;
  isError: boolean;
  slug: string;
}

interface WorkspaceContextType {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeChannel: string | null;
  setActiveChannel: React.Dispatch<React.SetStateAction<string | null>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  // Data from queries - shared across all workspace components
  data: WorkspaceDataContextType;
}

const WorkspaceContext = React.createContext<WorkspaceContextType | undefined>(
  undefined
);

interface WorkspaceProviderProps {
  children: React.ReactNode;
  slug: string;
}

export function WorkspaceProvider({ children, slug }: WorkspaceProviderProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeChannel, setActiveChannel] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("home");
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  // Centralized data fetching - these queries are shared across all workspace components
  const organization = useQuery(
    api.organizations.getOrganizationBySlug,
    slug ? { slug } : "skip"
  );

  const membership = useQuery(
    api.organizations.getUserMembership,
    organization?._id ? { organizationId: organization._id } : "skip"
  );

  const userOrganizations = useQuery(api.organizations.getUserOrganizations);

  // Derived loading state
  const isLoading = !authLoaded || 
    organization === undefined || 
    (organization !== null && membership === undefined) ||
    userOrganizations === undefined;

  const isError = organization === null;

  const data: WorkspaceDataContextType = {
    organization,
    membership,
    userOrganizations,
    isLoading,
    isError,
    slug,
  };

  return (
    <WorkspaceContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        activeChannel,
        setActiveChannel,
        activeTab,
        setActiveTab,
        data,
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

// Hook specifically for accessing workspace data
export function useWorkspaceData() {
  const { data } = useWorkspace();
  return data;
}
