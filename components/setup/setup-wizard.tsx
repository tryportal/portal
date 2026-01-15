"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { parseAsInteger, useQueryState } from "nuqs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Spinner,
  ArrowRight,
  ArrowLeft,
  Check,
  Confetti,
} from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";
import { useUserDataCache } from "@/components/user-data-cache";
import { Button } from "@/components/ui/button";
import { SetupProgress } from "@/components/setup/setup-progress";
import { ChoiceStep } from "@/components/setup/steps/choice-step";
import { IdentityStep } from "@/components/setup/steps/identity-step";
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

// Updated steps - merged About into Identity (now 3 steps instead of 4)
const STEPS = [
  { id: "choice", label: "Start" },
  { id: "identity", label: "Workspace" },
  { id: "invite", label: "Team" },
];

// Progress steps (excluding choice)
const PROGRESS_STEPS = [
  { id: "identity", label: "Workspace" },
  { id: "invite", label: "Team" },
];

interface SetupWizardProps {
  organizationId?: string;
}

export function SetupWizard({ organizationId: initialOrgId }: SetupWizardProps) {
  const router = useRouter();
  const { cache: userDataCache, fetchUserData } = useUserDataCache();
  const prevStepRef = useRef(0);

  // URL state for step and org ID using nuqs
  const [step, setStep] = useQueryState("step", parseAsInteger.withDefault(0));
  const [orgIdParam, setOrgIdParam] = useQueryState("org");

  // Track direction for animations
  const [direction, setDirection] = useState(0);

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
  const [isFinishing, setIsFinishing] = useState(false);

  // Update direction when step changes
  useEffect(() => {
    if (step > prevStepRef.current) {
      setDirection(1);
    } else if (step < prevStepRef.current) {
      setDirection(-1);
    }
    prevStepRef.current = step;
  }, [step]);

  // Initialize form with existing org data
  useEffect(() => {
    if (existingOrg && !hasInitialized) {
      setName(existingOrg.name || "");
      setSlug(existingOrg.slug || "");
      setDescription(existingOrg.description || "");
      setLogoUrl(existingOrg.logoUrl ?? undefined);
      setLogoId(existingOrg.logoId ?? undefined);
      setHasInitialized(true);

      // If org already has name and slug, start from invite step (step 2)
      if (existingOrg.name && existingOrg.slug && step === 0) {
        setStep(2);
      }
    }
  }, [existingOrg, hasInitialized, step, setStep]);

  const handleCreateNew = () => {
    setDirection(1);
    setStep(1);
  };

  const handleJoinWorkspace = () => {
    router.push("/setup/public-workspaces");
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    } else if (step === 1) {
      setDirection(-1);
      setStep(0);
    }
  };

  const handleContinue = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Validate on step 1 (identity step)
      if (step === 1) {
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

      if (step === 1) {
        if (!orgId) {
          // Create new organization
          orgId = await createOrg({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
            logoId,
          });
          await setOrgIdParam(orgId);
          analytics.workspaceCreated({ workspaceId: orgId, name: name.trim() });
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
      }

      // Move to next step or finish
      if (step < STEPS.length - 1) {
        setDirection(1);
        await setStep(step + 1);
        analytics.setupStepCompleted({ step, stepName: STEPS[step].id });
      } else {
        // Finish setup with animation
        setIsFinishing(true);
        analytics.setupCompleted();
        setTimeout(() => {
          router.replace(`/w/${slug}`);
        }, 800);
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
      setDirection(1);
      setStep(step + 1);
    } else {
      setIsFinishing(true);
      setTimeout(() => {
        router.replace(`/w/${slug}`);
      }, 800);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts on steps > 0 (not choice step)
      if (step === 0) return;
      
      // Check if step is valid (inline validation)
      const stepIsValid = step === 1 
        ? name.trim().length >= 2 && slug.trim().length >= 2 
        : true;
      
      // Ctrl/Cmd + Enter to continue
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isSaving && stepIsValid) {
        e.preventDefault();
        handleContinue();
      }
      
      // Escape to go back (only if not saving)
      if (e.key === "Escape" && !isSaving && step > 0) {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, isSaving, name, slug, handleContinue, handleBack]);

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
    if (step === 1) {
      return name.trim().length >= 2 && slug.trim().length >= 2;
    }
    return true;
  };

  // For choice step, don't show progress or continue button
  const showProgress = step > 0;
  const isLastStep = step === STEPS.length - 1;

  // Animation variants for step transitions
  const stepVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -20 : 20,
      opacity: 0,
    }),
  };

  // Show finishing animation
  if (isFinishing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md mx-auto flex flex-col items-center justify-center py-20"
      >
        <div className="size-20 rounded-full bg-primary flex items-center justify-center mb-6">
          <Check className="size-10 text-primary-foreground" weight="bold" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          You're all set!
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Redirecting to your workspace...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-[95%] sm:max-w-lg lg:max-w-2xl mx-auto px-2 sm:px-0">
      {/* Progress indicator - only show for create flow */}
      <AnimatePresence mode="wait">
        {showProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-10"
          >
            <SetupProgress currentStep={step - 1} steps={PROGRESS_STEPS} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content with animations */}
      <div className="min-h-[400px] relative">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="choice"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <ChoiceStep
                onCreateNew={handleCreateNew}
                onJoinWorkspace={handleJoinWorkspace}
              />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="identity"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <IdentityStep
                name={name}
                setName={setName}
                slug={slug}
                setSlug={setSlug}
                description={description}
                setDescription={setDescription}
                logoUrl={logoUrl}
                onLogoUploaded={handleLogoUploaded}
                onLogoRemoved={handleLogoRemoved}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="invite"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <InviteStep
                onInvite={handleInvite}
                pendingInvitations={formattedInvitations}
                onRevokeInvitation={handleRevokeInvitation}
                existingMembers={formattedMembers}
                inviteLink={inviteLink}
                onCreateInviteLink={handleCreateInviteLink}
                onRevokeInviteLink={handleRevokeInviteLink}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions - only show for create flow (steps 1-2) */}
      <AnimatePresence>
        {step > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-10 flex items-center justify-between pt-6 border-t border-border"
          >
            {/* Left side - Back button or Skip */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isSaving}
                  className="gap-1.5 text-muted-foreground"
                >
                  <ArrowLeft className="size-4" weight="bold" />
                  Back
                </Button>
              )}
            </div>

            {/* Right side - Skip and Continue */}
            <div className="flex items-center gap-3">
              {isLastStep && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              )}

              <Button
                type="button"
                onClick={handleContinue}
                disabled={isSaving || !isStepValid()}
                className="gap-2 min-w-[130px] h-10"
              >
                {isSaving ? (
                  <Spinner className="size-4 animate-spin" />
                ) : (
                  <>
                    {isLastStep ? "Finish Setup" : "Continue"}
                    {isLastStep ? (
                      <Confetti className="size-4" weight="fill" />
                    ) : (
                      <ArrowRight className="size-4" weight="bold" />
                    )}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
