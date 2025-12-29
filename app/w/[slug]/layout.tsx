"use client";

import * as React from "react";
import { WorkspaceProvider, useWorkspace, useWorkspaceData } from "@/components/workspace-context";
import { UserDataCacheProvider } from "@/components/user-data-cache";
import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { TopNav } from "@/components/preview/top-nav";
import { Sidebar } from "@/components/preview/sidebar";
import { NoAccess } from "@/components/no-access";
import { LoadingSpinner } from "@/components/loading-spinner";
import { analytics } from "@/lib/analytics";

// Helper to get the current tab from a pathname
function getTabFromPathname(pathname: string | null, slug: string): "home" | "messages" | "inbox" {
  if (!pathname || !slug) return "home";
  
  if (pathname.includes(`/w/${slug}/messages`)) {
    return "messages";
  } else if (pathname.includes(`/w/${slug}/inbox`)) {
    return "inbox";
  }
  return "home";
}

function WorkspaceLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    activeTab,
    setActiveTab
  } = useWorkspace();

  const { membership, isLoading, isError, slug, organization } = useWorkspaceData();

  // Track the tab derived from the actual current pathname
  const currentPathTab = getTabFromPathname(pathname, slug);
  
  // Track if we're transitioning between major tabs (home/messages/inbox)
  // This happens when activeTab (user's desired tab) differs from currentPathTab (actual route)
  const isTransitioning = activeTab !== currentPathTab;
  
  // Track the previous tab for determining sidebar visibility during transitions
  const prevTabRef = React.useRef(activeTab);
  React.useEffect(() => {
    if (!isTransitioning) {
      prevTabRef.current = activeTab;
    }
  }, [activeTab, isTransitioning]);

  // Track workspace view
  const trackedRef = React.useRef(false);
  React.useEffect(() => {
    if (membership && organization && !trackedRef.current) {
      analytics.workspaceViewed({ workspaceId: organization._id, slug });
      trackedRef.current = true;
    }
  }, [membership, organization, slug]);

  // Sync activeTab with current route (for direct navigation/browser back-forward)
  React.useEffect(() => {
    if (!pathname || !slug) return;
    const tabFromPath = getTabFromPathname(pathname, slug);
    setActiveTab(tabFromPath);
  }, [pathname, slug, setActiveTab]);

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Not signed in - show nothing (will redirect)
  if (!authLoaded || !isSignedIn) {
    return <LoadingSpinner fullScreen />;
  }

  // If workspace doesn't exist, show error immediately
  if (isError) {
    return <NoAccess slug={slug} organizationExists={false} />;
  }

  // Show loading spinner while loading
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // User doesn't have access to this workspace
  if (!membership) {
    return <NoAccess slug={slug} organizationExists={true} />;
  }

  const handleTabChange = (tab: string) => {
    analytics.tabChanged({ tab });
    setActiveTab(tab as "home" | "messages" | "inbox");
  };

  // Determine sidebar visibility based on destination tab during transitions
  // During transition: show sidebar based on the DESTINATION tab (activeTab)
  // Not transitioning: show sidebar based on current tab
  const showSidebar = activeTab !== "messages";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F4]">
      {/* Top Navigation */}
      <TopNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on messages tab */}
        {showSidebar && (
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
          />
        )}

        {/* Page Content - show loading state during tab transitions */}
        {isTransitioning ? (
          <div className="flex-1 overflow-hidden">
            <LoadingSpinner fullScreen />
          </div>
        ) : (
          <React.Suspense fallback={<div className="flex-1 overflow-hidden"><LoadingSpinner fullScreen /></div>}>
            {children}
          </React.Suspense>
        )}
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
    return <LoadingSpinner fullScreen />;
  }

  return (
    <WorkspaceProvider slug={slug}>
      <UserDataCacheProvider>
        <WorkspaceLayoutContent>{children}</WorkspaceLayoutContent>
      </UserDataCacheProvider>
    </WorkspaceProvider>
  );
}
