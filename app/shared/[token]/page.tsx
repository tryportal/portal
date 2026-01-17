"use client";

import { useAuth, SignIn } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle, XCircle, HashStraight, Buildings } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";
import { LoadingSpinner } from "@/components/loading-spinner";
import * as React from "react";

export default function SharedChannelInvitePage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [token, setToken] = useState<string>("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acceptedChannel, setAcceptedChannel] = useState<{
    channelName: string;
    categoryName: string;
    organizationSlug: string;
    organizationName: string;
  } | null>(null);

  const acceptInvitation = useMutation(api.sharedChannels.acceptSharedChannelInvite);

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setToken(resolved.token));
    } else {
      setToken(params.token);
    }
  }, [params]);

  // Get invitation details
  const invitationData = useQuery(
    api.sharedChannels.getSharedChannelInviteByToken,
    token ? { token } : "skip"
  );

  // Handle accepting the invitation when signed in
  const handleAccept = useCallback(async () => {
    if (!token) return;

    setIsAccepting(true);
    setError(null);

    try {
      const result = await acceptInvitation({ token });
      setAcceptedChannel({
        channelName: result.channelName,
        categoryName: result.categoryName,
        organizationSlug: result.organizationSlug,
        organizationName: result.organizationName,
      });
      setSuccess(true);

      // Redirect to the shared channel after a short delay
      setTimeout(() => {
        const encodedCategory = encodeURIComponent(result.categoryName.toLowerCase());
        const encodedChannel = encodeURIComponent(result.channelName.toLowerCase());
        router.replace(`/w/${result.organizationSlug}/${encodedCategory}/${encodedChannel}`);
      }, 2000);
    } catch (err) {
      console.error("Failed to accept invitation:", err);
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  }, [token, acceptInvitation, router]);

  // Auto-accept when user signs in and invitation is valid
  useEffect(() => {
    if (
      authLoaded &&
      isSignedIn &&
      invitationData?.invitation &&
      invitationData.invitation.status === "pending" &&
      !success &&
      !isAccepting &&
      !error
    ) {
      handleAccept();
    }
  }, [authLoaded, isSignedIn, invitationData, success, isAccepting, error, handleAccept]);

  // Auto-redirect when invitation is already accepted
  useEffect(() => {
    const slug = invitationData?.organization?.slug;
    if (
      invitationData?.invitation?.status === "accepted" &&
      invitationData?.channel &&
      slug
    ) {
      const timer = setTimeout(() => {
        router.replace(`/w/${slug}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [invitationData, router]);

  // Loading state

  if (!authLoaded || !token || (token && invitationData === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="size-12 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
            <img src={isDark ? "/portal.svg" : "/portal-dark.svg"} alt="Portal" className="size-6 opacity-90" />
          </div>
          <LoadingSpinner size="sm" text="Loading invitation..." />
        </div>
      </div>
    );
  }

  // Invalid or expired invitation
  if (!invitationData || !invitationData.invitation || !invitationData.channel || !invitationData.organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="size-5 sm:size-8 text-red-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Invalid Invitation</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              This shared channel invitation link is invalid or has expired. Please request a new invitation.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="mt-4 bg-foreground text-background hover:bg-foreground/90"
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );

  }

  const { invitation, channel, organization, inviter } = invitationData;

  // Already accepted - redirect to channel
  if (invitation.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="size-5 sm:size-8 text-green-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
              You&apos;re already a member of #{channel.name}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Taking you to the channel...
            </p>
            <LoadingSpinner size="sm" className="mt-2" />
            <Button
              variant="link"
              onClick={() => router.push(`/w/${organization.slug}`)}
              className="text-muted-foreground hover:text-foreground"
            >
              Click here if you&apos;re not redirected
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Revoked invitation
  if (invitation.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-amber-50 flex items-center justify-center">
              <XCircle className="size-5 sm:size-8 text-amber-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
              Invitation No Longer Valid
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              This invitation has been revoked. Please request a new invitation.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="mt-4 bg-foreground text-background hover:bg-foreground/90"
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Expired
  if (invitation.expiresAt && invitation.expiresAt < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-amber-50 flex items-center justify-center">
              <XCircle className="size-5 sm:size-8 text-amber-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Invitation Expired</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              This shared channel invitation has expired. Please request a new invitation.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="mt-4 bg-foreground text-background hover:bg-foreground/90"
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success && acceptedChannel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="size-5 sm:size-8 text-green-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">You've joined #{acceptedChannel.channelName}!</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              You now have access to this channel in {acceptedChannel.organizationName}. Redirecting you there now...
            </p>
            <LoadingSpinner size="sm" className="mt-4" />
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full">
          <div className="bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border mb-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-12 sm:size-16 rounded-full bg-muted flex items-center justify-center">
                <HashStraight className="size-5 sm:size-8 text-foreground" weight="fill" />
              </div>
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
                You're invited to join #{channel.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Buildings className="size-4" weight="bold" />
                <span>{organization.name}</span>
              </div>
              {inviter && (
                <p className="text-sm text-muted-foreground">
                  Invited by {inviter.firstName} {inviter.lastName}
                </p>
              )}
              <p className="text-sm sm:text-base text-muted-foreground">
                Sign in or create an account to join this channel and start collaborating.
              </p>
            </div>
          </div>
          <SignIn
            routing="hash"
            afterSignInUrl={`/shared/${token}`}
            afterSignUpUrl={`/shared/${token}`}
          />
        </div>
      </div>
    );
  }

  // Accepting state
  if (isAccepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="size-12 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
            <img src={isDark ? "/portal.svg" : "/portal-dark.svg"} alt="Portal" className="size-6 opacity-90" />
          </div>
          <LoadingSpinner size="sm" text={`Joining #${channel.name}...`} />
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="size-5 sm:size-8 text-red-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{error}</p>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="border-border"
              >
                Go Home
              </Button>
              <Button
                onClick={() => {
                  setError(null);
                  handleAccept();
                }}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: accepting invitation (should auto-trigger)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
        <LoadingSpinner size="md" />
      </div>
    </div>
  );
}
