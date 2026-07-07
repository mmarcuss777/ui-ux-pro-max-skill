# Garmin — direct integration

Strava locked its API behind a paid subscription, so the fitness path for
Nexa is Garmin direct. Two stages:

## Now (free, works today): Garmin Connect CSV

1. Open **connect.garmin.com** on the web → **Activities**.
2. Filter the range you want, then **Export CSV** (top-right export icon).
3. In Nexa → **Connect Data → Garmin → Import activities**, pick the file,
   map the **Date** column (Duration/Distance optional), **Import**.

Each activity becomes a Body signal: workouts, active minutes and distance
per day feed the Body pillar, streak, weekly score and trend exactly like
a manual log. Re-importing the same days overwrites, never duplicates.

## Later (automatic): Garmin Health API

Direct daily sync (sleep, stress, Body Battery, steps, resting HR) needs
Garmin's approval:

1. Apply at **developer.garmin.com/gc-developer-program** → *Request
   Access*. Describe Nexa as a personal analytics tool that reads the
   user's own wellness data.
2. Approval is manual and can take weeks — apply now, in parallel with
   using the CSV path.
3. When approved you receive a **Consumer Key + Consumer Secret** (OAuth
   1.0a). Add them to Vercel as `GARMIN_CONSUMER_KEY` /
   `GARMIN_CONSUMER_SECRET`.
4. Garmin's Health API is **push-based**: after a user authorizes, Garmin
   POSTs new data to a webhook. The connector is built at that point
   against the approved account (the exact payload shape and the OAuth
   1.0a signing are only testable with real credentials, so we wire it
   when the keys arrive — no speculative code before then).

Until approval, the CSV path covers the same Body-pillar signals from your
actual Garmin activities.
