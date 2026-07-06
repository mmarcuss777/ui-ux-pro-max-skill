import { WorkspaceForm } from "@/components/workspace-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getT } from "@/lib/i18n-server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

export default async function WorkspacePage() {
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const others = workspaces.filter((w) => w.id !== active.id)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.workspace.title}</h1>
        <p className="text-sm text-muted-foreground">
          {d.workspace.active} {active.name}
        </p>
      </div>

      <WorkspaceForm key={active.id} workspace={active} />

      {others.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{d.workspace.others}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {others.map((workspace) => (
                <li
                  key={workspace.id}
                  className="flex items-center justify-between py-3"
                >
                  <p className="text-sm text-ink">{workspace.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {workspace.status}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {d.workspace.switchHint}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
