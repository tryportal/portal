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
  ShareNetworkIcon,
  PaperPlaneIcon,
  UsersIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type ShareChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: Id<"channels">;
  channelName: string;
};

export function ShareChannelDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
}: ShareChannelDialogProps) {
  const [activeTab, setActiveTab] = React.useState<"email" | "link" | "members">("email");
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Actions and mutations
  const sendInvitation = useAction(api.invitations.sendSharedChannelInvitationEmail);
  const createLink = useMutation(api.sharedChannels.createSharedChannelLink);
  const revokeLink = useMutation(api.sharedChannels.revokeSharedChannelLink);
  const removeExternalMember = useMutation(api.sharedChannels.removeExternalMember);

  // Query for existing invite link
  const existingLink = useQuery(api.sharedChannels.getSharedChannelLink, 
    channelId ? { channelId } : "skip"
  );

  // Query for shared members
  const sharedMembers = useQuery(api.sharedChannels.getSharedChannelMembers, 
    channelId ? { channelId } : "skip"
  );

  // Query for pending invitations
  const pendingInvitations = useQuery(api.sharedChannels.getPendingSharedInvitations, 
    channelId ? { channelId } : "skip"
  );

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const inviteLink = existingLink
    ? `${baseUrl}/shared/${existingLink.token}`
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
        channelId,
        email: email.trim(),
        baseUrl,
      });
      setSuccess(true);
      setEmail("");
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
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
      await createLink({
        channelId,
      });
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
      await revokeLink({
        channelId,
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
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setError("Failed to copy link");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await removeExternalMember({
        channelId,
        userId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    setSuccess(false);
    setCopiedLink(false);
    onOpenChange(false);
  };

  const memberCount = (sharedMembers?.length || 0);
  const pendingCount = (pendingInvitations?.length || 0);

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md p-0 gap-0 bg-card">
        {/* Header */}
        <AlertDialogHeader className="border-b border-border px-6 py-4 text-left place-items-start">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-foreground rounded-lg flex items-center justify-center">
              <ShareNetworkIcon className="size-4 text-background" weight="bold" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-semibold text-foreground">
                Share #{channelName}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                Invite people from other workspaces
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
              Email
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
              Link
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === "members"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UsersIcon className="size-4" weight="bold" />
              {memberCount > 0 && <span className="text-xs">({memberCount})</span>}
            </button>
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
                  placeholder="collaborator@external.com"
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
                They'll receive an email with a link to join this channel. They won't have access to other channels in your workspace.
              </p>

              {/* Pending invitations */}
              {pendingInvitations && pendingInvitations.length > 0 && (
                <div className="mt-4">
                  <Label className="text-xs font-medium text-foreground/80 mb-2 block">
                    Pending Invitations ({pendingCount})
                  </Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pendingInvitations.map((inv) => (
                      <div key={inv._id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm text-foreground truncate">{inv.email}</span>
                        <span className="text-xs text-muted-foreground">Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                      Anyone with this link can join this channel. They won't have access to other channels in your workspace.
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
                      Create a shareable link that anyone can use to join this channel
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

          {/* Members Tab */}
          {activeTab === "members" && (
            <div className="space-y-4">
              {sharedMembers && sharedMembers.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sharedMembers.map((member) => (
                    <div key={member._id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        {member.user?.imageUrl ? (
                          <img
                            src={member.user.imageUrl}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-foreground/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-foreground">
                              {member.user?.firstName?.[0] || member.user?.email?.[0] || "?"}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.user?.firstName} {member.user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.sourceOrganization
                              ? member.sourceOrganization.name
                              : member.user?.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <UsersIcon className="size-8 mx-auto mb-2 text-muted-foreground" weight="bold" />
                  <p className="text-sm text-foreground/80 mb-1">No external members yet</p>
                  <p className="text-xs text-muted-foreground">
                    Invite people using email or a shareable link
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
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
