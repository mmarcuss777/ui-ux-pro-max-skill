import type { SupabaseClient } from "@supabase/supabase-js"

import { decryptToken, encryptToken } from "@/lib/crypto"
import type { Json } from "@/types/db"
import { plausibleSync } from "@/lib/connectors/plausible"
import { shopifySync } from "@/lib/connectors/shopify"
import { stravaSync } from "@/lib/connectors/strava"
import { stripeSync } from "@/lib/connectors/stripe"
import type { SyncFn } from "@/lib/connectors/types"
import type { Database } from "@/types/db"

type Admin = SupabaseClient<Database>
type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"]

const SYNC_FNS: Record<string, SyncFn> = {
  strava: stravaSync,
  stripe: stripeSync,
  shopify: shopifySync,
  plausible: plausibleSync,
}

// Runs one provider sync for one user: decrypt secrets → fetch → upsert
// daily metrics → persist refreshed tokens → record the run. Returns the
// number of metric rows written. Uses the service-role client because
// integration_secrets has no user-facing RLS policy by design.
export async function runSync(
  admin: Admin,
  integration: IntegrationRow
): Promise<number> {
  const syncFn = SYNC_FNS[integration.provider]
  if (!syncFn) throw new Error(`No sync for provider ${integration.provider}`)

  const { data: run } = await admin
    .from("sync_runs")
    .insert({ user_id: integration.user_id, provider: integration.provider })
    .select("id")
    .single()

  try {
    const { data: secrets } = await admin
      .from("integration_secrets")
      .select("*")
      .eq("integration_id", integration.id)
      .single()

    const since = integration.last_sync_at
      ? new Date(new Date(integration.last_sync_at).getTime() - 86_400_000)
          .toISOString()
          .slice(0, 10)
      : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)

    const result = await syncFn(
      {
        accessToken: secrets?.access_token_enc
          ? decryptToken(secrets.access_token_enc)
          : null,
        refreshToken: secrets?.refresh_token_enc
          ? decryptToken(secrets.refresh_token_enc)
          : null,
        expiresAt: secrets?.expires_at ?? null,
        externalAccount: integration.external_account,
      },
      since
    )

    if (result.updatedTokens) {
      await admin
        .from("integration_secrets")
        .update({
          access_token_enc: encryptToken(result.updatedTokens.accessToken),
          ...(result.updatedTokens.refreshToken
            ? { refresh_token_enc: encryptToken(result.updatedTokens.refreshToken) }
            : {}),
          expires_at: result.updatedTokens.expiresAt ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("integration_id", integration.id)
    }

    if (result.rows.length > 0) {
      await admin.from("imported_metrics").upsert(
        result.rows.map((row) => ({
          user_id: integration.user_id,
          provider: integration.provider,
          metric: row.metric,
          date: row.date,
          value: row.value,
          meta: (row.meta ?? {}) as Json,
        })),
        { onConflict: "user_id,provider,metric,date" }
      )
    }

    await admin
      .from("integrations")
      .update({ status: "connected", error: null, last_sync_at: new Date().toISOString() })
      .eq("id", integration.id)
    if (run)
      await admin
        .from("sync_runs")
        .update({ status: "ok", finished_at: new Date().toISOString(), items: result.rows.length })
        .eq("id", run.id)
    return result.rows.length
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed"
    await admin
      .from("integrations")
      .update({ status: "error", error: message })
      .eq("id", integration.id)
    if (run)
      await admin
        .from("sync_runs")
        .update({ status: "error", finished_at: new Date().toISOString(), error: message })
        .eq("id", run.id)
    throw error
  }
}
