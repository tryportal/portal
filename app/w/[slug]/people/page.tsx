"use client";

import { useQuery, useMutation } from "convex/react";
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
  SignOutIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InvitePeopleDialog } from "@/components/invite-people-dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePageTitle } from "@/lib/use-page-title";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const leaveOrganization = useMutation(api.organizations.leaveOrganization);

  usePageTitle("People - Portal");

  const isAdmin = membership?.role === "admin";

  const handleLeaveWorkspace = async () => {
    if (!organization?._id) return;

    setIsLeaving(true);
    setLeaveError(null);

    try {
      await leaveOrganization({
        organizationId: organization._id,
      });

      router.push("/");
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : "Failed to leave workspace");
    } finally {
      setIsLeaving(false);
    }
  };

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
          <div className="ml-auto flex items-center gap-2">
            <AlertDialog 
              open={leaveDialogOpen} 
              onOpenChange={(open) => {
                setLeaveDialogOpen(open);
                if (!open) setLeaveError(null);
              }}
            >
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-600 text-xs sm:text-sm"
                  />
                }
              >
                <SignOutIcon className="size-3.5 sm:size-4 mr-1.5 sm:mr-2" />
                Leave
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Workspace</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave this workspace? You will lose access immediately and will need to be re-invited to rejoin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {leaveError && (
                  <p className="text-sm text-red-600">{leaveError}</p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveWorkspace}
                    disabled={isLeaving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLeaving ? "Leaving..." : "Leave"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {isAdmin && (
              <Button
                onClick={() => setInviteDialogOpen(true)}
                size="sm"
                className="bg-foreground hover:bg-foreground/90 text-background text-xs sm:text-sm"
              >
                <UserIcon className="size-3.5 sm:size-4 mr-1.5 sm:mr-2" weight="bold" />
                Invite
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-12">
              <LoadingSpinner text="Loading members..." />
            </div>
          ) : (
            <div className="mx-auto max-w-2xl py-6 px-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search people..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-transparent border-border text-sm h-9"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {filteredMembers.length}
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {filteredMembers.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "No results" : "No members"}
                      </p>
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <div
                        key={member._id}
                        onClick={() => handleMemberClick(member)}
                        onMouseEnter={() => handleMemberPrefetch(member)}
                        className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                      >
                        <Avatar className="size-8">
                          {member.publicUserData?.imageUrl ? (
                            <AvatarImage
                              src={member.publicUserData.imageUrl}
                              alt={getDisplayName(member)}
                            />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {getDisplayName(member)}
                            </span>
                            {member.role === "admin" && (
                              <ShieldIcon className="size-3 text-muted-foreground shrink-0" weight="fill" />
                            )}
                          </div>
                          {member.jobTitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.jobTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
