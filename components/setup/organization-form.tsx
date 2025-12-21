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
  const [currentStep, setCurrentStep] = useState(0);
  const initializedOrgIdRef = useRef<string | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  const steps = [
    { id: "basics", title: "Organization Details", icon: Buildings },
    {
      id: "description",
      title: "About Your Organization",
      icon: TextAlignLeft,
    },
    { id: "members", title: "Invite Team Members", icon: LinkIcon },
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

  // Load pending invitations
  useEffect(() => {
    const loadInvitations = async () => {
      if (organization) {
        const invitations = await getPendingInvitations();
        setPendingInvitations(
          invitations.map((inv) => ({
            id: inv.id,
            emailAddress: inv.emailAddress ?? "",
            role: inv.role ?? "org:member",
          }))
        );
      }
    };
    loadInvitations();
  }, [organization, getPendingInvitations]);

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
        // Silently fail - metadata update is optional since description is stored in Convex
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

      // Reset user edited flag after successful save
      setHasUserEdited(false);

      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        // Clear error on successful step transition
        setError(null);
      } else {
        // Final step - redirect to home
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
    // Refresh pending invitations
    const invitations = await getPendingInvitations();
    setPendingInvitations(
      invitations.map((inv) => ({
        id: inv.id,
        emailAddress: inv.emailAddress ?? "",
        role: inv.role ?? "org:member",
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
  const isDescriptionValid = description.trim().length >= 10;

  if (!clerkLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">No organization found.</p>
        <p className="text-sm text-muted-foreground">
          Please sign out and sign up again to create an organization.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
                  index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : index < currentStep
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-primary/5 text-primary/40"
                )}
              >
                <Icon
                  className="size-4"
                  weight={index <= currentStep ? "fill" : "regular"}
                />
                <span className="text-xs font-medium hidden sm:inline">
                  {step.title}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 rounded-full",
                    index < currentStep ? "bg-primary/20" : "bg-primary/5"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="space-y-8">
        {currentStep === 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-primary">
                Set up your organization
              </h2>
              <p className="text-primary/60">
                Customize your organization&apos;s name, URL, and logo
              </p>
            </div>

            {/* Image Upload */}
            <OrgImageUpload
              currentImageUrl={organization.imageUrl}
              organizationName={name}
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
            />

            {/* Name & Slug */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-primary">
                  <Buildings className="size-4" />
                  Organization name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasUserEdited(true);
                  }}
                  placeholder="Acme Inc."
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="flex items-center gap-2 text-primary">
                  <LinkIcon className="size-4" />
                  Organization URL
                </Label>
                <div className="flex items-center gap-0">
                  <span className="h-10 px-3 flex items-center text-sm text-primary/40 bg-primary/5 border border-r-0 border-transparent rounded-l-md">
                    tryportal.app/
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
                    className="h-10 rounded-l-none"
                  />
                </div>
                <p className="text-xs text-primary/60">
                  Only lowercase letters, numbers, and hyphens
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-primary">
                Describe your organization
              </h2>
              <p className="text-primary/60">
                Help your team understand what your organization is about
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2 text-primary">
                <TextAlignLeft className="size-4" />
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="We're a team building amazing products that help people..."
                className="min-h-32 resize-none"
              />
              <p className="text-xs text-primary/60">
                At least 10 characters. This will be visible to your team
                members.
              </p>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-primary">
                Invite your team
              </h2>
              <p className="text-primary/60">
                Collaboration is better with your team. You can also do this
                later.
              </p>
            </div>

            <MemberInvitation
              onInvite={handleInvite}
              pendingInvitations={pendingInvitations}
              onRevokeInvitation={handleRevokeInvitation}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          {currentStep === 2 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isSaving}
            >
              Skip for now
            </Button>
          ) : (
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
            className="gap-2 min-w-32"
          >
            {isSaving ? (
              <Spinner className="size-4 animate-spin" />
            ) : (
              <>
                {currentStep === steps.length - 1 ? "Finish setup" : "Continue"}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
