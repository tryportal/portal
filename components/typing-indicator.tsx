"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TypingUser {
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.[0] || ""
  const last = lastName?.[0] || ""
  return (first + last).toUpperCase() || "?"
}

function getDisplayName(user: TypingUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) {
    return user.firstName
  }
  return "Someone"
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return null
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${getDisplayName(typingUsers[0])} is typing...`
    }
    if (typingUsers.length === 2) {
      return `${getDisplayName(typingUsers[0])} and ${getDisplayName(typingUsers[1])} are typing...`
    }
    const othersCount = typingUsers.length - 2
    return `${getDisplayName(typingUsers[0])}, ${getDisplayName(typingUsers[1])}, and ${othersCount} ${othersCount === 1 ? "other" : "others"} are typing...`
  }

  return (
    <div className="absolute -top-6 left-0 z-10 pointer-events-none">
      <div className="flex items-center gap-1.5 px-4 py-0.5 text-[11px] text-muted-foreground">
        {/* Avatars */}
        <div className="flex -space-x-1">
          {typingUsers.slice(0, 3).map((user) => (
            <Avatar key={user.userId} className="size-4 border border-background">
              {user.imageUrl ? (
                <AvatarImage src={user.imageUrl} alt={getDisplayName(user)} />
              ) : null}
              <AvatarFallback className="bg-secondary text-foreground text-[6px]">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        
        {/* Typing text with animated dots */}
        <span className="flex items-center">
          <span>{getTypingText().replace("...", "")}</span>
          <span className="flex">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
          </span>
        </span>
      </div>
    </div>
  )
}
