import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The single gold action allowed per page — same gold as the Nexa
// wordmark (design rule: exactly one primary CTA; everything else is
// secondary/ghost).
export function PrimaryCta({ className, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      className={cn(
        "gold-fill h-12 px-7 text-[15px] font-semibold text-[#231B06] shadow-gold-glow",
        className
      )}
    />
  )
}
