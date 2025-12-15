# Codex Agent Instructions (Barber Reservations)

## Prime directive
Nezkoumat celý repo. Pracuj v malých krocích.
- Každý task = malý diff (ideálně < 8 souborů).
- Před změnou: otevři jen relevantní soubory.
- Vždy přidej/aktualizuj testy u availability + booking concurrency.

## Stack & constraints
- Next.js (App Router), TypeScript
- Postgres + Prisma
- Google OAuth pro admin (Auth.js / NextAuth)
- Stripe pro platby (booking + voucher)
- Time handling: UTC v DB, branch timezone v nastavení

## Domain invariants (NEPORUŠIT)
1) Všechny časové údaje v DB jsou UTC.
2) Booking nesmí překrývat jiný booking/hold pro stejného staff.
3) Booking flow s platbou používá HOLD s expirací (např. 10 min).
4) Webhooky jsou idempotentní (payment_intent_id je klíč).
5) “Any barber” vybírá nejbližší slot napříč eligible staff.

## Repo structure (target)
- /app
  - /public  public pages (branch search, booking flow, voucher)
  - /admin   admin pages (protected)
  - /api     route handlers (availability, booking, voucher, stripe webhooks)
- /lib
  - db.ts (Prisma)
  - time.ts (UTC/timezone helpers)
  - availability/ (engine + tests)
  - stripe/ (client + webhook verify)
  - auth/ (Auth.js config)
- /prisma
  - schema.prisma
  - migrations/
- /emails
  - templates (booking confirmed, voucher)

## Commands (assume)
- pnpm install
- pnpm dev
- pnpm test
- pnpm lint
- pnpm prisma migrate dev

## Coding rules
- TypeScript strict, žádné `any` bez důvodu.
- Validace vstupů: Zod na API boundaries.
- Žádné “business rules” v React komponentách.
  - UI = render + call actions/API
  - Business logic = /lib
- Na časové výpočty používej jednu knihovnu (např. date-fns + date-fns-tz) konzistentně.

## Availability engine expectations
Funkce:
- listAvailableSlots({ branchId, serviceId, staffId|any, date })
Vrací:
- slots: [{ startAtUtc, endAtUtc, staffId }]
Parametry:
- slot_step_min, booking_buffer_min, max_days_ahead z `branches`

Test cases (must exist):
- overlap booking blocks slot
- buffer blocks adjacent slot
- break/timeoff removes slots
- shift across midnight
- DST transition day in branch timezone
- any-staff returns earliest

## Booking flow expectations
- POST /api/booking/hold: vytvoří booking_holds (expiruje)
- POST /api/booking/confirm:
  - bez platby: promění hold na booking (transaction)
  - s platbou: pouze vytvoří PaymentIntent + hold; booking vzniká až po webhooku
- /api/stripe/webhook:
  - on succeeded:
    - confirm booking OR issue voucher
  - on failed/canceled:
    - mark payment_status + allow hold to expire

## Admin auth expectations
- Only Google OAuth.
- Allowlist admin emails (env var).
- All /admin routes guarded server-side.

## Working style
Když si nejsi jistý, udělej “best default”:
- 10 min hold
- 5 min slot step (konfigurovat)
- 10 min buffer (konfigurovat)
- max_days_ahead 60

Nikdy se neptej na “všechno najednou”.
Navrhni konkrétní implementační krok a proveď ho.
