"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface ContextMenuProps {
  children: React.ReactNode
  content: React.ReactNode
}

interface ContextMenuState {
  open: boolean
  x: number
  y: number
}

function ContextMenu({ children, content }: ContextMenuProps) {
  const [state, setState] = React.useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
  })
  const [positioned, setPositioned] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setPositioned(false)
      setState({ open: true, x: e.clientX, y: e.clientY })
    },
    []
  )

  // After mount, measure and adjust position, then reveal
  React.useLayoutEffect(() => {
    if (!state.open || !menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    let x = state.x
    let y = state.y

    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 4
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 4
    }
    if (x < 0) x = 4
    if (y < 0) y = 4

    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
    setPositioned(true)
  }, [state])

  React.useEffect(() => {
    if (!state.open) return

    const close = () => setState((s) => ({ ...s, open: false }))

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }

    const handleScroll = () => close()
    const handleContextMenu = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }

    // Delay adding click listener to avoid immediately closing
    requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick)
      document.addEventListener("contextmenu", handleContextMenu)
    })
    document.addEventListener("keydown", handleKey)
    window.addEventListener("scroll", handleScroll, true)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKey)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [state.open])

  const close = React.useCallback(
    () => setState((s) => ({ ...s, open: false })),
    []
  )

  return (
    <>
      <div onContextMenu={handleContextMenu} className="contents">
        {children}
      </div>
      {state.open &&
        createPortal(
          <div
            ref={menuRef}
            className={cn(
              "fixed z-50 ring-foreground/10 bg-popover text-popover-foreground min-w-48 shadow-md ring-1 overflow-hidden",
              positioned
                ? "animate-in fade-in-0 zoom-in-95 duration-100"
                : "opacity-0"
            )}
            style={{ left: state.x, top: state.y }}
          >
            <ContextMenuContext.Provider value={{ close }}>
              {content}
            </ContextMenuContext.Provider>
          </div>,
          document.body
        )}
    </>
  )
}

const ContextMenuContext = React.createContext<{ close: () => void }>({
  close: () => {},
})

function ContextMenuItem({
  className,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & { onClick?: () => void }) {
  const { close } = React.useContext(ContextMenuContext)

  return (
    <button
      className={cn(
        "focus:bg-accent focus:text-accent-foreground gap-2 px-2 py-2 text-xs not-data-[variant=destructive]:focus:**:text-accent-foreground relative flex w-full cursor-default items-center outline-hidden select-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      onClick={() => {
        onClick?.()
        close()
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function ContextMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("bg-border -mx-1 h-px", className)} />
}

export { ContextMenu, ContextMenuItem, ContextMenuSeparator }
