# Barber Reservation

MVP rezervační systém pro barber shop na Next.js + Prisma + Stripe.

## Quick start
- `pnpm install`
- `cp .env.example .env` a vyplň env proměnné (DB, Google OAuth, Stripe, Resend).
- `pnpm dev` spustí Next.js app (`/` public, `/admin` placeholder).

## Struktura (zatím)
- `app/(public)` – veřejné stránky/flow.
- `app/(admin)` – admin (chránit přes Google OAuth).
- `app/api` – API route handlers.
- `lib` – sdílená business logika (UTC/time, availability, auth, stripe).
- `prisma` – schema + migrace.

Viz `plan.md` a `partial-plan.md` pro roadmapu. Drž invarianty z `AGENTS.md` (UTC v DB, hold/booking concurrency, any-barber earliest, webhook idempotence).
