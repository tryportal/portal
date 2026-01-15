"use client";

import { motion } from "framer-motion";
import { InviteForm } from "@/components/setup/invite-form";
import { StepHeading } from "@/components/setup/step-container";

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
    displayName?: string;
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
    <div className="space-y-8">
      <StepHeading
        title="Invite your team"
        description="Add colleagues to your workspace and start collaborating right away."
      />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <InviteForm
          onInvite={onInvite}
          pendingInvitations={pendingInvitations}
          onRevokeInvitation={onRevokeInvitation}
          existingMembers={existingMembers}
          inviteLink={inviteLink}
          onCreateInviteLink={onCreateInviteLink}
          onRevokeInviteLink={onRevokeInviteLink}
        />
      </motion.div>
    </div>
  );
}
