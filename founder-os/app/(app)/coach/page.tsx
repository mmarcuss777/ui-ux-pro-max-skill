import { CoachGenerator } from "@/components/coach-generator"
import { getT } from "@/lib/i18n-server"

export default function CoachPage() {
  const { d } = getT()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.coach.title}</h1>
        <p className="text-sm text-muted-foreground">{d.coach.subtitle}</p>
      </div>

      <CoachGenerator />
    </div>
  )
}
