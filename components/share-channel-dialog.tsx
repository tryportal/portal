"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Check,
  Link as LinkIcon,
  Trash,
  EnvelopeSimple,
  ArrowSquareOut,
} from "@phosphor-icons/react";

interface ShareChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: Id<"channels">;
  channelName: string;
  workspaceName: string;
  inviterName: string;
}

export function ShareChannelDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
  workspaceName,
  inviterName,
}: ShareChannelDialogProps) {
  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const activeInviteLink = useQuery(
    api.sharedChannels.getActiveInviteLink,
    open ? { channelId } : "skip"
  );
  const sharedMembers = useQuery(
    api.sharedChannels.getSharedMembers,
    open ? { channelId } : "skip"
  );

  const createEmailInvite = useMutation(api.sharedChannels.createEmailInvite);
  const createInviteLink = useMutation(api.sharedChannels.createInviteLink);
  const revokeInviteLink = useMutation(api.sharedChannels.revokeInviteLink);
  const removeSharedMember = useMutation(api.sharedChannels.removeSharedMember);
  const sendChannelInviteEmail = useAction(api.emails.sendChannelInviteEmail);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const inviteLink = generatedLink
    ? generatedLink
    : activeInviteLink
      ? `${appUrl}/channel-invite/${activeInviteLink.token}`
      : null;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setEmailSent(false);
      setLinkCopied(false);
      setGeneratedLink(null);
    }
  }, [open]);

  const handleSendEmail = useCallback(async () => {
    if (!email.trim()) return;
    setIsSendingEmail(true);
    try {
      const { token } = await createEmailInvite({ channelId, email: email.trim() });
      await sendChannelInviteEmail({
        email: email.trim(),
        inviteToken: token,
        channelName,
        workspaceName,
        inviterName,
      });
      setEmail("");
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } finally {
      setIsSendingEmail(false);
    }
  }, [email, channelId, channelName, workspaceName, inviterName, createEmailInvite, sendChannelInviteEmail]);

  const handleGenerateLink = useCallback(async () => {
    try {
      const { token } = await createInviteLink({ channelId });
      setGeneratedLink(`${appUrl}/channel-invite/${token}`);
    } catch (err) {
      console.error("Failed to generate invite link:", err);
    }
  }, [channelId, createInviteLink, appUrl]);

  const handleCopyLink = useCallback(async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [inviteLink]);

  const handleRevokeLink = useCallback(async () => {
    try {
      await revokeInviteLink({ channelId });
      setGeneratedLink(null);
    } catch (err) {
      console.error("Failed to revoke invite link:", err);
    }
  }, [channelId, revokeInviteLink]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share #{channelName}</DialogTitle>
          <DialogDescription>
            Invite people from other workspaces to access this channel.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Email invite */}
          <div className="grid gap-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <EnvelopeSimple size={12} />
              Invite by email
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendEmail();
                }}
              />
              <Button
                size="sm"
                onClick={handleSendEmail}
                disabled={!email.trim() || isSendingEmail}
              >
                {emailSent ? (
                  <>
                    <Check size={14} />
                    Sent
                  </>
                ) : isSendingEmail ? (
                  "Sending..."
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Link invite */}
          <div className="grid gap-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <LinkIcon size={12} />
              Invite link
            </label>
            {inviteLink ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive w-fit text-xs"
                  onClick={handleRevokeLink}
                >
                  Revoke link
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleGenerateLink}>
                <LinkIcon size={14} />
                Generate invite link
              </Button>
            )}
          </div>

          {/* Shared members */}
          {sharedMembers && sharedMembers.length > 0 && (
            <>
              <Separator />
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">
                  Shared with ({sharedMembers.length})
                </label>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {sharedMembers.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center gap-2.5 px-1 py-1.5 text-xs"
                    >
                      {member.userImageUrl ? (
                        <img
                          src={member.userImageUrl}
                          alt={member.userName}
                          className="size-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                          {member.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="truncate">{member.userName}</span>
                        {member.sourceOrgName && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            <ArrowSquareOut size={10} />
                            {member.sourceOrgName}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          removeSharedMember({ channelId, userId: member.userId })
                        }
                      >
                        <Trash size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
