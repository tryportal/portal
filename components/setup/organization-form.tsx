"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import {
  Spinner,
  ArrowRight,
  Buildings,
  Link as LinkIcon,
  TextAlignLeft,
  Check,
  CaretRight,
} from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { useOrganizationManager } from "@/lib/clerk-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OrgImageUpload } from "./org-image-upload";
import { MemberInvitation } from "./member-invitation";
import { cn } from "@/lib/utils";

export function OrganizationForm() {
  const router = useRouter();
  const { organization, isLoaded: clerkLoaded } = useOrganization();
  const {
    updateOrganization,
    updateOrganizationImage,
    removeOrganizationImage,
    updateOrganizationMetadata,
    inviteMember,
    getPendingInvitations,
    revokeInvitation,
    getMembers,
  } = useOrganizationManager();

  const createOrUpdateOrg = useMutation(
    api.organizations.createOrUpdateOrganization
  );
  const existingOrg = useQuery(
    api.organizations.getOrganization,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<
    Array<{ id: string; emailAddress: string; role: string }>
  >([]);
  const [existingMembers, setExistingMembers] = useState<
    Array<{ id: string; emailAddress: string; role: string; publicUserData?: { firstName?: string; lastName?: string; imageUrl?: string } }>
  >([]);
  const [currentStep, setCurrentStep] = useState(0);
  const initializedOrgIdRef = useRef<string | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  const steps = [
    { id: "basics", title: "Identity", description: "Name & Logo", icon: Buildings },
    { id: "description", title: "About", description: "Mission & Goals", icon: TextAlignLeft },
    { id: "members", title: "Team", description: "Invite Members", icon: LinkIcon },
  ];

  // Initialize form with organization data (only once per organization)
  useEffect(() => {
    if (organization) {
      const orgId = organization.id;

      // Only initialize if this is a new organization or first time
      if (initializedOrgIdRef.current !== orgId) {
        setName(organization.name || "");
        setSlug(organization.slug || "");
        setDescription(
          (organization.publicMetadata?.description as string) ||
            existingOrg?.description ||
            ""
        );
        initializedOrgIdRef.current = orgId;
        setHasUserEdited(false);
      }
    }
  }, [organization?.id, existingOrg]);

  // Load pending invitations and existing members
  useEffect(() => {
    const loadData = async () => {
      if (organization) {
        const [invitations, members] = await Promise.all([
          getPendingInvitations(),
          getMembers(),
        ]);
        
        setPendingInvitations(
          invitations.map((inv) => ({
            id: inv.id,
            emailAddress: inv.emailAddress ?? "",
            role: inv.role ?? "org:member",
          }))
        );

        setExistingMembers(
          members.map((member) => ({
            id: member.id,
            emailAddress: member.publicUserData?.identifier ?? "",
            role: member.role ?? "org:member",
            publicUserData: member.publicUserData,
          }))
        );
      }
    };
    loadData();
  }, [organization, getPendingInvitations, getMembers]);

  const handleSaveAndContinue = async () => {
    if (!organization) return;

    setIsSaving(true);
    setError(null);

    try {
      // Validate inputs
      if (!name.trim() || name.trim().length < 2) {
        throw new Error("Organization name must be at least 2 characters long");
      }
      if (!slug.trim() || slug.trim().length < 2) {
        throw new Error("Organization URL must be at least 2 characters long");
      }
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new Error(
          "Organization URL can only contain lowercase letters, numbers, and hyphens"
        );
      }

      // Update organization in Clerk
      try {
        await updateOrganization({ name, slug });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update organization";
        if (errorMessage.includes("slug") || errorMessage.includes("taken")) {
          throw new Error(
            "That organization URL is already taken. Please choose a different one."
          );
        }
        throw new Error(errorMessage);
      }

      // Update description in Clerk metadata (optional - description is stored in Convex)
      try {
        await updateOrganizationMetadata({ description });
      } catch (err) {
        console.warn("Failed to update Clerk metadata (non-critical):", err);
      }

      // Sync to Convex
      await createOrUpdateOrg({
        clerkOrgId: organization.id,
        name,
        slug,
        description,
        imageUrl: organization.imageUrl || undefined,
      });

      setHasUserEdited(false);

      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        setError(null);
      } else {
        router.replace("/");
      }
    } catch (err) {
      console.error("Failed to save organization:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save organization";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = async (file: File) => {
    await updateOrganizationImage(file);
  };

  const handleImageRemove = async () => {
    await removeOrganizationImage();
  };

  const handleInvite = async (
    email: string,
    role: "org:admin" | "org:member"
  ) => {
    await inviteMember(email, role);
    const [invitations, members] = await Promise.all([
      getPendingInvitations(),
      getMembers(),
    ]);
    setPendingInvitations(
      invitations.map((inv) => ({
        id: inv.id,
        emailAddress: inv.emailAddress ?? "",
        role: inv.role ?? "org:member",
      }))
    );
    setExistingMembers(
      members.map((member) => ({
        id: member.id,
        emailAddress: member.publicUserData?.identifier ?? "",
        role: member.role ?? "org:member",
        publicUserData: member.publicUserData,
      }))
    );
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    await revokeInvitation(invitationId);
    setPendingInvitations((prev) =>
      prev.filter((inv) => inv.id !== invitationId)
    );
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.replace("/");
    }
  };

  const isBasicsValid = name.trim().length >= 2 && slug.trim().length >= 2;
  const isDescriptionValid = true; // Description is optional

  if (!clerkLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8 animate-spin text-[#26251E]/20" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-[#26251E]/60">No organization found.</p>
        <p className="text-sm text-[#26251E]/40">
          Please sign out and sign up again to create an organization.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12 md:gap-24 items-start">
      {/* Sidebar Stepper - Left Side */}
      <div className="hidden md:flex flex-col space-y-1 relative sticky top-8">
        <div className="absolute left-3.5 top-4 bottom-4 w-px bg-[#26251E]/5 -z-10" />
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          
          return (
            <div 
              key={step.id} 
              className={cn(
                "flex items-center gap-4 py-3 px-3 rounded-lg transition-all duration-300",
                isActive ? "bg-white shadow-sm" : "opacity-60 hover:opacity-100 hover:bg-[#26251E]/5"
              )}
            >
              <div 
                className={cn(
                  "size-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors duration-300 z-10",
                  isActive 
                    ? "bg-[#26251E] text-white border-[#26251E]" 
                    : isCompleted
                      ? "bg-[#26251E] text-white border-[#26251E]"
                      : "bg-[#F7F7F4] text-[#26251E]/40 border-[#26251E]/20"
                )}
              >
                {isCompleted ? <Check weight="bold" /> : index + 1}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-[#26251E]" : "text-[#26251E]/80"
                )}>
                  {step.title}
                </span>
                <span className="text-[10px] text-[#26251E]/40 font-medium tracking-wide uppercase">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Form Area */}
      <div className="flex flex-col gap-8 w-full max-w-lg">
        {/* Mobile Step Indicator */}
        <div className="flex md:hidden items-center justify-between mb-4 border-b border-[#26251E]/10 pb-4">
          <span className="text-sm font-medium text-[#26251E]/60">Step {currentStep + 1} of {steps.length}</span>
          <span className="text-sm font-semibold text-[#26251E]">{steps[currentStep].title}</span>
        </div>

        {currentStep === 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 ease-out">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[#26251E]">
                Let's start with the basics
              </h1>
              <p className="text-[#26251E]/60 text-lg">
                Your organization's identity helps your team recognize where they are.
              </p>
            </div>

            <div className="flex flex-col gap-8 py-4">
              <OrgImageUpload
                currentImageUrl={organization.imageUrl}
                organizationName={name}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
              />

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#26251E] font-medium">
                    Organization Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setHasUserEdited(true);
                    }}
                    placeholder="e.g. Acme Inc."
                    className="h-12 bg-white border-[#26251E]/10 focus:border-[#26251E] focus:ring-0 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-[#26251E] font-medium">
                    Workspace URL
                  </Label>
                  <div className="flex items-center group focus-within:ring-1 focus-within:ring-[#26251E] rounded-md transition-all">
                    <span className="h-12 px-4 flex items-center text-sm text-[#26251E]/40 bg-[#26251E]/5 border border-[#26251E]/10 border-r-0 rounded-l-md group-focus-within:border-[#26251E]">
                      portal.app/
                    </span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => {
                        setSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                        );
                        setHasUserEdited(true);
                      }}
                      placeholder="acme"
                      className="h-12 rounded-l-none bg-white border-[#26251E]/10 focus:border-[#26251E] focus-visible:ring-0 text-base"
                    />
                  </div>
                  <p className="text-xs text-[#26251E]/40 pl-1">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 ease-out">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[#26251E]">
                What is this team about?
              </h1>
              <p className="text-[#26251E]/60 text-lg">
                A short description helps new members understand the mission.
              </p>
            </div>

            <div className="space-y-2 py-4">
              <Label htmlFor="description" className="text-[#26251E] font-medium">
                Description <span className="text-[#26251E]/40 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="We are building the future of..."
                className="min-h-[200px] resize-none p-4 bg-white border-[#26251E]/10 focus:border-[#26251E] focus:ring-0 text-base leading-relaxed"
              />
              <div className="flex justify-between pl-1">
                <p className="text-xs text-[#26251E]/40">
                  Visible to all members
                </p>
                <p className="text-xs text-[#26251E]/40">
                  {description.length} characters
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 ease-out">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[#26251E]">
                Bring your team together
              </h1>
              <p className="text-[#26251E]/60 text-lg">
                Everything is better with friends. Invite your colleagues now.
              </p>
            </div>

            <div className="py-4">
              <MemberInvitation
                onInvite={handleInvite}
                pendingInvitations={pendingInvitations}
                onRevokeInvitation={handleRevokeInvitation}
                existingMembers={existingMembers}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="size-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-[#26251E]/5 mt-auto">
          {currentStep === 2 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isSaving}
              className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
            >
              Skip for now
            </Button>
          ) : (
             // Spacer
             <div />
          )}

          <Button
            type="button"
            size="lg"
            onClick={handleSaveAndContinue}
            disabled={
              isSaving ||
              (currentStep === 0 && !isBasicsValid) ||
              (currentStep === 1 && !isDescriptionValid)
            }
            className="gap-2 min-w-[140px] bg-[#26251E] text-white hover:bg-[#26251E]/90 rounded-full h-12 px-6 shadow-md shadow-[#26251E]/5"
          >
            {isSaving ? (
              <Spinner className="size-4 animate-spin" />
            ) : (
              <>
                {currentStep === steps.length - 1 ? "Finish Setup" : "Continue"}
                <ArrowRight className="size-4" weight="bold" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
