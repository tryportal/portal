"use client"

import { cn } from "@/lib/utils"

interface OPBadgeProps {
  className?: string
}

/**
 * Original Poster badge - shown next to the post author's name in comments
 */
export function OPBadge({ className }: OPBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[0.625rem] font-semibold",
        "bg-primary/10 text-primary border border-primary/20",
        className
      )}
    >
      OP
    </span>
  )
}
