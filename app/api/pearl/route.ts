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
import type { Id } from "@/convex/_generated/dataModel";

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
    organizationId: organizationId as Id<"organizations">,
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

## Understanding Mentions
Users can mention people, channels, or inbox in their messages using @ and # symbols:

### User Mentions (@username)
When a user mentions someone like "@John Doe", determine the intent from context:
- Questions about what they said (e.g., "what did @John Doe say?", "summarize @John Doe") → Use summarizeDmMessages tool to fetch and summarize their DM conversation
- Requests to message them (e.g., "tell @John Doe...", "message @John Doe that...", "send @John Doe...") → Use sendMessage tool with targetType "dm"

### Channel Mentions (#channel)
When a user mentions a channel like "#general", determine the intent from context:
- Summarize requests (e.g., "summarize #general", "what's happening in #general?") → Use summarizeChannelMessages tool
- Send requests (e.g., "post to #general...", "send to #general...") → Use sendMessage tool with targetType "channel"

### Inbox Mention (@inbox)
When the user mentions "@inbox", always summarize their inbox using the summarizeInbox tool.

## Important Rules
1. When the user asks to summarize a channel, use the summarizeChannelMessages tool with the correct channel ID from the list above.
2. When the user asks to summarize a DM, use the summarizeDmMessages tool. This requires consent - the tool will show a confirmation dialog to the user.
3. When the user asks to send a message, use the sendMessage tool. This requires consent.
4. When the user asks to summarize their inbox, use the summarizeInbox tool.
5. When the user asks to create a forum post, use the createForumPost tool. This requires consent. The post will be attributed to you (Pearl).
6. If you don't know which channel or person the user is referring to, ask for clarification.
7. Always use channel/conversation IDs from the lists above - never guess IDs.
8. When presenting summaries, organize them clearly with key topics, important decisions, and action items.
9. Keep responses concise but thorough.

## Inbox Summarization Guidelines
When summarizing the user's inbox, DO NOT just list every message. Instead:
- Group related messages by topic or conversation thread
- Highlight what needs the user's attention or action
- Mention who is trying to reach them and why
- Call out any urgent or time-sensitive items
- Provide a brief, digestible overview (e.g., "You have 3 messages from Sarah about the project deadline, and 2 mentions in #engineering about the deployment")
- Only include specific message content if it's critical context
- If the inbox is empty, simply say so - don't elaborate unnecessarily`;

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
            { channelId: channelId as Id<"channels"> }
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
        } catch {
          return { error: "Failed to fetch channel messages." };
        }
      },
    }),

    // Server-side tool: auto-executes on server
    summarizeInbox: tool({
      description:
        "Fetch the user's recent inbox including unread mentions and direct messages for summarization. Use this when the user asks about their inbox, mentions, or unread messages.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const result = await convex.query(api.pearl.getInboxForSummary, {
            organizationId: organizationId as Id<"organizations">,
          });
          if (!result || (result.totalMentions === 0 && result.totalDMs === 0)) {
            return { message: "Your inbox is empty - no unread mentions or messages." };
          }
          return {
            totalMentions: result.totalMentions,
            totalDMs: result.totalDMs,
            mentions: result.mentions.map((m) => ({
              from: m.author,
              channel: m.channelName,
              content: m.content,
              time: new Date(m.createdAt).toLocaleString(),
            })),
            directMessages: result.dms.map((dm) => ({
              from: dm.author,
              content: dm.content,
              time: new Date(dm.createdAt).toLocaleString(),
            })),
          };
        } catch {
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
    model: gateway("xai/grok-4.1-fast-non-reasoning"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    temperature: 0.7,
  });

  return result.toUIMessageStreamResponse();
}
