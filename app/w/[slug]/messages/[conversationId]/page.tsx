"use client"

import * as React from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import { CircleNotchIcon } from "@phosphor-icons/react"
import { useUserDataCache } from "@/components/user-data-cache"
import { MessageList, type Message, type Attachment, type Reaction } from "@/components/preview/message-list"
import { MessageInput } from "@/components/preview/message-input"
import { TypingIndicator } from "@/components/typing-indicator"
import { DmHeader } from "@/components/messages/dm-header"
import type { Id } from "@/convex/_generated/dataModel"

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

  // Real-time subscription for typing users
  const typingUsersQuery = useQuery(
    api.messages.getTypingUsersInConversationQuery,
    conversationId ? { conversationId } : "skip"
  )

  // Mutations
  const sendMessage = useMutation(api.messages.sendDirectMessage)
  const deleteMessage = useMutation(api.messages.deleteDirectMessage)
  const editMessage = useMutation(api.messages.editDirectMessage)
  const setTyping = useMutation(api.messages.setTypingInConversation)
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl)
  const toggleReaction = useMutation(api.messages.toggleDirectMessageReaction)

  // Fetch user data for other participant
  React.useEffect(() => {
    if (conversation?.otherParticipantId) {
      fetchUserData([conversation.otherParticipantId])
    }
  }, [conversation?.otherParticipantId, fetchUserData])

  // Fetch user data for typing users
  React.useEffect(() => {
    if (typingUsersQuery?.typingUsers && typingUsersQuery.typingUsers.length > 0) {
      fetchUserData(typingUsersQuery.typingUsers)
    }
  }, [typingUsersQuery?.typingUsers, fetchUserData])

  // Fetch user data for message authors
  React.useEffect(() => {
    if (!rawMessages || rawMessages.length === 0) return
    const uniqueUserIds = Array.from(new Set(rawMessages.map((msg) => msg.userId)))
    fetchUserData(uniqueUserIds)
  }, [rawMessages, fetchUserData])

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
    ;(rawMessages || []).forEach((msg) => {
      map.set(msg._id, { content: msg.content, userId: msg.userId })
    })
    return map
  }, [rawMessages])

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
    return (rawMessages || []).map((msg) => {
      const cachedUserData = userDataCache[msg.userId]
      const firstName = cachedUserData?.firstName ?? (user?.id === msg.userId ? user?.firstName : null)
      const lastName = cachedUserData?.lastName ?? (user?.id === msg.userId ? user?.lastName : null)
      const imageUrl = cachedUserData?.imageUrl ?? (user?.id === msg.userId ? user?.imageUrl : null)

      const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || "Unknown User"

      const initials =
        firstName && lastName ? `${firstName[0]}${lastName[0]}` : firstName?.[0] || "?"

      // Transform attachments
      const attachments: Attachment[] =
        msg.attachments?.map((att) => ({
          storageId: att.storageId,
          name: att.name,
          size: att.size,
          type: att.type,
        })) || []

      // Transform reactions
      const reactions: Reaction[] | undefined = msg.reactions?.map((r) => ({
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
        editedAt: msg.editedAt,
        parentMessageId: msg.parentMessageId,
        parentMessage,
        reactions: reactions && reactions.length > 0 ? reactions : undefined,
        mentions: msg.mentions,
      }
    })
  }, [rawMessages, userDataCache, user, messageMap, userNames])

  // Loading state
  if (!routeParams || conversation === undefined || messagesData === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <CircleNotchIcon className="size-6 animate-spin text-[#26251E]/20" />
      </div>
    )
  }

  // Not found or not authorized
  if (conversation === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-white">
        <p className="text-sm text-[#26251E]/60 mb-2">Conversation not found</p>
        <button
          onClick={() => router.push(`/w/${routeParams.slug}/messages`)}
          className="text-sm text-[#26251E] hover:underline"
        >
          Back to messages
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
    parentMessageId?: string
  ) => {
    if (!conversationId) return

    try {
      await sendMessage({
        conversationId,
        content,
        attachments: attachments?.map((a) => ({
          ...a,
          storageId: a.storageId as Id<"_storage">,
        })),
        parentMessageId: parentMessageId as Id<"messages"> | undefined,
      })
    } catch (error) {
      console.error("Failed to send message:", error)
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

  const handleBack = () => {
    router.push(`/w/${routeParams.slug}/messages`)
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

  return (
    <main className="flex flex-1 flex-col bg-[#F7F7F4]">
      {/* DM Header */}
      <DmHeader
        participantName={participantName}
        participantImageUrl={participantData?.imageUrl}
        participantInitials={participantInitials}
        onBack={handleBack}
      />

      {/* Message List */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
        onReply={handleReply}
        onReaction={handleReaction}
        onAvatarClick={handleAvatarClick}
        onNameClick={handleNameClick}
        savedMessageIds={new Set()}
        userNames={userNames}
        channelName={participantName}
        channelDescription="Direct message"
        isAdmin={false}
      />

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        channelName={participantName}
        onTyping={handleTyping}
        generateUploadUrl={handleGenerateUploadUrl}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        mentionUsers={[]}
      />
    </main>
  )
}

