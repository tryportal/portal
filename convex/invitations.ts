import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Send invitation email using inbound.new
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

    const apiKey = process.env.INBOUND_API_KEY;
    if (!apiKey) {
      console.warn("INBOUND_API_KEY not set, skipping email send");
      return result;
    }

    const inviteUrl = `${args.baseUrl || "http://localhost:3000"}/invite/${result.token}`;

    // Send email using inbound.new API
    try {
      const response = await fetch("https://inbound.new/api/v2/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `Portal <noreply@${process.env.INBOUND_DOMAIN || "tryportal.app"}>`,
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
            { name: "organization", value: org.slug },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to send invitation email: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          // If errorText is not JSON, use it as-is
          if (errorText) {
            errorMessage = errorText;
          }
        }
        console.error("Failed to send invitation email:", errorMessage);
        // Don't throw - invitation was created, just email failed
      } else {
        const result = await response.json();
        console.log("Invitation email sent successfully:", result.id || result.message_id);
      }
    } catch (error) {
      console.error("Error sending invitation email:", error);
      // Don't throw - invitation was created, just email failed
    }

    return result;
  },
});

