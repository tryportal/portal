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
    // #region agent log - hypothesis tracking
    const logFetch = async (data: Record<string, unknown>) => {
      try {
        await fetch('http://127.0.0.1:7243/ingest/3caa9c0f-a95a-4c2c-b63a-897bc1df096e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,timestamp:Date.now(),sessionId:'debug-session'})});
      } catch (e) {
        // Silent catch - logging service might not be available
      }
    };
    // #endregion
    
    // #region agent log - entry point
    await logFetch({location:'invitations.ts:sendInvitationEmail:entry',message:'Action started',data:{organizationId:args.organizationId,email:args.email,role:args.role},hypothesisId:'all'});
    // #endregion
    
    // First create the invitation in the database
    const result = await ctx.runMutation(api.organizations.inviteMember, {
      organizationId: args.organizationId,
      email: args.email,
      role: args.role,
    });
    
    // #region agent log - after mutation
    await logFetch({location:'invitations.ts:sendInvitationEmail:after_mutation',message:'Mutation completed',data:{invitationId:result.invitationId,token:result.token},hypothesisId:'1,2'});
    // #endregion

    // Get organization details for the email
    const org = await ctx.runQuery(api.organizations.getOrganization, {
      id: args.organizationId,
    });
    
    // #region agent log - after query
    await logFetch({location:'invitations.ts:sendInvitationEmail:after_query',message:'Organization query result',data:{orgExists:!!org,orgName:org?.name,orgSlug:org?.slug},hypothesisId:'1,2,4'});
    // #endregion

    if (!org) {
      throw new Error("Organization not found");
    }

    const apiKey = process.env.INBOUND_API_KEY;
    if (!apiKey) {
      console.warn("INBOUND_API_KEY not set, skipping email send");
      // #region agent log - no api key
      await logFetch({location:'invitations.ts:sendInvitationEmail:no_api_key',message:'INBOUND_API_KEY not set',data:{hasApiKey:false},hypothesisId:'3'});
      // #endregion
      console.log("[CONVEX EMAIL] Email send skipped - INBOUND_API_KEY is not configured. Invitation created but email not sent.");
      return result;
    }
    
    const inboundDomain = process.env.INBOUND_DOMAIN || "tryportal.app";
    
    // #region agent log - api key present
    await logFetch({location:'invitations.ts:sendInvitationEmail:api_key_check',message:'API key and domain present',data:{hasApiKey:true,apiKeyLength:apiKey.length,inboundDomain},hypothesisId:'3'});
    // #endregion

    const inviteUrl = `${args.baseUrl || "http://localhost:3000"}/invite/${result.token}`;

    // Send email using inbound.new API
    try {
      // #region agent log - before fetch
      await logFetch({location:'invitations.ts:sendInvitationEmail:before_fetch',message:'About to send email',data:{inviteUrl,orgName:org.name,email:args.email,fromEmail:`noreply@${inboundDomain}`},hypothesisId:'3'});
      // #endregion
      
      const emailPayload = {
        from: `Portal <noreply@${inboundDomain}>`,
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
        // Note: tags field may not be supported in inbound.new v2 API
        // Remove if experiencing 404 errors
      };
      
      // #region agent log - payload debug
      await logFetch({location:'invitations.ts:sendInvitationEmail:payload_debug',message:'Email payload prepared',data:{from:emailPayload.from,to:emailPayload.to,subject:emailPayload.subject,hasHtml:!!emailPayload.html,hasText:!!emailPayload.text,tagsCount:emailPayload.tags?.length},hypothesisId:'3'});
      // #endregion
      
      console.log("[CONVEX EMAIL] Sending email with payload:", {
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        hasHtml: !!emailPayload.html,
        hasText: !!emailPayload.text,
        tags: emailPayload.tags,
        payloadKeys: Object.keys(emailPayload),
      });
      
      console.log("[CONVEX EMAIL] Request details:", {
        url: "https://inbound.new/api/v2/emails",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`,
        },
      });
      
      const response = await fetch("https://inbound.new/api/v2/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(emailPayload),
      });

      // #region agent log - response check
      await logFetch({location:'invitations.ts:sendInvitationEmail:response_check',message:'Fetch response received',data:{ok:response.ok,status:response.status,statusText:response.statusText,contentType:response.headers.get('content-type')},hypothesisId:'3'});
      // #endregion
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to send invitation email: ${response.status} ${response.statusText}`;
        let parsedError: any = null;
        try {
          parsedError = JSON.parse(errorText);
          errorMessage = parsedError.message || parsedError.error || errorMessage;
        } catch {
          // If errorText is not JSON, use it as-is
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        // #region agent log - error response detailed
        await logFetch({location:'invitations.ts:sendInvitationEmail:error_response',message:'Email API returned error',data:{status:response.status,statusText:response.statusText,errorMessage,errorText,rawResponse:errorText.substring(0,500),parsedError:JSON.stringify(parsedError)},hypothesisId:'3'});
        // #endregion
        
        // Provide detailed error logging for debugging
        console.error("[CONVEX EMAIL] Email API error:", {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          from: `noreply@${inboundDomain}`,
          to: args.email,
          domain: inboundDomain,
          hasApiKey: !!apiKey,
          rawResponse: errorText.substring(0, 500),
          requestUrl: "https://inbound.new/api/v2/emails",
        });
        
        // For 404 errors, log more details to help troubleshoot
        if (response.status === 404) {
          console.error(
            "[CONVEX EMAIL] 404 NOT_FOUND - Check the following:\n" +
            "1. API endpoint: https://inbound.new/api/v2/emails\n" +
            "2. Request headers: Content-Type: application/json, Authorization: Bearer [API_KEY]\n" +
            "3. Email payload format - check if all required fields are present\n" +
            "4. Raw error response: " + errorText
          );
        }
        // Don't throw - invitation was created, just email failed
      } else {
        const emailResult = await response.json();
        // #region agent log - success
        await logFetch({location:'invitations.ts:sendInvitationEmail:success',message:'Email sent successfully',data:{messageId:emailResult.id || emailResult.message_id,responseKeys:Object.keys(emailResult)},hypothesisId:'3'});
        // #endregion
        console.log("[CONVEX EMAIL] Invitation email sent successfully:", {
          messageId: emailResult.id || emailResult.message_id,
          response: JSON.stringify(emailResult).substring(0, 200),
        });
      }
    } catch (error) {
      // #region agent log - catch error
      await logFetch({location:'invitations.ts:sendInvitationEmail:catch_error',message:'Exception during email send',data:{error:String(error),errorStack:error instanceof Error ? error.stack : 'no stack'},hypothesisId:'3,5'});
      // #endregion
      console.error("[CONVEX EMAIL] Exception during email send:", error);
      // Don't throw - invitation was created, just email failed
    }

    // #region agent log - return
    await logFetch({location:'invitations.ts:sendInvitationEmail:return',message:'Action complete, returning result',data:{invitationId:result.invitationId,token:result.token},hypothesisId:'all'});
    // #endregion
    
    console.log("[CONVEX EMAIL] sendInvitationEmail action complete");
    return result;
  },
});

/**
 * Send shared channel invitation email using inbound.new
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

    const apiKey = process.env.INBOUND_API_KEY;
    if (!apiKey) {
      console.warn("INBOUND_API_KEY not set, skipping email send");
      console.log("[CONVEX EMAIL] Email send skipped - INBOUND_API_KEY is not configured. Invitation created but email not sent.");
      return { invitationId: "", token: result.token };
    }

    const inboundDomain = process.env.INBOUND_DOMAIN || "tryportal.app";
    const inviteUrl = `${args.baseUrl || "http://localhost:3000"}/shared/${result.token}`;

    // Send email using inbound.new API
    try {
      const response = await fetch("https://inbound.new/api/v2/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `Portal <noreply@${inboundDomain}>`,
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
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to send shared channel invitation email: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          // If errorText is not JSON, use it as-is
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        // Provide detailed error logging for debugging
        console.error("[CONVEX EMAIL] Shared channel email API error:", {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          from: `noreply@${inboundDomain}`,
          to: args.email,
          domain: inboundDomain,
          hasApiKey: !!apiKey,
          rawResponse: errorText.substring(0, 500),
          requestUrl: "https://inbound.new/api/v2/emails",
        });
        
        // For 404 errors, log more details to help troubleshoot
        if (response.status === 404) {
          console.error(
            "[CONVEX EMAIL] 404 NOT_FOUND - Check the following:\n" +
            "1. API endpoint: https://inbound.new/api/v2/emails\n" +
            "2. Request headers: Content-Type: application/json, Authorization: Bearer [API_KEY]\n" +
            "3. Email payload format - check if all required fields are present\n" +
            "4. Raw error response: " + errorText
          );
        }
        // Don't throw - invitation was created, just email failed
      } else {
        const emailResult = await response.json();
        console.log("[CONVEX EMAIL] Shared channel invitation email sent successfully:", {
          messageId: emailResult.id || emailResult.message_id,
          response: JSON.stringify(emailResult).substring(0, 200),
        });
      }
    } catch (error) {
      console.error("[CONVEX EMAIL] Exception during shared channel email send:", error);
      // Don't throw - invitation was created, just email failed
    }

    console.log("[CONVEX EMAIL] sendSharedChannelInvitationEmail action complete");
    return { invitationId: "", token: result.token };
  },
});

