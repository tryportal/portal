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
      <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="size-8 text-muted-foreground" weight="fill" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2 text-center break-words max-w-md">
        Welcome to #{channelName}
      </h2>
      {channelDescription ? (
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4 break-words">
          {channelDescription}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4 break-words">
          This is the beginning of the #{channelName} channel. Start the conversation!
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Send a message to get things started
      </p>
    </div>
  )
}
