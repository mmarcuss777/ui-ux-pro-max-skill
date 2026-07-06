import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The single gradient-filled action allowed per page (design rule:
// exactly one primary CTA; everything else is secondary/ghost).
export function PrimaryCta({ className, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      className={cn(
        "gold-fill h-11 px-6 font-semibold shadow-lg shadow-gold/25 transition hover:opacity-90",
        className
      )}
    />
  )
}
