"use client";

import { useState } from "react";
import { Plus, X, PaperPlaneTilt, Spinner, EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MemberInvitationProps {
  onInvite: (email: string, role: "org:admin" | "org:member") => Promise<void>;
  pendingInvitations: Array<{
    id: string;
    emailAddress: string;
    role: string;
  }>;
  onRevokeInvitation: (invitationId: string) => Promise<void>;
}

export function MemberInvitation({
  onInvite,
  pendingInvitations,
  onRevokeInvitation,
}: MemberInvitationProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [isInviting, setIsInviting] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addEmailField = () => {
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    if (emails.length === 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
    setError(null);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleInviteAll = async () => {
    const validEmails = emails.filter((email) => email.trim() && isValidEmail(email.trim()));
    
    if (validEmails.length === 0) {
      setError("Please enter at least one valid email address");
      return;
    }

    setIsInviting(true);
    setError(null);

    try {
      for (const email of validEmails) {
        await onInvite(email.trim(), "org:member");
        setInvitedEmails((prev) => [...prev, email.trim()]);
      }
      setEmails([""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitations");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await onRevokeInvitation(invitationId);
    } catch (err) {
      console.error("Failed to revoke invitation:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-primary">Invite team members</Label>
        <p className="text-xs text-primary/60">
          Add email addresses of people you want to invite to your organization
        </p>

        <div className="space-y-2">
          {emails.map((email, index) => (
            <div key={index} className="flex gap-2">
              <div className="relative flex-1">
                <EnvelopeSimple className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-primary/40" />
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="pl-8 h-9"
                  disabled={isInviting}
                />
              </div>
              {emails.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmailField(index)}
                  disabled={isInviting}
                  className="shrink-0"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEmailField}
            disabled={isInviting}
            className="gap-1"
          >
            <Plus className="size-3.5" />
            Add another
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleInviteAll}
            disabled={isInviting || emails.every((e) => !e.trim())}
            className="gap-1"
          >
            {isInviting ? (
              <Spinner className="size-3.5 animate-spin" />
            ) : (
              <PaperPlaneTilt className="size-3.5" weight="fill" />
            )}
            Send invitations
          </Button>
        </div>
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-primary">Pending invitations</Label>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2",
                  "bg-primary/5 rounded-lg text-sm"
                )}
              >
                <div className="flex items-center gap-2">
                  <EnvelopeSimple className="size-4 text-primary/40" />
                  <span className="text-primary">{invitation.emailAddress}</span>
                  <span className="text-xs text-primary/60 capitalize">
                    ({invitation.role.replace("org:", "")})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRevoke(invitation.id)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently invited */}
      {invitedEmails.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-green-600 dark:text-green-400">
            Invitations sent
          </Label>
          <div className="space-y-1">
            {invitedEmails.map((email, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-primary/60"
              >
                <PaperPlaneTilt className="size-4 text-green-600 dark:text-green-400" weight="fill" />
                <span>{email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

