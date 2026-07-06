import { AddExperimentDialog } from "@/components/add-experiment-dialog"
import { ExperimentCard } from "@/components/experiment-card"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Experiment } from "@/types/db"

const COLUMNS = [
  { status: "idea", label: "Ideas" },
  { status: "testing", label: "Testing" },
  { status: "decided", label: "Decided" },
] as const

export default async function LabPage() {
  const supabase = createClient()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!

  const { data: experiments } = await supabase
    .from("experiments")
    .select("*")
    .eq("workspace_id", active.id)
    .order("created_at", { ascending: false })

  const all: Experiment[] = experiments ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Business Lab</h1>
          <p className="text-sm text-muted-foreground">
            Idea → experiment → decision. Nothing lives here forever.
          </p>
        </div>
        <AddExperimentDialog workspaceId={active.id} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const items = all.filter((e) => e.status === column.status)
          return (
            <section key={column.status} aria-label={column.label}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                {column.label}
                <span className="ml-2 tabular-nums">{items.length}</span>
              </h2>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted-foreground">
                    {column.status === "idea"
                      ? "No ideas yet. Add one."
                      : "Empty."}
                  </p>
                ) : (
                  items.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      businessType={active.business_type}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
