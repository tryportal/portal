"use client"

import * as React from "react"
import { UsersIcon } from "@phosphor-icons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface MentionUser {
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  isEveryone?: boolean
}

interface MentionAutocompleteProps {
  users: MentionUser[]
  searchQuery: string
  onSelect: (user: MentionUser) => void
  visible: boolean
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
}

export function MentionAutocomplete({
  users,
  searchQuery,
  onSelect,
  visible,
  selectedIndex,
  onSelectedIndexChange,
}: MentionAutocompleteProps) {
  const listRef = React.useRef<HTMLDivElement>(null)

  // Filter users based on search query and add @everyone option
  const filteredUsers = React.useMemo(() => {
    const everyoneOption: MentionUser = {
      userId: "everyone",
      firstName: "everyone",
      lastName: null,
      imageUrl: null,
      isEveryone: true,
    }
    
    const usersWithEveryone = [everyoneOption, ...users]
    
    if (!searchQuery) return usersWithEveryone
    const query = searchQuery.toLowerCase()
    return usersWithEveryone.filter((user) => {
      if (user.isEveryone) {
        return "everyone".includes(query)
      }
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase()
      return fullName.includes(query)
    })
  }, [users, searchQuery])

  // Scroll selected item into view
  React.useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.querySelectorAll("[data-mention-item]")
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex])

  if (!visible || filteredUsers.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50">
      <ScrollArea className="max-h-48">
        <div ref={listRef} className="py-1">
          {filteredUsers.map((user, index) => {
            const name = user.isEveryone
              ? "everyone"
              : user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || "Unknown User"
            const initials = user.firstName && user.lastName
              ? `${user.firstName[0]}${user.lastName[0]}`
              : user.firstName?.[0] || "?"

            return (
              <button
                key={user.userId}
                data-mention-item
                onClick={() => onSelect(user)}
                onMouseEnter={() => onSelectedIndexChange(index)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-muted"
                    : "hover:bg-muted/50"
                }`}
              >
                {user.isEveryone ? (
                  <div className="flex size-6 items-center justify-center rounded-full bg-secondary">
                    <UsersIcon className="size-3.5 text-foreground" weight="fill" />
                  </div>
                ) : (
                  <Avatar className="size-6">
                    {user.imageUrl && (
                      <AvatarImage src={user.imageUrl} alt={name} />
                    )}
                    <AvatarFallback className="text-[10px] bg-secondary text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm font-medium text-foreground">{name}</span>
                {user.isEveryone && (
                  <span className="text-xs text-muted-foreground">Notify everyone in this channel</span>
                )}
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
