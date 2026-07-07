// Instant skeleton for every page in the app group. Navigation paints
// this immediately while the server renders, so a tap always responds
// within a frame instead of freezing until data arrives.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-black/[0.06]" />
        <div className="h-4 w-64 animate-pulse rounded bg-black/[0.04]" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-black/[0.05] bg-white/70"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}
