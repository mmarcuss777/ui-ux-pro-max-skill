// Seven gold-lit day squares — the last week at a glance. Server-safe.
// The last cell is today: ringed so the user always sees which square
// they're fighting for, and it pops the day it lights up.
export function WeekGrid({
  days,
}: {
  days: { date: string; active: boolean }[]
}) {
  return (
    <div className="flex gap-1.5">
      {days.map((day, i) => {
        const isToday = i === days.length - 1
        return (
          <div
            key={day.date}
            title={day.date}
            className={[
              "h-8 w-8 rounded-md",
              day.active
                ? "bg-gradient-to-br from-gold-light to-gold-dark shadow-md shadow-gold/25"
                : "border border-line bg-secondary/50",
              isToday
                ? "ring-2 ring-gold/60 ring-offset-2 ring-offset-card"
                : "",
              isToday && day.active ? "animate-pop" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        )
      })}
    </div>
  )
}
