"use client"

import * as React from "react"
import { ChatCircleIcon } from "@phosphor-icons/react"
import { usePageTitle } from "@/lib/use-page-title"

export default function MessagesPage() {
  usePageTitle("Messages - Portal");
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background h-full">
      <div className="flex flex-col items-center text-center max-w-md px-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted mb-5">
          <ChatCircleIcon className="size-10 text-foreground/25" weight="fill" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Your Messages
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Select a conversation from the sidebar to start chatting, or create a new message to connect with someone.
        </p>
      </div>
    </main>
  )
}
