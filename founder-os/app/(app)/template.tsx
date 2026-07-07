// Remounts on every navigation (unlike layout), so each page enters with
// the same quick rise-and-fade. This is the single seam that makes ALL
// navigation feel smooth — every current and future page inherits it for
// free. Transform + opacity only: compositor-friendly, never janky.
export default function Template({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="animate-page">{children}</div>
}
