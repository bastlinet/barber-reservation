# Barber Reservation

MVP rezervační systém pro barber shop na Next.js + Prisma + Stripe.

## Quick start
- `pnpm install`
- `cp .env.example .env` a vyplň env proměnné (DB, Google OAuth, Stripe, Resend).
- (Volitelné) `DATABASE_URL="postgresql://barber:barber@localhost:5432/barber_reservation" pnpm prisma:migrate dev` a `pnpm seed`.
- `pnpm dev` spustí Next.js app (`/public` veřejně, `/admin` pro backend).

## Lokální databáze přes Docker Compose
- `docker compose up -d db` spustí Postgres 17 (`barber`/`barber`, databáze `barber_reservation`, host port 5433).
- `docker compose ps` zkontroluje stav a `docker compose down` vypne instanci.
- Nastav v `.env`/`.env.local`: `DATABASE_URL="postgresql://barber:barber@localhost:5433/barber_reservation"`.
- Po spuštění DB použij `pnpm prisma:migrate dev` a `pnpm seed` pro základní data (branch, služby, staff, shift).

## Struktura (zatím)
- `app/public` – veřejné stránky/flow.
- `app/admin` – admin (chránit přes Google OAuth).
- `app/api` – API route handlery.
- `lib` – sdílená business logika (UTC/time, availability, auth, stripe).
- `prisma` – schema + migrace.

Viz `plan.md` a `partial-plan.md` pro roadmapu. Drž invarianty z `AGENTS.md` (UTC v DB, hold/booking concurrency, any-barber earliest, webhook idempotence).
