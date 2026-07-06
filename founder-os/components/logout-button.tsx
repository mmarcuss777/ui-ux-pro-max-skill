"use client"

import { useRouter } from "next/navigation"
import { ExitIcon } from "@radix-ui/react-icons"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()

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
      className="h-10 w-10"
      aria-label="Log out"
      onClick={handleLogout}
    >
      <ExitIcon className="h-4 w-4" />
    </Button>
  )
}
