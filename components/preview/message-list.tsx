"use client"

import * as React from "react"
import {
  ArrowBendUpLeftIcon,
  ShareIcon,
  SmileyIcon,
  DotsThreeIcon,
  CopyIcon,
  PushPinIcon,
  BookmarkIcon,
  TrashIcon,
  PencilIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface Message {
  id: string
  content: string
  timestamp: string
  user: {
    id: string
    name: string
    avatar?: string
    initials: string
  }
}

interface MessageListProps {
  messages: Message[]
}

function MessageItem({ message }: { message: Message }) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div
      className="group relative rounded-lg px-4 py-2 hover:bg-[#26251E]/[0.03] transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar>
          {message.user.avatar ? (
            <AvatarImage src={message.user.avatar} alt={message.user.name} />
          ) : null}
          <AvatarFallback className="bg-[#26251E]/10 text-[#26251E] text-xs">
            {message.user.initials}
          </AvatarFallback>
        </Avatar>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-[#26251E]">
              {message.user.name}
            </span>
            <span className="text-xs text-[#26251E]/40">
              {message.timestamp}
            </span>
          </div>
          <p className="text-sm text-[#26251E]/80 mt-0.5 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>

      {/* Hover actions */}
      {isHovered && (
        <div className="absolute -top-3 right-4 flex items-center gap-0.5 rounded-md border border-[#26251E]/10 bg-[#F7F7F4] p-0.5 shadow-sm">
          <Tooltip>
            <TooltipTrigger
              render={<Button
                variant="ghost"
                size="icon-xs"
                className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
              />}
            >
              <ArrowBendUpLeftIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={<Button
                variant="ghost"
                size="icon-xs"
                className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
              />}
            >
              <ShareIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={<Button
                variant="ghost"
                size="icon-xs"
                className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
              />}
            >
              <SmileyIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Add reaction</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={<DropdownMenuTrigger
                  render={<Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
                  />}
                />}
              >
                <DotsThreeIcon className="size-3.5" weight="bold" />
              </TooltipTrigger>
              <TooltipContent>More options</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>
                <CopyIcon className="size-4" />
                Copy text
              </DropdownMenuItem>
              <DropdownMenuItem>
                <PushPinIcon className="size-4" />
                Pin message
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BookmarkIcon className="size-4" />
                Save message
              </DropdownMenuItem>
              <DropdownMenuItem>
                <PencilIcon className="size-4" />
                Edit message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <TrashIcon className="size-4" />
                Delete message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [messages])

  return (
    <div ref={scrollRef} className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex flex-col justify-end min-h-full py-4">
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

