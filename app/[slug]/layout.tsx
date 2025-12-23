"use client";

import * as React from "react";
import { WorkspaceProvider, useWorkspace } from "@/components/workspace-context";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { TopNav } from "@/components/preview/top-nav";
import { Sidebar } from "@/components/preview/sidebar";
import { mockCategories } from "@/components/preview/mock-data";
import { Spinner } from "@phosphor-icons/react/dist/ssr";
import { NoAccess } from "@/components/no-access";

function WorkspaceLayoutContent({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [slug, setSlug] = React.useState<string>("");
  
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    activeChannel, 
    setActiveChannel,
    activeTab,
    setActiveTab
  } = useWorkspace();

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setSlug(resolved.slug));
    } else {
      setSlug(params.slug);
    }
  }, [params]);

  // Get organization by slug from Convex
  const orgBySlug = useQuery(
    api.organizations.getOrganizationBySlug,
    slug ? { slug } : "skip"
  );

  // Check if user is a member of this organization
  const isMember = useQuery(
    api.organizations.isUserMember,
    orgBySlug?._id ? { organizationId: orgBySlug._id } : "skip"
  );

  // Get user's organizations for fallback redirect
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Verify user has access to the organization with this slug
  React.useEffect(() => {
    if (!authLoaded || !isSignedIn || !slug) return;
    if (orgBySlug === undefined || isMember === undefined || userOrgs === undefined) return;

    // Don't automatically redirect - let NoAccess component handle it
  }, [authLoaded, isSignedIn, slug, orgBySlug, isMember, userOrgs]);

  // Clear activeChannel when navigating to People or Settings
  React.useEffect(() => {
    if (pathname?.includes("/people") || pathname?.includes("/settings")) {
      setActiveChannel(null);
    }
  }, [pathname, setActiveChannel]);

  if (!authLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <Spinner className="size-6 animate-spin text-[#26251E]/20" />
        </div>
      </div>
    );
  }

  // Show loading while checking access
  if (orgBySlug === undefined || isMember === undefined || userOrgs === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <Spinner className="size-6 animate-spin text-[#26251E]/20" />
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!orgBySlug || !isMember) {
    return <NoAccess slug={slug} organizationExists={orgBySlug !== null} />;
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
          activeChannel={activeChannel ?? ""}
          onChannelSelect={setActiveChannel}
          categories={mockCategories}
        />

        {/* Page Content */}
        {children}
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
  return (
    <WorkspaceProvider>
      <WorkspaceLayoutContent params={params}>{children}</WorkspaceLayoutContent>
    </WorkspaceProvider>
  );
}
