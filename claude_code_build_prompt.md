# Antan Batura Watersports — Booking Management System
### Build brief for Claude Code

You are helping me build a booking management system for a small watersports rental
business (5 staff, single site at Tasik Shah Alam, Selangor). The business currently
runs entirely on WhatsApp bookings and paper receipts. Replace that with a web-based
system covering booking, payment recording, equipment tracking, and reporting.

This is a final-year Information Systems coursework project, so favour a clean,
well-documented, incrementally buildable codebase over premature optimisation.

## Tech stack (use this stack unless there's a strong reason not to)

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, React Router
- **Backend:** Node.js + Express + TypeScript
- **ORM:** Prisma
- **Database:** MySQL
- **Auth:** JWT-based session auth with three roles: `customer`, `staff`, `admin`
- **No real payment gateway.** Payment happens on-site (QR / bank transfer / cash).
  Build a **mock/simulated payment gateway** for the demo, it should look and feel
  like a real checkout flow (QR code display, bank transfer instructions, cash
  confirmation) but never call out to an actual payment processor or move real
  money. See the Payment recording module below for details.

If you'd rather use PHP/Laravel for the backend instead of Node/Express, that's
also acceptable, our team knows both, just keep frontend and backend cleanly
separated either way (REST API + SPA, not server-rendered pages).

## User roles

- **Customer** — books equipment, views availability, receives digital receipt
- **Staff** — checks in customers, records payments, monitors usage time, inspects
  returned equipment
- **Admin/Owner** — everything staff can do, plus views reports and manages
  equipment inventory

## Data model (starting point — adjust as needed)

- `User` — id, name, email, phone, password_hash, role (customer/staff/admin)
- `Equipment` — id, name, type (cruise_boat/kayak_single/kayak_double/canoe/
  paddle_boat/paddle_boat_family), status (available/booked/maintenance), hourly_rate
- `Booking` — id, customer_id, equipment_id, booking_date, start_time, end_time,
  status (pending/confirmed/checked_in/in_use/completed/cancelled), booking_reference
- `Payment` — id, booking_id, amount, method (qr/bank_transfer/cash), status
  (pending/confirmed/failed), mock_transaction_id, recorded_by (staff user id),
  recorded_at
- `UsageLog` — id, booking_id, actual_start_time, actual_end_time, exceeded_minutes,
  extra_charge_amount
- `DamageReport` — id, booking_id, description, deposit_charged, recorded_by,
  recorded_at

## Core modules, in the order the business process actually happens

1. **Booking & availability**
   - Customer submits a booking request (online) or staff enters a walk-in
   - System checks equipment availability for the requested date/time
   - If unavailable: suggest an alternative slot or waitlist; re-check availability
     once the customer picks a new slot
   - If available: customer selects equipment & time slot, system reserves it and
     sends a booking confirmation (with a booking reference)

2. **Check-in & handover**
   - Staff check in the customer and verify the booking reference (or start a
     walk-in booking directly)
   - Staff record that a safety briefing was given and safety gear issued

3. **Payment recording (mock gateway)**
   - Customer/staff selects a payment method: QR, bank transfer, or cash
   - **QR:** generate and display a QR code (any QR code library is fine, it can
     encode a fake reference like `PAY-<booking_reference>`) along with the amount
     due. Show a "Simulate payment received" button that staff click once the
     customer shows proof of payment, this stands in for the webhook a real
     gateway would normally send.
   - **Bank transfer:** display mock bank account details (dummy account name/
     number) and the amount due, with the same "Simulate payment received" button
     for staff to confirm.
   - **Cash:** no simulation needed, staff mark it received directly since cash is
     confirmed in person on the spot.
   - Whichever method is used, once confirmed the booking's payment status updates
     to `confirmed`, a mock transaction ID is generated and stored, the system
     generates a digital receipt (sent to customer's email or shown in-app), and
     staff mark equipment as handed over.
   - If payment can't be confirmed (customer backs out, wrong amount, etc.), staff
     mark it failed/cancelled and the booking ends there.
   - Wrap this behind a `PaymentGatewayService` interface with a `MockPaymentGateway`
     implementation, so a real gateway (DuitNow QR, ToyyibPay, etc.) could be
     swapped in later without touching the rest of the booking flow.

4. **Usage monitoring**
   - Staff (or the system) track elapsed usage time against the booked duration
   - If the customer exceeds the time limit, system auto-calculates an extra
     charge; staff record collection of that payment

5. **Return & inspection**
   - Staff mark equipment as returned and log its condition
   - If damaged, staff record a damage report and optionally charge a deposit
   - System updates equipment status back to available and closes the transaction

6. **Reporting**
   - Admin can generate sales, booking, and equipment-usage reports over a date
     range, pulling from the Booking/Payment/UsageLog/DamageReport tables

## Non-functional requirements

- Fully responsive — staff and customers will mostly use this on phones
- Passwords hashed, JWTs short-lived with refresh, no more customer data collected
  than needed (name, phone, email is enough — this matters for Malaysia's PDPA)
- Should run affordably on shared/low-tier hosting, no need to design for scale
  beyond a single small business

## Explicitly out of scope (don't build these)

- A **real** payment gateway / card processing integration (the mock gateway
  simulates the checkout UX only, it never touches real money or a real processor)
- Native iOS/Android app (responsive web only)
- Accounting or payroll functionality
- Multi-location support (this is a single-site business)
- Inventory management beyond the watersport equipment itself

## Suggested build order

1. Project scaffold: repo structure, Prisma schema + migrations, auth (register/
   login for customer & staff/admin roles)
2. Booking & availability module (includes the alternative-slot/waitlist path)
3. Check-in, safety briefing log, and payment recording module (with mock
   QR/bank-transfer/cash gateway)
4. Usage monitoring + automatic overtime charge calculation
5. Return, inspection, and damage report module
6. Reporting dashboard for admin
7. Polish: responsive layout pass, form validation, empty/error states

Start with step 1. Set up the project structure and Prisma schema first, and
confirm the schema with me before scaffolding the API routes.
