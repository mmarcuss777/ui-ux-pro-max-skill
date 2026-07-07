# Nexa — terénny testovací protokol (7 dní)

> Cieľ: odpovedať na otázku „má to reálnu hodnotu?" merateľne, nie pocitovo.
> Testuje Marcus (reálny život) + Claude (technické toky, priebežne).

## Deň 0 — príprava (raz, ~20 minút)

- [ ] Migrácie 0001–0007 v Supabase (0007 = profiles)
- [ ] Vercel env: ANTHROPIC_API_KEY, INTEGRATION_TOKEN_KEY, CRON_SECRET, VAPID pár
- [ ] Profil: meno + latky (tréningy/týždeň, fokus min/deň, waste limit, hlavný cieľ)
- [ ] Pripojený aspoň 1 zdroj na pilier: Garmin CSV (Body), Toggl/RescueTime (Mind),
      bankový CSV výpis (Money), GitHub/Shopify/Plausible (Business)
- [ ] Projekt vytvorený cez AI návrh (opíš vlastnými slovami)
- [ ] Push notifikácie zapnuté (Profil → Večerná pripomienka)
- [ ] Nexa na ploche iPhonu ako web appka

## Denný rituál (max 5 minút denne)

**Ráno (2 min):** otvor Dashboard → nastav One Move → pozri „Body na stole".
**Cez deň:** ži normálne; zapisuj len to, čo appka reálne pýta.
**Večer (2 min):** Close Day + over, či skóre sedí s realitou dňa.
**Nedeľa (+5 min):** Review → vygeneruj AI verdikt → Weekly Reset.

## Denný záznam (vyplň každý večer — pokojne do poznámok v mobile)

| Deň | Otvoril som appku sám od seba? | Operator Score | Urobil som niečo LEN kvôli appke? (čo?) | Skóre sedí s realitou? | AI výstup dnes užitočný? | Chyba/frustrácia? |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| … | | | | | | |

## Kritériá verdiktu (po 7 dňoch)

**Hodnota POTVRDENÁ, ak platí aspoň toto:**
1. ≥ 5/7 dní si appku otvoril dobrovoľne (nie z povinnosti voči testu)
2. ≥ 3 reálne akcie vykonané len preto, že ich appka pýtala (tréning, zápis, krok)
3. Týždenné skóre v Review reálne odráža, aký ten týždeň bol
4. ≥ 2 AI výstupy (briefing/audit/verdikt), ktoré zmenili rozhodnutie alebo pohľad
5. Denný čas v appke < 5 minút (appka má čas šetriť, nie žrať)

**Hodnota NEPOTVRDENÁ, ak:** appku otváraš z povinnosti, skóre sa dá „vyklikať"
bez reálnej zmeny správania, AI výstupy čítaš a ignoruješ.

## Honesty check (odpovedz si raz, v strede týždňa)

- Keby skóre nikto nevidel, správal by som sa inak?
- Klamal by som appke, keby to šlo ľahšie ako urobiť akciu?
- Ktorú sekciu som celý týždeň neotvoril? (kandidát na zjednodušenie/vyhodenie)

## Technická časť (Claude, priebežne)

- Každá sekcia preklikaná E2E pri každej zmene (mock + Playwright) ✓
- Po teste: zoznam chýb/frustrácií z denníka → oprava v jednej dávke
