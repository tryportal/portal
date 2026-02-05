"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceData } from "@/components/workspace-context";
import { PearlAvatar } from "@/components/pearl/pearl-avatar";
import { Button } from "@/components/ui/button";
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
  ClockCounterClockwiseIcon,
  PlusIcon,
  CaretLeftIcon,
} from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PearlMentionAutocomplete, type PearlMentionItem } from "./pearl-mention-autocomplete";

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

  // Conversation management
  const conversations = useQuery(
    api.pearl.listConversations,
    organizationId ? { organizationId } : "skip"
  );
  const createConversation = useMutation(api.pearl.createConversation);
  const updateConversationTitle = useMutation(api.pearl.updateConversationTitle);
  const deleteConversation = useMutation(api.pearl.deleteConversation);
  const savePearlMessage = useMutation(api.pearl.savePearlMessage);

  // Convex client for queries in handlers
  const convex = useConvex();

  // Convex mutations for client-side tool execution
  const sendChannelMessage = useMutation(api.pearl.sendChannelMessageViaPearl);
  const sendDirectMessage = useMutation(api.pearl.sendDirectMessageViaPearl);
  const createForumPost = useMutation(api.pearl.createForumPostViaPearl);

  // Workspace context for mentions (channels and users)
  const workspaceContext = useQuery(
    api.pearl.getWorkspaceContext,
    organizationId ? { organizationId } : "skip"
  );
  const workspaceMembers = useQuery(
    api.pearl.getWorkspaceMembers,
    organizationId ? { organizationId } : "skip"
  );

  // Build mention items from workspace context
  const mentionItems = React.useMemo<PearlMentionItem[]>(() => {
    const items: PearlMentionItem[] = [];

    // Add inbox option
    items.push({
      type: "inbox",
      id: "inbox",
      name: "inbox",
      description: "Summarize your mentions",
    });

    // Add users from workspace members
    if (workspaceMembers) {
      for (const member of workspaceMembers) {
        items.push({
          type: "user",
          id: member.userId,
          name: member.name,
          imageUrl: member.imageUrl,
        });
      }
    }

    // Add channels from workspace context
    if (workspaceContext?.channels) {
      for (const channel of workspaceContext.channels) {
        items.push({
          type: "channel",
          id: channel.id,
          name: channel.name,
        });
      }
    }

    return items;
  }, [workspaceContext, workspaceMembers]);

  // Chat state
  const [input, setInput] = React.useState("");
  const [personaState, setPersonaState] = React.useState<"idle" | "thinking" | "speaking" | "listening">("idle");
  const [currentConversationId, setCurrentConversationId] = React.useState<Id<"pearlConversations"> | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const pendingConversationIdRef = React.useRef<Id<"pearlConversations"> | null>(null);

  // Mention autocomplete state
  const [mentionVisible, setMentionVisible] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionType, setMentionType] = React.useState<"@" | "#">("@");
  const [mentionStartPos, setMentionStartPos] = React.useState<number | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = React.useState(0);

  // Get messages for current conversation
  const conversationMessages = useQuery(
    api.pearl.getConversationMessages,
    currentConversationId ? { conversationId: currentConversationId } : "skip"
  );

  // Convert persisted messages to useChat format
  const initialMessages = React.useMemo(() => {
    if (!conversationMessages || conversationMessages.length === 0) return undefined;
    return conversationMessages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      parts: m.toolInvocations
        ? JSON.parse(m.toolInvocations)
        : [{ type: "text" as const, text: m.content }],
    }));
  }, [conversationMessages]);

  const { messages, setMessages, sendMessage, addToolOutput, status, error } = useChat({
    id: currentConversationId || "new",
    transport: new DefaultChatTransport({
      api: "/api/pearl",
      body: { organizationId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
    },
    onFinish: async ({ message }) => {
      // Save assistant message when complete
      if (!organizationId) return;
      const convId = pendingConversationIdRef.current || currentConversationId;
      if (!convId) return;

      // Extract text content
      const textContent = (message as any).parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("") || (message as any).content || "";

      await savePearlMessage({
        organizationId,
        conversationId: convId,
        role: "assistant",
        content: textContent,
        toolInvocations: (message as any).parts ? JSON.stringify((message as any).parts) : undefined,
      });

      // Don't update currentConversationId here - it would change the hook ID and reset state.
      // The conversation is saved to DB, so it will load correctly on next visit.
      // pendingConversationIdRef stays set so subsequent messages in this session use the right ID.
    },
  });

  // Initialize: load most recent conversation or start fresh
  React.useEffect(() => {
    if (isInitialized || !conversations) return;

    if (conversations.length > 0) {
      // Load the most recent conversation
      setCurrentConversationId(conversations[0].id);
    }
    setIsInitialized(true);
  }, [conversations, isInitialized]);

  // When conversation changes, load its messages
  // Only load when conversation ID changes, NOT when initialMessages changes
  // (to prevent overwriting local tool output updates)
  const prevConversationIdRef = React.useRef<Id<"pearlConversations"> | null>(null);
  const justCreatedConversationRef = React.useRef(false);
  React.useEffect(() => {
    if (currentConversationId !== prevConversationIdRef.current) {
      const wasNewConversation = prevConversationIdRef.current === null && currentConversationId !== null;
      prevConversationIdRef.current = currentConversationId;

      // Skip loading messages when transitioning from new conversation to persisted
      // The messages are already displayed from the streaming response
      if (wasNewConversation && isInitialized && justCreatedConversationRef.current) {
        justCreatedConversationRef.current = false;
        return;
      }

      if (initialMessages && currentConversationId) {
        setMessages(initialMessages);
      } else if (!currentConversationId && isInitialized) {
        setMessages([]);
      }
    }
  }, [currentConversationId, initialMessages, setMessages, isInitialized]);

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

  // Check for mention trigger in input
  const checkMentionTrigger = (value: string, cursorPos: number) => {
    // Look backwards from cursor to find @ or #
    let startPos = cursorPos - 1;
    while (startPos >= 0) {
      const char = value[startPos];
      if (char === "@" || char === "#") {
        // Check if trigger is at start or preceded by whitespace
        if (startPos === 0 || /\s/.test(value[startPos - 1])) {
          const query = value.slice(startPos + 1, cursorPos);
          // Only show autocomplete if query doesn't contain whitespace
          if (!/\s/.test(query)) {
            setMentionVisible(true);
            setMentionQuery(query);
            setMentionType(char as "@" | "#");
            setMentionStartPos(startPos);
            setMentionSelectedIndex(0);
            return;
          }
        }
        break;
      }
      if (/\s/.test(char)) {
        break;
      }
      startPos--;
    }
    setMentionVisible(false);
    setMentionQuery("");
    setMentionStartPos(null);
  };

  // Handle mention selection from autocomplete
  const handleMentionSelect = (item: PearlMentionItem) => {
    if (mentionStartPos === null) return;

    const beforeMention = input.slice(0, mentionStartPos);
    const afterMention = input.slice(mentionStartPos + 1 + mentionQuery.length);
    
    // Format the mention text based on type
    let mentionText: string;
    if (item.type === "inbox") {
      mentionText = "@inbox";
    } else if (item.type === "channel") {
      mentionText = `#${item.name}`;
    } else {
      mentionText = `@${item.name}`;
    }

    const newInput = `${beforeMention}${mentionText} ${afterMention}`;
    setInput(newInput);
    setMentionVisible(false);
    setMentionQuery("");
    setMentionStartPos(null);

    // Focus back on textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = beforeMention.length + mentionText.length + 1;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Auto-resize textarea and check for mention triggers
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "20px";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";

    // Check for mention trigger
    const cursorPos = e.target.selectionStart || 0;
    checkMentionTrigger(value, cursorPos);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (dailyLimit && !dailyLimit.allowed) return;
    if (!organizationId) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "20px";
    }

    // Create conversation if none exists
    let convId = currentConversationId;
    if (!convId) {
      // Generate title from first message (first 50 chars)
      const title = trimmed.length > 50 ? trimmed.slice(0, 50) + "..." : trimmed;
      convId = await createConversation({ organizationId, title });
      // Store in ref only - don't update state yet or it will change the useChat hook ID
      // and break the in-flight request. State will be updated in onFinish.
      pendingConversationIdRef.current = convId;
      justCreatedConversationRef.current = true;
    }

    // Save user message
    await savePearlMessage({
      organizationId,
      conversationId: convId,
      role: "user",
      content: trimmed,
    });

    // Send to AI
    sendMessage({ text: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention autocomplete navigation
    if (mentionVisible) {
      // Get filtered items count for navigation
      const typeFiltered = mentionItems.filter((item) =>
        mentionType === "@"
          ? item.type === "user" || item.type === "inbox"
          : item.type === "channel"
      );
      const filteredItems = mentionQuery
        ? typeFiltered.filter((item) =>
            item.name.toLowerCase().includes(mentionQuery.toLowerCase())
          )
        : typeFiltered;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (filteredItems.length > 0) {
          e.preventDefault();
          // Sort items same way as autocomplete component
          const sortedItems = [...filteredItems].sort((a, b) => {
            if (a.type === "inbox") return -1;
            if (b.type === "inbox") return 1;
            return a.name.localeCompare(b.name);
          });
          handleMentionSelect(sortedItems[mentionSelectedIndex]);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionVisible(false);
        return;
      }
    }

    // Regular enter to send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    pendingConversationIdRef.current = null;
    justCreatedConversationRef.current = false;
    setShowHistory(false);
  };

  const handleSelectConversation = (convId: Id<"pearlConversations">) => {
    setCurrentConversationId(convId);
    pendingConversationIdRef.current = null;
    justCreatedConversationRef.current = false;
    setShowHistory(false);
  };

  const handleDeleteConversation = async (convId: Id<"pearlConversations">, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation({ conversationId: convId });
    if (currentConversationId === convId) {
      handleNewChat();
    }
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
          // Fetch the actual DM messages after user consent
          const dmData = await convex.query(
            api.pearl.getConversationMessagesForSummary,
            { conversationId: toolInput.conversationId as Id<"conversations"> }
          );
          if (!dmData) {
            result = { error: "Could not access conversation or no messages found." };
          } else {
            result = {
              otherUserName: dmData.otherUserName,
              messageCount: dmData.messages.length,
              messages: dmData.messages.map((m: any) => ({
                author: m.author,
                content: m.content,
                time: new Date(m.createdAt).toLocaleString(),
              })),
            };
          }
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
        output: JSON.stringify({ error: err?.message || "Action failed" }),
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

  // History panel
  if (showHistory) {
    return (
      <main className="flex flex-1 flex-col h-full min-h-0 bg-background overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(false)}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <CaretLeftIcon className="size-4" />
            </Button>
            <h1 className="text-sm font-medium text-foreground">Chat History</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <PlusIcon className="size-3.5" />
            New Chat
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {!conversations || conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
              <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center">
                <ClockCounterClockwiseIcon className="size-5 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="py-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectConversation(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectConversation(conv.id);
                    }
                  }}
                  className={cn(
                    "group w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                    "hover:bg-muted/50",
                    currentConversationId === conv.id && "bg-muted/50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(conv.lastMessageAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="size-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-opacity"
                  >
                    <TrashIcon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

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
              <h1 className="text-sm font-medium text-foreground">Pearl</h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <SparkleIcon className="size-2.5" weight="fill" />
                AI
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Workspace assistant
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Daily usage indicator */}
          {dailyLimit && (
            <span className="text-xs text-muted-foreground mr-2 tabular-nums">
              {dailyLimit.remaining}/{dailyLimit.limit}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="size-8 text-muted-foreground hover:text-foreground"
            title="New chat"
          >
            <PlusIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(true)}
            className="size-8 text-muted-foreground hover:text-foreground"
            title="Chat history"
          >
            <ClockCounterClockwiseIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="py-4">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5 px-4">
                <div className="relative">
                  <PearlAvatar state="idle" size="lg" />
                  {/* Decorative ring */}
                  <div className="absolute -inset-3 rounded-full border border-foreground/[0.05]" />
                </div>
                <div className="text-center max-w-sm">
                  <h2 className="text-base font-medium text-foreground mb-1">
                    Hi, I&apos;m Pearl
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your workspace assistant. Try one of these:
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
                      className="group flex items-center gap-3 rounded-xl ring-1 ring-foreground/[0.08] bg-card px-4 py-3 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:ring-foreground/15 transition-all"
                    >
                      <suggestion.icon className="size-4 flex-shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message, index) => (
              <div 
                key={message.id} 
                className={cn(
                  "px-4 py-1.5",
                  index === 0 && "pt-2"
                )}
              >
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

            {/* Thinking indicator - show when submitted OR streaming with no visible text yet */}
            {(() => {
              if (status === "submitted") return true;
              if (status === "streaming") {
                // Check if the last assistant message has any visible text
                const lastMsg = messages[messages.length - 1];
                if (lastMsg?.role === "assistant") {
                  const hasVisibleText = lastMsg.parts?.some(
                    (p: any) => p.type === "text" && p.text?.trim()
                  );
                  return !hasVisibleText;
                }
              }
              return false;
            })() && (
              <div className="px-4 py-1.5">
                <div className="flex gap-3 items-start">
                  <PearlAvatar state="thinking" size="sm" />
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="px-4 py-1.5">
                <div className="rounded-lg ring-1 ring-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  {error.message || "Something went wrong. Please try again."}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background px-4 py-3 shrink-0">
        {dailyLimit && !dailyLimit.allowed ? (
          <div className="flex items-center justify-center py-3">
            <p className="text-sm text-muted-foreground">
              Daily limit reached. Come back tomorrow!
            </p>
          </div>
        ) : (
          <div className="relative flex flex-col rounded-xl ring-1 ring-foreground/[0.08] bg-muted/30 focus-within:ring-foreground/15 transition-all">
            {/* Mention autocomplete */}
            <PearlMentionAutocomplete
              items={mentionItems}
              searchQuery={mentionQuery}
              mentionType={mentionType}
              onSelect={handleMentionSelect}
              visible={mentionVisible}
              selectedIndex={mentionSelectedIndex}
              onSelectedIndexChange={setMentionSelectedIndex}
            />

            <div className="px-4 pt-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Pearl anything... (use @ or # to mention)"
                disabled={isLoading}
                className="min-h-[22px] max-h-[120px] w-full resize-none border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0 shadow-none leading-[22px] disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto outline-none"
                rows={1}
                style={{ height: "22px" }}
              />
            </div>

            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px] text-muted-foreground/50 select-none">
                AI responses may be inaccurate
              </span>
              <Button
                size="icon-sm"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:bg-foreground/20 disabled:text-background/40 transition-colors"
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
// Helper Functions
// ============================================================================

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getMessageText(message: any): string {
  if (!message.parts) return message.content || "";
  for (const part of message.parts) {
    if (part.type === "text") return part.text;
  }
  return message.content || "";
}

// ============================================================================
// Sub-components
// ============================================================================

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-background">
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
  personaState: "idle" | "thinking" | "speaking" | "listening";
  onToolConfirm: (toolCallId: string, toolName: string, input: any) => void;
  onToolDeny: (toolCallId: string, toolName: string) => void;
}) {
  return (
    <div className="flex gap-3 items-start">
      <PearlAvatar state={personaState} size="sm" />
      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
        {message.parts?.map((part: any, i: number) => {
          switch (part.type) {
            case "text":
              return (
                <div
                  key={`${message.id}-${i}`}
                  className="pearl-markdown max-w-none text-sm text-foreground"
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
                    className="inline-flex items-center gap-2 rounded-lg ring-1 ring-foreground/[0.08] bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
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
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
          wasApproved
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20"
            : "bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-500/20"
        )}
      >
        {wasApproved ? (
          <CheckIcon className="size-3.5" weight="bold" />
        ) : (
          <XIcon className="size-3.5" weight="bold" />
        )}
        <span className="font-medium">{title}</span>
        <span className="opacity-70">{wasApproved ? "approved" : "denied"}</span>
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg ring-1 ring-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <XIcon className="size-3.5" weight="bold" />
        <span className="font-medium">{title}</span>
        <span className="opacity-70">failed</span>
      </div>
    );
  }

  // Waiting for user input - show all details
  if (state === "input-available") {
    // Fields to hide (internal IDs)
    const hiddenFields = ["targetId", "channelId", "conversationId", "otherUserId"];

    // User-friendly labels for fields
    const friendlyLabels: Record<string, string> = {
      targetType: "Type",
      targetName: "To",
      otherUserName: "Conversation with",
      channelName: "Channel",
      content: "Message",
      title: "Title",
    };

    // Format values for display
    const formatValue = (key: string, value: any): string => {
      if (key === "targetType") {
        return value === "channel" ? "Channel" : "Direct Message";
      }
      if (key === "targetName" && input?.targetType === "channel") {
        return `#${value}`;
      }
      return String(value);
    };

    const visibleEntries = Object.entries(input || {}).filter(
      ([key]) => !hiddenFields.includes(key)
    );

    return (
      <div className="rounded-xl ring-1 ring-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>

        {/* Show tool input details with friendly labels */}
        <div className="space-y-2.5 mb-3">
          {visibleEntries.map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="font-medium text-muted-foreground">
                {friendlyLabels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className="mt-1 text-sm text-foreground bg-background/60 rounded-lg px-3 py-2 ring-1 ring-foreground/[0.05] whitespace-pre-wrap break-words">
                {formatValue(key, value)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onConfirm(toolCallId, toolName, input)}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <CheckIcon className="size-3.5 mr-1" weight="bold" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDeny(toolCallId, toolName)}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5 mr-1" weight="bold" />
            Deny
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="inline-flex items-center gap-2 rounded-lg ring-1 ring-foreground/[0.08] bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex gap-1">
        <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
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
      <div className="inline-flex items-center gap-2 rounded-lg ring-1 ring-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <XIcon className="size-3.5" weight="bold" />
        {result.error}
      </div>
    );
  }

  // Don't render a separate result card - the AI will summarize the data in its text response
  return null;
}
