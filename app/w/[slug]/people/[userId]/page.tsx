"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as React from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceData } from "@/components/workspace-context";
import { MemberProfileSkeleton } from "@/components/skeletons";
import { 
  ArrowLeftIcon, 
  ShieldIcon, 
  UserIcon,
  WarningCircleIcon,
  CheckIcon,
  TrashIcon,
  PencilSimpleIcon,
  XIcon,
  FloppyDiskIcon,
  BriefcaseIcon,
  BuildingsIcon,
  MapPinIcon,
  ClockIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

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

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }> | { slug: string; userId: string };
}) {
  const router = useRouter();
  const { userId: currentUserId } = useAuth();
  const [userId, setUserId] = useState<string>("");
  const { organization, membership: contextMembership, slug, isLoading: contextLoading } = useWorkspaceData();

  // Member data state
  const [member, setMember] = useState<MemberWithUserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Profile update state
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

  // Role update state
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleSaveError, setRoleSaveError] = useState<string | null>(null);
  const [roleSaveSuccess, setRoleSaveSuccess] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Resolve params
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => {
        setUserId(resolved.userId);
      });
    } else {
      setUserId(params.userId);
    }
  }, [params]);

  // Actions and mutations
  const getMember = useAction(api.organizations.getOrganizationMember);
  const updateRole = useMutation(api.organizations.updateOrganizationMemberRole);
  const removeMember = useMutation(api.organizations.removeOrganizationMember);
  const updateProfile = useMutation(api.organizations.updateMemberProfile);

  // Fetch member data
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
          
          // Initialize form
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
  }, [organization?._id, userId, contextMembership, getMember]);

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
      
      // Clear success message after 3 seconds
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
      
      setMember({ ...member, role: newRole });
      setRoleSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setRoleSaveSuccess(false), 3000);
    } catch (err) {
      setRoleSaveError(err instanceof Error ? err.message : "Failed to update role");
      setSelectedRole(member.role); // Revert on error
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
      
      // Navigate back to people list
      router.push(`/w/${slug}/people`);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove member");
      setRemoveDialogOpen(false);
    } finally {
      setIsRemoving(false);
    }
  };

  const canEdit = isAdmin || (member && member.userId === currentUserId);

  // Show skeleton while context is loading
  if (contextLoading) {
    return <MemberProfileSkeleton />;
  }

  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-[#F7F7F4]">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
          <button
            onClick={() => router.push(`/w/${slug}/people`)}
            className="flex items-center gap-1.5 text-sm text-[#26251E]/60 hover:text-[#26251E] transition-colors"
          >
            <ArrowLeftIcon className="size-4" />
            <span>Back to People</span>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white/50">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <CircleNotchIcon className="size-6 animate-spin text-[#26251E]/40" />
                <p className="text-sm text-[#26251E]/60">Loading member...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center py-12">
              <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-[#26251E]/5 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <WarningCircleIcon className="size-6" weight="fill" />
                </div>
                <h2 className="text-lg font-semibold text-[#26251E] mb-2">
                  Member Not Found
                </h2>
                <p className="text-sm text-[#26251E]/60 mb-4">{error}</p>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/w/${slug}/people`)}
                >
                  Back to People
                </Button>
              </div>
            </div>
          ) : member ? (
            <div className="mx-auto max-w-5xl py-8 px-6">
              {isEditing ? (
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[#26251E]">Edit Profile</h2>
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
                      <XIcon className="size-4 mr-1.5" />
                      Cancel
                    </Button>
                  </div>

                  <div className="bg-white rounded-xl border border-[#26251E]/10 shadow-sm p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input
                          id="jobTitle"
                          value={profileForm.jobTitle}
                          onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                          placeholder="e.g. Senior Designer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={profileForm.department}
                          onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                          placeholder="e.g. Design"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                          placeholder="e.g. San Francisco, CA"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Input
                          id="timezone"
                          value={profileForm.timezone}
                          onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                          placeholder="e.g. PST (UTC-8)"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        placeholder="Tell us a bit about yourself..."
                        className="min-h-[120px] resize-none"
                      />
                      <p className="text-xs text-[#26251E]/40">
                        Brief description for your profile.
                      </p>
                    </div>

                    {profileSaveError && (
                      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2">
                        <WarningCircleIcon className="size-4" weight="fill" />
                        {profileSaveError}
                      </div>
                    )}

                    {profileSaveSuccess && (
                      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 border border-green-100 flex items-center gap-2">
                        <CheckIcon className="size-4" weight="bold" />
                        Profile updated successfully
                      </div>
                    )}

                    <div className="flex items-center justify-end pt-2">
                      <Button
                        onClick={handleProfileUpdate}
                        disabled={isSavingProfile}
                        className="min-w-[120px]"
                      >
                        {isSavingProfile ? (
                          <CircleNotchIcon className="size-4 animate-spin mr-1.5" />
                        ) : (
                          <FloppyDiskIcon className="size-4 mr-1.5" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Profile Header Card */}
                  <div className="bg-white rounded-2xl border border-[#26251E]/10 shadow-sm overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-[#F7F7F4] to-[#E8E8E5] border-b border-[#26251E]/5 relative">
                      {canEdit && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => setIsEditing(true)}
                          className="absolute top-4 right-4 bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm"
                        >
                          <PencilSimpleIcon className="size-4 mr-1.5" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                    <div className="px-8 pb-8">
                      <div className="relative -mt-12 mb-4 flex justify-between items-end">
                        <Avatar className="size-32 border-4 border-white shadow-sm">
                          {member.publicUserData?.imageUrl ? (
                            <AvatarImage 
                              src={member.publicUserData.imageUrl} 
                              alt={getDisplayName(member)} 
                            />
                          ) : null}
                          <AvatarFallback className="text-4xl bg-[#F7F7F4] text-[#26251E]/40">
                            {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex gap-2 mb-1">
                          {/* Placeholder for future actions like Message */}
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h1 className="text-2xl font-bold text-[#26251E]">
                            {getDisplayName(member)}
                          </h1>
                          <Badge 
                            variant={member.role === "admin" ? "default" : "secondary"}
                            className={cn(
                              "text-[10px] uppercase tracking-wider h-5",
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
                        </div>
                        <p className="text-base text-[#26251E]/60 font-medium">
                          {member.jobTitle || "No job title"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Info */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-[#26251E]/10 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-[#26251E] mb-4 uppercase tracking-wider">
                          Contact & Info
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="size-8 rounded-lg bg-[#F7F7F4] flex items-center justify-center shrink-0">
                              <UserIcon className="size-4 text-[#26251E]/60" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs text-[#26251E]/40 mb-0.5">Email</p>
                              <p className="text-sm text-[#26251E] truncate" title={member.emailAddress || ""}>
                                {member.emailAddress}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="size-8 rounded-lg bg-[#F7F7F4] flex items-center justify-center shrink-0">
                              <MapPinIcon className="size-4 text-[#26251E]/60" />
                            </div>
                            <div>
                              <p className="text-xs text-[#26251E]/40 mb-0.5">Location</p>
                              <p className="text-sm text-[#26251E]">
                                {member.location || "Not specified"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="size-8 rounded-lg bg-[#F7F7F4] flex items-center justify-center shrink-0">
                              <ClockIcon className="size-4 text-[#26251E]/60" />
                            </div>
                            <div>
                              <p className="text-xs text-[#26251E]/40 mb-0.5">Timezone</p>
                              <p className="text-sm text-[#26251E]">
                                {member.timezone || "Not specified"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="size-8 rounded-lg bg-[#F7F7F4] flex items-center justify-center shrink-0">
                              <BuildingsIcon className="size-4 text-[#26251E]/60" />
                            </div>
                            <div>
                              <p className="text-xs text-[#26251E]/40 mb-0.5">Joined</p>
                              <p className="text-sm text-[#26251E]">
                                {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                }) : "Unknown"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Admin Controls (Left Col) */}
                      {isAdmin && (
                        <div className="bg-white rounded-xl border border-[#26251E]/10 shadow-sm p-6">
                          <h3 className="text-sm font-semibold text-[#26251E] mb-4 uppercase tracking-wider">
                            Admin Controls
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <Label className="mb-2 block text-xs font-medium text-[#26251E]/60">
                                Role
                              </Label>
                              <Select 
                                value={selectedRole} 
                                onValueChange={(value) => handleRoleChange(value as "admin" | "member")}
                                disabled={isSavingRole}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                              {roleSaveSuccess && (
                                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                  <CheckIcon className="size-3" weight="bold" />
                                  Role updated
                                </p>
                              )}
                              {roleSaveError && (
                                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                  <WarningCircleIcon className="size-3" weight="fill" />
                                  {roleSaveError}
                                </p>
                              )}
                            </div>
                            
                            <div className="pt-4 border-t border-[#26251E]/5">
                              <AlertDialog 
                                open={removeDialogOpen} 
                                onOpenChange={(open) => {
                                  setRemoveDialogOpen(open);
                                  if (!open) {
                                    setRemoveError(null);
                                  }
                                }}
                              >
                                <AlertDialogTrigger 
                                  render={<Button 
                                    variant="outline" 
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  />}
                                >
                                  <TrashIcon className="size-4 mr-2" />
                                  Remove Member
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove this member? They will lose access immediately.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  {removeError && (
                                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2 mx-6">
                                      <WarningCircleIcon className="size-4" weight="fill" />
                                      {removeError}
                                    </div>
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
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Bio & Details */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-xl border border-[#26251E]/10 shadow-sm p-8 min-h-[200px]">
                        <h3 className="text-sm font-semibold text-[#26251E] mb-4 uppercase tracking-wider">
                          About
                        </h3>
                        {member.bio ? (
                          <p className="text-base text-[#26251E]/80 leading-relaxed whitespace-pre-wrap">
                            {member.bio}
                          </p>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-sm text-[#26251E]/40 italic">
                              No bio provided yet.
                            </p>
                            {canEdit && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                onClick={() => setIsEditing(true)}
                                className="mt-2 text-[#26251E]/60"
                              >
                                Add a bio
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-xl border border-[#26251E]/10 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-[#26251E] mb-4 uppercase tracking-wider">
                          Organization
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs text-[#26251E]/40 mb-1">Department</p>
                            <div className="flex items-center gap-2">
                              <BriefcaseIcon className="size-4 text-[#26251E]/40" />
                              <p className="text-sm font-medium text-[#26251E]">
                                {member.department || "Not specified"}
                              </p>
                            </div>
                          </div>
                          {/* Placeholder for Manager or Team */}
                          <div>
                            <p className="text-xs text-[#26251E]/40 mb-1">Role Type</p>
                            <div className="flex items-center gap-2">
                              <ShieldIcon className="size-4 text-[#26251E]/40" />
                              <p className="text-sm font-medium text-[#26251E] capitalize">
                                {member.role}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
