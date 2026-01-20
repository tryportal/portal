"use client"

import { cn } from "@/lib/utils"
import { CheckCircleIcon } from "@phosphor-icons/react"

interface SolvedBadgeProps {
  className?: string
  showLabel?: boolean
}

/**
 * Badge shown on the accepted answer comment
 */
export function SolvedBadge({ className, showLabel = true }: SolvedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium",
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
        className
      )}
    >
      <CheckCircleIcon className="size-3" weight="fill" />
      {showLabel && "Accepted Answer"}
    </span>
  )
}
