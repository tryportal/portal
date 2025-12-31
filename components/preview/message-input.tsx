"use client"

import * as React from "react"
import { useAction } from "convex/react"
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
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MentionAutocomplete, type MentionUser } from "./mention-autocomplete"
import { LinkPreview, LinkPreviewSkeleton, type LinkEmbedData } from "./link-preview"

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
  }>, parentMessageId?: string, linkEmbed?: LinkEmbedData) => void
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

// URL detection regex - matches http(s) URLs
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

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
  const [displayMessage, setDisplayMessage] = React.useState("") // Display value with names
  const [mentionMap, setMentionMap] = React.useState<Record<string, string>>({}) // Map userId -> userName
  const [emojiOpen, setEmojiOpen] = React.useState(false)
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Link embed state
  const [linkEmbed, setLinkEmbed] = React.useState<LinkEmbedData | null>(null)
  const [linkEmbedLoading, setLinkEmbedLoading] = React.useState(false)
  const [fetchedUrls, setFetchedUrls] = React.useState<Set<string>>(new Set())
  const [removedUrls, setRemovedUrls] = React.useState<Set<string>>(new Set())
  const fetchLinkMetadata = useAction(api.messages.fetchLinkMetadata)

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = React.useState(false)
  const dragCounterRef = React.useRef(0)

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

  // Detect URLs and fetch metadata - only when user intent is clear
  React.useEffect(() => {
    const detectAndFetchUrl = async () => {
      // Find URLs in the message
      const urls = message.match(URL_REGEX)
      if (!urls || urls.length === 0) {
        // No URLs found, clear embed if it was from a URL no longer in message
        if (linkEmbed && !message.includes(linkEmbed.url)) {
          setLinkEmbed(null)
        }
        return
      }

      // Only fetch for URLs that appear "complete" - followed by whitespace or at end of message
      const completeUrls = urls.filter((url) => {
        const urlIndex = message.indexOf(url)
        const charAfterUrl = message[urlIndex + url.length]
        // URL is complete if it's followed by whitespace/newline or is at the end
        return !charAfterUrl || /\s/.test(charAfterUrl)
      })

      if (completeUrls.length === 0) return

      // Get the first complete URL that hasn't been fetched or removed
      const urlToFetch = completeUrls.find(
        (url) => !fetchedUrls.has(url) && !removedUrls.has(url)
      )

      if (!urlToFetch) return

      // Mark as fetched to prevent duplicate requests
      setFetchedUrls((prev) => new Set(prev).add(urlToFetch))
      setLinkEmbedLoading(true)

      try {
        const metadata = await fetchLinkMetadata({ url: urlToFetch })
        if (metadata) {
          setLinkEmbed(metadata)
        }
      } catch {
        // Silently fail on fetch errors
      } finally {
        setLinkEmbedLoading(false)
      }
    }

    // Longer debounce to ensure user has finished typing the URL
    const timeoutId = setTimeout(detectAndFetchUrl, 2000)
    return () => clearTimeout(timeoutId)
  }, [message, fetchLinkMetadata, fetchedUrls, removedUrls, linkEmbed])

  // Handle removing link preview
  const handleRemoveLinkEmbed = React.useCallback(() => {
    if (linkEmbed) {
      setRemovedUrls((prev) => new Set(prev).add(linkEmbed.url))
    }
    setLinkEmbed(null)
  }, [linkEmbed])

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
      let embedToSend = linkEmbed

      // If no embed yet, check for complete URLs and fetch metadata before sending
      if (!embedToSend && !linkEmbedLoading) {
        const urls = message.match(URL_REGEX)
        if (urls && urls.length > 0) {
          // Find first complete URL that hasn't been removed
          const completeUrl = urls.find((url) => {
            if (removedUrls.has(url)) return false
            const urlIndex = message.indexOf(url)
            const charAfterUrl = message[urlIndex + url.length]
            return !charAfterUrl || /\s/.test(charAfterUrl)
          })

          if (completeUrl) {
            try {
              const metadata = await fetchLinkMetadata({ url: completeUrl })
              if (metadata) {
                embedToSend = metadata
              }
            } catch {
              // Silently fail on fetch errors
            }
          }
        }
      }

      // Send the backend message (with user IDs)
      onSendMessage(
        message.trim(),
        uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        replyingTo?.messageId,
        embedToSend || undefined
      )
      setMessage("")
      setDisplayMessage("")
      setMentionMap({})
      setAttachments([])
      setLinkEmbed(null)
      setFetchedUrls(new Set())
      setRemovedUrls(new Set())
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

  // Handle pasting images from clipboard
  const handlePaste = React.useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          // Generate a filename for pasted images
          const extension = item.type.split("/")[1] || "png"
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
          const namedFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
            type: file.type,
          })
          imageFiles.push(namedFile)
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault() // Prevent the image from being pasted as text/base64
      await processFiles(imageFiles)
    }
  }, [])

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
    setDisplayMessage(value)

    // Convert display message back to backend format for processing
    // Replace @userName with @userId using the mention map
    // Sort by length (longest first) to prevent partial matches
    let backendValue = value
    const sortedEntries = Object.entries(mentionMap).sort(([, a], [, b]) => b.length - a.length)
    sortedEntries.forEach(([userId, userName]) => {
      const userNamePattern = new RegExp(`@${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
      backendValue = backendValue.replace(userNamePattern, `@${userId}`)
    })

    setMessage(backendValue)
    handleTyping()

    // Check for mention trigger using the display value
    const cursorPos = e.target.selectionStart || 0
    checkMentionTrigger(value, cursorPos)
  }

  const handleMentionSelect = (user: MentionUser) => {
    if (mentionStartPos === null) return

    const beforeMention = message.slice(0, mentionStartPos)
    const afterMention = message.slice(mentionStartPos + 1 + mentionQuery.length)
    const userName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || "User"

    // Backend message uses userId
    const backendMessage = `${beforeMention}@${user.userId} ${afterMention}`
    // Display message uses userName
    const displayMsg = `${beforeMention}@${userName} ${afterMention}`

    // Update mention map
    setMentionMap(prev => ({ ...prev, [user.userId]: userName }))

    setMessage(backendMessage)
    setDisplayMessage(displayMsg)
    setMentionVisible(false)
    setMentionQuery("")
    setMentionStartPos(null)

    // Focus back on textarea
    textareaRef.current?.focus()
  }

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setDisplayMessage((prev) => prev + emoji)
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
      } catch {
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

  // Drag and drop handlers
  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true)
    }
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false)
    }
  }, [])

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = React.useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDraggingOver(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    // Process all file types
    await processFiles(Array.from(files))
  }, [])

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const hasUploadedAttachments = attachments.some(a => a.status === "uploaded")
  const canSend = (message.trim() || hasUploadedAttachments) && !disabled

  return (
    <div 
      className={`border-t border-border bg-background px-4 py-2 shrink-0 relative ${isDraggingOver ? "ring-2 ring-primary ring-inset" : ""}`}
      onClick={(e) => {
        // Focus textarea when clicking blank areas (not interactive elements)
        const target = e.target as HTMLElement
        const isInteractive = target.closest('button, input, textarea, a, [role="button"]')
        if (!isInteractive && textareaRef.current) {
          textareaRef.current.focus()
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-primary pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <FileIcon className="size-8" />
            <span className="text-sm font-medium">Drop files here</span>
          </div>
        </div>
      )}
      {/* Reply indicator */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <ArrowBendUpLeftIcon className="size-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Replying to </span>
            <span className="text-xs font-medium text-foreground">{replyingTo.userName}</span>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground"
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
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${attachment.status === "error"
                ? "border-red-300 bg-red-50"
                : attachment.status === "uploading"
                  ? "border-border bg-muted"
                  : "border-border bg-card"
                }`}
            >
              {attachment.type.startsWith("image/") ? (
                <ImageIcon className="size-4 text-muted-foreground" />
              ) : (
                <FileIcon className="size-4 text-muted-foreground" />
              )}
              <span className="max-w-[120px] truncate text-foreground/70">
                {attachment.name}
              </span>
              <span className="text-muted-foreground">
                {formatFileSize(attachment.size)}
              </span>
              {attachment.status === "uploading" && (
                <SpinnerIcon className="size-3 animate-spin text-muted-foreground" />
              )}
              {attachment.status === "error" && (
                <span className="text-red-500">{attachment.error}</span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="ml-1 rounded p-0.5 hover:bg-secondary"
              >
                <XIcon className="size-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link embed preview */}
      {linkEmbedLoading && (
        <div className="mb-2">
          <LinkPreviewSkeleton onRemove={() => setLinkEmbedLoading(false)} />
        </div>
      )}
      {linkEmbed && !linkEmbedLoading && (
        <div className="mb-2">
          <LinkPreview embed={linkEmbed} onRemove={handleRemoveLinkEmbed} />
        </div>
      )}

      <div 
        className="relative flex flex-col rounded-lg border border-border bg-card shadow-sm"
        onClick={(e) => {
          // Focus textarea when clicking blank areas (not interactive elements)
          const target = e.target as HTMLElement
          const isInteractive = target.closest('button, input, textarea, a, [role="button"]')
          if (!isInteractive && textareaRef.current) {
            textareaRef.current.focus()
          }
        }}
      >
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
            value={displayMessage}
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
            onPaste={handlePaste}
            placeholder={
              disabled && disabledReason
                ? disabledReason
                : isDirectMessage
                  ? `Message ${channelName}`
                  : `Message #${channelName}`
            }
            disabled={disabled}
            className="min-h-[20px] max-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0 shadow-none leading-[20px] disabled:cursor-not-allowed overflow-y-auto"
            rows={1}
            style={{ height: '20px' }}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-1.5 py-1.5">
          {/* Left side buttons */}
          <div className="flex items-center gap-1">
            {/* Attachment button */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 size-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              disabled={disabled}
              title="Add attachment"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusIcon className="size-3.5" />
            </Button>

            {/* Emoji picker */}
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger
                render={<Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 size-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  disabled={disabled}
                  title="Add emoji"
                />}
              >
                <SmileyIcon className="size-3.5" />
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-72 p-3"
              >
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Quick reactions
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Send button - right side */}
          <Button
            onClick={handleSend}
            disabled={!canSend || isUploading}
            size="icon"
            className="size-7 rounded-full bg-foreground/80 text-background hover:bg-foreground disabled:bg-foreground/30 disabled:text-background/50"
            title="Send message"
          >
            <PaperPlaneTiltIcon className="size-3.5" weight="fill" />
          </Button>
        </div>
      </div>
    </div>
  )
}
