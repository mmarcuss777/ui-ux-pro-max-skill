# Nexa — koncept troch verzií (podklad na diskusiu)

> Stav: návrh na večernú diskusiu. Nič z tohto ešte nie je implementované.
> Rozhodnutie: stavať ako feature-flagy (`plan: free | pro | business`),
> billing (Stripe) až keď Nexu použije druhý človek.

## Nosná myšlienka

Verzie kopírujú piliere a rast používateľa, nie zoznam funkcií:
**Free = ty (telo + myseľ) → Pro = tvoje peniaze + AI rozhovor → Business = tvoja firma na živých dátach.**

Predajná veta: „Nexa rastie s tebou — od disciplíny, cez peniaze, po firmu.“

## FREE — „Operátor dňa“ (Body + Mind)

Cieľ: návyk a identita. Celý dopamínový motor ostáva free (retenčný stroj):

- Body + Mind zápisy, ciele do dňa, týždenná mriežka
- Streak + štíty, never-miss-twice, minimum day, evidence counter, rank
- One Move, Close Day, push pripomienky
- 1 konektor zadarmo (Garmin CSV) — ochutnávka „appka vie, že som cvičil“
- Ask Nexa: 3 otázky/týždeň (ochutnávka konvertuje lepšie než zámka)

Free nemá: Money, Business, AI weekly verdikt, ostatné konektory.

## PRO — „Operátor života“ (+ Money + Ask Nexa)

Cieľ: hĺbka a rozhovor — platíš za to, že Nexa rozmýšľa s tebou.

- Money: transakcie, cashflow, disciplína míňania, CSV import
- Ask Nexa naplno (všetky režimy, história)
- AI Weekly Review verdikt (nedeľný rozsudok)
- Osobné konektory: Toggl, RescueTime, Google Kalendár, …
- Insight karty, share card, best day
- Model: stredná trieda (Sonnet) — múdry, lacný na prevádzku

## BUSINESS — „AI operátor firmy“

Iný produkt, nie „viac funkcií“: AI sediaca na živých dátach firmy.

- Biznis konektory: Shopify, Stripe, Lemon Squeezy, Plausible, Mailchimp, GitHub
- Ranný AI briefing (cron morning už existuje): jeden záver + jeden ťah
- Reality Check s pamäťou (konfrontuje s minulým verdiktom a reálnym pohybom)
- Experimenty napojené na reálne čísla (kill/scale rozhodnutia)
- Top model (Opus/Fable trieda) + vyšší tokenový rozpočet

Prestavba Business sekcie = stavba Business verzie. AI briefing z konektorov
je vlajková funkcia; ručné zapisovanie v Business sekcii končí, ostávajú
len rozhodnutia founderа ako odpoveď na to, čo AI predloží.

## Zásady

1. AI dostáva len súhrny, nikdy surové dáta (bezpečnostné pravidlo platí ďalej).
2. Náklady: denný briefing = predvídateľný náklad → tokenový strop na plán.
3. Zamknuté karty ukazujú rozmazaný obsah („Nexa má na dnes záver → Pro“),
   zámka bez ochutnávky nepredáva.
4. Feature-flag helper v kóde od prvého dňa; Marcus beží na `business`.

## Otvorené rozhodnutia (večer)

1. Ask Nexa vo free: 3 otázky/týždeň vs. úplná zámka
2. Push notifikácie free pre všetkých? (odporúčanie: áno)
3. Business: jeden projekt vs. viac workspace-ov
4. Ceny — prvý nástrel: Free 0 / Pro ~9 €/mes / Business ~29 €/mes
