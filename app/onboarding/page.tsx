"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import Link from "next/link";
import { ChoiceStep } from "@/components/onboarding/choice-step";
import { JoinStep } from "@/components/onboarding/join-step";
import {
  CreateDetailsStep,
  type WorkspaceData,
} from "@/components/onboarding/create-details-step";
import { CreateInviteStep } from "@/components/onboarding/create-invite-step";
import { CreateDoneStep } from "@/components/onboarding/create-done-step";

type Step = "choice" | "join" | "create-details" | "create-invite" | "create-done";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberships = useQuery(api.organizations.getUserMemberships);
  const initialStep = searchParams.get("step") === "create" ? "create-details" : "choice";
  const [step, setStep] = useState<Step>(initialStep);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);

  // Loading state while checking memberships
  if (memberships === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const leftPanelContent = () => {
    switch (step) {
      case "choice":
        return null;
      case "join":
        return (
          <p className="text-sm text-background/70 max-w-xs">
            Join an existing workspace to collaborate with your team.
          </p>
        );
      case "create-details":
        return (
          <p className="text-sm text-background/70 max-w-xs">
            Create a workspace for your team to communicate and collaborate.
          </p>
        );
      case "create-invite":
        return (
          <p className="text-sm text-background/70 max-w-xs">
            Invite your teammates to join the conversation.
          </p>
        );
      case "create-done":
        return (
          <p className="text-sm text-background/70 max-w-xs">
            Your workspace is all set up and ready to use.
          </p>
        );
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-foreground p-10 text-background lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/portal.svg"
            alt="Portal"
            width={24}
            height={24}
            className="invert"
          />
          <span className="text-sm font-medium">Portal</span>
        </Link>
        <div className="max-w-md">{leftPanelContent()}</div>
        <p className="text-xs text-background/40">
          &copy; {new Date().getFullYear()} Portal. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Mobile header */}
        <div className="flex items-center border-b border-border p-4 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/portal.svg" alt="Portal" width={20} height={20} />
            <span className="text-xs font-medium">Portal</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {step === "choice" && (
            <ChoiceStep
              onChoice={(choice) =>
                setStep(choice === "create" ? "create-details" : "join")
              }
            />
          )}

          {step === "join" && (
            <JoinStep
              onBack={() => setStep("choice")}
              onJoinedSlug={(slug) => router.push(`/w/${slug}`)}
            />
          )}

          {step === "create-details" && (
            <CreateDetailsStep
              onNext={(data) => {
                setWorkspaceData(data);
                setStep("create-invite");
              }}
              onBack={() => setStep("choice")}
            />
          )}

          {step === "create-invite" && workspaceData?.organizationId && (
            <CreateInviteStep
              organizationId={workspaceData.organizationId}
              workspaceName={workspaceData.name}
              onNext={() => setStep("create-done")}
              onBack={() => setStep("create-details")}
            />
          )}

          {step === "create-done" && workspaceData && (
            <CreateDoneStep
              workspaceName={workspaceData.name}
              onFinish={() => router.push(`/w/${workspaceData.slug}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
