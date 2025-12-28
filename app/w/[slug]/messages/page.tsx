"use client"

import * as React from "react"
import { ChatCircleIcon } from "@phosphor-icons/react"

export default function MessagesPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#F7F7F4] h-full">
      <div className="flex flex-col items-center text-center max-w-md px-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-[#26251E]/5 mb-5">
          <ChatCircleIcon className="size-10 text-[#26251E]/25" weight="fill" />
        </div>
        <h2 className="text-xl font-semibold text-[#26251E] mb-2">
          Your Messages
        </h2>
        <p className="text-sm text-[#26251E]/60 leading-relaxed">
          Select a conversation from the sidebar to start chatting, or create a new message to connect with someone.
        </p>
      </div>
    </main>
  )
}
