import { Resend } from "resend";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Send invitation email using Resend
 */
export const sendInvitationEmail = action({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ invitationId: string; token: string }> => {
    // First create the invitation in the database
    const result = await ctx.runMutation(api.organizations.inviteMember, {
      organizationId: args.organizationId,
      email: args.email,
      role: args.role,
    });

    // Get organization details for the email
    const org = await ctx.runQuery(api.organizations.getOrganization, {
      id: args.organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping email send");
      console.log("[CONVEX EMAIL] Email send skipped - RESEND_API_KEY is not configured. Invitation created but email not sent.");
      return result;
    }

    const resendDomain = process.env.RESEND_DOMAIN || "mail.tryportal.app";
    const inviteUrl = `${args.baseUrl || "http://localhost:3000"}/invite/${result.token}`;

    // Send email using Resend SDK
    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: `Portal <noreply@${resendDomain}>`,
        to: [args.email],
        subject: `You've been invited to join ${org.name} on Portal`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F7F4; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="${(args.baseUrl || "http://localhost:3000")}/portal.svg" alt="Portal" width="48" height="48" style="width: 48px; height: 48px;">
    </div>
    
    <h1 style="color: #26251E; font-size: 24px; font-weight: 600; margin: 0 0 16px; text-align: center;">
      You're invited to join ${org.name}
    </h1>
    
    <p style="color: #26251E; opacity: 0.7; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
      You've been invited to join as ${args.role === "admin" ? "an admin" : "a member"}. Click the button below to accept the invitation.
    </p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${inviteUrl}" style="display: inline-block; background: #26251E; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 500; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #26251E; opacity: 0.5; font-size: 14px; text-align: center; margin: 0;">
      This invitation will expire in 7 days.
    </p>
    
    <hr style="border: none; border-top: 1px solid #26251E; opacity: 0.1; margin: 32px 0;">
    
    <p style="color: #26251E; opacity: 0.4; font-size: 12px; text-align: center; margin: 0;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
        `.trim(),
        text: `You've been invited to join ${org.name} on Portal as ${args.role === "admin" ? "an admin" : "a member"}. Accept your invitation: ${inviteUrl} - This invitation expires in 7 days.`,
        tags: [
          { name: "type", value: "invitation" },
          { name: "organization", value: org.name },
        ],
      });

      if (error) {
        console.error("[CONVEX EMAIL] Resend error:", {
          name: error.name,
          message: error.message,
          from: `noreply@${resendDomain}`,
          to: args.email,
        });
      } else {
        console.log("[CONVEX EMAIL] Email sent successfully:", data?.id);
      }
    } catch (error) {
      console.error("[CONVEX EMAIL] Exception during email send:", error);
    }

    return result;
  },
});

/**
 * Send shared channel invitation email using Resend
 */
export const sendSharedChannelInvitationEmail = action({
  args: {
    channelId: v.id("channels"),
    email: v.string(),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ invitationId: string; token: string }> => {
    // First create the invitation in the database
    const result = await ctx.runMutation(api.sharedChannels.createSharedChannelInvite, {
      channelId: args.channelId,
      email: args.email,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping email send");
      console.log("[CONVEX EMAIL] Email send skipped - RESEND_API_KEY is not configured. Invitation created but email not sent.");
      return { invitationId: "", token: result.token };
    }

    const resendDomain = process.env.RESEND_DOMAIN || "mail.tryportal.app";
    const inviteUrl = `${args.baseUrl || "http://localhost:3000"}/shared/${result.token}`;

    // Send email using Resend SDK
    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: `Portal <noreply@${resendDomain}>`,
        to: [args.email],
        subject: `You've been invited to #${result.channelName} in ${result.organizationName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F7F4; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="${(args.baseUrl || "http://localhost:3000")}/portal.svg" alt="Portal" width="48" height="48" style="width: 48px; height: 48px;">
    </div>
    
    <h1 style="color: #26251E; font-size: 24px; font-weight: 600; margin: 0 0 16px; text-align: center;">
      You're invited to join #${result.channelName}
    </h1>
    
    <p style="color: #26251E; opacity: 0.7; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
      Someone from <strong>${result.organizationName}</strong> has shared a channel with you. Click the button below to join and start collaborating.
    </p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${inviteUrl}" style="display: inline-block; background: #26251E; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 500; font-size: 16px;">
        Join Channel
      </a>
    </div>
    
    <p style="color: #26251E; opacity: 0.5; font-size: 14px; text-align: center; margin: 0;">
      You'll be able to read and send messages in this channel.
    </p>
    
    <hr style="border: none; border-top: 1px solid #26251E; opacity: 0.1; margin: 32px 0;">
    
    <p style="color: #26251E; opacity: 0.4; font-size: 12px; text-align: center; margin: 0;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
        `.trim(),
        text: `You've been invited to join #${result.channelName} in ${result.organizationName} on Portal. Join the channel: ${inviteUrl}`,
        tags: [
          { name: "type", value: "shared-channel-invitation" },
          { name: "channel", value: result.channelName },
          { name: "organization", value: result.organizationName },
        ],
      });

      if (error) {
        console.error("[CONVEX EMAIL] Resend error:", {
          name: error.name,
          message: error.message,
          from: `noreply@${resendDomain}`,
          to: args.email,
        });
      } else {
        console.log("[CONVEX EMAIL] Shared channel invitation email sent successfully:", data?.id);
      }
    } catch (error) {
      console.error("[CONVEX EMAIL] Exception during shared channel email send:", error);
    }

    return { invitationId: "", token: result.token };
  },
});
