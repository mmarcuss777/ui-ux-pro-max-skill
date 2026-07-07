import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/db"

// Service-role client — server routes only. Required for
// integration_secrets, which has no user-facing RLS policy by design.
export function createAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
