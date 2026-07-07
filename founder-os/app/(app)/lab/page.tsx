import { AddExperimentDialog } from "@/components/add-experiment-dialog"
import { ExperimentCard } from "@/components/experiment-card"
import { getT } from "@/lib/i18n-server"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Experiment } from "@/types/db"

export default async function LabPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!

  const { data: experiments } = await supabase
    .from("experiments")
    .select("*")
    .eq("workspace_id", active.id)
    .order("created_at", { ascending: false })

  const all: Experiment[] = experiments ?? []
  const columns = [
    { status: "idea", label: d.lab.ideas },
    { status: "testing", label: d.lab.testing },
    { status: "decided", label: d.lab.decided },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.lab.title}</h1>
          <p className="text-sm text-muted-foreground">{d.lab.subtitle}</p>
        </div>
        <AddExperimentDialog workspaceId={active.id} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => {
          const items = all.filter((e) => e.status === column.status)
          return (
            <section key={column.status} aria-label={column.label}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                {column.label}
                <span className="ml-2 tabular-nums">{items.length}</span>
              </h2>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted-foreground">
                    {column.status === "idea" ? d.lab.noIdeas : d.lab.empty}
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
