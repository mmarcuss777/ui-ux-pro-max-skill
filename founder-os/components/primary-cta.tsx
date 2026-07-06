import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The single filled-navy action allowed per page (design rule:
// exactly one primary CTA; everything else is secondary/ghost).
export function PrimaryCta({ className, ...props }: ButtonProps) {
  return <Button {...props} className={cn("h-11 px-6", className)} />
}
