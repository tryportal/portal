"use client";

import { InviteForm } from "@/components/setup/invite-form";

interface InviteStepProps {
  onInvite: (email: string, role: "org:admin" | "org:member") => Promise<void>;
  pendingInvitations: Array<{
    id: string;
    emailAddress: string;
    role: string;
  }>;
  onRevokeInvitation: (invitationId: string) => Promise<void>;
  existingMembers: Array<{
    id: string;
    emailAddress: string;
    role: string;
    publicUserData?: {
      firstName?: string | null;
      lastName?: string | null;
      imageUrl?: string | null;
    };
  }>;
  inviteLink?: {
    token: string;
    expiresAt: number;
  } | null;
  onCreateInviteLink?: () => Promise<{ token: string; expiresAt: number }>;
  onRevokeInviteLink?: () => Promise<void>;
}

export function InviteStep({
  onInvite,
  pendingInvitations,
  onRevokeInvitation,
  existingMembers,
  inviteLink,
  onCreateInviteLink,
  onRevokeInviteLink,
}: InviteStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Invite your team
        </h1>
        <p className="text-sm text-muted-foreground">
          Add colleagues to start collaborating.
        </p>
      </div>

      <InviteForm
        onInvite={onInvite}
        pendingInvitations={pendingInvitations}
        onRevokeInvitation={onRevokeInvitation}
        existingMembers={existingMembers}
        inviteLink={inviteLink}
        onCreateInviteLink={onCreateInviteLink}
        onRevokeInviteLink={onRevokeInviteLink}
      />
    </div>
  );
}
