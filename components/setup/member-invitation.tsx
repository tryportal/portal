"use client";

import { useState } from "react";
import { Plus, X, PaperPlaneTilt, Spinner, EnvelopeSimple, User, CheckCircle, Link as LinkIcon, Copy, Check, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MemberInvitationProps {
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
    publicUserData?: { firstName?: string; lastName?: string; imageUrl?: string };
  }>;
  inviteLink?: {
    token: string;
    expiresAt: number;
  } | null;
  onCreateInviteLink?: () => Promise<{ token: string; expiresAt: number }>;
  onRevokeInviteLink?: () => Promise<void>;
  isLoadingInviteLink?: boolean;
}

export function MemberInvitation({
  onInvite,
  pendingInvitations,
  onRevokeInvitation,
  existingMembers,
  inviteLink,
  onCreateInviteLink,
  onRevokeInviteLink,
  isLoadingInviteLink,
}: MemberInvitationProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [isInviting, setIsInviting] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
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
    if (days === 1) return "Expires in 1 day";
    return `Expires in ${days} days`;
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

  const getMemberDisplayName = (member: typeof existingMembers[0]) => {
    const firstName = member.publicUserData?.firstName;
    const lastName = member.publicUserData?.lastName;
    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim();
    }
    return member.emailAddress;
  };

  const getMemberInitials = (member: typeof existingMembers[0]) => {
    const firstName = member.publicUserData?.firstName;
    const lastName = member.publicUserData?.lastName;
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (lastName) {
      return lastName[0].toUpperCase();
    }
    if (member.emailAddress && member.emailAddress.length > 0) {
      return member.emailAddress[0].toUpperCase();
    }
    return "?";
  };

  return (
    <div className="space-y-8">
      {/* Existing team members */}
      {existingMembers.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-[#26251E]/40 uppercase tracking-widest">Team members</Label>
          <div className="grid grid-cols-1 gap-2">
            {existingMembers.map((member) => (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  "bg-white border border-[#26251E]/5 rounded-xl text-sm shadow-sm"
                )}
              >
                <Avatar className="size-8">
                  <AvatarImage src={member.publicUserData?.imageUrl} />
                  <AvatarFallback className="bg-[#26251E]/5 text-[#26251E] text-xs font-medium">
                    {getMemberInitials(member)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#26251E] font-medium truncate">
                      {getMemberDisplayName(member)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#26251E]/5 text-[#26251E]/60 capitalize shrink-0 border border-[#26251E]/5">
                      {member.role.replace("org:", "")}
                    </span>
                  </div>
                  <p className="text-xs text-[#26251E]/40 truncate">{member.emailAddress}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Link Section */}
      {onCreateInviteLink && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-[#26251E]/40 uppercase tracking-widest">Invite Link</Label>
          
          {inviteLink ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#26251E]/30" />
                  <Input
                    type="text"
                    value={getInviteUrl()}
                    readOnly
                    className="pl-10 h-11 w-full bg-white border-[#26251E]/10 text-sm font-mono text-[#26251E]/70 cursor-text"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0 size-11 border-[#26251E]/10 hover:bg-[#26251E]/5"
                >
                  {copied ? (
                    <Check className="size-4 text-green-600" weight="bold" />
                  ) : (
                    <Copy className="size-4 text-[#26251E]/60" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-[#26251E]/40">
                  {formatExpiryDate(inviteLink.expiresAt)} • Anyone with this link can join as a member
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRevokeLink}
                  className="h-7 px-2 text-xs text-[#26251E]/40 hover:text-red-500 hover:bg-red-50"
                >
                  <ArrowsClockwise className="size-3 mr-1" />
                  Reset link
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateLink}
              disabled={isGeneratingLink || isLoadingInviteLink}
              className="w-full h-11 gap-2 border-[#26251E]/10 hover:bg-[#26251E]/5 text-[#26251E]/70"
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

      <div className="space-y-4">
        <div className="flex items-end justify-between">
           <Label className="text-xs font-semibold text-[#26251E]/40 uppercase tracking-widest">Invite by Email</Label>
        </div>

        <div className="space-y-3">
          {emails.map((email, index) => (
            <div key={index} className="flex gap-2 group">
              <div className="relative flex-1">
                <EnvelopeSimple className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#26251E]/30 group-focus-within:text-[#26251E]/60 transition-colors" />
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="pl-10 h-11 bg-white border-[#26251E]/10 focus:border-[#26251E] focus:ring-0 text-sm transition-all"
                  disabled={isInviting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email.trim()) {
                      e.preventDefault();
                      // If it's the last field, add a new one
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
                  className="shrink-0 size-11 text-[#26251E]/30 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="size-4" weight="bold" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-500 pl-1">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEmailField}
            disabled={isInviting}
            className="gap-2 h-9 border-[#26251E]/10 hover:bg-[#26251E]/5 text-[#26251E]/70"
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
            className="gap-2 h-9 bg-[#26251E] text-white hover:bg-[#26251E]/90"
          >
            {isInviting ? (
              <Spinner className="size-3.5 animate-spin" />
            ) : (
              <PaperPlaneTilt className="size-3.5" weight="fill" />
            )}
            Send Invitations
          </Button>
        </div>
      </div>

      {/* Pending & Sent */}
      {(pendingInvitations.length > 0 || invitedEmails.length > 0) && (
        <div className="space-y-3 pt-4 border-t border-[#26251E]/5">
          <Label className="text-xs font-semibold text-[#26251E]/40 uppercase tracking-widest">Pending & Sent</Label>
          <div className="space-y-1">
             {invitedEmails.map((email, index) => (
              <div
                key={`sent-${index}`}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-green-50/50 border border-green-100/50"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="size-4 text-green-600" weight="fill" />
                  <span className="text-sm text-[#26251E]/80">{email}</span>
                </div>
                <span className="text-[10px] font-medium text-green-700 uppercase tracking-wide">Sent</span>
              </div>
            ))}
            
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-[#26251E]/5 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-4 rounded-full border border-[#26251E]/20 flex items-center justify-center">
                    <div className="size-2 rounded-full bg-[#26251E]/10" />
                  </div>
                  <span className="text-sm text-[#26251E]/70">{invitation.emailAddress}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRevoke(invitation.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity size-6 text-[#26251E]/30 hover:text-red-500 hover:bg-red-50"
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
