"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { parseAsInteger, useQueryState } from "nuqs";
import { Spinner, ArrowRight } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";
import { useUserDataCache } from "@/components/user-data-cache";
import { Button } from "@/components/ui/button";
import { SetupProgress } from "@/components/setup/setup-progress";
import { IdentityStep } from "@/components/setup/steps/identity-step";
import { AboutStep } from "@/components/setup/steps/about-step";
import { InviteStep } from "@/components/setup/steps/invite-step";

// Type for member data with user info from cache
type MemberWithUserData = {
  _id: Id<"organizationMembers">;
  organizationId: Id<"organizations">;
  userId: string;
  role: "admin" | "member";
  publicUserData: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | undefined;
};

// Reserved routes that cannot be used as workspace slugs
const RESERVED_ROUTES = [
  "w",
  "invite",
  "preview",
  "setup",
  "sign-in",
  "sign-up",
  "api",
  "admin",
  "dashboard",
  "settings",
  "help",
  "about",
  "contact",
  "privacy",
  "terms",
  "login",
  "logout",
  "register",
];

const STEPS = [
  { id: "identity", label: "Identity" },
  { id: "about", label: "About" },
  { id: "invite", label: "Invite" },
];

interface SetupWizardProps {
  organizationId?: string;
}

export function SetupWizard({ organizationId: initialOrgId }: SetupWizardProps) {
  const router = useRouter();
  const { cache: userDataCache, fetchUserData } = useUserDataCache();

  // URL state for step and org ID using nuqs
  const [step, setStep] = useQueryState("step", parseAsInteger.withDefault(0));
  const [orgIdParam, setOrgIdParam] = useQueryState("org");

  // Mutations
  const createOrg = useMutation(api.organizations.createOrganization);
  const updateOrg = useMutation(api.organizations.updateOrganization);
  const sendInvitation = useAction(api.invitations.sendInvitationEmail);
  const revokeInvitationMutation = useMutation(api.organizations.revokeInvitation);
  const createInviteLinkMutation = useMutation(api.organizations.createInviteLink);
  const revokeInviteLinkMutation = useMutation(api.organizations.revokeInviteLink);

  // Determine current org ID
  const currentOrgId = (orgIdParam || initialOrgId) as Id<"organizations"> | undefined;

  // Queries
  const existingOrg = useQuery(
    api.organizations.getOrganization,
    currentOrgId ? { id: currentOrgId } : "skip"
  );
  const pendingInvitations = useQuery(
    api.organizations.getOrganizationInvitations,
    currentOrgId ? { organizationId: currentOrgId } : "skip"
  );
  const inviteLink = useQuery(
    api.organizations.getInviteLink,
    currentOrgId ? { organizationId: currentOrgId, role: "member" as const } : "skip"
  );

  // Members query (reactive)
  const membersResult = useQuery(
    api.organizations.getOrganizationMembersQuery,
    currentOrgId ? { organizationId: currentOrgId } : "skip"
  );

  const rawMembers = membersResult?.members ?? [];

  // Fetch user data for all members
  useEffect(() => {
    if (rawMembers.length > 0) {
      const userIds = rawMembers.map((m) => m.userId);
      fetchUserData(userIds);
    }
  }, [rawMembers, fetchUserData]);

  // Transform members with cached user data
  const members: MemberWithUserData[] = useMemo(() => {
    return rawMembers.map((member) => {
      const cached = userDataCache[member.userId];
      return {
        _id: member._id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        publicUserData: cached ? {
          firstName: cached.firstName,
          lastName: cached.lastName,
          imageUrl: cached.imageUrl,
        } : undefined,
      };
    });
  }, [rawMembers, userDataCache]);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoId, setLogoId] = useState<Id<"_storage"> | undefined>();
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize form with existing org data
  useEffect(() => {
    if (existingOrg && !hasInitialized) {
      setName(existingOrg.name || "");
      setSlug(existingOrg.slug || "");
      setDescription(existingOrg.description || "");
      setLogoUrl(existingOrg.logoUrl ?? undefined);
      setLogoId(existingOrg.logoId ?? undefined);
      setHasInitialized(true);

      // If org already has name and slug, start from appropriate step
      if (existingOrg.name && existingOrg.slug && step === 0) {
        setStep(1);
      }
    }
  }, [existingOrg, hasInitialized, step, setStep]);

  const handleContinue = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Validate on step 0
      if (step === 0) {
        if (!name.trim() || name.trim().length < 2) {
          throw new Error("Workspace name must be at least 2 characters");
        }
        if (!slug.trim() || slug.trim().length < 2) {
          throw new Error("Workspace URL must be at least 2 characters");
        }
        if (!/^[a-z0-9-]+$/.test(slug)) {
          throw new Error("URL can only contain lowercase letters, numbers, and hyphens");
        }
        if (RESERVED_ROUTES.includes(slug.trim().toLowerCase())) {
          throw new Error(`"${slug}" is reserved. Please choose a different URL.`);
        }
      }

      let orgId = currentOrgId;

      if (step === 0) {
        if (!orgId) {
          // Create new organization
          orgId = await createOrg({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
            logoId,
          });
          await setOrgIdParam(orgId);
        } else {
          // Update existing organization
          await updateOrg({
            id: orgId,
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
            logoId,
          });
        }
      } else if (step === 1 && orgId) {
        // Update description
        await updateOrg({
          id: orgId,
          description: description.trim() || undefined,
        });
      }

      // Move to next step or finish
      if (step < STEPS.length - 1) {
        await setStep(step + 1);
        analytics.setupStepCompleted({ step, stepName: STEPS[step].id });
      } else {
        // Finish setup
        analytics.setupCompleted();
        router.replace(`/w/${slug}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      router.replace(`/w/${slug}`);
    }
  };

  const handleLogoUploaded = (storageId: Id<"_storage">) => {
    setLogoId(storageId);
  };

  const handleLogoRemoved = () => {
    setLogoId(undefined);
    setLogoUrl(undefined);
  };

  const handleInvite = async (email: string, role: "org:admin" | "org:member") => {
    if (!currentOrgId) {
      throw new Error("Please complete the first step first");
    }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    await sendInvitation({
      organizationId: currentOrgId,
      email,
      role: role === "org:admin" ? "admin" : "member",
      baseUrl,
    });
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    await revokeInvitationMutation({
      invitationId: invitationId as Id<"organizationInvitations">,
    });
  };

  const handleCreateInviteLink = async () => {
    if (!currentOrgId) {
      throw new Error("Please complete the first step first");
    }
    return await createInviteLinkMutation({
      organizationId: currentOrgId,
      role: "member",
    });
  };

  const handleRevokeInviteLink = async () => {
    if (!currentOrgId) return;
    await revokeInviteLinkMutation({
      organizationId: currentOrgId,
      role: "member",
    });
  };

  // Format members for display
  const formattedMembers = members.map((member: MemberWithUserData) => {
    const firstName = member.publicUserData?.firstName;
    const lastName = member.publicUserData?.lastName;
    const displayName = firstName || lastName
      ? `${firstName || ""} ${lastName || ""}`.trim()
      : undefined;
    return {
      id: member._id,
      displayName,
      role: member.role === "admin" ? "org:admin" : "org:member",
      publicUserData: member.publicUserData,
    };
  });

  // Format invitations for display
  const formattedInvitations = (pendingInvitations || [])
    .filter((inv) => inv.email && !inv.isLinkInvite)
    .map((inv) => ({
      id: inv._id,
      emailAddress: inv.email!,
      role: inv.role === "admin" ? "org:admin" : "org:member",
    }));

  const isStepValid = () => {
    if (step === 0) {
      return name.trim().length >= 2 && slug.trim().length >= 2;
    }
    return true;
  };

  return (
    <div className="w-full max-w-[95%] sm:max-w-md mx-auto px-2 sm:px-0">
      {/* Progress indicator */}
      <div className="mb-8">
        <SetupProgress currentStep={step} steps={STEPS} />
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {step === 0 && (
          <IdentityStep
            name={name}
            setName={setName}
            slug={slug}
            setSlug={setSlug}
            logoUrl={logoUrl}
            onLogoUploaded={handleLogoUploaded}
            onLogoRemoved={handleLogoRemoved}
          />
        )}

        {step === 1 && (
          <AboutStep description={description} setDescription={setDescription} />
        )}

        {step === 2 && (
          <InviteStep
            onInvite={handleInvite}
            pendingInvitations={formattedInvitations}
            onRevokeInvitation={handleRevokeInvitation}
            existingMembers={formattedMembers}
            inviteLink={inviteLink}
            onCreateInviteLink={handleCreateInviteLink}
            onRevokeInviteLink={handleRevokeInviteLink}
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between pt-4 border-t border-border">
        <div>
          {step === 2 && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isSaving}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
        </div>

        <Button
          type="button"
          onClick={handleContinue}
          disabled={isSaving || !isStepValid()}
          className="gap-2 min-w-[120px]"
        >
          {isSaving ? (
            <Spinner className="size-4 animate-spin" />
          ) : (
            <>
              {step === STEPS.length - 1 ? "Finish" : "Continue"}
              <ArrowRight className="size-4" weight="bold" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
