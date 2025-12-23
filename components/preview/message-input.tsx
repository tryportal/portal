"use client"

import * as React from "react"
import {
  PlusIcon,
  SmileyIcon,
  PaperPlaneTiltIcon,
  FileIcon,
  ImageIcon,
  XIcon,
  SpinnerIcon,
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

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

export interface PendingAttachment {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: "pending" | "uploading" | "uploaded" | "error"
  storageId?: string
  error?: string
}

interface MessageInputProps {
  onSendMessage: (message: string, attachments?: Array<{
    storageId: string
    name: string
    size: number
    type: string
  }>) => void
  channelName: string
  disabled?: boolean
  disabledReason?: string
  onTyping?: () => void
  generateUploadUrl?: () => Promise<string>
}

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
  "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘",
  "👍", "👎", "👏", "🙌", "🤝", "💪", "✨", "🔥",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "🎉", "🎊", "🎈", "🎁", "🏆", "⭐", "💡", "📌",
]

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function MessageInput({ 
  onSendMessage, 
  channelName, 
  disabled,
  disabledReason,
  onTyping,
  generateUploadUrl,
}: MessageInputProps) {
  const [message, setMessage] = React.useState("")
  const [emojiOpen, setEmojiOpen] = React.useState(false)
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Debounced typing indicator
  const handleTyping = React.useCallback(() => {
    if (!onTyping) return
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Trigger typing
    onTyping()
    
    // Set new timeout to stop triggering after 500ms of no input
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null
    }, 500)
  }, [onTyping])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleSend = async () => {
    const uploadedAttachments = attachments
      .filter(a => a.status === "uploaded" && a.storageId)
      .map(a => ({
        storageId: a.storageId!,
        name: a.name,
        size: a.size,
        type: a.type,
      }))

    if (message.trim() || uploadedAttachments.length > 0) {
      onSendMessage(message.trim(), uploadedAttachments.length > 0 ? uploadedAttachments : undefined)
      setMessage("")
      setAttachments([])
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    handleTyping()
  }

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setEmojiOpen(false)
    textareaRef.current?.focus()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    await processFiles(Array.from(files))
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const processFiles = async (files: File[]) => {
    if (!generateUploadUrl) return

    const newAttachments: PendingAttachment[] = []

    for (const file of files) {
      const id = crypto.randomUUID()
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        newAttachments.push({
          id,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
          error: "File exceeds 5MB limit",
        })
        continue
      }

      newAttachments.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "pending",
      })
    }

    setAttachments(prev => [...prev, ...newAttachments])

    // Upload each pending file
    setIsUploading(true)
    for (const attachment of newAttachments) {
      if (attachment.status !== "pending") continue

      // Update status to uploading
      setAttachments(prev => prev.map(a => 
        a.id === attachment.id ? { ...a, status: "uploading" as const } : a
      ))

      try {
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": attachment.file.type },
          body: attachment.file,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const { storageId } = await response.json()

        // Update status to uploaded
        setAttachments(prev => prev.map(a => 
          a.id === attachment.id 
            ? { ...a, status: "uploaded" as const, storageId } 
            : a
        ))
      } catch (error) {
        // Update status to error
        setAttachments(prev => prev.map(a => 
          a.id === attachment.id 
            ? { ...a, status: "error" as const, error: "Upload failed" } 
            : a
        ))
      }
    }
    setIsUploading(false)
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const hasUploadedAttachments = attachments.some(a => a.status === "uploaded")
  const canSend = (message.trim() || hasUploadedAttachments) && !disabled

  return (
    <div className="border-t border-[#26251E]/10 bg-[#F7F7F4] px-3 py-2">
      {/* Pending attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                attachment.status === "error"
                  ? "border-red-300 bg-red-50"
                  : attachment.status === "uploading"
                  ? "border-[#26251E]/20 bg-[#26251E]/5"
                  : "border-[#26251E]/10 bg-white"
              }`}
            >
              {attachment.type.startsWith("image/") ? (
                <ImageIcon className="size-4 text-[#26251E]/50" />
              ) : (
                <FileIcon className="size-4 text-[#26251E]/50" />
              )}
              <span className="max-w-[120px] truncate text-[#26251E]/70">
                {attachment.name}
              </span>
              <span className="text-[#26251E]/40">
                {formatFileSize(attachment.size)}
              </span>
              {attachment.status === "uploading" && (
                <SpinnerIcon className="size-3 animate-spin text-[#26251E]/50" />
              )}
              {attachment.status === "error" && (
                <span className="text-red-500">{attachment.error}</span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="ml-1 rounded p-0.5 hover:bg-[#26251E]/10"
              >
                <XIcon className="size-3 text-[#26251E]/50" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-lg border border-[#26251E]/15 bg-white p-1 shadow-sm">
        {/* Attachment button */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={<DropdownMenuTrigger
                render={<Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-[#26251E]/50 hover:text-[#26251E] hover:bg-[#26251E]/5"
                  disabled={disabled}
                />}
              />}
            >
              <PlusIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="top">Add attachment</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FileIcon className="size-4" />
              Upload file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="size-4" />
              Upload image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled && disabledReason
              ? disabledReason
              : `Message #${channelName}`
          }
          disabled={disabled}
          className="min-h-[32px] max-h-[100px] flex-1 resize-none border-0 bg-transparent py-1.5 px-2 text-sm text-[#26251E] placeholder:text-[#26251E]/40 focus-visible:ring-0 focus-visible:border-0 shadow-none leading-[20px] disabled:cursor-not-allowed"
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
                    disabled={disabled}
                  />}
                />}
              >
                <SmileyIcon className="size-4" />
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
                disabled={!canSend || isUploading}
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

