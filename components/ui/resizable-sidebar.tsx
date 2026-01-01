"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ResizableSidebarProps {
  children: React.ReactNode
  storageKey: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  className?: string
  /** Additional class names for the resize handle */
  handleClassName?: string
}

export function ResizableSidebar({
  children,
  storageKey,
  defaultWidth = 240,
  minWidth = 180,
  maxWidth = 400,
  className,
  handleClassName,
}: ResizableSidebarProps) {
  const [width, setWidth] = React.useState(defaultWidth)
  const [isResizing, setIsResizing] = React.useState(false)
  const sidebarRef = React.useRef<HTMLDivElement>(null)

  // Load saved width from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(storageKey)
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10)
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          setWidth(parsed)
        }
      }
    }
  }, [storageKey, minWidth, maxWidth])

  // Save width to localStorage when it changes
  React.useEffect(() => {
    if (!isResizing && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, width.toString())
    }
  }, [width, storageKey, isResizing])

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
    },
    []
  )

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return

      // Calculate width relative to the sidebar's left position
      const rect = sidebarRef.current.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth)
      } else if (newWidth < minWidth) {
        setWidth(minWidth)
      } else if (newWidth > maxWidth) {
        setWidth(maxWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      // Prevent text selection while dragging
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }
  }, [isResizing, minWidth, maxWidth])

  return (
    <div
      ref={sidebarRef}
      className={cn("relative hidden sm:flex flex-col", className)}
      style={{ width }}
    >
      {children}
      {/* Resize handle - only visible on desktop (hidden on mobile via parent's hidden sm:flex) */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute right-0 top-0 h-full w-1 cursor-col-resize group z-10",
          "hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30",
          handleClassName
        )}
      >
        {/* Visual indicator line */}
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-px bg-transparent transition-colors",
            "group-hover:bg-primary/50",
            isResizing && "bg-primary"
          )}
        />
      </div>
    </div>
  )
}
