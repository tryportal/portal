"use client"

import * as React from "react"
import { ConversationsSidebar } from "@/components/messages/conversations-sidebar"

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Conversations Sidebar */}
      <ConversationsSidebar />

      {/* Main Content Area - conversation or empty state */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

