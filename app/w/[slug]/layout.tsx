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

  // Track workspace view
  const trackedRef = React.useRef(false);
  React.useEffect(() => {
    if (membership && organization && !trackedRef.current) {
      analytics.workspaceViewed({ workspaceId: organization._id, slug });
      trackedRef.current = true;
    }
  }, [membership, organization, slug]);

  // Sync activeTab with current route
  React.useEffect(() => {
    if (!pathname || !slug) return;
    
    if (pathname.includes(`/w/${slug}/messages`)) {
      setActiveTab("messages");
    } else if (pathname.includes(`/w/${slug}/inbox`)) {
      setActiveTab("inbox");
    } else if (pathname === `/w/${slug}` || pathname.includes(`/w/${slug}/`)) {
      // Check if it's a channel route (has category/channel) or just the home page
      const pathParts = pathname.split("/").filter(Boolean);
      // If we're at /w/[slug] or /w/[slug]/people etc., it's "home"
      // If it's /w/[slug]/messages or /w/[slug]/inbox, we already handled it above
      if (!pathname.includes("/messages") && !pathname.includes("/inbox")) {
        setActiveTab("home");
      }
    }
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

  // Hide sidebar on messages tab
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
