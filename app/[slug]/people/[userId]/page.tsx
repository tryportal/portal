"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
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
  ArrowLeftIcon, 
  ShieldIcon, 
  UserIcon,
  WarningCircleIcon,
  CheckIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  AlertDialogMedia,
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
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [slug, setSlug] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  // Member data state
  const [member, setMember] = useState<MemberWithUserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Role update state
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Resolve params
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => {
        setSlug(resolved.slug);
        setUserId(resolved.userId);
      });
    } else {
      setSlug(params.slug);
      setUserId(params.userId);
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

  // Actions and mutations
  const getMember = useAction(api.organizations.getOrganizationMember);
  const updateRole = useMutation(api.organizations.updateOrganizationMemberRole);
  const removeMember = useMutation(api.organizations.removeOrganizationMember);

  // Fetch member data
  React.useEffect(() => {
    const fetchMember = async () => {
      if (!orgBySlug?._id || !userId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getMember({
          organizationId: orgBySlug._id,
          userId: userId,
        });
        
        if (result.member) {
          setMember(result.member);
          setSelectedRole(result.member.role);
          setIsAdmin(result.isAdmin);
        } else {
          setError("Member not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load member");
      } finally {
        setIsLoading(false);
      }
    };

    if (orgBySlug?._id && userId && isMember) {
      fetchMember();
    }
  }, [orgBySlug?._id, userId, isMember, getMember]);

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

  const handleRoleChange = async (newRole: "admin" | "member") => {
    if (!member || !orgBySlug?._id) return;
    
    setSelectedRole(newRole);
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateRole({
        organizationId: orgBySlug._id,
        membershipId: member._id,
        role: newRole,
      });
      
      setMember({ ...member, role: newRole });
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update role");
      setSelectedRole(member.role); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!member || !orgBySlug?._id) return;

    setIsRemoving(true);
    setSaveError(null);

    try {
      await removeMember({
        organizationId: orgBySlug._id,
        membershipId: member._id,
      });
      
      // Navigate back to people list
      router.push(`/${slug}/people`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to remove member");
      setRemoveDialogOpen(false);
    } finally {
      setIsRemoving(false);
    }
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

        {/* Profile Content */}
        <main className="flex-1 overflow-hidden">
          <div className="flex h-full flex-col bg-[#F7F7F4]">
            {/* Header */}
            <header className="flex h-12 shrink-0 items-center gap-4 border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
              <button
                onClick={() => router.push(`/${slug}/people`)}
                className="flex items-center gap-1.5 text-sm text-[#26251E]/60 hover:text-[#26251E] transition-colors"
              >
                <ArrowLeftIcon className="size-4" />
                <span>Back to People</span>
              </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-full items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Spinner className="size-6 animate-spin text-[#26251E]/40" />
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
                      onClick={() => router.push(`/${slug}/people`)}
                    >
                      Back to People
                    </Button>
                  </div>
                </div>
              ) : member ? (
                <div className="mx-auto max-w-3xl py-12 px-6">
                  <div className="space-y-10">
                    {/* Profile Header */}
                    <section className="space-y-6">
                      <div className="flex items-start gap-6">
                        <Avatar size="lg" className="size-20">
                          {member.publicUserData?.imageUrl ? (
                            <AvatarImage 
                              src={member.publicUserData.imageUrl} 
                              alt={getDisplayName(member)} 
                            />
                          ) : null}
                          <AvatarFallback className="text-xl">
                            {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-semibold text-[#26251E]">
                              {getDisplayName(member)}
                            </h2>
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
                          </div>
                          {member.emailAddress && (
                            <p className="text-sm text-[#26251E]/60">
                              {member.emailAddress}
                            </p>
                          )}
                          {member.joinedAt && (
                            <p className="text-xs text-[#26251E]/40 mt-2">
                              Joined {new Date(member.joinedAt).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Role Management (Admin only) */}
                    {isAdmin && (
                      <section className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-[#26251E]">Role</h3>
                          <p className="text-sm text-[#26251E]/60">
                            Manage this member's role and permissions.
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#26251E]/10 bg-white p-6 shadow-sm">
                          <div className="space-y-4">
                            <div>
                              <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#26251E]/50">
                                Member Role
                              </Label>
                              <Select 
                                value={selectedRole} 
                                onValueChange={(value) => handleRoleChange(value as "admin" | "member")}
                                disabled={isSaving}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <ShieldIcon className="size-3.5" weight="fill" />
                                      Admin
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="member">
                                    <div className="flex items-center gap-2">
                                      <UserIcon className="size-3.5" />
                                      Member
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="mt-2 text-xs text-[#26251E]/50">
                                {selectedRole === "admin" 
                                  ? "Admins can manage workspace settings, invite members, and change roles."
                                  : "Members can access workspace content but cannot manage settings."}
                              </p>
                            </div>

                            {/* Status Messages */}
                            {isSaving && (
                              <div className="flex items-center gap-2 text-sm text-[#26251E]/60">
                                <Spinner className="size-4 animate-spin" />
                                Updating role...
                              </div>
                            )}
                            
                            {saveSuccess && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckIcon className="size-4" weight="bold" />
                                Role updated successfully
                              </div>
                            )}

                            {saveError && (
                              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2">
                                <WarningCircleIcon className="size-4" weight="fill" />
                                {saveError}
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Danger Zone (Admin only) */}
                    {isAdmin && (
                      <section className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                          <p className="text-sm text-[#26251E]/60">
                            Irreversible actions for this member.
                          </p>
                        </div>

                        <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium text-[#26251E]">
                                Remove from Workspace
                              </h4>
                              <p className="text-xs text-[#26251E]/60">
                                Remove this member from the workspace. They will lose access immediately.
                              </p>
                            </div>
                            <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                              <AlertDialogTrigger
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-red-200 bg-transparent px-2 h-7 text-xs font-medium transition-all hover:bg-red-50 hover:text-red-700 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:pointer-events-none disabled:opacity-50"
                              >
                                <TrashIcon className="size-4 mr-1" />
                                Remove
                              </AlertDialogTrigger>
                              <AlertDialogContent size="default" className="max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogMedia className="bg-red-50 text-red-600">
                                    <WarningCircleIcon className="size-5" weight="fill" />
                                  </AlertDialogMedia>
                                  <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove <strong>{getDisplayName(member)}</strong> from this workspace? 
                                    They will lose access immediately and will need to be re-invited to rejoin.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleRemoveMember}
                                    disabled={isRemoving}
                                    className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isRemoving ? "Removing..." : "Remove Member"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Non-admin view */}
                    {!isAdmin && (
                      <section className="space-y-6">
                        <div className="rounded-xl border border-[#26251E]/10 bg-white p-6 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-[#26251E]/5">
                              {member.role === "admin" ? (
                                <ShieldIcon className="size-5 text-[#26251E]" weight="fill" />
                              ) : (
                                <UserIcon className="size-5 text-[#26251E]/60" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-[#26251E]">
                                {member.role === "admin" ? "Workspace Admin" : "Workspace Member"}
                              </h4>
                              <p className="text-xs text-[#26251E]/60 mt-1">
                                {member.role === "admin" 
                                  ? "This user can manage workspace settings, invite members, and change roles."
                                  : "This user can access workspace content."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
