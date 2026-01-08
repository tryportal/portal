"use client"

import * as React from "react"
import {
  TextBolderIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TextStrikethroughIcon,
  CodeIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextHThreeIcon,
  LinkIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export interface FormattingAction {
  icon: React.ReactNode
  label: string
  prefix: string
  suffix: string
  blockLevel?: boolean // If true, applies to whole line(s)
}

const formattingActions: FormattingAction[] = [
  { icon: <TextBolderIcon className="size-3.5" weight="bold" />, label: "Bold", prefix: "**", suffix: "**" },
  { icon: <TextItalicIcon className="size-3.5" />, label: "Italic", prefix: "*", suffix: "*" },
  { icon: <TextUnderlineIcon className="size-3.5" />, label: "Underline", prefix: "<u>", suffix: "</u>" },
  { icon: <TextStrikethroughIcon className="size-3.5" />, label: "Strikethrough", prefix: "~~", suffix: "~~" },
  { icon: <CodeIcon className="size-3.5" />, label: "Code", prefix: "`", suffix: "`" },
  { icon: <TextHOneIcon className="size-3.5" />, label: "Heading 1", prefix: "# ", suffix: "", blockLevel: true },
  { icon: <TextHTwoIcon className="size-3.5" />, label: "Heading 2", prefix: "## ", suffix: "", blockLevel: true },
  { icon: <TextHThreeIcon className="size-3.5" />, label: "Heading 3", prefix: "### ", suffix: "", blockLevel: true },
  { icon: <QuotesIcon className="size-3.5" />, label: "Quote", prefix: "> ", suffix: "", blockLevel: true },
  { icon: <ListBulletsIcon className="size-3.5" />, label: "Bullet List", prefix: "- ", suffix: "", blockLevel: true },
  { icon: <ListNumbersIcon className="size-3.5" />, label: "Numbered List", prefix: "1. ", suffix: "", blockLevel: true },
  { icon: <LinkIcon className="size-3.5" />, label: "Link", prefix: "[", suffix: "](url)" },
]

interface FormattingToolbarProps {
  visible: boolean
  position: { x: number; y: number }
  onFormat: (action: FormattingAction) => void
  onClose: () => void
}

export function FormattingToolbar({
  visible,
  position,
  onFormat,
  onClose,
}: FormattingToolbarProps) {
  const toolbarRef = React.useRef<HTMLDivElement>(null)

  // Close toolbar when clicking outside
  React.useEffect(() => {
    if (!visible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Use a small timeout to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        transform: "translateX(-50%) translateY(-100%)",
      }}
    >
      {formattingActions.map((action, index) => (
        <Button
          key={action.label}
          variant="ghost"
          size="icon-xs"
          className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onFormat(action)
          }}
          title={action.label}
        >
          {action.icon}
        </Button>
      ))}
    </div>
  )
}

export { formattingActions }
