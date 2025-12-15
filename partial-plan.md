# Partial plan (pro Codex mini)

Krůčky jsou malé, po každém kroku validuj (build/test) a drž invarianty z AGENTS.md.

- [ ] M0: Repo skeleton
  - [ ] Nastavit základní Next.js + TS config, lint, env (.env.example) a CI stub.
  - [ ] Přidat .gitignore, scripts (dev/build/test/lint/prisma) a placeholder root layout/page.
  - [ ] Připravit Prisma datasource a prázdné schema, ověřit `pnpm lint`.
- [ ] M1: Číselníky
  - [ ] Doplnit Prisma modely pro branches/services/branch_services + migrační skript.
  - [ ] Seeder/demo data (1 pobočka, pár služeb) + read-only API routes.
- [ ] M2: Staff + směny
  - [ ] Přidat staff/staff_services/shifts/breaks/time_off modely + migrace.
  - [ ] Serverové validace (Zod) pro CRUD endpoints/actions, základní admin UI formy.
- [ ] M3: Availability engine
  - [ ] Implementovat `listAvailableSlots` v /lib/availability + unit testy (overlap, buffer, break/timeoff, přes půlnoc, DST, any-staff).
  - [ ] API `/api/availability` (Zod vstupy, UTC in/out), zahrnout booking_holds.
- [ ] M4: Booking bez platby
  - [ ] Endpoint `/api/booking/hold` (transakce + expirace), `/api/booking/confirm` bez Stripe.
  - [ ] Email potvrzení (Resend stub/template) + jednoduché public UI kroky rezervace.
- [ ] M5: Stripe platby
  - [ ] Integrovat PaymentIntent pro booking + voucher, ukládat payment_intent_id.
  - [ ] Webhook handler idempotentní; hold → booking na succeeded, failure/cancel update status.
- [ ] M6: Vouchery
  - [ ] Model + migrace (vouchers, voucher_redemptions), purchase endpoint + email s kódem.
  - [ ] Redeem při booking flow, respektovat hodnotu/status/expiraci.
- [ ] M7: Backoffice
  - [ ] Google OAuth guard pro /(admin), allowlist emailů.
  - [ ] Admin UI pro kalendář rezervací, CRUD číselníků, shift management, no-show toggle.
- [ ] QA + deploy
  - [ ] E2E průchod public booking + voucher redeem, test branch timezone edge cases.
  - [ ] Deploy skript (Vercel + DB), kontrola env/secrets.
