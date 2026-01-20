"use client"

import { cn } from "@/lib/utils"
import { CheckCircleIcon, LockIcon, CircleIcon } from "@phosphor-icons/react"

type PostStatus = "open" | "closed" | "solved"

interface PostStatusBadgeProps {
  status: PostStatus
  className?: string
  showIcon?: boolean
  size?: "sm" | "md"
}

const statusConfig: Record<PostStatus, {
  label: string
  className: string
  icon: React.ElementType
}> = {
  open: {
    label: "Open",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CircleIcon,
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-border",
    icon: LockIcon,
  },
  solved: {
    label: "Solved",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    icon: CheckCircleIcon,
  },
}

export function PostStatusBadge({
  status,
  className,
  showIcon = true,
  size = "sm",
}: PostStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[0.625rem]" : "px-2.5 py-1 text-xs",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={cn(size === "sm" ? "size-3" : "size-3.5")} weight="fill" />}
      {config.label}
    </span>
  )
}
