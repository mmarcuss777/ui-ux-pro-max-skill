// Seven gold-lit day squares — the last week at a glance. Server-safe.
export function WeekGrid({
  days,
}: {
  days: { date: string; active: boolean }[]
}) {
  return (
    <div className="flex gap-1.5">
      {days.map((day) => (
        <div
          key={day.date}
          title={day.date}
          className={
            day.active
              ? "h-8 w-8 rounded-md bg-gradient-to-br from-gold-light to-gold-dark shadow-md shadow-gold/25"
              : "h-8 w-8 rounded-md border border-line bg-secondary/50"
          }
        />
      ))}
    </div>
  )
}
