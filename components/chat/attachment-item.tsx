"use client"

import { memo, useState } from "react"
import {
  FileIcon,
  DownloadSimpleIcon,
  ImageIcon,
  VideoCameraIcon,
  Spinner,
} from "@phosphor-icons/react"
import { formatFileSize, isImageType, isVideoType, type Attachment } from "./utils"
import { useGetAttachmentUrl } from "./message-list-context"

/**
 * Attachment Item
 * 
 * Renders a single attachment (image, video, or file).
 * Uses context to get attachment URLs (batch loaded).
 * Optimized with loading states to prevent layout shifts.
 */

// =============================================================================
// PROPS
// =============================================================================

interface AttachmentItemProps {
  attachment: Attachment
}

// =============================================================================
// IMAGE ATTACHMENT
// =============================================================================

interface ImageAttachmentProps {
  url: string
  name: string
  size: number
}

const ImageAttachment = memo(function ImageAttachment({
  url,
  name,
  size,
}: ImageAttachmentProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-xs rounded-md overflow-hidden border border-border hover:border-border/80 transition-all hover:shadow-sm"
    >
      {/* Fixed aspect ratio container to prevent layout shifts */}
      <div
        className="relative bg-muted/30"
        style={{
          minHeight: loaded ? "auto" : "120px",
          maxHeight: "256px",
        }}
      >
        <img
          src={url}
          alt={name}
          className={`max-h-64 w-auto object-contain transition-opacity duration-150 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
        {/* Loading placeholder */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-5 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 text-xs text-muted-foreground">
        <ImageIcon className="size-3.5 shrink-0" />
        <span className="truncate flex-1 font-medium min-w-0">{name}</span>
        <span className="text-muted-foreground/70 font-medium">
          {formatFileSize(size)}
        </span>
      </div>
    </a>
  )
})

// =============================================================================
// VIDEO ATTACHMENT
// =============================================================================

interface VideoAttachmentProps {
  url: string
  name: string
  size: number
}

const VideoAttachment = memo(function VideoAttachment({
  url,
  name,
  size,
}: VideoAttachmentProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="block max-w-md rounded-md overflow-hidden border border-border hover:border-border/80 transition-all hover:shadow-sm">
      {/* Fixed aspect ratio container for video */}
      <div
        className="relative bg-black"
        style={{
          minHeight: loaded ? "auto" : "180px",
          maxHeight: "320px",
        }}
      >
        <video
          src={url}
          controls
          preload="metadata"
          className={`max-h-80 w-auto transition-opacity duration-150 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoadedMetadata={() => setLoaded(true)}
        >
          Your browser does not support the video tag.
        </video>
        {/* Loading placeholder */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-5 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 text-xs text-muted-foreground">
        <VideoCameraIcon className="size-3.5 shrink-0" />
        <span className="truncate flex-1 font-medium min-w-0">{name}</span>
        <span className="text-muted-foreground/70 font-medium">
          {formatFileSize(size)}
        </span>
        <a
          href={url}
          download={name}
          className="hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <DownloadSimpleIcon className="size-3.5 shrink-0" />
        </a>
      </div>
    </div>
  )
})

// =============================================================================
// FILE ATTACHMENT
// =============================================================================

interface FileAttachmentProps {
  url: string | null
  name: string
  size: number
}

const FileAttachment = memo(function FileAttachment({
  url,
  name,
  size,
}: FileAttachmentProps) {
  // Loading state - no URL yet
  if (!url) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2 opacity-60 cursor-not-allowed max-w-xs"
        aria-disabled="true"
        tabIndex={-1}
        title="Attachment loading..."
      >
        <FileIcon
          className="size-8 text-muted-foreground shrink-0"
          weight="duotone"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate min-w-0">
            {name}
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {formatFileSize(size)}
          </div>
        </div>
        <Spinner className="size-4 text-muted-foreground shrink-0 animate-spin" />
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2 hover:border-border/80 hover:bg-muted/30 transition-all hover:shadow-sm max-w-xs"
    >
      <FileIcon
        className="size-8 text-muted-foreground shrink-0"
        weight="duotone"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate min-w-0">
          {name}
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          {formatFileSize(size)}
        </div>
      </div>
      <DownloadSimpleIcon className="size-4 text-muted-foreground shrink-0" />
    </a>
  )
})

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function AttachmentItemInner({ attachment }: AttachmentItemProps) {
  const getAttachmentUrl = useGetAttachmentUrl()
  const url = getAttachmentUrl(attachment.storageId)
  const isImage = isImageType(attachment.type)
  const isVideo = isVideoType(attachment.type)

  if (isImage && url) {
    return (
      <ImageAttachment url={url} name={attachment.name} size={attachment.size} />
    )
  }

  if (isVideo && url) {
    return (
      <VideoAttachment url={url} name={attachment.name} size={attachment.size} />
    )
  }

  return (
    <FileAttachment url={url} name={attachment.name} size={attachment.size} />
  )
}

export const AttachmentItem = memo(AttachmentItemInner)
