"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  DotsThree,
  ShieldCheck,
  UserMinus,
  Crown,
  UserPlus,
  Copy,
  Check,
  Link as LinkIcon,
  SignOut,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldSeparator,
} from "@/components/ui/field";
import { DotLoader } from "@/components/ui/dot-loader";

interface WorkspacePeopleProps {
  organizationId: Id<"organizations">;
  workspace: {
    _id: Id<"organizations">;
    name: string;
    slug: string;
    role: string;
  };
}

export function WorkspacePeople({
  organizationId,
  workspace,
}: WorkspacePeopleProps) {
  const { user } = useUser();
  const members = useQuery(api.organizations.getWorkspaceMembers, {
    organizationId,
  });
  const isAdmin = workspace.role === "admin";

  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">People</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {members === undefined
                ? "\u00A0"
                : `${members.length} member${members.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus size={14} />
              Invite people
            </Button>
          )}
        </div>

        <div className="mt-6">
          <Separator />
        </div>

        {/* Member List */}
        <div className="mt-6 flex flex-col gap-px">
          {members === undefined && (
            <div className="py-8">
              <DotLoader dotCount={7} dotSize={4} gap={5} />
            </div>
          )}
          {members?.map((member) => (
            <MemberRow
              key={member._id}
              member={member}
              isAdmin={isAdmin}
              isMe={member.userId === user?.id}
              organizationId={organizationId}
            />
          ))}
          {members && members.length === 0 && (
            <p className="py-8 text-center text-[11px] text-muted-foreground">
              No members found.
            </p>
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={organizationId}
        workspaceName={workspace.name}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Member Row                                                          */
/* ------------------------------------------------------------------ */

function MemberRow({
  member,
  isAdmin,
  isMe,
  organizationId,
}: {
  member: {
    _id: Id<"organizationMembers">;
    userId: string;
    role: string;
    joinedAt: number;
    isCreator: boolean;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
  isAdmin: boolean;
  isMe: boolean;
  organizationId: Id<"organizations">;
}) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const updateRole = useMutation(api.organizations.updateMemberRole);
  const removeMember = useMutation(api.organizations.removeMember);
  const leaveWorkspace = useMutation(api.organizations.leaveWorkspace);
  const [isUpdating, setIsUpdating] = useState(false);

  const displayName =
    [member.firstName, member.lastName].filter(Boolean).join(" ") || "Unknown";

  const canManage = isAdmin && !member.isCreator && !isMe;
  const canLeave = isMe && !member.isCreator;

  const handleRoleChange = async (
    newRole: "admin" | "member"
  ) => {
    setIsUpdating(true);
    try {
      await updateRole({ memberId: member._id, role: newRole });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    setIsUpdating(true);
    try {
      await removeMember({ memberId: member._id });
      setRemoveOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLeave = async () => {
    setIsUpdating(true);
    try {
      await leaveWorkspace({ organizationId });
      // Hard redirect to avoid Convex reactive re-render showing "not found"
      window.location.href = "/";
    } catch {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border border-border bg-card px-4 py-3 hover:bg-muted/50">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {member.imageUrl ? (
            <img
              src={member.imageUrl}
              alt={displayName}
              className="size-8 object-cover"
            />
          ) : (
            <div className="flex size-8 items-center justify-center bg-muted text-[11px] font-medium text-muted-foreground">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{displayName}</span>
            {member.role === "admin" && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {member.isCreator ? "Owner" : "Admin"}
              </Badge>
            )}
          </div>
          {member.email && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {member.email}
            </p>
          )}
        </div>

        {/* Joined date */}
        <span className="hidden text-[10px] text-muted-foreground/60 sm:block">
          Joined {formatDate(member.joinedAt)}
        </span>

        {/* Actions */}
        {(canManage || canLeave) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="text-muted-foreground hover:text-foreground cursor-pointer outline-none"
              disabled={isUpdating}
            >
              <DotsThree size={18} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" sideOffset={4} align="end">
              {canManage && (
                <>
                  {member.role === "member" ? (
                    <DropdownMenuItem
                      onClick={() => handleRoleChange("admin")}
                    >
                      <ShieldCheck size={14} />
                      Promote to admin
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => handleRoleChange("member")}
                    >
                      <Crown size={14} />
                      Demote to member
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setRemoveOpen(true)}
                  >
                    <UserMinus size={14} />
                    Remove from workspace
                  </DropdownMenuItem>
                </>
              )}
              {canLeave && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setLeaveOpen(true)}
                >
                  <SignOut size={14} />
                  Leave workspace
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Remove Confirmation */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {displayName} from the workspace. They will lose
              access to all channels and messages. They can be re-invited later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              onClick={handleRemove}
              disabled={isUpdating}
            >
              {isUpdating ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Confirmation */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to all channels and messages in this
              workspace. You can rejoin later if the workspace is public or
              if you receive a new invite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              onClick={handleLeave}
              disabled={isUpdating}
            >
              {isUpdating ? "Leaving..." : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Invite Dialog                                                       */
/* ------------------------------------------------------------------ */

function InviteDialog({
  open,
  onOpenChange,
  organizationId,
  workspaceName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
  workspaceName: string;
}) {
  const [email, setEmail] = useState("");
  const [sentInvites, setSentInvites] = useState<
    { email: string; status: "sending" | "sent" | "error" }[]
  >([]);
  const [linkCopied, setLinkCopied] = useState(false);

  const createEmailInvite = useMutation(api.invitations.createEmailInvite);
  const sendInviteEmail = useAction(api.emails.sendInviteEmail);
  const createInviteLink = useMutation(api.invitations.createInviteLink);
  const activeLink = useQuery(api.invitations.getActiveInviteLink, {
    organizationId,
  });
  const revokeInviteLink = useMutation(api.invitations.revokeInviteLink);

  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const inviteLink = generatedLink
    ? generatedLink
    : activeLink
      ? `${appUrl}/invite/${activeLink.token}`
      : null;

  const handleSendInvite = useCallback(async () => {
    if (!email.trim()) return;

    const emailToSend = email.trim();
    setEmail("");
    setSentInvites((prev) => [...prev, { email: emailToSend, status: "sending" }]);

    try {
      const { token } = await createEmailInvite({
        organizationId,
        email: emailToSend,
      });

      await sendInviteEmail({
        email: emailToSend,
        inviteToken: token,
        workspaceName,
        inviterName: "Your teammate",
      });

      setSentInvites((prev) =>
        prev.map((inv) =>
          inv.email === emailToSend ? { ...inv, status: "sent" } : inv
        )
      );
    } catch {
      setSentInvites((prev) =>
        prev.map((inv) =>
          inv.email === emailToSend ? { ...inv, status: "error" } : inv
        )
      );
    }
  }, [email, organizationId, workspaceName, createEmailInvite, sendInviteEmail]);

  const handleGenerateLink = useCallback(async () => {
    try {
      const { token } = await createInviteLink({ organizationId });
      setGeneratedLink(`${appUrl}/invite/${token}`);
    } catch (err) {
      console.error("Failed to generate invite link:", err);
    }
  }, [organizationId, createInviteLink, appUrl]);

  const handleCopyLink = useCallback(async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [inviteLink]);

  const handleRevokeLink = useCallback(async () => {
    try {
      await revokeInviteLink({ organizationId });
      setGeneratedLink(null);
    } catch (err) {
      console.error("Failed to revoke invite link:", err);
    }
  }, [organizationId, revokeInviteLink]);

  const reset = () => {
    setEmail("");
    setSentInvites([]);
    setLinkCopied(false);
    setGeneratedLink(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) reset();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            Invite people to join {workspaceName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Email invite */}
          <Field>
            <FieldLabel>Invite by email</FieldLabel>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
              />
              <Button
                size="default"
                onClick={handleSendInvite}
                disabled={!email.trim()}
              >
                Send
              </Button>
            </div>
          </Field>

          {/* Sent invites list */}
          {sentInvites.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {sentInvites.map((invite, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-border px-3 py-2"
                >
                  <span className="truncate text-xs">{invite.email}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {invite.status === "sending" && "Sending..."}
                    {invite.status === "sent" && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="size-3" />
                        Sent
                      </span>
                    )}
                    {invite.status === "error" && (
                      <span className="text-destructive">Failed</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <FieldSeparator>or</FieldSeparator>

          {/* Invite link */}
          <Field>
            <FieldLabel>Invite link</FieldLabel>
            {inviteLink ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleCopyLink}
                  >
                    {linkCopied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleRevokeLink}
                  className="self-start text-[11px] text-destructive hover:underline"
                >
                  Revoke link
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={handleGenerateLink}
              >
                <LinkIcon className="size-4" />
                Generate invite link
              </Button>
            )}
            <FieldDescription>
              Anyone with this link can join the workspace.
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
