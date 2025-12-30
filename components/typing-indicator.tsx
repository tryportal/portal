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
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
      {/* Avatars */}
      <div className="flex -space-x-1.5">
        {typingUsers.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="size-5 border-2 border-background">
            {user.imageUrl ? (
              <AvatarImage src={user.imageUrl} alt={getDisplayName(user)} />
            ) : null}
            <AvatarFallback className="bg-secondary text-foreground text-[8px]">
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      {/* Typing text with animated dots */}
      <span className="flex items-center gap-0.5">
        <span>{getTypingText().replace("...", "")}</span>
        <span className="flex gap-0.5">
          <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
        </span>
      </span>
    </div>
  )
}
