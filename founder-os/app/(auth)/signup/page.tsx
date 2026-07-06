"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { LanguageToggle } from "@/components/language-toggle"
import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const router = useRouter()
  const d = useT()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push("/onboarding")
      router.refresh()
      return
    }

    // Email confirmation is enabled on the Supabase project.
    setMessage(d.auth.checkInbox)
    setLoading(false)
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight text-ink">
            Nexa<span className="text-ok">.</span>
          </CardTitle>
          <CardDescription>
            {d.app.slogan} {d.auth.signupSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{d.auth.email}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{d.auth.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{d.auth.min8}</p>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            {message && <p className="text-sm text-ok">{message}</p>}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? d.auth.signingUp : d.auth.signUp}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            {d.auth.haveAccount}{" "}
            <Link href="/login" className="font-medium text-ink underline">
              {d.auth.logIn}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
