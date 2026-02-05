"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceData } from "@/components/workspace-context";
import { PearlAvatar } from "@/components/pearl/pearl-avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  PaperPlaneTiltIcon,
  SparkleIcon,
  ArrowLeftIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  ChatCircleIcon,
  EnvelopeIcon,
  ArticleIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PersonaState } from "@/components/ai-elements/persona";

// ============================================================================
// Pearl Chat Component
// ============================================================================

interface PearlChatProps {
  onBack?: () => void;
}

export function PearlChat({ onBack }: PearlChatProps) {
  const { organization } = useWorkspaceData();
  const organizationId = organization?._id;

  // Rate limit check
  const dailyLimit = useQuery(api.pearl.checkDailyLimit);

  // Clear chat history mutation
  const clearHistory = useMutation(api.pearl.clearChatHistory);

  // Convex mutations for client-side tool execution
  const sendChannelMessage = useMutation(api.pearl.sendChannelMessageViaPearl);
  const sendDirectMessage = useMutation(api.pearl.sendDirectMessageViaPearl);
  const createForumPost = useMutation(api.pearl.createForumPostViaPearl);
  const getConversationMessages = useQuery(api.pearl.getConversationMessagesForSummary, 
    // We use a placeholder - the actual query is made dynamically in tool execution
    undefined as any
  );

  // Save message mutations
  const savePearlMessage = useMutation(api.pearl.savePearlMessage);

  // Chat state
  const [input, setInput] = React.useState("");
  const [personaState, setPersonaState] = React.useState<PersonaState>("idle");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/pearl",
      body: { organizationId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      // Client-side tools are handled via the UI (confirmation dialogs)
      // We don't auto-execute them here - they render as confirmation UI
      if (toolCall.dynamic) return;
    },
  });

  // Update persona state based on chat status
  React.useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setPersonaState("thinking");
    } else {
      setPersonaState("idle");
    }
  }, [status]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "20px";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (dailyLimit && !dailyLimit.allowed) return;

    sendMessage({ text: trimmed });
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "20px";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = async () => {
    if (!organizationId) return;
    await clearHistory({ organizationId });
    window.location.reload();
  };

  // Handle tool confirmation
  const handleToolConfirm = async (
    toolCallId: string,
    toolName: string,
    toolInput: any
  ) => {
    try {
      let result: any;

      switch (toolName) {
        case "summarizeDmMessages": {
          // We need to read DM messages - this is the consent step
          // The actual Convex query will be done server-side on next turn
          // For now, we signal consent was given
          result = { consented: true, conversationId: toolInput.conversationId };
          break;
        }
        case "sendMessage": {
          if (toolInput.targetType === "channel") {
            await sendChannelMessage({
              channelId: toolInput.targetId as Id<"channels">,
              content: toolInput.content,
            });
            result = {
              success: true,
              message: `Message sent to #${toolInput.targetName}`,
            };
          } else {
            await sendDirectMessage({
              conversationId: toolInput.targetId as Id<"conversations">,
              content: toolInput.content,
            });
            result = {
              success: true,
              message: `Message sent to ${toolInput.targetName}`,
            };
          }
          break;
        }
        case "createForumPost": {
          await createForumPost({
            channelId: toolInput.channelId as Id<"channels">,
            title: toolInput.title,
            content: toolInput.content,
          });
          result = {
            success: true,
            message: `Forum post "${toolInput.title}" created in #${toolInput.channelName}`,
          };
          break;
        }
        default:
          result = { error: "Unknown tool" };
      }

      addToolOutput({
        tool: toolName,
        toolCallId,
        output: JSON.stringify(result),
      });
    } catch (err: any) {
      addToolOutput({
        tool: toolName,
        toolCallId,
        state: "output-error",
        errorText: err?.message || "Action failed",
      });
    }
  };

  const handleToolDeny = (toolCallId: string, toolName: string) => {
    addToolOutput({
      tool: toolName,
      toolCallId,
      output: JSON.stringify({
        denied: true,
        message: "User denied this action.",
      }),
    });
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <main className="flex flex-1 flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="size-8 text-muted-foreground hover:text-foreground sm:hidden"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
          )}
          <PearlAvatar state={personaState} size="sm" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground">Pearl</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <SparkleIcon className="size-2.5" weight="fill" />
                AI
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Your workspace assistant
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Daily usage indicator */}
          {dailyLimit && (
            <span className="text-xs text-muted-foreground">
              {dailyLimit.remaining}/{dailyLimit.limit} remaining
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="size-8 text-muted-foreground hover:text-foreground"
            title="Clear chat history"
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="py-4">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 px-4">
                <PearlAvatar state="idle" size="lg" />
                <div className="text-center max-w-sm">
                  <h2 className="text-base font-semibold text-foreground mb-1">
                    Hi, I&apos;m Pearl
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    I can help you with your workspace. Try asking me to:
                  </p>
                </div>
                <div className="grid gap-2 w-full max-w-sm">
                  {[
                    {
                      icon: ChatCircleIcon,
                      text: "Summarize #general",
                    },
                    {
                      icon: TrayIcon,
                      text: "Summarize my inbox",
                    },
                    {
                      icon: EnvelopeIcon,
                      text: "Send a message to someone",
                    },
                    {
                      icon: ArticleIcon,
                      text: "Create a forum post",
                    },
                  ].map((suggestion) => (
                    <button
                      key={suggestion.text}
                      onClick={() => {
                        setInput(suggestion.text);
                        textareaRef.current?.focus();
                      }}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <suggestion.icon className="size-4 flex-shrink-0" />
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div key={message.id} className="px-4 py-1.5">
                {message.role === "user" ? (
                  <UserMessage content={getMessageText(message)} />
                ) : (
                  <AssistantMessage
                    message={message}
                    personaState={personaState}
                    onToolConfirm={handleToolConfirm}
                    onToolDeny={handleToolDeny}
                  />
                )}
              </div>
            ))}

            {/* Thinking indicator */}
            {status === "submitted" && (
              <div className="px-4 py-1.5">
                <div className="flex gap-3 items-start">
                  <PearlAvatar state="thinking" size="sm" />
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Pearl is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="px-4 py-1.5">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error.message || "Something went wrong. Please try again."}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background px-4 py-2 shrink-0">
        {dailyLimit && !dailyLimit.allowed ? (
          <div className="flex items-center justify-center py-3">
            <p className="text-sm text-muted-foreground">
              Daily message limit reached ({dailyLimit.limit}/{dailyLimit.limit}). Come back tomorrow!
            </p>
          </div>
        ) : (
          <div className="relative flex flex-col">
            <div className="px-3 pt-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Pearl anything..."
                disabled={isLoading}
                className="min-h-[20px] max-h-[120px] w-full resize-none border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0 shadow-none leading-[20px] disabled:cursor-not-allowed overflow-y-auto outline-none"
                rows={1}
                style={{ height: "20px" }}
              />
            </div>

            <div className="flex items-center justify-between px-1.5 py-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground/50 px-1">
                  Pearl uses AI. Responses may not always be accurate.
                </span>
              </div>
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="size-7 rounded-full bg-foreground/80 text-background hover:bg-foreground disabled:bg-foreground/30 disabled:text-background/50"
              >
                <PaperPlaneTiltIcon className="size-3.5" weight="fill" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function getMessageText(message: any): string {
  if (!message.parts) return message.content || "";
  for (const part of message.parts) {
    if (part.type === "text") return part.text;
  }
  return message.content || "";
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  personaState,
  onToolConfirm,
  onToolDeny,
}: {
  message: any;
  personaState: PersonaState;
  onToolConfirm: (toolCallId: string, toolName: string, input: any) => void;
  onToolDeny: (toolCallId: string, toolName: string) => void;
}) {
  return (
    <div className="flex gap-3 items-start">
      <PearlAvatar state={personaState} size="sm" />
      <div className="flex-1 min-w-0 space-y-2">
        {message.parts?.map((part: any, i: number) => {
          switch (part.type) {
            case "text":
              return (
                <div
                  key={`${message.id}-${i}`}
                  className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_pre]:text-xs [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {part.text}
                  </ReactMarkdown>
                </div>
              );

            // Client-side tool calls that need confirmation
            case "tool-summarizeDmMessages":
              return (
                <ToolConfirmation
                  key={`${message.id}-${i}`}
                  toolCallId={part.toolCallId}
                  toolName="summarizeDmMessages"
                  input={part.input}
                  state={part.state}
                  output={part.output}
                  icon={<EnvelopeIcon className="size-4" />}
                  title="Read DM messages"
                  description={`Pearl wants to read your DM with ${part.input?.otherUserName || "someone"} to provide a summary.`}
                  onConfirm={onToolConfirm}
                  onDeny={onToolDeny}
                />
              );

            case "tool-sendMessage":
              return (
                <ToolConfirmation
                  key={`${message.id}-${i}`}
                  toolCallId={part.toolCallId}
                  toolName="sendMessage"
                  input={part.input}
                  state={part.state}
                  output={part.output}
                  icon={<ChatCircleIcon className="size-4" />}
                  title="Send message"
                  description={`Pearl wants to send "${part.input?.content}" to ${part.input?.targetType === "channel" ? "#" : ""}${part.input?.targetName || "someone"}.`}
                  onConfirm={onToolConfirm}
                  onDeny={onToolDeny}
                />
              );

            case "tool-createForumPost":
              return (
                <ToolConfirmation
                  key={`${message.id}-${i}`}
                  toolCallId={part.toolCallId}
                  toolName="createForumPost"
                  input={part.input}
                  state={part.state}
                  output={part.output}
                  icon={<ArticleIcon className="size-4" />}
                  title="Create forum post"
                  description={`Pearl wants to create a post "${part.input?.title}" in #${part.input?.channelName || "forum"}.`}
                  onConfirm={onToolConfirm}
                  onDeny={onToolDeny}
                />
              );

            // Server-side tool results
            case "tool-summarizeChannelMessages":
            case "tool-summarizeInbox":
              if (part.state === "output-available") {
                return (
                  <ToolResult
                    key={`${message.id}-${i}`}
                    toolName={part.type.replace("tool-", "")}
                    output={part.output}
                  />
                );
              }
              if (part.state === "input-available" || part.state === "input-streaming") {
                return (
                  <div
                    key={`${message.id}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                    Fetching data...
                  </div>
                );
              }
              return null;

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Tool Confirmation Component
// ============================================================================

function ToolConfirmation({
  toolCallId,
  toolName,
  input,
  state,
  output,
  icon,
  title,
  description,
  onConfirm,
  onDeny,
}: {
  toolCallId: string;
  toolName: string;
  input: any;
  state: string;
  output?: any;
  icon: React.ReactNode;
  title: string;
  description: string;
  onConfirm: (toolCallId: string, toolName: string, input: any) => void;
  onDeny: (toolCallId: string, toolName: string) => void;
}) {
  // Already responded
  if (state === "output-available") {
    const result = typeof output === "string" ? JSON.parse(output) : output;
    const wasApproved = !result?.denied;
    return (
      <div
        className={cn(
          "rounded-lg border px-3 py-2 text-xs",
          wasApproved
            ? "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400"
            : "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400"
        )}
      >
        <div className="flex items-center gap-2">
          {wasApproved ? (
            <CheckIcon className="size-3.5" weight="bold" />
          ) : (
            <XIcon className="size-3.5" weight="bold" />
          )}
          <span className="font-medium">{title}</span>
          <span>{wasApproved ? "Approved" : "Denied"}</span>
        </div>
        {wasApproved && result?.message && (
          <p className="mt-1 text-xs opacity-80">{result.message}</p>
        )}
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <span className="font-medium">{title}</span> - Action failed
      </div>
    );
  }

  // Waiting for user input
  if (state === "input-available") {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {icon}
          </div>
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onConfirm(toolCallId, toolName, input)}
            className="h-7 text-xs bg-foreground text-background hover:bg-foreground/90"
          >
            <CheckIcon className="size-3 mr-1" weight="bold" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDeny(toolCallId, toolName)}
            className="h-7 text-xs"
          >
            <XIcon className="size-3 mr-1" weight="bold" />
            Deny
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex gap-1">
        <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
      </div>
      Processing...
    </div>
  );
}

// ============================================================================
// Tool Result Component (for server-side tool results)
// ============================================================================

function ToolResult({
  toolName,
  output,
}: {
  toolName: string;
  output: any;
}) {
  const result = typeof output === "string" ? JSON.parse(output) : output;

  if (result?.error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {result.error}
      </div>
    );
  }

  // Don't render a separate result card - the AI will summarize the data in its text response
  return null;
}
