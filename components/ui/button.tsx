import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium focus-visible:ring-[2px] aria-invalid:ring-[2px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-primary/10 bg-transparent hover:bg-primary/5 hover:text-primary",
        secondary: "bg-primary/10 text-primary hover:bg-primary/20",
        ghost: "text-primary/70 hover:bg-primary/5 hover:text-primary",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-7 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-5 gap-1 rounded-sm px-2 text-[0.625rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-6 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-8 gap-1 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-5 rounded-sm [&_svg:not([class*='size-'])]:size-2.5",
        "icon-sm": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-8 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  React.ElementRef<typeof ButtonPrimitive>,
  ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
