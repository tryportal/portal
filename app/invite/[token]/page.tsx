"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import Link from "next/link";
import { LightRays } from "@/components/ui/light-rays";
import { Button } from "@/components/ui/button";
import { WorkspaceIcon } from "@/components/workspace-icon";
import { Users, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { DotLoader } from "@/components/ui/dot-loader";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const invite = useQuery(api.invitations.getInviteByToken, { token });
  const acceptInvite = useMutation(api.invitations.acceptInvite);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsJoining(true);
    setError(null);
    try {
      const result = await acceptInvite({ token });
      router.push(`/w/${result.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join workspace");
      setIsJoining(false);
    }
  };

  // Determine the content to show
  const isLoading = !isLoaded || invite === undefined;
  const isInvalid = invite === null;
  const isExpired = invite?.isExpired;
  const isRevoked = invite?.status === "revoked";
  const needsAuth = isLoaded && !isSignedIn;
  const alreadyMember = invite?.alreadyMember;

  const leftPanelText = () => {
    if (isLoading) return null;
    if (isInvalid || isExpired || isRevoked)
      return (
        <p className="text-sm text-background/70 max-w-xs">
          This invite link is no longer valid.
        </p>
      );
    if (needsAuth)
      return (
        <p className="text-sm text-background/70 max-w-xs">
          Sign in to accept this invite and join the workspace.
        </p>
      );
    if (alreadyMember)
      return (
        <p className="text-sm text-background/70 max-w-xs">
          You&apos;re already a member of this workspace.
        </p>
      );
    return (
      <p className="text-sm text-background/70 max-w-xs">
        You&apos;ve been invited to join a workspace on Portal.
      </p>
    );
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-foreground p-10 text-background lg:flex">
        <LightRays mouseInfluence={0} />
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <Image
            src="/portal.svg"
            alt="Portal"
            width={24}
            height={24}
            className="invert"
          />
          <span className="text-sm font-medium">Portal</span>
        </Link>
        <div className="relative z-10 max-w-md">{leftPanelText()}</div>
        <p className="relative z-10 text-xs text-background/40">
          &copy; {new Date().getFullYear()} Portal. All rights reserved.
        </p>
      </div>

      {/* Right content panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Mobile header */}
        <div className="flex items-center border-b border-border p-4 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/portal.svg" alt="Portal" width={20} height={20} />
            <span className="text-xs font-medium">Portal</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <DotLoader />
            </div>
          ) : isInvalid ? (
            <ErrorState
              title="Invalid invite"
              description="This invite link doesn't exist or has been deleted."
            />
          ) : isExpired ? (
            <ErrorState
              title="Invite expired"
              description="This invite link has expired. Ask the workspace admin for a new one."
            />
          ) : isRevoked ? (
            <ErrorState
              title="Invite revoked"
              description="This invite link has been revoked by a workspace admin."
            />
          ) : needsAuth ? (
            <div className="w-full max-w-sm">
              <WorkspaceCard workspace={invite.workspace} />
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-center text-xs text-muted-foreground">
                  You need to sign in to join this workspace.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1"
                    onClick={() =>
                      router.push(
                        `/sign-in?redirect_url=/invite/${token}`
                      )
                    }
                  >
                    Sign in
                  </Button>
                  <Button
                    size="default"
                    className="flex-1"
                    onClick={() =>
                      router.push(
                        `/get-started?redirect_url=/invite/${token}`
                      )
                    }
                  >
                    Create account
                  </Button>
                </div>
              </div>
            </div>
          ) : alreadyMember ? (
            <div className="w-full max-w-sm">
              <WorkspaceCard workspace={invite.workspace} />
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle size={14} className="text-green-600" />
                  You&apos;re already a member of this workspace.
                </div>
                <Button
                  size="default"
                  className="w-full"
                  onClick={() =>
                    router.push(`/w/${invite.workspace.slug}`)
                  }
                >
                  Open workspace
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm">
              <WorkspaceCard workspace={invite.workspace} />
              <div className="mt-6 flex flex-col gap-3">
                {error && (
                  <p className="text-xs text-destructive text-center">
                    {error}
                  </p>
                )}
                <Button
                  size="default"
                  className="w-full"
                  onClick={handleAccept}
                  disabled={isJoining}
                >
                  {isJoining ? "Joining..." : "Join workspace"}
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className="w-full"
                  onClick={() => router.push("/")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace preview card                                              */
/* ------------------------------------------------------------------ */

function WorkspaceCard({
  workspace,
}: {
  workspace: {
    name: string;
    slug: string;
    description?: string;
    logoUrl: string | null;
    memberCount: number;
  };
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex-shrink-0">
        <WorkspaceIcon
          logoUrl={workspace.logoUrl}
          name={workspace.name}
          slug={workspace.slug}
          size={64}
        />
      </div>
      <div className="text-center">
        <h1 className="text-lg font-medium tracking-tight">
          {workspace.name}
        </h1>
        {workspace.description && (
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {workspace.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Users size={12} />
          <span>
            {workspace.memberCount}{" "}
            {workspace.memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error state                                                         */
/* ------------------------------------------------------------------ */

function ErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-4 text-center max-w-sm">
      <div className="flex size-12 items-center justify-center bg-muted">
        <WarningCircle size={24} className="text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-lg font-medium tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="default" onClick={() => router.push("/")}>
        Go home
      </Button>
    </div>
  );
}
