import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The single gradient-filled action allowed per page (design rule:
// exactly one primary CTA; everything else is secondary/ghost).
export function PrimaryCta({ className, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      className={cn(
        "h-11 border-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-white shadow-lg shadow-violet-950/50 transition hover:opacity-90",
        className
      )}
    />
  )
}
