import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  gateway,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createConvexServerClient } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Authenticate
  const { getToken, userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const convexToken = await getToken({ template: "convex" });
  if (!convexToken) {
    return new Response("Failed to get auth token", { status: 401 });
  }

  // 2. Parse request body
  const { messages, organizationId } = (await req.json()) as {
    messages: UIMessage[];
    organizationId: string;
  };

  if (!organizationId) {
    return new Response("Missing organizationId", { status: 400 });
  }

  // 3. Create authenticated Convex client
  const convex = createConvexServerClient(convexToken);

  // 4. Check daily rate limit
  const usage = await convex.query(api.pearl.checkDailyLimit, {});
  if (!usage.allowed) {
    return new Response(
      JSON.stringify({
        error: `Daily message limit reached (${usage.limit}/${usage.limit}). Come back tomorrow!`,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Increment usage
  await convex.mutation(api.pearl.incrementUsage, {});

  // 6. Fetch workspace context for system prompt
  const context = await convex.query(api.pearl.getWorkspaceContext, {
    organizationId: organizationId as any,
  });

  // Build channel context string
  const channelContext = context?.channels
    ?.map(
      (ch) =>
        `- ${ch.name} (ID: ${ch.id}, type: ${ch.type}, category: ${ch.categoryName}${ch.isPrivate ? ", private" : ""})`
    )
    .join("\n") || "No channels available";

  // Build DM context string
  const dmContext = context?.conversations
    ?.map((c) => `- ${c.otherUserName} (conversation ID: ${c.id}, user ID: ${c.otherUserId})`)
    .join("\n") || "No DM conversations available";

  const systemPrompt = `You are Pearl, a helpful AI assistant for the Portal workspace. You help users manage their workspace communications efficiently.

## Your Personality
- Friendly, concise, and professional
- You proactively suggest relevant actions when appropriate
- When a user asks you to do something, just do it - don't ask for confirmation in your message. The system will show them a confirmation dialog automatically before any action is executed.

## Available Channels in This Workspace
${channelContext}

## DM Conversations the User Has
${dmContext}

## Important Rules
1. When the user asks to summarize a channel, use the summarizeChannelMessages tool with the correct channel ID from the list above.
2. When the user asks to summarize a DM, use the summarizeDmMessages tool. This requires consent - the tool will show a confirmation dialog to the user.
3. When the user asks to send a message, use the sendMessage tool. This requires consent.
4. When the user asks to summarize their inbox, use the summarizeInbox tool.
5. When the user asks to create a forum post, use the createForumPost tool. This requires consent. The post will be attributed to you (Pearl).
6. If you don't know which channel or person the user is referring to, ask for clarification.
7. Always use channel/conversation IDs from the lists above - never guess IDs.
8. When presenting summaries, organize them clearly with key topics, important decisions, and action items.
9. Keep responses concise but thorough.`;

  // 7. Define tools
  const tools = {
    // Server-side tool: auto-executes on server
    summarizeChannelMessages: tool({
      description:
        "Fetch the last 50 messages from a specific channel for summarization. Use this when the user asks to summarize a channel.",
      inputSchema: z.object({
        channelId: z
          .string()
          .describe("The ID of the channel to summarize messages from"),
      }),
      execute: async ({ channelId }) => {
        try {
          const result = await convex.query(
            api.pearl.getChannelMessagesForSummary,
            { channelId: channelId as any }
          );
          if (!result) {
            return { error: "Could not access channel or no messages found." };
          }
          return {
            channelName: result.channelName,
            messageCount: result.messages.length,
            messages: result.messages.map((m) => ({
              author: m.author,
              content: m.content,
              time: new Date(m.createdAt).toLocaleString(),
            })),
          };
        } catch (e) {
          return { error: "Failed to fetch channel messages." };
        }
      },
    }),

    // Server-side tool: auto-executes on server
    summarizeInbox: tool({
      description:
        "Fetch the user's recent inbox mentions and notifications for summarization. Use this when the user asks about their inbox or mentions.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const result = await convex.query(api.pearl.getInboxForSummary, {
            organizationId: organizationId as any,
          });
          if (!result || result.length === 0) {
            return { message: "Your inbox is empty - no recent mentions." };
          }
          return {
            mentionCount: result.length,
            mentions: result.map((m) => ({
              from: m.author,
              channel: m.channelName,
              content: m.content,
              time: new Date(m.createdAt).toLocaleString(),
            })),
          };
        } catch (e) {
          return { error: "Failed to fetch inbox." };
        }
      },
    }),

    // Client-side tool: requires user consent (no execute function)
    summarizeDmMessages: tool({
      description:
        "Fetch the last 50 messages from a DM conversation for summarization. This requires user consent before proceeding. Use this when the user asks to summarize a DM conversation.",
      inputSchema: z.object({
        conversationId: z
          .string()
          .describe("The ID of the DM conversation to summarize"),
        otherUserName: z
          .string()
          .describe("The name of the other person in the DM (for the consent dialog)"),
      }),
    }),

    // Client-side tool: requires user consent (no execute function)
    sendMessage: tool({
      description:
        "Send a message on behalf of the user to a channel or DM conversation. This requires user consent. The message will show a 'via Pearl' indicator.",
      inputSchema: z.object({
        targetType: z
          .enum(["channel", "dm"])
          .describe("Whether to send to a channel or DM"),
        targetId: z
          .string()
          .describe("The ID of the channel or conversation to send the message to"),
        targetName: z
          .string()
          .describe("The name of the channel or person (for the consent dialog)"),
        content: z
          .string()
          .describe("The message content to send"),
      }),
    }),

    // Client-side tool: requires user consent (no execute function)
    createForumPost: tool({
      description:
        "Create a new post in a forum channel. This requires user consent. The post will be attributed to Pearl (the AI assistant).",
      inputSchema: z.object({
        channelId: z
          .string()
          .describe("The ID of the forum channel to create the post in"),
        channelName: z
          .string()
          .describe("The name of the forum channel (for the consent dialog)"),
        title: z
          .string()
          .describe("The title of the forum post"),
        content: z
          .string()
          .describe("The content/body of the forum post"),
      }),
    }),
  };

  // 8. Stream the response
  const result = streamText({
    model: gateway("openai/gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    temperature: 0.7,
  });

  return result.toUIMessageStreamResponse();
}
