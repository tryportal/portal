"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as React from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceData } from "@/components/workspace-context";
import { useUserDataCache } from "@/components/user-data-cache";
import {
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
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePageTitle } from "@/lib/use-page-title";

// Type for member data with user info from cache
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
  publicUserData: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | undefined;
};

export default function PeoplePage() {
  const router = useRouter();
  const { organization, slug, isLoading: contextLoading } = useWorkspaceData();
  const { cache: userDataCache, fetchUserData } = useUserDataCache();

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Set page title
  usePageTitle("People - Portal");

  // Get members with reactive query
  const membersResult = useQuery(
    api.organizations.getOrganizationMembersQuery,
    organization?._id ? { organizationId: organization._id } : "skip"
  );

  const rawMembers = membersResult?.members ?? [];
  const isLoading = membersResult === undefined;

  // Fetch user data for all members
  React.useEffect(() => {
    if (rawMembers.length > 0) {
      const userIds = rawMembers.map((m) => m.userId);
      fetchUserData(userIds);
    }
  }, [rawMembers, fetchUserData]);

  // Transform members with cached user data
  const members: MemberWithUserData[] = React.useMemo(() => {
    return rawMembers.map((member) => {
      const cached = userDataCache[member.userId];
      return {
        _id: member._id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        jobTitle: member.jobTitle,
        department: member.department,
        location: member.location,
        timezone: member.timezone,
        bio: member.bio,
        publicUserData: cached ? {
          firstName: cached.firstName,
          lastName: cached.lastName,
          imageUrl: cached.imageUrl,
        } : undefined,
      };
    });
  }, [rawMembers, userDataCache]);

  const getDisplayName = (member: MemberWithUserData) => {
    if (member.publicUserData?.firstName || member.publicUserData?.lastName) {
      return `${member.publicUserData.firstName || ""} ${member.publicUserData.lastName || ""}`.trim();
    }
    return "Unknown User";
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
      return name.includes(query);
    });
  }, [members, searchQuery]);

  const handleMemberClick = (member: MemberWithUserData) => {
    router.push(`/w/${slug}/people/${member.userId}`);
  };

  // Prefetch member profile on hover for faster navigation
  const handleMemberPrefetch = (member: MemberWithUserData) => {
    if (slug) {
      router.prefetch(`/w/${slug}/people/${member.userId}`);
    }
  };

  // Show loading spinner while context is loading
  if (contextLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
          <UsersIcon className="size-4 sm:size-5 text-foreground" weight="fill" />
          <h1 className="text-sm sm:text-base font-semibold text-foreground">People</h1>
          <div className="ml-auto">
            <Button
              onClick={() => setInviteDialogOpen(true)}
              size="sm"
              className="bg-foreground hover:bg-foreground/90 text-background text-xs sm:text-sm"
            >
              <UserIcon className="size-3.5 sm:size-4 mr-1.5 sm:mr-2" weight="bold" />
              Invite
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-12">
              <LoadingSpinner text="Loading members..." />
            </div>
          ) : (
            <div className="mx-auto max-w-3xl py-6 sm:py-12 px-4 sm:px-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Header Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {members.length} {members.length === 1 ? "member" : "members"} in this workspace
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-card border-border text-sm"
                  />
                </div>

                {/* Members List */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                  {filteredMembers.length === 0 ? (
                    <div className="col-span-full py-12 text-center">
                      <UserIcon className="mx-auto size-6 sm:size-8 text-foreground/20 mb-2" />
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {searchQuery ? "No members found matching your search" : "No members yet"}
                      </p>
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <button
                        key={member._id}
                        onClick={() => handleMemberClick(member)}
                        onMouseEnter={() => handleMemberPrefetch(member)}
                        className="flex flex-col items-center p-4 sm:p-6 bg-card rounded-xl border border-border hover:border-border/80 hover:shadow-sm transition-all text-center group"
                      >
                        <Avatar className="size-14 sm:size-20 mb-3 sm:mb-4">
                          {member.publicUserData?.imageUrl ? (
                            <AvatarImage src={member.publicUserData.imageUrl} alt={getDisplayName(member)} />
                          ) : null}
                          <AvatarFallback className="text-base sm:text-xl">{getInitials(member)}</AvatarFallback>
                        </Avatar>

                        <div className="space-y-0.5 sm:space-y-1 mb-3 sm:mb-4 w-full">
                          <h3 className="font-medium text-foreground truncate text-xs sm:text-base max-w-full">
                            {getDisplayName(member)}
                          </h3>
                          {member.jobTitle && (
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate max-w-full">
                              {member.jobTitle}
                            </p>
                          )}
                        </div>

                        <Badge
                          variant={member.role === "admin" ? "default" : "secondary"}
                          className={cn(
                            "text-[9px] sm:text-[10px] uppercase tracking-wider",
                            member.role === "admin"
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {member.role === "admin" && (
                            <ShieldIcon className="size-2 sm:size-2.5 mr-0.5" weight="fill" />
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

      {/* Invite Dialog */}
      {organization?._id && (
        <InvitePeopleDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          organizationId={organization._id}
        />
      )}
    </main>
  );
}
