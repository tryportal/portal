"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useAction } from "convex/react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import {
    MagnifyingGlassIcon,
} from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { useWorkspaceData } from "@/components/workspace-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
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

export function SidebarMessages() {
    const router = useRouter()
    const params = useParams()
    const slug = params?.slug as string
    const conversationId = params?.conversationId as string | undefined
    const { user } = useUser()
    const { organization } = useWorkspaceData()

    const [searchQuery, setSearchQuery] = React.useState("")
    const [userDataCache, setUserDataCache] = React.useState<Record<string, UserData>>({})

    // Fetch conversations
    const conversations = useQuery(
        api.conversations.getUserConversations
    ) as ConversationWithDetails[] | undefined

    // Fetch unread counts for all conversations
    const unreadCounts = useQuery(api.conversations.getUnreadCountsForAllConversations) ?? {}

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

    const getParticipantName = React.useCallback((participantId: string) => {
        const userData = userDataCache[participantId]
        if (userData?.firstName && userData?.lastName) {
            return `${userData.firstName} ${userData.lastName}`
        }
        if (userData?.firstName) {
            return userData.firstName
        }
        return "Unknown User"
    }, [userDataCache])

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

    const handleConversationPrefetch = (id: string) => {
        if (slug) {
            router.prefetch(`/w/${slug}/messages/${id}`)
        }
    }

    // Filter conversations by search query
    const filteredConversations = React.useMemo(() => {
        if (!conversations) return []
        if (!searchQuery.trim()) return conversations

        return conversations.filter((c) => {
            const name = getParticipantName(c.otherParticipantId).toLowerCase()
            return name.includes(searchQuery.toLowerCase())
        })
    }, [conversations, searchQuery, getParticipantName])

    if (!organization?._id) {
        return (
            <div className="flex h-12 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        )
    }

    return (
        <>
            {/* Search */}
            <div className="p-2 pb-0">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 bg-muted/50 pl-8 text-sm placeholder:text-muted-foreground border-transparent focus-visible:border-border shadow-none"
                    />
                </div>
            </div>

            {/* Conversations List */}
            <div className="mt-2">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                            {searchQuery ? "No results" : "No conversations"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-[1px]">
                        {filteredConversations.map((conversation) => {
                            const participantName = getParticipantName(conversation.otherParticipantId)
                            const participantInitials = getParticipantInitials(conversation.otherParticipantId)
                            const participantImage = getParticipantImage(conversation.otherParticipantId)
                            const isOwnLastMessage = conversation.lastMessage?.userId === user?.id
                            const isActive = conversationId === conversation._id
                            const unreadCount = unreadCounts[conversation._id] ?? 0
                            const hasUnread = unreadCount > 0

                            return (
                                <Link
                                    key={conversation._id}
                                    href={`/w/${slug}/messages/${conversation._id}`}
                                    onMouseEnter={() => handleConversationPrefetch(conversation._id)}
                                    className={cn(
                                        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors group relative",
                                        isActive
                                            ? "bg-secondary"
                                            : "hover:bg-muted/50"
                                    )}
                                    style={{
                                        height: 'auto',
                                        paddingTop: 'var(--sidebar-item-padding-y)',
                                        paddingBottom: 'var(--sidebar-item-padding-y)',
                                    }}
                                >
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0 self-start mt-0.5">
                                        <Avatar className="size-8">
                                            <AvatarImage
                                                src={participantImage || undefined}
                                                alt={participantName}
                                            />
                                            <AvatarFallback className="bg-secondary text-foreground text-[10px] font-medium">
                                                {participantInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Unread indicator dot on avatar */}
                                        {hasUnread && !isActive && (
                                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-background pointer-events-none" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="flex items-baseline justify-between gap-1">
                                            <p className={cn(
                                                "text-sm truncate leading-none",
                                                isActive ? "font-semibold text-foreground" : hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
                                            )}
                                                style={{ fontSize: 'var(--sidebar-font-size)' }}
                                            >
                                                {participantName}
                                            </p>
                                            {conversation.lastMessage && (
                                                <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums leading-none">
                                                    {formatTime(conversation.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>

                                        {conversation.lastMessage ? (
                                            <p className={cn(
                                                "text-[11px] truncate mt-1 leading-snug",
                                                hasUnread && !isActive ? "text-foreground font-medium" : "text-muted-foreground"
                                            )}>
                                                {isOwnLastMessage && (
                                                    <span className="text-foreground/40 mr-1">You:</span>
                                                )}
                                                {conversation.lastMessage.content}
                                            </p>
                                        ) : (
                                            <p className="text-[11px] text-muted-foreground/50 italic mt-1">
                                                Start chatting
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}
