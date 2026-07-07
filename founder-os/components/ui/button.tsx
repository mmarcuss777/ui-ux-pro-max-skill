import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        // Primary action: solid ink, cream text. Maximum contrast, obviously
        // clickable. Gold is reserved for accents and selected states.
        default:
          "bg-ink text-paper font-semibold shadow-[0_8px_20px_-8px_rgba(28,23,16,0.55)] hover:bg-ink/90 disabled:bg-line disabled:text-muted-foreground disabled:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 disabled:opacity-50",
        outline:
          "border border-black/[0.09] bg-white shadow-sm hover:bg-secondary hover:text-accent-foreground disabled:opacity-50",
        secondary:
          "bg-black/[0.05] text-secondary-foreground shadow-sm hover:bg-black/[0.08] disabled:opacity-50",
        ghost: "hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
