"use client"

import * as React from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { useUserDataCache } from "@/components/user-data-cache"
import { LoadingSpinner } from "@/components/loading-spinner"
import { MessageList, type Message, type Attachment, type Reaction } from "@/components/chat"
import type { LinkEmbedData as LinkEmbed } from "@/components/preview/link-preview"
import { MessageInput } from "@/components/preview/message-input"
import { DmHeader } from "@/components/messages/dm-header"
import { ForwardMessageDialog } from "@/components/preview/forward-message-dialog"
import type { Id } from "@/convex/_generated/dataModel"
import { usePageTitle } from "@/lib/use-page-title"
import { useNotifications } from "@/lib/use-notifications"
import { analytics } from "@/lib/analytics"

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ slug: string; conversationId: string }>;
}) {
  const router = useRouter()
  const { user } = useUser()
  const { cache: userDataCache, fetchUserData } = useUserDataCache()

  const [routeParams, setRouteParams] = React.useState<{
    slug: string
    conversationId: string
  } | null>(null)

  // Handle reply state - must be declared before any conditional returns
  const [replyingTo, setReplyingTo] = React.useState<{
    messageId: string
    content: string
    userName: string
  } | null>(null)

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setRouteParams(resolved))
    } else {
      setRouteParams(params)
    }
  }, [params])

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Pending messages state for optimistic updates
  const [pendingMessages, setPendingMessages] = React.useState<Message[]>([]);

  // Get organization by slug for forward dialog
  const organization = useQuery(
    api.organizations.getOrganizationBySlug,
    routeParams?.slug ? { slug: routeParams.slug } : "skip"
  )
  const organizationId = organization?._id

  // Get conversation data
  const conversationId = routeParams?.conversationId as Id<"conversations"> | undefined
  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  )

  // Get messages for the conversation
  const messagesData = useQuery(
    api.messages.getConversationMessages,
    conversationId ? { conversationId, limit: 50 } : "skip"
  )
  const rawMessages = messagesData?.messages

  // Collect all attachment storage IDs from messages
  const attachmentStorageIds = React.useMemo(() => {
    if (!rawMessages) return []
    const ids: string[] = []
    rawMessages.forEach((msg) => {
      msg.attachments?.forEach((att: any) => {
        if (att.storageId) ids.push(att.storageId)
      })
    })
    return ids
  }, [rawMessages])

  // Fetch attachment URLs in batch
  const attachmentUrlsData = useQuery(
    api.messages.getBatchStorageUrls,
    attachmentStorageIds.length > 0
      ? { storageIds: attachmentStorageIds as any }
      : "skip"
  )

  // Build attachment URLs map
  const attachmentUrls = React.useMemo(() => {
    if (!attachmentUrlsData) return {}
    return attachmentUrlsData as Record<string, string | null>
  }, [attachmentUrlsData])

  // Server-side search (only if search query is long enough and we have a conversation)
  const serverSearchResults = useQuery(
    api.messages.searchMessages,
    conversationId && debouncedSearchQuery.length > 2
      ? { conversationId, query: debouncedSearchQuery, limit: 50 }
      : "skip"
  );

  // Client-side filtering and hybrid search logic
  const filteredMessages = React.useMemo(() => {
    if (!rawMessages) return [];
    
    // No search query - return all loaded messages
    if (!searchQuery.trim()) {
      return rawMessages;
    }

    const searchTerm = searchQuery.toLowerCase().trim();

    // First, filter loaded messages client-side
    const clientResults = rawMessages.filter((msg) =>
      msg.content.toLowerCase().includes(searchTerm)
    );

    // If we have client results OR search query is too short for server search, return client results
    if (clientResults.length > 0 || debouncedSearchQuery.length <= 2) {
      return clientResults;
    }

    // No client results and query is long enough - use server results
    if (serverSearchResults && serverSearchResults.length > 0) {
      // Deduplicate by message ID
      const messageMap = new Map<string, typeof serverSearchResults[number]>();
      serverSearchResults.forEach((msg) => {
        messageMap.set(msg._id, msg);
      });
      return Array.from(messageMap.values());
    }

    // No results at all
    return [];
  }, [rawMessages, debouncedSearchQuery, serverSearchResults]);

  // Real-time subscription for typing users
  const typingUsersQuery = useQuery(
    api.messages.getTypingUsersInConversationQuery,
    conversationId ? { conversationId } : "skip"
  )

  // Forward dialog state
  const [forwardDialogOpen, setForwardDialogOpen] = React.useState(false)
  const [forwardingMessage, setForwardingMessage] = React.useState<{
    id: string
    content: string
    attachments?: Array<{ name: string }>
    linkEmbed?: { url: string }
  } | null>(null)

  // Mutations
  const sendMessage = useMutation(api.messages.sendDirectMessage)
  const deleteMessage = useMutation(api.messages.deleteDirectMessage)
  const editMessage = useMutation(api.messages.editDirectMessage)
  const setTyping = useMutation(api.messages.setTypingInConversation)
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl)
  const toggleReaction = useMutation(api.messages.toggleDirectMessageReaction)
  const forwardMessage = useMutation(api.messages.forwardMessage)
  const markAsRead = useMutation(api.conversations.markConversationAsRead)
  
  // Track tab visibility for marking messages as read
  const { isTabVisible } = useNotifications()

  // Fetch user data for other participant
  React.useEffect(() => {
    if (conversation?.otherParticipantId) {
      fetchUserData([conversation.otherParticipantId])
    }
  }, [conversation?.otherParticipantId, fetchUserData])

  // Mark conversation as read when viewing, when new messages arrive, or when tab becomes visible
  React.useEffect(() => {
    if (conversationId && filteredMessages && filteredMessages.length > 0 && isTabVisible) {
      markAsRead({ conversationId })
    }
  }, [conversationId, filteredMessages?.length, markAsRead, isTabVisible])

  // Fetch user data for typing users
  React.useEffect(() => {
    if (typingUsersQuery?.typingUsers && typingUsersQuery.typingUsers.length > 0) {
      fetchUserData(typingUsersQuery.typingUsers)
    }
  }, [typingUsersQuery?.typingUsers, fetchUserData])

  // Fetch user data for message authors
  React.useEffect(() => {
    if (!filteredMessages || filteredMessages.length === 0) return
    const uniqueUserIds = Array.from(new Set(filteredMessages.map((msg) => msg.userId)))
    fetchUserData(uniqueUserIds)
  }, [filteredMessages, fetchUserData])

  // Transform typing users with cached user data
  const typingUsers = React.useMemo(() => {
    if (!typingUsersQuery?.typingUsers) return []
    return typingUsersQuery.typingUsers.map((userId) => {
      const cached = userDataCache[userId]
      return {
        userId,
        firstName: cached?.firstName ?? null,
        lastName: cached?.lastName ?? null,
        imageUrl: cached?.imageUrl ?? null,
      }
    })
  }, [typingUsersQuery?.typingUsers, userDataCache])

  // Get participant info
  const otherParticipantId = conversation?.otherParticipantId
  const participantData = otherParticipantId ? userDataCache[otherParticipantId] : null

  const participantName = React.useMemo(() => {
    if (participantData?.firstName && participantData?.lastName) {
      return `${participantData.firstName} ${participantData.lastName}`
    }
    if (participantData?.firstName) {
      return participantData.firstName
    }
    return "Loading..."
  }, [participantData])

  // Set page title
  usePageTitle(`${participantName} - Portal`)

  const participantInitials = React.useMemo(() => {
    if (participantData?.firstName && participantData?.lastName) {
      return `${participantData.firstName[0]}${participantData.lastName[0]}`.toUpperCase()
    }
    if (participantData?.firstName) {
      return participantData.firstName[0].toUpperCase()
    }
    return "?"
  }, [participantData])

  // Build a map of message IDs to their data for parent message lookups
  const messageMap = React.useMemo(() => {
    const map = new Map<string, { content: string; userId: string }>()
    ;(filteredMessages || []).forEach((msg) => {
      map.set(msg._id, { content: msg.content, userId: msg.userId })
    })
    return map
  }, [filteredMessages])

  // Build user names map for mentions and reactions
  const userNames: Record<string, string> = React.useMemo(() => {
    const names: Record<string, string> = {}
    Object.entries(userDataCache).forEach(([userId, data]) => {
      const firstName = data.firstName
      const lastName = data.lastName
      names[userId] = firstName && lastName ? `${firstName} ${lastName}` : firstName || userId
    })
    // Add current user
    if (user?.id) {
      names[user.id] =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.id
    }
    return names
  }, [userDataCache, user])

  // Transform messages for the MessageList component
  const messages: Message[] = React.useMemo(() => {
    return (filteredMessages || []).map((msg) => {
      const cachedUserData = userDataCache[msg.userId]
      const firstName = cachedUserData?.firstName ?? (user?.id === msg.userId ? user?.firstName : null)
      const lastName = cachedUserData?.lastName ?? (user?.id === msg.userId ? user?.lastName : null)
      const imageUrl = cachedUserData?.imageUrl ?? (user?.id === msg.userId ? user?.imageUrl : null)

      const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || "Unknown User"

      const initials =
        firstName && lastName ? `${firstName[0]}${lastName[0]}` : firstName?.[0] || "?"

      // Transform attachments
      const attachments: Attachment[] =
        msg.attachments?.map((att: any) => ({
          storageId: att.storageId,
          name: att.name,
          size: att.size,
          type: att.type,
        })) || []

      // Transform reactions
      const reactions: Reaction[] | undefined = msg.reactions?.map((r: any) => ({
        userId: r.userId,
        emoji: r.emoji,
      }))

      // Get parent message info for replies
      let parentMessage: { content: string; userName: string } | undefined
      if (msg.parentMessageId) {
        const parent = messageMap.get(msg.parentMessageId)
        if (parent) {
          parentMessage = {
            content: parent.content,
            userName: userNames[parent.userId] || "Unknown User",
          }
        }
      }

      return {
        id: msg._id,
        content: msg.content,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        createdAt: msg.createdAt,
        user: {
          id: msg.userId,
          name,
          avatar: imageUrl || undefined,
          initials,
        },
        attachments: attachments.length > 0 ? attachments : undefined,
        linkEmbed: msg.linkEmbed,
        editedAt: msg.editedAt,
        parentMessageId: msg.parentMessageId,
        parentMessage,
        reactions: reactions && reactions.length > 0 ? reactions : undefined,
        mentions: msg.mentions,
        forwardedFrom: msg.forwardedFrom ? {
          channelName: msg.forwardedFrom.channelName,
          userName: msg.forwardedFrom.userName,
        } : undefined,
      }
    })
  }, [filteredMessages, userDataCache, user, messageMap, userNames])

  // Combine server messages with pending (optimistic) messages for instant feedback
  const allMessages = React.useMemo(() => {
    return [...messages, ...pendingMessages];
  }, [messages, pendingMessages]);

  // Loading state
  if (!routeParams || conversation === undefined || messagesData === undefined) {
    return <LoadingSpinner fullScreen />
  }

  // Not found or not authorized
  if (conversation === null) {
    return (
      <div className="flex flex-1 h-full flex-col items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground mb-2">Conversation not found</p>
        <button
          onClick={() => router.push(`/w/${routeParams.slug}/messages`)}
          className="text-sm text-foreground hover:underline"
        >
          Select another conversation
        </button>
      </div>
    )
  }

  const currentUserId = user?.id

  const handleSendMessage = async (
    content: string,
    attachments?: Array<{
      storageId: string
      name: string
      size: number
      type: string
    }>,
    parentMessageId?: string,
    linkEmbed?: LinkEmbed
  ) => {
    if (!conversationId || !currentUserId) return

    // Create optimistic message for instant feedback
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    // Get current user's display info
    const userName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.firstName || "You";
    const initials = user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0] || "?";

    const optimisticMessage: Message = {
      id: tempId,
      content,
      timestamp: new Date(now).toLocaleTimeString([], { 
        hour: "numeric", 
        minute: "2-digit" 
      }),
      createdAt: now,
      user: {
        id: currentUserId,
        name: userName,
        avatar: user?.imageUrl || undefined,
        initials,
      },
      attachments: attachments?.map(a => ({
        storageId: a.storageId,
        name: a.name,
        size: a.size,
        type: a.type,
      })),
      linkEmbed,
      parentMessageId,
      parentMessage: parentMessageId ? (() => {
        const parent = messageMap.get(parentMessageId);
        return parent ? {
          content: parent.content,
          userName: userNames[parent.userId] || "Unknown User",
        } : undefined;
      })() : undefined,
      isPending: true,
    };

    // Add optimistic message immediately
    setPendingMessages(prev => [...prev, optimisticMessage]);

    try {
      await sendMessage({
        conversationId,
        content,
        attachments: attachments?.map((a) => ({
          ...a,
          storageId: a.storageId as Id<"_storage">,
        })),
        linkEmbed,
        parentMessageId: parentMessageId as Id<"messages"> | undefined,
      })
      analytics.messageSent({
        conversationId,
        hasAttachments: !!attachments?.length,
        isReply: !!parentMessageId,
      })
    } catch (error) {
      console.error("Failed to send message:", error)
      toast.error("Failed to send message")
    } finally {
      // Remove pending message - the real message will appear via subscription
      setPendingMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage({ messageId: messageId as Id<"messages"> })
    } catch (error) {
      console.error("Failed to delete message:", error)
    }
  }

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await editMessage({
        messageId: messageId as Id<"messages">,
        content,
      })
    } catch (error) {
      console.error("Failed to edit message:", error)
    }
  }

  const handleTyping = async () => {
    if (!conversationId) return

    try {
      await setTyping({ conversationId })
    } catch {
      // Ignore typing errors
    }
  }

  const handleGenerateUploadUrl = async () => {
    return await generateUploadUrl()
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleReaction({
        messageId: messageId as Id<"messages">,
        emoji,
      })
    } catch (error) {
      console.error("Failed to toggle reaction:", error)
    }
  }

  const handleAvatarClick = (userId: string) => {
    if (routeParams) {
      router.push(`/w/${routeParams.slug}/people/${userId}`)
    }
  }

  const handleNameClick = (userId: string) => {
    if (routeParams) {
      router.push(`/w/${routeParams.slug}/people/${userId}`)
    }
  }

  const handleReply = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (message) {
      setReplyingTo({
        messageId: message.id,
        content: message.content,
        userName: message.user.name,
      })
    }
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const handleForward = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (message) {
      setForwardingMessage({
        id: message.id,
        content: message.content,
        attachments: message.attachments?.map(a => ({ name: a.name })),
        linkEmbed: message.linkEmbed ? { url: message.linkEmbed.url } : undefined,
      })
      setForwardDialogOpen(true)
    }
  }

  const handleForwardToChannel = async (messageId: string, targetChannelId: string) => {
    try {
      const result = await forwardMessage({
        messageId: messageId as Id<"messages">,
        targetChannelId: targetChannelId as Id<"channels">,
      })
      
      if (result && routeParams) {
        toast.success(`Message forwarded to #${result.targetName}`)
        // Navigate to the target channel
        if (result.targetType === "channel" && result.categoryName) {
          router.push(`/w/${routeParams.slug}/${encodeURIComponent(result.categoryName)}/${encodeURIComponent(result.targetName)}`)
        }
      }
    } catch (error) {
      console.error("Failed to forward message:", error)
      toast.error("Failed to forward message")
    }
  }

  const handleForwardToConversation = async (messageId: string, targetConversationId: string) => {
    try {
      const result = await forwardMessage({
        messageId: messageId as Id<"messages">,
        targetConversationId: targetConversationId as Id<"conversations">,
      })
      
      if (result && routeParams) {
        toast.success(`Message forwarded to @${result.targetName}`)
        // Navigate to the target conversation
        if (result.targetType === "conversation" && result.conversationId) {
          router.push(`/w/${routeParams.slug}/messages/${result.conversationId}`)
        }
      }
    } catch (error) {
      console.error("Failed to forward message:", error)
      toast.error("Failed to forward message")
    }
  }

  return (
    <main className="flex flex-1 flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* DM Header */}
      <DmHeader
        participantName={participantName}
        participantImageUrl={participantData?.imageUrl}
        participantInitials={participantInitials}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Message List - takes up available space */}
      <MessageList
        messages={allMessages}
        currentUserId={currentUserId}
        style="bubble"
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
        onReply={handleReply}
        onForward={handleForward}
        onReaction={handleReaction}
        onAvatarClick={handleAvatarClick}
        onNameClick={handleNameClick}
        savedMessageIds={new Set()}
        userNames={userNames}
        isAdmin={false}
        searchQuery={searchQuery}
        attachmentUrls={attachmentUrls}
      />

      {/* Message Input with Typing Indicator */}
      <MessageInput
        onSendMessage={handleSendMessage}
        channelName={participantName}
        onTyping={handleTyping}
        generateUploadUrl={handleGenerateUploadUrl}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        mentionUsers={[]}
        isDirectMessage
        typingUsers={typingUsers}
      />

      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        messageId={forwardingMessage?.id}
        messageContent={forwardingMessage?.content ?? ""}
        messageAttachments={forwardingMessage?.attachments}
        messageLinkEmbed={forwardingMessage?.linkEmbed}
        organizationId={organizationId}
        currentConversationId={conversationId}
        onForwardToChannel={handleForwardToChannel}
        onForwardToConversation={handleForwardToConversation}
      />
    </main>
  )
}

