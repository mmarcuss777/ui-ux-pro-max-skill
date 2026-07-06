"use client"

import { useRouter } from "next/navigation"
import { ExitIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()
  const d = useT()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full"
      aria-label={d.nav.logout}
      onClick={handleLogout}
    >
      <ExitIcon className="h-4 w-4" />
    </Button>
  )
}
