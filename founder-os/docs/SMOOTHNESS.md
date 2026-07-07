# Smoothness rules — Nexa

The bar: nothing ever feels like a hard cut, a freeze, or a jump. These
rules are load-bearing; every new feature follows them by default.

## The four primitives (already wired — use them, don't reinvent)

1. **Page transitions** — `app/(app)/template.tsx` remounts on every
   navigation and plays `.animate-page` (240ms rise-and-fade). Every new
   page gets this for free. Never add a second page-level animation.
2. **Panel/tab swaps** — wrap switchable content in a keyed div with
   `.animate-tab` (160ms fade). See log-form.
3. **Press feedback** — Buttons already scale on press. Anything else
   tappable gets `.pressable`.
4. **Reward moments** — `.animate-pop` / `.animate-glow`, fired once on a
   completed action. Never looping.

## Hard rules

- **Animate only `transform` and `opacity`.** Never top/left/width/height
  in animations (layout thrash). The delete-row collapse uses max-height
  as the one sanctioned exception, staggered after the fade.
- **Every mutation is optimistic.** The UI changes the instant the finger
  lands; network + `router.refresh()` run behind the animation and must
  not cause a visible settle. Revert on error.
- **Never block a tap on the network.** If data is needed first, show the
  change with local state and reconcile after.
- **Durations:** press 150ms · tab 160ms · page 240ms · reward 400ms.
  Nothing longer without a reason; nothing infinite ever.
- **Blur is expensive on iOS.** Sticky/fixed elements keep
  `backdrop-blur-md` or less; opaque panels get no blur at all.
- **`prefers-reduced-motion` is law** — the global media query collapses
  all motion; don't opt anything out of it.
- **Every list row that can be removed animates out** (see
  components/delete-entry.tsx), never pops.
- **Keep loading.tsx skeletons** for every new route group — taps must
  paint a response within one frame.
