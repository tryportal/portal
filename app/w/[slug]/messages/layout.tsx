"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { ConversationsSidebar } from "@/components/messages/conversations-sidebar"
import { MobileConversationsList } from "@/components/messages/mobile-conversations-list"

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const hasActiveConversation = !!params?.conversationId

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop: Conversations Sidebar */}
      <ConversationsSidebar />

      {/* Mobile: Show full conversations list when no conversation selected */}
      {!hasActiveConversation && (
        <div className="sm:hidden flex-1 overflow-hidden">
          <MobileConversationsList />
        </div>
      )}

      {/* Main Content Area - conversation or empty state (hidden on mobile when no conversation) */}
      <div className={`flex-1 overflow-hidden ${!hasActiveConversation ? 'hidden sm:flex' : 'flex'}`}>
        {children}
      </div>
    </div>
  )
}

