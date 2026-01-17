"use client";

import { useState } from "react";
import {
  Plus,
  X,
  PaperPlaneTilt,
  Spinner,
  EnvelopeSimple,
  Link as LinkIcon,
  Copy,
  Check,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface InviteFormProps {
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

export function InviteForm({
  onInvite,
  pendingInvitations,
  onRevokeInvitation,
  existingMembers,
  inviteLink,
  onCreateInviteLink,
  onRevokeInviteLink,
}: InviteFormProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const getInviteUrl = () => {
    if (!inviteLink?.token) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/invite/${inviteLink.token}`;
  };

  const handleCopyLink = async () => {
    const url = getInviteUrl();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleGenerateLink = async () => {
    if (!onCreateInviteLink) return;
    setIsGeneratingLink(true);
    try {
      await onCreateInviteLink();
    } catch (err) {
      console.error("Failed to generate invite link:", err);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleRevokeLink = async () => {
    if (!onRevokeInviteLink) return;
    try {
      await onRevokeInviteLink();
    } catch (err) {
      console.error("Failed to revoke invite link:", err);
    }
  };

  const formatExpiryDate = (expiresAt: number) => {
    const days = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Expired";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

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
    const validEmails = emails.filter(
      (email) => email.trim() && isValidEmail(email.trim())
    );

    if (validEmails.length === 0) {
      setError("Please enter at least one valid email address");
      return;
    }

    setIsInviting(true);
    setError(null);

    try {
      for (const email of validEmails) {
        await onInvite(email.trim(), "org:member");
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

  const getMemberDisplayName = (member: (typeof existingMembers)[0]) => {
    const firstName = member.publicUserData?.firstName;
    const lastName = member.publicUserData?.lastName;
    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim();
    }
    return member.displayName || "Unknown";
  };

  const getMemberInitials = (member: (typeof existingMembers)[0]) => {
    const firstName = member.publicUserData?.firstName;
    const lastName = member.publicUserData?.lastName;
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (lastName) return lastName[0].toUpperCase();
    if (member.displayName) return member.displayName[0].toUpperCase();
    return "?";
  };

  return (
    <div className="space-y-6">
      {/* Existing members */}
      {existingMembers.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">
            Team members
          </Label>
          <div className="space-y-2">
            {existingMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 rounded-lg border border-border/50"
              >
                <Avatar className="size-8">
                  <AvatarImage src={member.publicUserData?.imageUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {getMemberInitials(member)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {getMemberDisplayName(member)}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase px-2 py-0.5 rounded-full bg-muted">
                  {member.role.replace("org:", "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite link */}
      {onCreateInviteLink && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">
            Invite link
          </Label>

          {inviteLink ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={getInviteUrl()}
                    readOnly
                    className="pl-9 h-10 font-mono text-xs bg-muted/30"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="size-10 shrink-0"
                >
                  {copied ? (
                    <Check className="size-4 text-green-600" weight="bold" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Expires in {formatExpiryDate(inviteLink.expiresAt)}</span>
                <button
                  type="button"
                  onClick={handleRevokeLink}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <ArrowsClockwise className="size-3" />
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateLink}
              disabled={isGeneratingLink}
              className="w-full h-10 gap-2"
            >
              {isGeneratingLink ? (
                <Spinner className="size-4 animate-spin" />
              ) : (
                <LinkIcon className="size-4" />
              )}
              Generate invite link
            </Button>
          )}
        </div>
      )}

      {/* Email invitations */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">
          Invite by email
        </Label>

        <div className="space-y-2">
          {emails.map((email, index) => (
            <div key={index} className="flex gap-2">
              <div className="relative flex-1">
                <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="pl-9 h-10"
                  disabled={isInviting}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email.trim()) {
                      e.preventDefault();
                      if (index === emails.length - 1) {
                        addEmailField();
                      }
                    }
                  }}
                />
              </div>
              {emails.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmailField(index)}
                  disabled={isInviting}
                  className="size-10 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addEmailField}
            disabled={isInviting}
            className="gap-1.5 h-9 text-xs"
          >
            <Plus className="size-3.5" />
            Add another
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            size="sm"
            onClick={handleInviteAll}
            disabled={isInviting || emails.every((e) => !e.trim())}
            className="gap-1.5 h-9 min-w-[100px]"
          >
            {isInviting ? (
              <Spinner className="size-3.5 animate-spin" />
            ) : (
              <PaperPlaneTilt className="size-3.5" weight="fill" />
            )}
            Send invites
          </Button>
        </div>
      </div>

    </div>
  );
}
