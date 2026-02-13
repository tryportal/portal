"use client";

import { useState, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSeparator,
} from "@/components/ui/field";
import { ArrowLeft, Check, Copy, Link as LinkIcon } from "@phosphor-icons/react";

interface CreateInviteStepProps {
  organizationId: Id<"organizations">;
  workspaceName: string;
  onNext: () => void;
  onBack: () => void;
}

interface SentInvite {
  email: string;
  status: "sending" | "sent" | "error";
}

export function CreateInviteStep({
  organizationId,
  workspaceName,
  onNext,
  onBack,
}: CreateInviteStepProps) {
  const [email, setEmail] = useState("");
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const createEmailInvite = useMutation(api.invitations.createEmailInvite);
  const sendInviteEmail = useAction(api.emails.sendInviteEmail);
  const createInviteLink = useMutation(api.invitations.createInviteLink);
  const updateWorkspacePublic = useMutation(api.organizations.updateWorkspacePublic);

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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      setInviteLink(`${appUrl}/invite/${token}`);
    } catch (err) {
      console.error("Failed to generate invite link:", err);
    }
  }, [organizationId, createInviteLink]);

  const handleCopyLink = useCallback(async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [inviteLink]);

  const handleTogglePublic = useCallback(
    async (checked: boolean) => {
      setIsPublic(checked);
      try {
        await updateWorkspacePublic({
          organizationId,
          isPublic: checked,
        });
      } catch (err) {
        console.error("Failed to update workspace visibility:", err);
        setIsPublic(!checked);
      }
    },
    [organizationId, updateWorkspacePublic]
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-xl font-medium tracking-tight">
          Invite your team
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Invite people to join {workspaceName}. You can always do this later.
        </p>
      </div>

      <FieldGroup>
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
                <span className="text-xs truncate">{invite.email}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
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

        <FieldSeparator />

        {/* Public toggle */}
        <Field orientation="horizontal">
          <div className="flex-1">
            <FieldLabel>Public workspace</FieldLabel>
            <FieldDescription>
              Allow anyone to discover and join this workspace.
            </FieldDescription>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => handleTogglePublic(!isPublic)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center border transition-colors ${
              isPublic
                ? "bg-foreground border-foreground"
                : "bg-muted border-border"
            }`}
          >
            <span
              className={`inline-block size-3.5 bg-background transition-transform ${
                isPublic ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </Field>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onNext}
          >
            Skip
          </Button>
          <Button size="lg" className="flex-1" onClick={onNext}>
            Continue
          </Button>
        </div>
      </FieldGroup>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back
        </button>
      </div>
    </div>
  );
}
