"use client"

import * as React from "react"
import { CaretDownIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

type AccordionContextValue = {
  value?: string
  onValueChange?: (value: string) => void
  type?: "single" | "multiple"
  collapsible?: boolean
}

const AccordionContext = React.createContext<AccordionContextValue>({})
const ItemContext = React.createContext<string>("")

function Accordion({
  type = "single",
  collapsible = false,
  value: controlledValue,
  onValueChange,
  defaultValue,
  className,
  children,
  ...props
}: {
  type?: "single" | "multiple"
  collapsible?: boolean
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(defaultValue)
  const value = controlledValue ?? uncontrolledValue
  const handleValueChange = onValueChange ?? setUncontrolledValue

  const contextValue = React.useMemo<AccordionContextValue>(
    () => ({
      value,
      onValueChange: handleValueChange,
      type,
      collapsible,
    }),
    [value, handleValueChange, type, collapsible]
  )

  return (
    <AccordionContext.Provider value={contextValue}>
      <div data-slot="accordion" className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

function AccordionItem({
  value,
  className,
  children,
  ...props
}: {
  value: string
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <ItemContext.Provider value={value}>
      <div
        data-slot="accordion-item"
        data-value={value}
        className={cn("border-b last:border-b-0", className)}
        {...props}
      >
        {children}
      </div>
    </ItemContext.Provider>
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: {
  className?: string
  children?: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(AccordionContext)
  const itemValue = React.useContext(ItemContext)
  const isOpen = context.value === itemValue

  const handleClick = () => {
    if (!itemValue) return

    if (context.type === "single") {
      if (isOpen && context.collapsible) {
        context.onValueChange?.("")
      } else if (!isOpen) {
        context.onValueChange?.(itemValue)
      }
    }
  }

  return (
    <button
      type="button"
      data-slot="accordion-trigger"
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
        isOpen && "[&>svg]:rotate-180",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
      <CaretDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
    </button>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: {
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(AccordionContext)
  const itemValue = React.useContext(ItemContext)
  const isOpen = context.value === itemValue

  return (
    <div
      data-slot="accordion-content"
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "overflow-hidden text-sm transition-all duration-200",
        isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
      {...props}
    >
      <div className={cn("pt-0 pb-4")}>{children}</div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

