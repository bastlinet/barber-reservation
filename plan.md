# Barber Reservations — Plan

## 0) Goal
Postavit rezervační systém pro barber shop:
- Public web: výběr pobočky → služby → barbera/“kdokoliv” → datum+čas → kontakt → shrnutí → platba předem (volitelně) → potvrzení.
- Backoffice (Google Auth): evidence poboček, číselníků (služby, ceny), zaměstnanců, směn, rezervací, voucherů, plateb.

Inspirace UX: veřejný web + rezervace podobně jako kombinace klasického webu salonu a “service list → reserve” stránky (např. Reservio styl seznamu služeb s cenou a CTA). :contentReference[oaicite:0]{index=0}

## 1) Non-goals (zatím)
- Marketplace více salonů (SaaS pro cizí podniky) — nejdřív single-brand / multi-branch.
- Multi-currency, multi-language, věrnostní program, složité slevy, SMS gateway — až po MVP.
- Účty pro zákazníky — MVP bez loginu (rezervace přes kontakt + linky).

## 2) User journeys

### 2.1 Public booking flow
1) Vyber pobočku
   - vyhledávání (město, ulice, název)
   - pobočka detail: adresa, otevírací doba, kontakty, fotky
2) Vyber službu
   - kategorie (Vlasy / Vousy / Kompletně / Břitva / …)
3) Vyber barbera
   - konkrétní barber nebo “je mi to jedno”
4) Vyber termín
   - “skočit na nejbližší volný”
   - seznam dní (kalendář)
   - volné časy v daném dni (sloty)
5) Kontaktní údaje (jméno + telefon/email) + poznámka
6) Shrnutí objednávky
   - cena, délka, pobočka, barber, termín
   - volitelně voucher (zadání kódu)
7) Platba předem (volitelné)
   - online (Stripe) nebo “zaplatím na místě” podle nastavení pobočky
8) Potvrzení + email (SMS později)

### 2.2 Voucher flow (public)
- Vyber pobočku → vyber službu → zaplať online → dostaneš voucher (kód + QR) e-mailem.
- Voucher lze uplatnit při rezervaci (sníží cenu na 0 nebo odečte hodnotu).

### 2.3 Backoffice
- Přihlášení přes Google OAuth, role-based přístup.
- CRUD:
  - Pobočky: data, otevírací doba, timezone, nastavení plateb, policy (storno, no-show)
  - Služby: název, kategorie, délka, popis, aktivní
  - Ceny: per-pobočka (a případně per-seniority barbera později)
  - Zaměstnanci: profily, aktivní, přiřazení k pobočkám, dovednosti (které služby umí)
  - Směny: plán směn + pauzy + výjimky (dovolená)
  - Rezervace: přehled, detail, ruční vytvoření, přesun, zrušení, označení no-show
  - Vouchery: typy (service voucher), prodané kusy, stav (active/redeemed/expired/refunded)

## 3) Core rules (tohle je zdroj bugů, držet tvrdě)
- Všechny časy ukládat v UTC + pobočka má `timezone`.
- Dostupnost = (směny - pauzy - time off) - (existující rezervace + buffer) - (holdy).
- Souběhy řešit transakcí/lockem v DB (žádné “doufám že to vyjde”).
- “Any barber” vybírá nejbližší volný slot napříč eligible zaměstnanci.
- Booking musí mít jednoznačný stav:
  - `HOLD` (dočasná blokace pro checkout), `CONFIRMED`, `CANCELLED`, `NO_SHOW`, `COMPLETED`.
- Hold expiruje (např. 10 minut). Po expiraci slot znovu volný.

## 4) Data model (Postgres)

### 4.1 Tenancy
- Multi-branch v rámci jedné značky.
- Admin role může mít scope:
  - `brand_admin` (všechny pobočky)
  - `branch_manager` (1+ poboček)

### 4.2 Tables (MVP)
- `branches`
  - id, name, slug, address, city, lat, lng, phone, email
  - timezone, booking_buffer_min, slot_step_min, max_days_ahead
  - allow_pay_on_site, allow_pay_online
- `services`
  - id, name, category, duration_min, description, active
- `branch_services`
  - branch_id, service_id, price_cents, active
- `staff`
  - id, branch_id (primární), name, active, avatar_url
- `staff_branches` (pokud barber může mezi pobočkami)
  - staff_id, branch_id
- `staff_services` (kdo umí co)
  - staff_id, service_id
- `shifts`
  - id, staff_id, branch_id, start_at_utc, end_at_utc
- `breaks`
  - id, staff_id, branch_id, start_at_utc, end_at_utc
- `time_off`
  - id, staff_id, start_at_utc, end_at_utc, reason
- `bookings`
  - id, branch_id, staff_id, service_id
  - start_at_utc, end_at_utc
  - customer_name, customer_email, customer_phone, note
  - status, created_at, cancelled_at
  - payment_status, payment_intent_id (Stripe)
  - voucher_redemption_id nullable
- `booking_holds`
  - id, branch_id, staff_id, service_id
  - start_at_utc, end_at_utc
  - expires_at_utc, client_fingerprint/session_id
- `vouchers`
  - id, branch_id, service_id, code (unique), status
  - price_cents, purchased_at, expires_at
  - purchaser_email, recipient_name nullable
  - stripe_payment_intent_id
- `voucher_redemptions`
  - id, voucher_id, booking_id, redeemed_at

Indexy:
- bookings: (staff_id, start_at_utc), (branch_id, start_at_utc)
- booking_holds: (staff_id, start_at_utc), expires_at_utc
- vouchers: unique(code), (status, expires_at)

## 5) API (server actions / route handlers)

### 5.1 Public
- GET /api/branches?query=
- GET /api/branches/:slug
- GET /api/branches/:id/services
- GET /api/branches/:id/staff?serviceId=
- GET /api/availability?branchId=&serviceId=&staffId=|any&date=YYYY-MM-DD
- POST /api/booking/hold
- POST /api/booking/confirm
- POST /api/booking/cancel (token)
- POST /api/voucher/purchase
- POST /api/voucher/validate

### 5.2 Backoffice
- CRUD endpoints nebo server actions (admin UI):
  - branches, services, branch_services, staff, staff_services, shifts, breaks, time_off, bookings, vouchers

## 6) Payments (Stripe)
- Online platba:
  - booking: vytvořit `booking_hold` → Stripe PaymentIntent → po webhooku potvrdit booking.
- Voucher purchase:
  - Stripe PaymentIntent → po webhooku vytvořit voucher + poslat email.
- Webhooks (must-have):
  - payment_intent.succeeded
  - payment_intent.payment_failed / canceled
- Idempotence: webhook handler musí být idempotentní (unikátní klíč: payment_intent_id).

## 7) Email notifications
- Booking confirmed / rescheduled / cancelled
- Voucher delivery
- Reminder (např. 24h předem) — až po MVP, ale datový model připravit (cron/queue).

## 8) Security & GDPR baseline
- Minimal data: jméno + telefon/email + poznámka.
- Retence: anonymizovat/maskovat PII po X měsících (konfigurovat).
- Audit log v backoffice (aspoň create/update/delete booking, voucher, shift).

## 9) Tech stack (doporučení pro rychlost)
- Next.js (public + admin v jednom monorepu)
- Postgres + Prisma
- Auth.js (NextAuth) + Google provider, allowlist emailů/domény
- Stripe
- Email: Resend (nebo Sendgrid)
- Hosting: Vercel + managed Postgres (nebo tvoje infra, ale MVP = rychlost)

## 10) Milestones (pragmaticky)
M0 — Repo + infra skeleton
- Next.js app, Prisma, DB, lint, CI, basic UI kit.

M1 — Číselníky
- branches, services, branch_services.

M2 — Staff + shifts
- staff, staff_services, shifts, breaks, time_off.

M3 — Availability engine
- API pro volné sloty + unit testy na edge cases (DST, buffer, overlap).

M4 — Booking flow bez platby
- hold + confirm (bez Stripe), email confirmation.

M5 — Stripe platby
- booking pay online, webhooky, idempotence.

M6 — Vouchery
- purchase, delivery email, redeem při booking.

M7 — Backoffice kalendář
- denní/týdenní pohled, drag&drop move (optional), no-show toggle.

Done = nasadit + 1 pobočka + pár barberů + provozní testy.
