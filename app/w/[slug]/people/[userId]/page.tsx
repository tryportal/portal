"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as React from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceData } from "@/components/workspace-context";
import { LoadingSpinner } from "@/components/loading-spinner";
import { 
  ArrowLeftIcon, 
  ShieldIcon, 
  WarningCircleIcon,
  CheckIcon,
  TrashIcon,
  PencilSimpleIcon,
  XIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { usePageTitle } from "@/lib/use-page-title";
import { analytics } from "@/lib/analytics";

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

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }> | { slug: string; userId: string };
}) {
  const router = useRouter();
  const { userId: currentUserId } = useAuth();
  const [userId, setUserId] = useState<string>("");
  const { organization, membership: contextMembership, slug, isLoading: contextLoading } = useWorkspaceData();

  const [member, setMember] = useState<MemberWithUserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    jobTitle: "",
    department: "",
    location: "",
    timezone: "",
    bio: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleSaveError, setRoleSaveError] = useState<string | null>(null);
  const [roleSaveSuccess, setRoleSaveSuccess] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => {
        setUserId(resolved.userId);
      });
    } else {
      setUserId(params.userId);
    }
  }, [params]);

  const getMember = useAction(api.organizations.getOrganizationMember);
  const updateRole = useMutation(api.organizations.updateOrganizationMemberRole);
  const removeMember = useMutation(api.organizations.removeOrganizationMember);
  const updateProfile = useMutation(api.organizations.updateMemberProfile);

  React.useEffect(() => {
    const fetchMember = async () => {
      if (!organization?._id || !userId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getMember({
          organizationId: organization._id,
          userId: userId,
        });
        
        if (result.member) {
          setMember(result.member);
          setSelectedRole(result.member.role);
          setIsAdmin(result.isAdmin);

          analytics.profileViewed({ isOwnProfile: result.member.userId === currentUserId });

          setProfileForm({
            jobTitle: result.member.jobTitle || "",
            department: result.member.department || "",
            location: result.member.location || "",
            timezone: result.member.timezone || "",
            bio: result.member.bio || "",
          });
        } else {
          setError("Member not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load member");
      } finally {
        setIsLoading(false);
      }
    };

    if (organization?._id && userId && contextMembership) {
      fetchMember();
    }
  }, [organization?._id, userId, contextMembership, getMember, currentUserId]);

  const getDisplayName = (m: MemberWithUserData) => {
    if (m.publicUserData?.firstName || m.publicUserData?.lastName) {
      return `${m.publicUserData.firstName || ""} ${m.publicUserData.lastName || ""}`.trim();
    }
    return m.emailAddress || "Unknown User";
  };

  const getInitials = (m: MemberWithUserData) => {
    const name = getDisplayName(m);
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleProfileUpdate = async () => {
    if (!member || !organization?._id) return;

    setIsSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(false);

    try {
      await updateProfile({
        organizationId: organization._id,
        membershipId: member._id,
        jobTitle: profileForm.jobTitle,
        department: profileForm.department,
        location: profileForm.location,
        timezone: profileForm.timezone,
        bio: profileForm.bio,
      });

      setMember({
        ...member,
        jobTitle: profileForm.jobTitle,
        department: profileForm.department,
        location: profileForm.location,
        timezone: profileForm.timezone,
        bio: profileForm.bio,
      });

      setProfileSaveSuccess(true);
      setIsEditing(false);
      
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRoleChange = async (newRole: "admin" | "member") => {
    if (!member || !organization?._id) return;
    
    setSelectedRole(newRole);
    setIsSavingRole(true);
    setRoleSaveError(null);
    setRoleSaveSuccess(false);

    try {
      await updateRole({
        organizationId: organization._id,
        membershipId: member._id,
        role: newRole,
      });

      analytics.roleChanged();
      setMember({ ...member, role: newRole });
      setRoleSaveSuccess(true);
      
      setTimeout(() => setRoleSaveSuccess(false), 3000);
    } catch (err) {
      setRoleSaveError(err instanceof Error ? err.message : "Failed to update role");
      setSelectedRole(member.role);
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!member || !organization?._id) return;

    setIsRemoving(true);
    setRemoveError(null);

    try {
      await removeMember({
        organizationId: organization._id,
        membershipId: member._id,
      });

      analytics.memberRemoved();
      router.push(`/w/${slug}/people`);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove member");
      setRemoveDialogOpen(false);
    } finally {
      setIsRemoving(false);
    }
  };

  const canEdit = isAdmin || (member && member.userId === currentUserId);

  const displayName = member
    ? member.publicUserData?.firstName && member.publicUserData?.lastName
      ? `${member.publicUserData.firstName} ${member.publicUserData.lastName}`
      : member.emailAddress || "User"
    : "Loading...";
  usePageTitle(`${displayName} - Portal`);

  if (contextLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
          <button
            onClick={() => router.push(`/w/${slug}/people`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="size-4" />
            <span>People</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-12">
              <LoadingSpinner text="Loading..." />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/w/${slug}/people`)}
                >
                  Back
                </Button>
              </div>
            </div>
          ) : member ? (
            <div className="mx-auto max-w-xl py-8 px-4">
              {isEditing ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-foreground">Edit Profile</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setProfileForm({
                          jobTitle: member.jobTitle || "",
                          department: member.department || "",
                          location: member.location || "",
                          timezone: member.timezone || "",
                          bio: member.bio || "",
                        });
                      }}
                      disabled={isSavingProfile}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="jobTitle" className="text-xs">Job Title</Label>
                        <Input
                          id="jobTitle"
                          value={profileForm.jobTitle}
                          onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                          placeholder="e.g. Designer"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="department" className="text-xs">Department</Label>
                        <Input
                          id="department"
                          value={profileForm.department}
                          onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                          placeholder="e.g. Design"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="location" className="text-xs">Location</Label>
                        <Input
                          id="location"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                          placeholder="e.g. San Francisco"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="timezone" className="text-xs">Timezone</Label>
                        <Input
                          id="timezone"
                          value={profileForm.timezone}
                          onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                          placeholder="e.g. PST"
                          className="h-9"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="bio" className="text-xs">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        placeholder="About yourself..."
                        className="min-h-[100px] resize-none"
                      />
                    </div>

                    {profileSaveError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <WarningCircleIcon className="size-3" weight="fill" />
                        {profileSaveError}
                      </p>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleProfileUpdate}
                        disabled={isSavingProfile}
                        size="sm"
                      >
                        {isSavingProfile ? (
                          <CircleNotchIcon className="size-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Profile Header */}
                  <div className="flex items-start gap-4">
                    <Avatar className="size-16">
                      {member.publicUserData?.imageUrl ? (
                        <AvatarImage 
                          src={member.publicUserData.imageUrl} 
                          alt={getDisplayName(member)} 
                        />
                      ) : null}
                      <AvatarFallback className="text-lg">
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-foreground truncate">
                          {getDisplayName(member)}
                        </h1>
                        {member.role === "admin" && (
                          <ShieldIcon className="size-4 text-muted-foreground shrink-0" weight="fill" />
                        )}
                      </div>
                      {member.jobTitle && (
                        <p className="text-sm text-muted-foreground">{member.jobTitle}</p>
                      )}
                      {canEdit && (
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="text-xs text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1"
                        >
                          <PencilSimpleIcon className="size-3" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {profileSaveSuccess && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckIcon className="size-3" weight="bold" />
                      Profile updated
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-3 text-sm">
                    {member.emailAddress && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="text-foreground">{member.emailAddress}</span>
                      </div>
                    )}
                    {member.department && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Department</span>
                        <span className="text-foreground">{member.department}</span>
                      </div>
                    )}
                    {member.location && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span className="text-foreground">{member.location}</span>
                      </div>
                    )}
                    {member.timezone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timezone</span>
                        <span className="text-foreground">{member.timezone}</span>
                      </div>
                    )}
                    {member.joinedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Joined</span>
                        <span className="text-foreground">
                          {new Date(member.joinedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  {member.bio && (
                    <div className="space-y-2">
                      <h3 className="text-xs text-muted-foreground uppercase tracking-wider">About</h3>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {member.bio}
                      </p>
                    </div>
                  )}

                  {/* Admin Controls */}
                  {isAdmin && (
                    <div className="pt-4 border-t border-border space-y-4">
                      <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Admin</h3>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Role</span>
                        <Select 
                          value={selectedRole} 
                          onValueChange={(value) => handleRoleChange(value as "admin" | "member")}
                          disabled={isSavingRole}
                        >
                          <SelectTrigger className="w-32 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {roleSaveSuccess && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckIcon className="size-3" weight="bold" />
                          Role updated
                        </p>
                      )}
                      {roleSaveError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <WarningCircleIcon className="size-3" weight="fill" />
                          {roleSaveError}
                        </p>
                      )}
                      
                      <AlertDialog 
                        open={removeDialogOpen} 
                        onOpenChange={(open) => {
                          setRemoveDialogOpen(open);
                          if (!open) setRemoveError(null);
                        }}
                      >
                        <AlertDialogTrigger 
                          render={<button className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1" />}
                        >
                          <TrashIcon className="size-3" />
                          Remove member
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove their access immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          {removeError && (
                            <p className="text-sm text-red-600">{removeError}</p>
                          )}
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleRemoveMember}
                              disabled={isRemoving}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {isRemoving ? "Removing..." : "Remove"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
