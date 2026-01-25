"use client"

import { memo } from "react"

/**
 * Date Separator
 * 
 * A simple horizontal line with a date label.
 * Memoized since the date string is the only prop and rarely changes.
 */

interface DateSeparatorProps {
  date: string
}

function DateSeparatorInner({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center my-4 px-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/60 min-w-[60px]" />
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap px-1">
          {date}
        </span>
        <div className="flex-1 h-px bg-border/60 min-w-[60px]" />
      </div>
    </div>
  )
}

export const DateSeparator = memo(DateSeparatorInner)
