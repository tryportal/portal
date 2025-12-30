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
  ArrowBendUpLeftIcon,
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
import { MentionAutocomplete, type MentionUser } from "./mention-autocomplete"

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

export interface ReplyingTo {
  messageId: string
  content: string
  userName: string
}

interface MessageInputProps {
  onSendMessage: (message: string, attachments?: Array<{
    storageId: string
    name: string
    size: number
    type: string
  }>, parentMessageId?: string) => void
  channelName: string
  disabled?: boolean
  disabledReason?: string
  onTyping?: () => void
  generateUploadUrl?: () => Promise<string>
  replyingTo?: ReplyingTo | null
  onCancelReply?: () => void
  mentionUsers?: MentionUser[]
  isDirectMessage?: boolean
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
  replyingTo,
  onCancelReply,
  mentionUsers = [],
  isDirectMessage = false,
}: MessageInputProps) {
  const [message, setMessage] = React.useState("")
  const [emojiOpen, setEmojiOpen] = React.useState(false)
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Mention autocomplete state
  const [mentionVisible, setMentionVisible] = React.useState(false)
  const [mentionQuery, setMentionQuery] = React.useState("")
  const [mentionSelectedIndex, setMentionSelectedIndex] = React.useState(0)
  const [mentionStartPos, setMentionStartPos] = React.useState<number | null>(null)

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
      onSendMessage(
        message.trim(), 
        uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        replyingTo?.messageId
      )
      setMessage("")
      setAttachments([])
      onCancelReply?.()
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '20px'
      }
      textareaRef.current?.focus()
    }
  }

  // Check for mention trigger
  const checkMentionTrigger = (value: string, cursorPos: number) => {
    // Look backwards from cursor to find @
    let startPos = cursorPos - 1
    while (startPos >= 0) {
      const char = value[startPos]
      if (char === "@") {
        // Check if @ is at start or preceded by whitespace
        if (startPos === 0 || /\s/.test(value[startPos - 1])) {
          const query = value.slice(startPos + 1, cursorPos)
          // Only show autocomplete if query doesn't contain whitespace
          if (!/\s/.test(query)) {
            setMentionVisible(true)
            setMentionQuery(query)
            setMentionStartPos(startPos)
            setMentionSelectedIndex(0)
            return
          }
        }
        break
      }
      if (/\s/.test(char)) {
        break
      }
      startPos--
    }
    setMentionVisible(false)
    setMentionQuery("")
    setMentionStartPos(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention autocomplete navigation
    if (mentionVisible) {
      const filteredUsers = mentionUsers.filter((user) => {
        if (!mentionQuery) return true
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase()
        return fullName.includes(mentionQuery.toLowerCase())
      })

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionSelectedIndex((prev) => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        )
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        )
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (filteredUsers.length > 0) {
          e.preventDefault()
          handleMentionSelect(filteredUsers[mentionSelectedIndex])
          return
        }
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setMentionVisible(false)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    handleTyping()

    // Check for mention trigger
    const cursorPos = e.target.selectionStart || 0
    checkMentionTrigger(value, cursorPos)
  }

  const handleMentionSelect = (user: MentionUser) => {
    if (mentionStartPos === null) return

    const beforeMention = message.slice(0, mentionStartPos)
    const afterMention = message.slice(mentionStartPos + 1 + mentionQuery.length)
    const newMessage = `${beforeMention}@${user.userId} ${afterMention}`
    
    setMessage(newMessage)
    setMentionVisible(false)
    setMentionQuery("")
    setMentionStartPos(null)
    
    // Focus back on textarea
    textareaRef.current?.focus()
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
    <div className="border-t border-[#26251E]/10 bg-[#F7F7F4] px-4 py-2 shrink-0">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#26251E]/10 bg-white px-3 py-2">
          <ArrowBendUpLeftIcon className="size-4 text-[#26251E]/40" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-[#26251E]/50">Replying to </span>
            <span className="text-xs font-medium text-[#26251E]">{replyingTo.userName}</span>
            <p className="text-xs text-[#26251E]/60 truncate">{replyingTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCancelReply}
            className="text-[#26251E]/40 hover:text-[#26251E]"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}

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

      <div className="relative flex flex-col rounded-xl border border-[#26251E]/15 bg-white shadow-sm">
        {/* Mention autocomplete */}
        <MentionAutocomplete
          users={mentionUsers}
          searchQuery={mentionQuery}
          onSelect={handleMentionSelect}
          visible={mentionVisible}
          selectedIndex={mentionSelectedIndex}
          onSelectedIndexChange={setMentionSelectedIndex}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Message input area - top section */}
        <div className="px-3 pt-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              handleInputChange(e)
              // Auto-resize textarea
              const textarea = e.target
              textarea.style.height = 'auto'
              const lineHeight = 20
              const maxLines = 3
              const maxHeight = lineHeight * maxLines
              textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled && disabledReason
                ? disabledReason
                : isDirectMessage
                  ? `Message ${channelName}`
                  : `Message #${channelName}`
            }
            disabled={disabled}
            className="min-h-[20px] max-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-sm text-[#26251E] placeholder:text-[#26251E]/40 focus-visible:ring-0 focus-visible:border-0 shadow-none leading-[20px] disabled:cursor-not-allowed overflow-y-auto"
            rows={1}
            style={{ height: '20px' }}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-1.5 py-1.5">
          {/* Left side buttons */}
          <div className="flex items-center gap-1">
            {/* Attachment button */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={<DropdownMenuTrigger
                    render={<Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 size-7 rounded-md border border-[#26251E]/10 text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5"
                      disabled={disabled}
                    />}
                  />}
                >
                  <PlusIcon className="size-3.5" />
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

            {/* Emoji picker */}
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <Tooltip>
                <TooltipTrigger
                  render={<PopoverTrigger
                    render={<Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-md border border-[#26251E]/10 text-[#26251E]/60 hover:text-[#26251E] hover:bg-[#26251E]/5 gap-1 px-2"
                      disabled={disabled}
                    />}
                  />}
                >
                  <SmileyIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top">Add emoji</TooltipContent>
              </Tooltip>
              <PopoverContent
                side="top"
                align="start"
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
          </div>

          {/* Send button - right side */}
          <Tooltip>
            <TooltipTrigger
              render={<Button
                onClick={handleSend}
                disabled={!canSend || isUploading}
                size="icon"
                className="size-7 rounded-full bg-[#26251E]/80 text-[#F7F7F4] hover:bg-[#26251E] disabled:bg-[#26251E]/30 disabled:text-[#F7F7F4]/50"
              />}
            >
              <PaperPlaneTiltIcon className="size-3.5" weight="fill" />
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
