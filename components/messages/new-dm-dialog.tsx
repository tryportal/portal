"use client"

import * as React from "react"
import { useAction, useMutation } from "convex/react"
import { useRouter, useParams } from "next/navigation"
import {
  MagnifyingGlassIcon,
  UserIcon,
  UsersIcon,
  SpinnerIcon,
  AtIcon,
} from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { analytics } from "@/lib/analytics"

interface NewDmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: Id<"organizations">
}

interface UserResult {
  userId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  isOrgMember: boolean
  handle?: string | null
}

export function NewDmDialog({
  open,
  onOpenChange,
  organizationId,
}: NewDmDialogProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<UserResult[]>([])
  const [isCreating, setIsCreating] = React.useState(false)

  const searchUsers = useAction(api.messages.searchUsersForDM)
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation)

  // Debounced search
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setSearchResults([])
      return
    }

    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchUsers({
          organizationId,
          query,
        })
        setSearchResults(results)
      } catch (error) {
        console.error("Search failed:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, open, organizationId, searchUsers])

  const handleSelectUser = async (user: UserResult) => {
    if (isCreating) return

    setIsCreating(true)
    try {
      const conversationId = await getOrCreateConversation({
        otherUserId: user.userId,
      })

      analytics.conversationStarted()
      onOpenChange(false)
      router.push(`/w/${slug}/messages/${conversationId}`)
    } catch (error) {
      console.error("Failed to create conversation:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName[0].toUpperCase()
    }
    return "?"
  }

  const getName = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    if (firstName) {
      return firstName
    }
    return "Unknown User"
  }

  const isEmailSearch = searchQuery.includes("@") && !searchQuery.startsWith("@")
  const isHandleSearch = searchQuery.startsWith("@")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Search by name, email, or @handle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            {isHandleSearch || isEmailSearch ? (
              <AtIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            ) : (
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              type="text"
              placeholder="Search by name, email, or @handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {isSearching && (
              <SpinnerIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Search Results */}
          <div className="min-h-[200px]">
            {searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <UserIcon className="size-10 text-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {isHandleSearch
                    ? "Enter a handle to find someone (e.g. @username)"
                    : isEmailSearch
                    ? "Enter a full email address to find someone"
                    : "Start typing to search for team members"}
                </p>
              </div>
            ) : searchResults.length === 0 && !isSearching ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <MagnifyingGlassIcon className="size-10 text-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {isHandleSearch
                    ? "No user found with that handle"
                    : isEmailSearch
                    ? "No user found with that email"
                    : "No team members found"}
                </p>
                {!isEmailSearch && !isHandleSearch && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Try searching by email or @handle to find users outside your team
                  </p>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {searchResults.map((user) => (
                    <button
                      key={user.userId}
                      onClick={() => handleSelectUser(user)}
                      disabled={isCreating}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Avatar size="default">
                        <AvatarImage
                          src={user.imageUrl || undefined}
                          alt={getName(user.firstName, user.lastName)}
                        />
                        <AvatarFallback className="bg-secondary text-foreground text-sm">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {getName(user.firstName, user.lastName)}
                          </p>
                          {user.isOrgMember && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground/70">
                              <UsersIcon className="size-3" />
                              Team
                            </span>
                          )}
                        </div>
                        {user.handle ? (
                          <p className="text-xs text-muted-foreground truncate">
                            @{user.handle}
                          </p>
                        ) : user.email ? (
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

