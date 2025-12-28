"use client"

import * as React from "react"
import { useQuery, useAction } from "convex/react"
import { useRouter, useParams, usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import {
  PlusIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { useWorkspaceData } from "@/components/workspace-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { NewDmDialog } from "@/components/messages/new-dm-dialog"
import { cn } from "@/lib/utils"

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

export function ConversationsSidebar() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const slug = params?.slug as string
  const conversationId = params?.conversationId as string | undefined
  const { user } = useUser()
  const { organization } = useWorkspaceData()

  const [newDmDialogOpen, setNewDmDialogOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
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

  const handleConversationClick = (id: string) => {
    router.push(`/w/${slug}/messages/${id}`)
  }

  // Filter conversations by search query
  const filteredConversations = React.useMemo(() => {
    if (!conversations) return []
    if (!searchQuery.trim()) return conversations

    return conversations.filter((c) => {
      const name = getParticipantName(c.otherParticipantId).toLowerCase()
      return name.includes(searchQuery.toLowerCase())
    })
  }, [conversations, searchQuery, userDataCache])

  if (!organization?._id) {
    return (
      <div className="flex h-full w-72 flex-col border-r border-[#26251E]/10 bg-[#FAFAF8]">
        <div className="flex h-14 items-center justify-center">
          <p className="text-sm text-[#26251E]/40">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-72 flex-col border-r border-[#26251E]/10 bg-[#FAFAF8]">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[#26251E]/10 px-4">
        <h2 className="text-sm font-semibold text-[#26251E]">Messages</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setNewDmDialogOpen(true)}
          className="text-[#26251E]/60 hover:text-[#26251E]"
        >
          <PlusIcon className="size-4" weight="bold" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[#26251E]/5">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#26251E]/40" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 bg-[#26251E]/5 pl-8 text-sm placeholder:text-[#26251E]/40 border-transparent focus-visible:border-[#26251E]/20"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm text-[#26251E]/50 mb-3">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNewDmDialogOpen(true)}
              >
                <PlusIcon className="size-3.5 mr-1.5" />
                New Message
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => {
              const participantName = getParticipantName(conversation.otherParticipantId)
              const participantInitials = getParticipantInitials(conversation.otherParticipantId)
              const participantImage = getParticipantImage(conversation.otherParticipantId)
              const isOwnLastMessage = conversation.lastMessage?.userId === user?.id
              const isActive = conversationId === conversation._id

              return (
                <button
                  key={conversation._id}
                  onClick={() => handleConversationClick(conversation._id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                    isActive
                      ? "bg-[#26251E]/10"
                      : "hover:bg-[#26251E]/5"
                  )}
                >
                  {/* Avatar with online indicator potential */}
                  <div className="relative flex-shrink-0">
                    <Avatar size="default">
                      <AvatarImage
                        src={participantImage || undefined}
                        alt={participantName}
                      />
                      <AvatarFallback className="bg-[#26251E]/10 text-[#26251E] text-xs font-medium">
                        {participantInitials}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-sm truncate",
                        isActive ? "font-semibold text-[#26251E]" : "font-medium text-[#26251E]"
                      )}>
                        {participantName}
                      </p>
                      {conversation.lastMessage && (
                        <span className="text-[10px] text-[#26251E]/40 flex-shrink-0">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage ? (
                      <p className="text-xs text-[#26251E]/50 truncate mt-0.5">
                        {isOwnLastMessage && (
                          <span className="text-[#26251E]/30">You: </span>
                        )}
                        {conversation.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-xs text-[#26251E]/30 italic mt-0.5">
                        Start chatting
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* New DM Dialog */}
      <NewDmDialog
        open={newDmDialogOpen}
        onOpenChange={setNewDmDialogOpen}
        organizationId={organization._id}
      />
    </div>
  )
}

