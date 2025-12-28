"use client"

import * as React from "react"
import { useQuery, useAction } from "convex/react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import {
  ChatCircleIcon,
  PlusIcon,
  EnvelopeSimpleIcon,
} from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { useWorkspaceData } from "@/components/workspace-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NewDmDialog } from "@/components/messages/new-dm-dialog"

interface ConversationWithDetails {
  _id: string
  participant1Id: string
  participant2Id: string
  createdAt: number
  lastMessageAt: number
  otherParticipantId: string
  lastMessage: {
    content: string
    createdAt: number
    userId: string
  } | null
}

interface UserData {
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

export default function MessagesPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string
  const { user } = useUser()
  const { organization } = useWorkspaceData()

  const [newDmDialogOpen, setNewDmDialogOpen] = React.useState(false)
  const [userDataCache, setUserDataCache] = React.useState<Record<string, UserData>>({})

  // Fetch conversations
  const conversations = useQuery(
    api.conversations.getUserConversations
  ) as ConversationWithDetails[] | undefined

  // Fetch user data for other participants
  const getUserDataAction = useAction(api.messages.getUserData)

  React.useEffect(() => {
    if (!conversations || conversations.length === 0) return

    const participantIds = conversations.map((c) => c.otherParticipantId)
    const missingIds = participantIds.filter((id) => !userDataCache[id])

    if (missingIds.length === 0) return

    const fetchUserData = async () => {
      try {
        const usersData = await getUserDataAction({ userIds: missingIds })
        const newCache: Record<string, UserData> = {}
        usersData.forEach((userData) => {
          newCache[userData.userId] = userData
        })
        setUserDataCache((prev) => ({ ...prev, ...newCache }))
      } catch {
        // Ignore errors
      }
    }

    fetchUserData()
  }, [conversations, getUserDataAction, userDataCache])

  const getParticipantName = (participantId: string) => {
    const userData = userDataCache[participantId]
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`
    }
    if (userData?.firstName) {
      return userData.firstName
    }
    return "Unknown User"
  }

  const getParticipantInitials = (participantId: string) => {
    const userData = userDataCache[participantId]
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    }
    if (userData?.firstName) {
      return userData.firstName[0].toUpperCase()
    }
    return "?"
  }

  const getParticipantImage = (participantId: string) => {
    return userDataCache[participantId]?.imageUrl || null
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const handleConversationClick = (conversationId: string) => {
    router.push(`/w/${slug}/messages/${conversationId}`)
  }

  if (!organization?._id) {
    return (
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-[#26251E]/60">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-hidden bg-[#F7F7F4]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#26251E]/10 px-6">
          <div className="flex items-center gap-2">
            <ChatCircleIcon className="size-5 text-[#26251E]" weight="fill" />
            <h1 className="text-base font-semibold text-[#26251E]">Messages</h1>
          </div>
          <Button
            size="sm"
            onClick={() => setNewDmDialogOpen(true)}
          >
            <PlusIcon className="size-4 mr-1.5" />
            New Message
          </Button>
        </header>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {!conversations || conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8">
              <div className="flex size-16 items-center justify-center rounded-full bg-[#26251E]/5 mb-4">
                <EnvelopeSimpleIcon className="size-8 text-[#26251E]/30" />
              </div>
              <h2 className="text-lg font-medium text-[#26251E] mb-2">
                No messages yet
              </h2>
              <p className="text-sm text-[#26251E]/60 text-center max-w-sm mb-6">
                Start a conversation with a team member or anyone with a Portal account
              </p>
              <Button onClick={() => setNewDmDialogOpen(true)}>
                <PlusIcon className="size-4 mr-1.5" />
                Start a Conversation
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-1">
              {conversations.map((conversation) => {
                const participantName = getParticipantName(conversation.otherParticipantId)
                const participantInitials = getParticipantInitials(conversation.otherParticipantId)
                const participantImage = getParticipantImage(conversation.otherParticipantId)
                const isOwnLastMessage = conversation.lastMessage?.userId === user?.id

                return (
                  <button
                    key={conversation._id}
                    onClick={() => handleConversationClick(conversation._id)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-[#26251E]/5"
                  >
                    <Avatar size="default">
                      <AvatarImage
                        src={participantImage || undefined}
                        alt={participantName}
                      />
                      <AvatarFallback className="bg-[#26251E]/10 text-[#26251E] text-sm">
                        {participantInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-medium text-[#26251E] truncate">
                          {participantName}
                        </p>
                        {conversation.lastMessage && (
                          <span className="text-xs text-[#26251E]/50 flex-shrink-0">
                            {formatTime(conversation.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage ? (
                        <p className="text-xs text-[#26251E]/60 truncate">
                          {isOwnLastMessage && (
                            <span className="text-[#26251E]/40">You: </span>
                          )}
                          {conversation.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs text-[#26251E]/40 italic">
                          No messages yet
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* New DM Dialog */}
      <NewDmDialog
        open={newDmDialogOpen}
        onOpenChange={setNewDmDialogOpen}
        organizationId={organization._id}
      />
    </main>
  )
}

