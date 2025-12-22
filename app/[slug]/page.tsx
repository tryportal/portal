"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { TopNav } from "@/components/preview/top-nav";
import { Sidebar } from "@/components/preview/sidebar";
import { ChatInterface } from "@/components/preview/chat-interface";
import {
  mockCategories,
  getMessagesForChannel,
  getChannelInfo,
  mockUsers,
} from "@/components/preview/mock-data";
import type { Message } from "@/components/preview/message-list";
import { Spinner } from "@phosphor-icons/react";
import * as React from "react";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const router = useRouter();
  const { organization, isLoaded: clerkLoaded } = useOrganization();
  const { userMemberships, isLoaded: orgListLoaded, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const [slug, setSlug] = React.useState<string>("");
  const [activeTab, setActiveTab] = React.useState("home");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeChannel, setActiveChannel] = React.useState("general");
  const [messages, setMessages] = React.useState<Record<string, Message[]>>(
    () => {
      // Initialize with mock messages
      const initial: Record<string, Message[]> = {};
      for (const category of mockCategories) {
        for (const channel of category.channels) {
          initial[channel.id] = getMessagesForChannel(channel.id);
        }
      }
      return initial;
    }
  );

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setSlug(resolved.slug));
    } else {
      setSlug(params.slug);
    }
  }, [params]);

  const orgData = useQuery(
    api.organizations.getOrganization,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const orgBySlug = useQuery(
    api.organizations.getOrganizationBySlug,
    slug ? { slug } : "skip"
  );

  // Verify user has access to the organization with this slug
  useEffect(() => {
    if (!clerkLoaded || !orgListLoaded || !slug || orgBySlug === undefined) return;

    // If no organization found for this slug, redirect to setup
    if (orgBySlug === null) {
      router.replace("/setup");
      return;
    }

    // Check if user is a member of the organization with this slug
    const targetMembership = userMemberships?.data?.find(
      (membership) => membership.organization.id === orgBySlug.clerkOrgId
    );

    if (!targetMembership) {
      // User doesn't have access to this organization
      // Redirect to their first organization or setup
      const firstOrg = userMemberships?.data?.[0]?.organization;
      if (firstOrg?.slug) {
        router.replace(`/${firstOrg.slug}`);
      } else {
        router.replace("/setup");
      }
      return;
    }

    // If user has access but the active organization doesn't match, switch to it
    if (organization?.id !== orgBySlug.clerkOrgId && setActive) {
      // Use Clerk's setActive to switch organizations
      // This will update the organization context
      setActive({ organization: orgBySlug.clerkOrgId });
      return;
    }

    // Ensure the slug matches the organization's slug
    if (organization.slug && organization.slug !== slug) {
      router.replace(`/${organization.slug}`);
    }
  }, [
    clerkLoaded,
    orgListLoaded,
    slug,
    orgBySlug,
    userMemberships?.data,
    organization?.id,
    organization?.slug,
    setActive,
    router,
  ]);

  // Redirect to setup if no organization is active
  useEffect(() => {
    if (clerkLoaded && orgListLoaded && !organization && userMemberships?.data?.length === 0) {
      router.replace("/setup");
    }
  }, [clerkLoaded, orgListLoaded, organization, userMemberships?.data?.length, router]);

  const channelInfo = getChannelInfo(activeChannel);
  const currentMessages = messages[activeChannel] || [];

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `${Date.now()}`,
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      user: mockUsers.john, // Current user
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMessage],
    }));
  };

  if (!clerkLoaded || !orgListLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <Spinner className="size-6 animate-spin text-[#26251E]/20" />
        </div>
      </div>
    );
  }

  // Show loading while checking access
  if (orgBySlug === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <Spinner className="size-6 animate-spin text-[#26251E]/20" />
        </div>
      </div>
    );
  }

  if (!organization) {
    return null; // Will redirect to setup
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
          activeChannel={activeChannel}
          onChannelSelect={setActiveChannel}
          categories={mockCategories}
        />

        {/* Chat Interface */}
        <main className="flex-1 overflow-hidden">
          <ChatInterface
            channelName={channelInfo.name}
            channelIcon={channelInfo.icon}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
          />
        </main>
      </div>
    </div>
  );
}

