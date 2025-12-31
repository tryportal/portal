"use client";

import { useAuth, SignIn } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner, CheckCircle, XCircle, EnvelopeSimple } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { useTheme } from "@/lib/theme-provider";
import * as React from "react";

export default function InvitePage({
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

  const acceptInvitation = useMutation(api.organizations.acceptInvitation);

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
    api.organizations.getInvitationByToken,
    token ? { token } : "skip"
  );

  // Handle accepting the invitation when signed in
  const handleAccept = async () => {
    if (!token) return;

    setIsAccepting(true);
    setError(null);

    try {
      const result = await acceptInvitation({ token });
      const isLinkInvite = !invitationData?.invitation?.email;
      analytics.inviteAccepted({ method: isLinkInvite ? "link" : "email" });
      setSuccess(true);

      // Redirect to the organization workspace after a short delay
      setTimeout(() => {
        if (result.slug) {
          router.replace(`/w/${result.slug}`);
        } else {
          router.replace("/setup");
        }
      }, 2000);
    } catch (err) {
      console.error("Failed to accept invitation:", err);
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

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
  }, [authLoaded, isSignedIn, invitationData, success, isAccepting, error]);

  // Loading state
  if (!authLoaded || (token && invitationData === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="size-12 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
            <img src={isDark ? "/portal.svg" : "/portal-dark.svg"} alt="Portal" className="size-6 opacity-90" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Spinner className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Loading invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid or expired invitation
  if (!invitationData || !invitationData.invitation || !invitationData.organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="size-5 sm:size-8 text-red-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Invalid Invitation</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              This invitation link is invalid or has expired. Please request a new invitation from your team admin.
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

  const { invitation, organization } = invitationData;

  // Already accepted or revoked
  if (invitation.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-amber-50 flex items-center justify-center">
              <EnvelopeSimple className="size-5 sm:size-8 text-amber-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
              Invitation {invitation.status === "accepted" ? "Already Accepted" : "No Longer Valid"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {invitation.status === "accepted"
                ? "This invitation has already been accepted. You can access the organization from your dashboard."
                : "This invitation has been revoked. Please request a new invitation from your team admin."}
            </p>
            <Button
              onClick={() => router.push(`/w/${organization.slug}`)}
              className="mt-4 bg-foreground text-background hover:bg-foreground/90"
            >
              Go to {organization.name}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Expired
  if (invitation.expiresAt < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-amber-50 flex items-center justify-center">
              <XCircle className="size-5 sm:size-8 text-amber-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Invitation Expired</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              This invitation has expired. Please request a new invitation from your team admin.
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
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="size-5 sm:size-8 text-green-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Welcome to {organization.name}!</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              You&apos;ve successfully joined the team. Redirecting you to the workspace...
            </p>
            <Spinner className="size-5 animate-spin text-muted-foreground mt-4" />
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
                <EnvelopeSimple className="size-5 sm:size-8 text-foreground" weight="fill" />
              </div>
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
                You&apos;re invited to join {organization.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Sign in or create an account to accept this invitation and join the team as {invitation.role === "admin" ? "an admin" : "a member"}.
              </p>
            </div>
          </div>
          <SignIn
            routing="hash"
            afterSignInUrl={`/invite/${token}`}
            afterSignUpUrl={`/invite/${token}`}
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
          <div className="flex flex-col items-center gap-2">
            <Spinner className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Joining {organization.name}...</p>
          </div>
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
        <Spinner className="size-6 animate-spin text-foreground/20" />
      </div>
    </div>
  );
}

