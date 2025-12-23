"use client"

import { HashIcon } from "@phosphor-icons/react"

interface EmptyChannelStateProps {
  channelName: string
  channelDescription?: string
  channelIcon?: React.ElementType
}

export function EmptyChannelState({
  channelName,
  channelDescription,
  channelIcon: Icon = HashIcon,
}: EmptyChannelStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="flex size-16 items-center justify-center rounded-full bg-[#26251E]/5 mb-4">
        <Icon className="size-8 text-[#26251E]/40" weight="fill" />
      </div>
      <h2 className="text-lg font-semibold text-[#26251E] mb-2">
        Welcome to #{channelName}
      </h2>
      {channelDescription ? (
        <p className="text-sm text-[#26251E]/60 text-center max-w-md mb-4">
          {channelDescription}
        </p>
      ) : (
        <p className="text-sm text-[#26251E]/60 text-center max-w-md mb-4">
          This is the beginning of the #{channelName} channel. Start the conversation!
        </p>
      )}
      <p className="text-xs text-[#26251E]/40">
        Send a message to get things started
      </p>
    </div>
  )
}
