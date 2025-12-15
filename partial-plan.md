# Partial plan (pro Codex mini)

Krůčky jsou malé, po každém kroku validuj (build/test) a drž invarianty z AGENTS.md.

- [x] M0: Repo skeleton
  - [x] Nastavit základní Next.js + TS config, lint, env (.env.example) a CI stub.
  - [x] Přidat .gitignore, scripts (dev/build/test/lint/prisma) a placeholder root layout/page.
  - [x] Připravit Prisma datasource a prázdné schema, ověřit `pnpm lint`.
- [ ] M1: Číselníky
  - [x] Doplnit Prisma modely pro branches/services/branch_services + migrační skript.
  - [x] Seeder/demo data (1 pobočka, pár služeb) + read-only API routes.
- [x] M2: Staff + směny
  - [x] Přidat staff/staff_services/shifts/breaks/time_off modely + migrace.
  - [x] Serverové validace (Zod) pro CRUD endpoints/actions, základní admin UI formy.
- [x] M3: Availability engine
  - [x] Implementovat `listAvailableSlots` v /lib/availability + unit testy (overlap, buffer, break/timeoff, přes půlnoc, DST, any-staff).
  - [x] API `/api/availability` (Zod vstupy, UTC in/out), zahrnout booking_holds + confirmed bookings.
- [x] M4: Booking bez platby
  - [x] Endpoint `/api/booking/hold` (transakce + expirace), `/api/booking/confirm` bez Stripe.
  - [x] Email potvrzení (Resend stub/template) + jednoduché public UI kroky rezervace.
- [ ] M5: Stripe platby
  - [x] Sledovat `paymentIntentId`/`paymentStatus` v holdu i bookingu a povolit payload
  - [ ] Integrovat PaymentIntent pro booking + voucher, ukládat payment_intent_id.
  - [ ] Webhook handler idempotentní; hold → booking na succeeded, failure/cancel update status.
- [ ] M6: Vouchery
  - [ ] Model + migrace (vouchers, voucher_redemptions), purchase endpoint + email s kódem.
  - [ ] Redeem při booking flow, respektovat hodnotu/status/expiraci.
- [x] M7: Backoffice
  - [x] Google OAuth guard pro /admin, allowlist emailů + lokální dev credentials.
  - [x] Admin UI pro kalendář rezervací, CRUD číselníků, shift management, no-show toggle (základní tabulky/formuláře).
- [ ] QA + deploy
  - [ ] E2E průchod public booking + voucher redeem, test branch timezone edge cases.
  - [ ] Deploy skript (Vercel + DB), kontrola env/secrets.

## Architecture review (aktuální stav)
- Domain služby jsou oddělené v `/lib` (availability, booking), API vrstvy používají Zod, invariants drží UTC v DB a buffer/hold logiku – good.
- Chybí druhá půlka plateb: PaymentIntent orchestrace + webhook idempotence pro booking/voucher (M5), voucher model + redeem tok (M6).
- Time helper stojí na `date-fns-tz`; zkontrolovat, že API/DB vždy pracují v UTC a UI formáty používají branch timezone (časy v Reactu nesmí řešit logiku).
- Backoffice guard (Google OAuth + allowlist) hotový, ale Stripe/Voucher env proměnné a deploy checklisty nejsou.

## UX/design zlepšení (běžící TODO)
- [ ] Public booking: nahradit playground stepperem (branch/service/barber/slot), summary panel připravený pro voucher + platbu; “nejbližší slot” CTA, místní čas.
- [ ] Admin bookings: agenda view se status chipy, filtry (dnes/zítra/víkend, status, search), výrazné lokální časy, inline no-show akce.
