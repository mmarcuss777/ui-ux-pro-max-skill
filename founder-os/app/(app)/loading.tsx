// Instant skeleton for every page in the app group. It mirrors the real
// page anatomy (title, gold-framed hero, list rows) so the wait reads as
// "the page is here, content is filling in" — never as a blank screen.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-black/[0.07]" />
        <div className="h-4 w-56 animate-pulse rounded bg-black/[0.05]" />
      </div>

      {/* Hero card with the signature gold frame — the page identity is
          visible even before data lands. */}
      <div className="rounded-2xl bg-gradient-to-br from-gold-light/50 via-gold/20 to-transparent p-px">
        <div className="space-y-3 rounded-[calc(1rem-1px)] bg-card p-5">
          <div className="h-3 w-40 animate-pulse rounded bg-gold/20" />
          <div className="h-6 w-3/4 animate-pulse rounded-lg bg-black/[0.07]" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-black/[0.05]" />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-black/[0.05] bg-card p-5 shadow-card">
        <div className="h-4 w-28 animate-pulse rounded bg-black/[0.06]" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div
              className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gold/[0.12]"
              style={{ animationDelay: `${i * 120}ms` }}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div
                className="h-3 w-16 animate-pulse rounded bg-black/[0.05]"
                style={{ animationDelay: `${i * 120}ms` }}
              />
              <div
                className="h-4 w-2/3 animate-pulse rounded bg-black/[0.07]"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            </div>
            <div
              className="h-8 w-8 shrink-0 animate-pulse rounded-full border-2 border-black/[0.06]"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-black/[0.05] bg-card p-4 shadow-card">
        <div className="h-[84px] w-[84px] shrink-0 animate-pulse rounded-full border-[11px] border-black/[0.06]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-4 w-32 animate-pulse rounded bg-black/[0.07]" />
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-6 w-14 animate-pulse rounded-full bg-black/[0.05]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
