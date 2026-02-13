"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendInviteEmail = action({
  args: {
    email: v.string(),
    inviteToken: v.string(),
    workspaceName: v.string(),
    inviterName: v.string(),
  },
  handler: async (_, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured, skipping email send");
      return { success: false, error: "Email not configured" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${args.inviteToken}`;
    const fromDomain = process.env.RESEND_DOMAIN ?? "tryportal.app";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Portal <noreply@${fromDomain}>`,
        to: [args.email],
        subject: `${args.inviterName} invited you to join ${args.workspaceName} on Portal`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">
              You've been invited to ${args.workspaceName}
            </h2>
            <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
              ${args.inviterName} has invited you to join their workspace on Portal.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 24px; text-decoration: none; font-size: 14px; font-weight: 500;">
              Accept Invitation
            </a>
            <p style="font-size: 12px; color: #999; margin-top: 24px;">
              This invitation expires in 7 days. If you didn't expect this invitation, you can ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send invite email:", error);
      return { success: false, error };
    }

    return { success: true };
  },
});
