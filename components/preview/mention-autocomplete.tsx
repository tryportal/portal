"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface MentionUser {
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
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

  // Filter users based on search query
  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return users
    const query = searchQuery.toLowerCase()
    return users.filter((user) => {
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
    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-[#26251E]/10 bg-white shadow-lg overflow-hidden z-50">
      <ScrollArea className="max-h-48">
        <div ref={listRef} className="py-1">
          {filteredUsers.map((user, index) => {
            const name = user.firstName && user.lastName
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
                    ? "bg-[#26251E]/5"
                    : "hover:bg-[#26251E]/[0.02]"
                }`}
              >
                <Avatar className="size-6">
                  {user.imageUrl && (
                    <AvatarImage src={user.imageUrl} alt={name} />
                  )}
                  <AvatarFallback className="text-[10px] bg-[#26251E]/10 text-[#26251E]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-[#26251E]">{name}</span>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
