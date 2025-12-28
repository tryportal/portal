"use client"

import { CircleNotchIcon } from "@phosphor-icons/react"

export default function MessagesLoading() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#F7F7F4]">
      <CircleNotchIcon className="size-6 animate-spin text-[#26251E]/20" />
    </main>
  )
}

