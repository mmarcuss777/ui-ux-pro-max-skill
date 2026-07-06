import { AskNexa } from "@/components/ask-nexa"
import { getT } from "@/lib/i18n-server"

export default function NexaPage() {
  const { d } = getT()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          <span className="gold-text">{d.nexa.title}</span>
        </h1>
        <p className="text-sm text-muted-foreground">{d.nexa.subtitle}</p>
      </div>

      <AskNexa />
    </div>
  )
}
