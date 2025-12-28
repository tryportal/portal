"use client";

import * as React from "react";
import { WorkspaceProvider, useWorkspace, useWorkspaceData } from "@/components/workspace-context";
import { UserDataCacheProvider } from "@/components/user-data-cache";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/preview/top-nav";
import { Sidebar } from "@/components/preview/sidebar";
import { NoAccess } from "@/components/no-access";
import { SidebarSkeleton, TopNavSkeleton } from "@/components/skeletons";

function WorkspaceLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    activeTab,
    setActiveTab
  } = useWorkspace();

  const { membership, isLoading, isError, slug } = useWorkspaceData();

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Not signed in - show nothing (will redirect)
  if (!authLoaded || !isSignedIn) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F4]">
        <TopNavSkeleton />
        <div className="flex flex-1 overflow-hidden">
          <SidebarSkeleton />
          <div className="flex-1" />
        </div>
      </div>
    );
  }

  // If workspace doesn't exist, show error immediately
  if (isError) {
    return <NoAccess slug={slug} organizationExists={false} />;
  }

  // Show layout shell with skeletons while loading
  // This provides instant visual feedback while data loads
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F4]">
        <TopNavSkeleton />
        <div className="flex flex-1 overflow-hidden">
          <SidebarSkeleton />
          {/* Show the page's loading state via Next.js loading.tsx */}
          {children}
        </div>
      </div>
    );
  }

  // User doesn't have access to this workspace
  if (!membership) {
    return <NoAccess slug={slug} organizationExists={true} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F4]">
      {/* Top Navigation */}
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Page Content - wrapped in React.Suspense for per-page loading states */}
        <React.Suspense fallback={children}>
          {children}
        </React.Suspense>
      </div>
    </div>
  );
}

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const [slug, setSlug] = React.useState<string>("");

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setSlug(resolved.slug));
    } else {
      setSlug(params.slug);
    }
  }, [params]);

  // Don't render until we have the slug
  if (!slug) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F4]">
        <TopNavSkeleton />
        <div className="flex flex-1 overflow-hidden">
          <SidebarSkeleton />
          <div className="flex-1" />
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider slug={slug}>
      <UserDataCacheProvider>
        <WorkspaceLayoutContent>{children}</WorkspaceLayoutContent>
      </UserDataCacheProvider>
    </WorkspaceProvider>
  );
}
