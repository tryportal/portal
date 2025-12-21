import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "bg-primary/5 border-transparent focus-visible:border-primary/20 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder:text-primary/40 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
