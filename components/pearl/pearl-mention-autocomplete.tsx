"use client"

import * as React from "react"
import { UserIcon, HashIcon, TrayIcon } from "@phosphor-icons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

// ============================================================================
// Types
// ============================================================================

export interface PearlMentionItem {
  type: "user" | "channel" | "inbox"
  id: string
  name: string
  imageUrl?: string | null
  description?: string
}

interface PearlMentionAutocompleteProps {
  items: PearlMentionItem[]
  searchQuery: string
  mentionType: "@" | "#"
  onSelect: (item: PearlMentionItem) => void
  visible: boolean
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
}

// ============================================================================
// Component
// ============================================================================

export function PearlMentionAutocomplete({
  items,
  searchQuery,
  mentionType,
  onSelect,
  visible,
  selectedIndex,
  onSelectedIndexChange,
}: PearlMentionAutocompleteProps) {
  const listRef = React.useRef<HTMLDivElement>(null)

  // Filter items based on mention type and search query
  const filteredItems = React.useMemo(() => {
    // Filter by mention type first
    let typeFiltered: PearlMentionItem[]
    
    if (mentionType === "@") {
      // For @ mentions: show inbox and users
      typeFiltered = items.filter((item) => item.type === "user" || item.type === "inbox")
    } else {
      // For # mentions: show channels only
      typeFiltered = items.filter((item) => item.type === "channel")
    }

    // Then filter by search query
    if (!searchQuery) return typeFiltered
    
    const query = searchQuery.toLowerCase()
    return typeFiltered.filter((item) => {
      return item.name.toLowerCase().includes(query)
    })
  }, [items, searchQuery, mentionType])

  // Sort: inbox first, then alphabetically
  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      // Inbox always first for @ mentions
      if (a.type === "inbox") return -1
      if (b.type === "inbox") return 1
      // Then alphabetically by name
      return a.name.localeCompare(b.name)
    })
  }, [filteredItems])

  // Scroll selected item into view
  React.useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.querySelectorAll("[data-mention-item]")
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex])

  if (!visible || sortedItems.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50">
      <ScrollArea className="max-h-48">
        <div ref={listRef} className="py-1">
          {sortedItems.map((item, index) => {
            const initials = item.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            return (
              <button
                key={`${item.type}-${item.id}`}
                data-mention-item
                onClick={() => onSelect(item)}
                onMouseEnter={() => onSelectedIndexChange(index)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-muted"
                    : "hover:bg-muted/50"
                }`}
              >
                {/* Icon/Avatar based on type */}
                {item.type === "inbox" ? (
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                    <TrayIcon className="size-3.5 text-primary" weight="fill" />
                  </div>
                ) : item.type === "channel" ? (
                  <div className="flex size-6 items-center justify-center rounded-full bg-secondary">
                    <HashIcon className="size-3.5 text-foreground" weight="bold" />
                  </div>
                ) : (
                  <Avatar className="size-6">
                    {item.imageUrl && (
                      <AvatarImage src={item.imageUrl} alt={item.name} />
                    )}
                    <AvatarFallback className="text-[10px] bg-secondary text-foreground">
                      {initials || <UserIcon className="size-3" />}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Name and description */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {item.type === "channel" ? `#${item.name}` : item.name}
                  </span>
                  {item.description && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
