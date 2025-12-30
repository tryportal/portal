"use client"

import * as React from "react"

interface MentionProps {
  userId: string
  displayName: string
  className?: string
}

/**
 * Mention component that displays a user mention with Discord-like styling
 * Renders as a styled badge with the user's name
 */
export function Mention({ userId, displayName, className = "" }: MentionProps) {
  return (
    <span
      data-mention-user-id={userId}
      className={`inline-flex items-center rounded px-1 py-0.5 text-sm font-medium bg-[#26251E]/10 text-[#26251E]/80 hover:bg-[#26251E]/15 transition-colors ${className}`}
    >
      @{displayName}
    </span>
  )
}

/**
 * Parses message content and extracts mentions in @userId format
 * Returns an array of React nodes (text + Mention components)
 */
export function parseMentions(
  content: string,
  userNames: Record<string, string>
): React.ReactNode[] {
  // Match @userId pattern
  const mentionPattern = /@(\w+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = mentionPattern.exec(content)) !== null) {
    const userId = match[1]
    const matchStart = match.index
    
    // Add text before mention
    if (matchStart > lastIndex) {
      parts.push(content.slice(lastIndex, matchStart))
    }
    
    // Add mention component
    const displayName = userNames[userId] || userId
    parts.push(
      <Mention
        key={`mention-${userId}-${matchStart}`}
        userId={userId}
        displayName={displayName}
      />
    )
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }
  
  // If no mentions found, return original content
  return parts.length > 0 ? parts : [content]
}

/**
 * Replaces @userId mentions with @displayName in plain text
 * Useful for preprocessing content before markdown rendering
 */
export function replaceMentionsInText(
  content: string,
  userNames: Record<string, string>
): string {
  return content.replace(/@(\w+)/g, (match, userId) => {
    const displayName = userNames[userId]
    return displayName ? `@${displayName}` : match
  })
}
