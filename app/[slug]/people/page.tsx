"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as React from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TopNav } from "@/components/preview/top-nav";
import { Sidebar } from "@/components/preview/sidebar";
import { mockCategories } from "@/components/preview/mock-data";
import { 
  Spinner,
  UsersIcon,
  MagnifyingGlassIcon,
  ShieldIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InvitePeopleDialog } from "@/components/invite-people-dialog";

// Type for member data
type MemberWithUserData = {
  _id: Id<"organizationMembers">;
  organizationId: Id<"organizations">;
  userId: string;
  role: "admin" | "member";
  joinedAt?: number;
  jobTitle?: string;
  department?: string;
  location?: string;
  timezone?: string;
  bio?: string;
  emailAddress: string | null;
  publicUserData: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | undefined;
};

export default function PeoplePage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [slug, setSlug] = useState<string>("");
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  // Members state
  const [members, setMembers] = useState<MemberWithUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Resolve params
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setSlug(resolved.slug));
    } else {
      setSlug(params.slug);
    }
  }, [params]);

  // Get organization by slug
  const orgBySlug = useQuery(
    api.organizations.getOrganizationBySlug,
    slug ? { slug } : "skip"
  );

  // Check if user is a member
  const isMember = useQuery(
    api.organizations.isUserMember,
    orgBySlug?._id ? { organizationId: orgBySlug._id } : "skip"
  );

  // Get user's organizations for fallback
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  // Get members action
  const getMembers = useAction(api.organizations.getOrganizationMembers);

  // Fetch members
  React.useEffect(() => {
    const fetchMembers = async () => {
      if (!orgBySlug?._id || !isMember) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getMembers({ organizationId: orgBySlug._id });
        setMembers(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        setIsLoading(false);
      }
    };

    if (orgBySlug?._id && isMember) {
      fetchMembers();
    }
  }, [orgBySlug?._id, isMember, getMembers]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Verify user has access
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !slug) return;
    if (orgBySlug === undefined || isMember === undefined || userOrgs === undefined) return;

    if (orgBySlug === null) {
      if (userOrgs.length > 0 && userOrgs[0].slug) {
        router.replace(`/${userOrgs[0].slug}`);
      } else {
        router.replace("/setup");
      }
      return;
    }

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

  const getDisplayName = (member: MemberWithUserData) => {
    if (member.publicUserData?.firstName || member.publicUserData?.lastName) {
      return `${member.publicUserData.firstName || ""} ${member.publicUserData.lastName || ""}`.trim();
    }
    return member.emailAddress || "Unknown User";
  };

  const getInitials = (member: MemberWithUserData) => {
    const name = getDisplayName(member);
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter((member) => {
      const name = getDisplayName(member).toLowerCase();
      const email = (member.emailAddress || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [members, searchQuery]);

  const handleMemberClick = (member: MemberWithUserData) => {
    router.push(`/${slug}/people/${member.userId}`);
  };

  if (!authLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <Spinner className="size-6 animate-spin text-[#26251E]/20" />
        </div>
      </div>
    );
  }

  if (orgBySlug === undefined || isMember === undefined || userOrgs === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <Spinner className="size-6 animate-spin text-[#26251E]/20" />
        </div>
      </div>
    );
  }

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

        {/* People Content */}
        <main className="flex-1 overflow-hidden">
          <div className="flex h-full flex-col bg-[#F7F7F4]">
            {/* Header */}
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
              <UsersIcon className="size-5 text-[#26251E]" weight="fill" />
              <h1 className="text-base font-semibold text-[#26251E]">People</h1>
              <div className="ml-auto">
                <Button
                  onClick={() => setInviteDialogOpen(true)}
                  size="sm"
                  className="bg-[#26251E] hover:bg-[#26251E]/90 text-white"
                >
                  <UserIcon className="size-4 mr-2" weight="bold" />
                  Invite
                </Button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-full items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Spinner className="size-6 animate-spin text-[#26251E]/40" />
                    <p className="text-sm text-[#26251E]/60">Loading members...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl py-12 px-6">
                  <div className="space-y-6">
                    {/* Header Info */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#26251E]/60">
                          {members.length} {members.length === 1 ? "member" : "members"} in this workspace
                        </p>
                      </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#26251E]/40" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-[#26251E]/10"
                      />
                    </div>

                    {/* Members List */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredMembers.length === 0 ? (
                        <div className="col-span-full py-12 text-center">
                          <UserIcon className="mx-auto size-8 text-[#26251E]/20 mb-2" />
                          <p className="text-sm text-[#26251E]/60">
                            {searchQuery ? "No members found matching your search" : "No members yet"}
                          </p>
                        </div>
                      ) : (
                        filteredMembers.map((member) => (
                          <button
                            key={member._id}
                            onClick={() => handleMemberClick(member)}
                            className="flex flex-col items-center p-6 bg-white rounded-xl border border-[#26251E]/10 hover:border-[#26251E]/20 hover:shadow-sm transition-all text-center group"
                          >
                            <Avatar className="size-20 mb-4">
                              {member.publicUserData?.imageUrl ? (
                                <AvatarImage src={member.publicUserData.imageUrl} alt={getDisplayName(member)} />
                              ) : null}
                              <AvatarFallback className="text-xl">{getInitials(member)}</AvatarFallback>
                            </Avatar>

                            <div className="space-y-1 mb-4">
                              <h3 className="font-medium text-[#26251E] truncate max-w-[200px]">
                                {getDisplayName(member)}
                              </h3>
                              {member.jobTitle && (
                                <p className="text-xs font-medium text-[#26251E]/60 truncate max-w-[200px]">
                                  {member.jobTitle}
                                </p>
                              )}
                              {!member.jobTitle && member.emailAddress && (
                                <p className="text-xs text-[#26251E]/40 truncate max-w-[200px]">
                                  {member.emailAddress}
                                </p>
                              )}
                            </div>

                            <Badge 
                              variant={member.role === "admin" ? "default" : "secondary"}
                              className={cn(
                                "text-[10px] uppercase tracking-wider",
                                member.role === "admin" 
                                  ? "bg-[#26251E] text-white" 
                                  : "bg-[#26251E]/5 text-[#26251E]/60"
                              )}
                            >
                              {member.role === "admin" && (
                                <ShieldIcon className="size-2.5 mr-0.5" weight="fill" />
                              )}
                              {member.role}
                            </Badge>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Invite Dialog */}
      {orgBySlug?._id && (
        <InvitePeopleDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          organizationId={orgBySlug._id}
        />
      )}
    </div>
  );
}
