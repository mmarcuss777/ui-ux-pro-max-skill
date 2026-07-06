import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The single gradient-filled action allowed per page (design rule:
// exactly one primary CTA; everything else is secondary/ghost).
export function PrimaryCta({ className, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      className={cn(
        "h-12 px-7 text-[15px]",
        className
      )}
    />
  )
}
