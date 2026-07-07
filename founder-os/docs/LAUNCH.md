# Nexa — najľahšia cesta k reálnej appke (plán, nie úloha)

> Princíp: PWA zostáva jadrom. Žiadny prepis, žiadny vlastný backend,
> žiadny app store, kým to nedokáže hodnotu. Každá fáza má jasný spúšťač.

## Fáza A — jeden používateľ (TERAZ) ✓

Hotové: appka, skóre, AI, konektory, push, bezpečnosť tokenov.
Spúšťač ďalšej fázy: terénny test potvrdí hodnotu (TEST-PROTOKOL.md).

## Fáza B — prvých 5–10 ľudí (2–3 večery práce)

1. **Doména** (~15 €/rok) + napojenie na Vercel — 30 min
2. **E-maily cez Resend** (free tier): Supabase auth SMTP, nech potvrdzovacie
   maily nekončia v spame — 1 večer
3. **Privacy policy + podmienky** — jednostránka zo šablóny (GDPR minimum,
   zbierame osobné dáta v EÚ; dáta sú v eu-west-1, tokeny šifrované — to už spĺňame) — 1 večer
4. **Sentry free** — nech o chybách používateľov vieš skôr než oni napíšu — 1 h
5. **`plan` stĺpec v profiles** (free/pro/business, default business pre
   všetkých v tejto fáze) — pripraví balíčky bez billing systému — 1 h
6. Pozvánky = obyčajný link na registráciu. Žiadny waitlist systém.

## Fáza C — platby (spúšťač: prvý človek povie „platil by som")

**Lemon Squeezy ako merchant of record** — najľahšia cesta pre jednotlivca zo
Slovenska: oni riešia DPH, faktúry a platobné metódy, ty dostaneš payout.
Checkout link → webhook nastaví `plan` v profiles. 1–2 dni práce.
(Stripe priamo = viac kontroly, ale aj viac povinností — až neskôr.)
Ceny podľa docs/TIERS.md: Free 0 / Pro ~9 € / Business ~29 €.
K tomu: živnosť/s.r.o. na príjem — vyrieš s účtovníkom, MoR to zjednodušuje.

## Fáza D — App Store (spúšťač: PWA retencia dokázaná + treba HealthKit)

Capacitor wrapper okolo existujúcej appky → natívny shell, Apple Health
konektor (Body pilier bez Garminu), push cez APNs. Apple dev účet 99 $/rok,
review proces. Nerobiť skôr — PWA dnes vie všetko potrebné.

## Prevádzkové náklady (odhad)

| Položka | Teraz | Desiatky userov |
|---|---|---|
| Vercel | 0 € | 20 €/mes (Pro) |
| Supabase | 0 € | 25 €/mes |
| Anthropic API | jednotky €/mes | limity/plán držia strop (ai-usage) |
| Doména | — | ~15 €/rok |
| Resend, Sentry | 0 € | 0 € (free tier stačí) |

## Čo NErobiť (pasce)

- Prepis do native / vlastný backend / mikroservisy
- Teams, multi-user, sharing (out of scope od začiatku)
- Billing skôr, než niekto chce platiť
- App Store skôr, než PWA dokáže retenciu
