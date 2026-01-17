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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { InvitePeopleDialog } from "@/components/invite-people-dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePageTitle } from "@/lib/use-page-title";

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
  const { organization, membership, slug, isLoading: contextLoading } = useWorkspaceData();
  const { cache: userDataCache, fetchUserData } = useUserDataCache();

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  usePageTitle("People - Portal");

  const isAdmin = membership?.role === "admin";

  const membersResult = useQuery(
    api.organizations.getOrganizationMembersQuery,
    organization?._id ? { organizationId: organization._id } : "skip"
  );

  const rawMembers = membersResult?.members ?? [];
  const isLoading = membersResult === undefined;

  React.useEffect(() => {
    if (rawMembers.length > 0) {
      const userIds = rawMembers.map((m) => m.userId);
      fetchUserData(userIds);
    }
  }, [rawMembers, fetchUserData]);

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

  const formatJoinDate = (timestamp?: number) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter((member) => {
      const name = getDisplayName(member).toLowerCase();
      const jobTitle = member.jobTitle?.toLowerCase() || "";
      const department = member.department?.toLowerCase() || "";
      return name.includes(query) || jobTitle.includes(query) || department.includes(query);
    });
  }, [members, searchQuery]);

  const handleMemberClick = (member: MemberWithUserData) => {
    router.push(`/w/${slug}/people/${member.userId}`);
  };

  const handleMemberPrefetch = (member: MemberWithUserData) => {
    if (slug) {
      router.prefetch(`/w/${slug}/people/${member.userId}`);
    }
  };

  if (contextLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
          <UsersIcon className="size-4 sm:size-5 text-foreground" weight="fill" />
          <h1 className="text-sm sm:text-base font-semibold text-foreground">People</h1>
          {isAdmin && (
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
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-12">
              <LoadingSpinner text="Loading members..." />
            </div>
          ) : (
            <div className="mx-auto max-w-5xl py-6 sm:py-8 px-4 sm:px-6">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search people..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-card border-border text-sm"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
                    {searchQuery && ` found`}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[300px]">Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Role</TableHead>
                        <TableHead className="hidden md:table-cell">Department</TableHead>
                        <TableHead className="hidden lg:table-cell">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={4} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <UserIcon className="size-8 text-muted-foreground/40" />
                              <p className="text-sm text-muted-foreground">
                                {searchQuery ? "No members found matching your search" : "No members yet"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((member) => (
                          <TableRow
                            key={member._id}
                            onClick={() => handleMemberClick(member)}
                            onMouseEnter={() => handleMemberPrefetch(member)}
                            className="cursor-pointer"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="size-9">
                                  {member.publicUserData?.imageUrl ? (
                                    <AvatarImage
                                      src={member.publicUserData.imageUrl}
                                      alt={getDisplayName(member)}
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-xs">
                                    {getInitials(member)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {getDisplayName(member)}
                                  </p>
                                  {member.jobTitle && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {member.jobTitle}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge
                                variant={member.role === "admin" ? "default" : "secondary"}
                                className={cn(
                                  "text-[10px] uppercase tracking-wider",
                                  member.role === "admin"
                                    ? "bg-foreground text-background"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {member.role === "admin" && (
                                  <ShieldIcon className="size-2.5 mr-0.5" weight="fill" />
                                )}
                                {member.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {member.department || "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {formatJoinDate(member.joinedAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
