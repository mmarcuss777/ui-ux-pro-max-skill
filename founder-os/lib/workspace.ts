import { cookies } from "next/headers"

import { createClient } from "@/lib/supabase/server"
import type { Workspace } from "@/types/db"

// Client components set this cookie directly (it only holds a workspace id;
// row level security protects the data itself).
export const WORKSPACE_COOKIE = "fos_workspace"

export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at")
  return data ?? []
}

export function resolveActiveWorkspace(
  workspaces: Workspace[]
): Workspace | null {
  const cookieId = cookies().get(WORKSPACE_COOKIE)?.value
  return (
    workspaces.find((w) => w.id === cookieId) ??
    workspaces.find((w) => w.is_primary) ??
    workspaces[0] ??
    null
  )
}
