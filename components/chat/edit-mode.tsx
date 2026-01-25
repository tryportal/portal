"use client"

import { memo, useState, useCallback, useEffect, useRef } from "react"
import { CheckIcon, XIcon } from "@phosphor-icons/react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

/**
 * Edit Mode Component
 * 
 * Renders the inline message editing UI with:
 * - Textarea for content editing
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 * - Save/Cancel buttons
 * 
 * All state is internal - this component receives initial content
 * and calls back when editing is complete.
 */

// =============================================================================
// PROPS
// =============================================================================

interface EditModeProps {
  initialContent: string
  onSave: (newContent: string) => void
  onCancel: () => void
  className?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function EditModeInner({
  initialContent,
  onSave,
  onCancel,
  className,
}: EditModeProps) {
  const [editContent, setEditContent] = useState(initialContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [])

  const canSave = editContent.trim() && editContent !== initialContent

  const handleSave = useCallback(() => {
    if (canSave) {
      onSave(editContent.trim())
    }
  }, [canSave, editContent, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave, onCancel]
  )

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Textarea
        ref={textareaRef}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[80px] text-sm resize-none"
        placeholder="Type your message..."
      />
      
      {/* Keyboard shortcuts hint */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">
            Enter
          </kbd>
          <span>to save</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">
            Esc
          </kbd>
          <span>to cancel</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">
            Shift+Enter
          </kbd>
          <span>for new line</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!canSave}
        >
          <CheckIcon className="size-4 mr-1" />
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
        >
          <XIcon className="size-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

export const EditMode = memo(EditModeInner)
