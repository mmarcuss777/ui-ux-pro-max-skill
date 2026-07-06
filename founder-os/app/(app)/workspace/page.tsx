import { WorkspaceForm } from "@/components/workspace-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

export default async function WorkspacePage() {
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const others = workspaces.filter((w) => w.id !== active.id)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Workspace</h1>
        <p className="text-sm text-muted-foreground">
          The active project: {active.name}
        </p>
      </div>

      <WorkspaceForm key={active.id} workspace={active} />

      {others.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Other workspaces</CardTitle>
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
              Switch workspaces from the header.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
