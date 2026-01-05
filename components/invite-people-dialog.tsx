"use client";

import * as React from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EnvelopeIcon,
  LinkIcon,
  CheckIcon,
  CopyIcon,
  UserPlusIcon,
  ShieldIcon,
  UserIcon,
  PaperPlaneIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

type InvitePeopleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
};

export function InvitePeopleDialog({
  open,
  onOpenChange,
  organizationId,
}: InvitePeopleDialogProps) {
  const [activeTab, setActiveTab] = React.useState<"email" | "link">("email");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "member">("member");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Actions and mutations
  const sendInvitation = useAction(api.invitations.sendInvitationEmail);
  const createInviteLink = useMutation(api.organizations.createInviteLink);
  const revokeInviteLink = useMutation(api.organizations.revokeInviteLink);

  // Query for existing invite link
  const existingLink = useQuery(api.organizations.getInviteLink, {
    organizationId,
    role,
  });

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const inviteLink = existingLink
    ? `${baseUrl}/invite/${existingLink.token}`
    : null;

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await sendInvitation({
        organizationId,
        email: email.trim(),
        role,
        baseUrl,
      });
      analytics.invitationSent({ method: "email", role });
      setSuccess(true);
      setEmail("");
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLink = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await createInviteLink({
        organizationId,
        role,
      });
      analytics.inviteLinkCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeLink = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await revokeInviteLink({
        organizationId,
        role,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      analytics.inviteLinkCopied();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setError("Failed to copy link");
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    setSuccess(false);
    setCopiedLink(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md p-0 gap-0 bg-card">
        {/* Header */}
        <AlertDialogHeader className="border-b border-border px-6 py-4 text-left place-items-start">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-foreground rounded-lg flex items-center justify-center">
              <UserPlusIcon className="size-4 text-background" weight="bold" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-semibold text-foreground">
                Invite People
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                Add new members to your workspace
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
            <button
              onClick={() => setActiveTab("email")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === "email"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <EnvelopeIcon className="size-4" weight="bold" />
              Email Invite
            </button>
            <button
              onClick={() => setActiveTab("link")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === "link"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LinkIcon className="size-4" weight="bold" />
              Invite Link
            </button>
          </div>

          {/* Role Selection */}
          <div className="mb-4">
            <Label className="text-xs font-medium text-foreground/80 mb-2 block">
              Role
            </Label>
            <div className="flex gap-2">
              <button
                onClick={() => setRole("member")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                  role === "member"
                    ? "border-primary bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:border-border/80"
                )}
              >
                <UserIcon className="size-4" weight="bold" />
                <span className="text-sm font-medium">Member</span>
              </button>
              <button
                onClick={() => setRole("admin")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                  role === "admin"
                    ? "border-primary bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:border-border/80"
                )}
              >
                <ShieldIcon className="size-4" weight="fill" />
                <span className="text-sm font-medium">Admin</span>
              </button>
            </div>
          </div>

          {/* Email Tab */}
          {activeTab === "email" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs font-medium text-foreground/80 mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleSendInvitation();
                    }
                  }}
                  disabled={isLoading}
                  className="bg-card border-border"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckIcon className="size-4 text-green-600" weight="bold" />
                  <p className="text-xs text-green-600">Invitation sent successfully!</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                An email will be sent with an invitation link. The invitation expires in 7 days.
              </p>
            </div>
          )}

          {/* Link Tab */}
          {activeTab === "link" && (
            <div className="space-y-4">
              {inviteLink ? (
                <>
                  <div>
                    <Label className="text-xs font-medium text-foreground/80 mb-2 block">
                      Share this link
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={inviteLink}
                        readOnly
                        className="bg-muted border-border font-mono text-xs"
                      />
                      <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      >
                        {copiedLink ? (
                          <CheckIcon className="size-4" weight="bold" />
                        ) : (
                          <CopyIcon className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-foreground/70">
                      Anyone with this link can join as{" "}
                      <span className="font-medium">
                        {role === "admin" ? "an admin" : "a member"}
                      </span>
                      . The link expires in 7 days.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleRevokeLink}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Revoke Link
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <LinkIcon className="size-8 mx-auto mb-2 text-muted-foreground" weight="bold" />
                    <p className="text-sm text-foreground/80 mb-1">No active invite link</p>
                    <p className="text-xs text-muted-foreground">
                      Create a shareable link that anyone can use to join your workspace
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleCreateLink}
                    disabled={isLoading}
                    className="w-full bg-foreground hover:bg-foreground/90"
                  >
                    Create Invite Link
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <AlertDialogFooter className="border-t border-border px-6 py-4">
          {activeTab === "email" ? (
            <>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <Button
                onClick={handleSendInvitation}
                disabled={isLoading || !email.trim()}
                className="bg-foreground hover:bg-foreground/90"
              >
                {isLoading ? (
                  "Sending..."
                ) : (
                  <>
                    <PaperPlaneIcon className="size-4 mr-2" weight="bold" />
                    Send Invitation
                  </>
                )}
              </Button>
            </>
          ) : (
            <AlertDialogCancel disabled={isLoading} className="w-full sm:w-auto">
              Close
            </AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
