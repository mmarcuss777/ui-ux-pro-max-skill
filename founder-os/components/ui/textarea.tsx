import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[72px] w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-base md:text-[15px] shadow-sm transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
