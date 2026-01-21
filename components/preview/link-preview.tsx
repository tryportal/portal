"use client"

import * as React from "react"
import { XIcon, LinkIcon, GlobeIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface LinkEmbedData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

interface LinkPreviewProps {
  embed: LinkEmbedData
  onRemove?: () => void
  className?: string
  compact?: boolean
}

// Memoized LinkPreview to prevent unnecessary re-renders during scroll/hover
function LinkPreviewComponent({ 
  embed, 
  onRemove, 
  className, 
  compact = false 
}: LinkPreviewProps) {
  // Use refs to track error state to avoid re-renders during scroll
  // Only use state for the initial render decision
  const [imageError, setImageError] = React.useState(false)
  const [faviconError, setFaviconError] = React.useState(false)
  
  // Prevent error state updates after unmount
  const isMountedRef = React.useRef(true)
  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const hostname = React.useMemo(() => {
    try {
      return new URL(embed.url).hostname.replace("www.", "")
    } catch {
      return embed.siteName || "Link"
    }
  }, [embed.url, embed.siteName])

  const handleClick = React.useCallback(() => {
    window.open(embed.url, "_blank", "noopener,noreferrer")
  }, [embed.url])

  // Stable error handlers that check mount status
  const handleImageError = React.useCallback(() => {
    if (isMountedRef.current) {
      setImageError(true)
    }
  }, [])

  const handleFaviconError = React.useCallback(() => {
    if (isMountedRef.current) {
      setFaviconError(true)
    }
  }, [])

  if (compact) {
    return (
      <div className={cn("group relative", className)}>
        <button
          onClick={handleClick}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted w-full"
        >
          {embed.favicon && !faviconError ? (
            // Use native img to avoid Next.js Image lazy loading issues in scroll containers
            <img
              src={embed.favicon}
              alt=""
              width={16}
              height={16}
              className="rounded-sm flex-shrink-0 size-4 object-contain"
              onError={handleFaviconError}
              loading="eager"
              decoding="async"
            />
          ) : (
            <GlobeIcon className="size-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-sm text-foreground truncate">
            {embed.title || hostname}
          </span>
          <LinkIcon className="size-3 text-muted-foreground flex-shrink-0 ml-auto" />
        </button>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <XIcon className="size-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn("group relative", className)}>
      <button
        onClick={handleClick}
        className="flex rounded-lg border border-border bg-card overflow-hidden text-left transition-colors hover:bg-muted w-full"
      >
        {/* Image preview - use native img to avoid lazy loading issues */}
        {embed.image && !imageError && (
          <div className="relative w-24 h-24 flex-shrink-0 bg-muted overflow-hidden">
            <img
              src={embed.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={handleImageError}
              loading="eager"
              decoding="async"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 p-3">
          {/* Site info */}
          <div className="flex items-center gap-1.5 mb-1">
            {embed.favicon && !faviconError ? (
              <img
                src={embed.favicon}
                alt=""
                width={14}
                height={14}
                className="rounded-sm size-3.5 object-contain"
                onError={handleFaviconError}
                loading="eager"
                decoding="async"
              />
            ) : (
              <GlobeIcon className="size-3.5 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground truncate">
              {embed.siteName || hostname}
            </span>
          </div>

          {/* Title */}
          {embed.title && (
            <p className="text-sm font-medium text-foreground line-clamp-1 mb-0.5">
              {embed.title}
            </p>
          )}

          {/* Description */}
          {embed.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {embed.description}
            </p>
          )}
        </div>
      </button>

      {/* Remove button */}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </div>
  )
}

// Export the memoized component
export const LinkPreview = React.memo(LinkPreviewComponent)

// Loading state component
export function LinkPreviewSkeleton({ onRemove }: { onRemove?: () => void }) {
  return (
    <div className="group relative">
      <div className="flex rounded-lg border border-border bg-card overflow-hidden w-full animate-pulse">
        <div className="w-24 h-24 flex-shrink-0 bg-muted" />
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="size-3.5 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted mb-1" />
          <div className="h-3 w-full rounded bg-muted" />
        </div>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </div>
  )
}

