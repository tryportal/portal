"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { TopNav } from "@/components/preview/top-nav";
import { Sidebar } from "@/components/preview/sidebar";
import { WorkspaceSettingsPage } from "@/components/preview/workspace-settings-page";
import { mockCategories } from "@/components/preview/mock-data";
import { Spinner } from "@phosphor-icons/react";
import * as React from "react";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [slug, setSlug] = React.useState<string>("");
  const [activeTab, setActiveTab] = React.useState("home");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeChannel, setActiveChannel] = React.useState<string | null>(null);

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
  useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Verify user has access to the organization with this slug
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !slug) return;
    if (orgBySlug === undefined || isMember === undefined || userOrgs === undefined) return;

    // If no organization found for this slug, redirect
    if (orgBySlug === null) {
      // Try to redirect to user's first org or setup
      if (userOrgs.length > 0 && userOrgs[0].slug) {
        router.replace(`/${userOrgs[0].slug}`);
      } else {
        router.replace("/setup");
      }
      return;
    }

    // If user is not a member, redirect
    if (!isMember) {
      if (userOrgs.length > 0 && userOrgs[0].slug) {
        router.replace(`/${userOrgs[0].slug}`);
      } else {
        router.replace("/setup");
      }
      return;
    }
  }, [authLoaded, isSignedIn, slug, orgBySlug, isMember, userOrgs, router]);

  // Redirect to setup if user has no organizations
  useEffect(() => {
    if (authLoaded && isSignedIn && userOrgs !== undefined && userOrgs.length === 0) {
      router.replace("/setup");
    }
  }, [authLoaded, isSignedIn, userOrgs, router]);

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
    return null;
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

        {/* Settings Content */}
        <main className="flex-1 overflow-hidden">
          {orgBySlug._id && (
            <WorkspaceSettingsPage organizationId={orgBySlug._id} />
          )}
        </main>
      </div>
    </div>
  );
}

