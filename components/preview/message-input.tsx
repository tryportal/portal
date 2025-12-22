"use client"

import * as React from "react"
import {
  PlusIcon,
  SmileyIcon,
  PaperPlaneTiltIcon,
  FileIcon,
  LinkIcon,
  ImageIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MessageInputProps {
  onSendMessage: (message: string) => void
  channelName: string
}

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
  "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘",
  "👍", "👎", "👏", "🙌", "🤝", "💪", "✨", "🔥",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "🎉", "🎊", "🎈", "🎁", "🏆", "⭐", "💡", "📌",
]

export function MessageInput({ onSendMessage, channelName }: MessageInputProps) {
  const [message, setMessage] = React.useState("")
  const [emojiOpen, setEmojiOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage("")
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setEmojiOpen(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="border-t border-[#26251E]/10 bg-[#F7F7F4] p-4">
      <div className="flex items-center gap-2 rounded-xl border border-[#26251E]/15 bg-white p-2 shadow-sm">
        {/* Attachment button */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={<DropdownMenuTrigger
                render={<Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-[#26251E]/50 hover:text-[#26251E] hover:bg-[#26251E]/5"
                />}
              />}
            >
              <PlusIcon className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="top">Add attachment</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem>
              <FileIcon className="size-4" />
              Upload file
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ImageIcon className="size-4" />
              Upload image
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LinkIcon className="size-4" />
              Add link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          className="min-h-[40px] max-h-[120px] flex-1 resize-none border-0 bg-transparent py-2.5 px-2 text-base text-[#26251E] placeholder:text-[#26251E]/40 focus-visible:ring-0 focus-visible:border-0 shadow-none"
          rows={1}
        />

        {/* Right side buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Emoji picker */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <Tooltip>
              <TooltipTrigger
                render={<PopoverTrigger
                  render={<Button
                    variant="ghost"
                    size="icon"
                    className="text-[#26251E]/50 hover:text-[#26251E] hover:bg-[#26251E]/5"
                  />}
                />}
              >
                <SmileyIcon className="size-5" />
              </TooltipTrigger>
              <TooltipContent side="top">Add emoji</TooltipContent>
            </Tooltip>
            <PopoverContent
              side="top"
              align="end"
              className="w-72 p-3"
            >
              <div className="mb-2 text-xs font-medium text-[#26251E]/60">
                Quick reactions
              </div>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-[#26251E]/5 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Send button */}
          <Tooltip>
            <TooltipTrigger
              render={<Button
                onClick={handleSend}
                disabled={!message.trim()}
                size="icon"
                className="bg-[#26251E] text-[#F7F7F4] hover:bg-[#26251E]/80 disabled:opacity-30"
              />}
            >
              <PaperPlaneTiltIcon className="size-4" weight="fill" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="text-xs">
                Send message
                <div className="mt-1 text-[10px] text-[#26251E]/60">
                  Press <kbd className="rounded bg-[#26251E]/10 px-1 py-0.5 font-mono">Enter</kbd> to send, <kbd className="rounded bg-[#26251E]/10 px-1 py-0.5 font-mono">Shift + Enter</kbd> for new line
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

