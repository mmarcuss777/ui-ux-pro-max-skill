import { redirect } from "next/navigation"

// Middleware sends unauthenticated visitors to /login before this runs.
export default function Home() {
  redirect("/dashboard")
}
