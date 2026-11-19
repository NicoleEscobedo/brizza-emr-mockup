# Brizza Clinic — clickable EMR mockup

A **preview-only** interactive mockup of a fictional luxury medical aesthetics clinic in Manhattan. It uses **synthetic sample records only**. It is not a production EMR, has no live database, and must never be used with real patient data.

This repository starts from a copy of the fixed EMR concept (`reference/emr-fixed-r4.html`, sha256 `852aa311b47f2d8ca50f3181872ff382d9ec7f52967abe212b982fe63e82c9ef`, 40/40 QA checks). The working mockup is a new multi-screen program with hash routes, a theme switcher, a guided demo, visit grouping, and a concept checkout / FEFO flow.

## How to open it

From this folder:

```bash
python3 -m http.server 8765
```

Then open [http://127.0.0.1:8765/](http://127.0.0.1:8765/) in a browser. The file to open is `index.html` (the server root). Do not use a `file://` URL if you want hash routing and fonts to behave consistently.

There is no login. Refreshing the page restores the original sample data (nothing is saved).

## How to use it

- **Worklist, Schedule (calendar), Patients, Work queue, Rooming, Point of Sale, Inventory, Configuration** are in the left navigation. Each screen has its own hash URL (for example `#/schedule/worklist/2026-11-18?theme=01`, `#/schedule/calendar/week/2026-11-16?theme=01`, `#/inventory/catalog?theme=01`, `#/rooming/2026-11-18?theme=01`).
- **Worklist** replaces the old Schedule List (kept in `_superseded/`). It is the default schedule view, opening on today, grouped by provider, with date navigation. Front-desk staff can confirm, review registration, change visit status, jot appointment notes, check balances, and open an Invoice pop-up without leaving the page. Task filters (Needs confirmation, Missing forms/ID, Ready for checkout, Unpaid balance, Open quotes) toggle and combine, with live counts and an All reset. The full POS page remains available.
- **Schedule** also has a Calendar view. Calendar has Day, Week, and Month modes, with previous/next and Today. Clinic hours are Monday–Friday, 10:00 a.m.–6:00 p.m. ET; weekends are shown as closed (month) or omitted (week columns). The List view has a location selector (Manhattan Clinic is the only real location) and expandable registration status on each appointment. Appointment cards (calendar and Worklist) use a creamy light white background, with the type color only as a left stripe in creamy pastels; text stays ink for AA contrast. A type legend is shown. Provider office availability is shaded separately from clinic open hours (synthetic sample, labeled as an open question). Patient counts appear next to each date in day, week, and month views. Times are shown in 12-hour form with a.m./p.m. A patient search bar finds patients (including by date of birth) and their appointments. The patient’s name is underlined and opens the chart. Booking over an Admin block is blocked unless an admin override reason is recorded. Clicking an appointment on the calendar or in the list opens its card, which includes **Open Chart**. Click an empty slot on the day or week calendar, or an add action in the list, to open a new-appointment window prefilled with that date, time, and provider.
- The **sample day** is Monday, November 16, 2026. Use **Sample day** on the schedule to return to it. Clinic hours are Monday–Friday, 10:00 a.m.–6:00 p.m. ET. The clinic is cash-pay.
- The only runtime theme is **01 Quiet Atelier**. Lapis Conservatory and its toggle were moved to `_superseded/`. Fonts are local (Cormorant Garamond + Jost). No CDN at runtime.
- **Start guided demo** is on the Configuration page, or go to `#/demo`. It runs about 60–90 seconds, with captions tied to decision IDs, and can be stepped or stopped.
- **Same-day consult-then-treat:** open Sofia Williams on the sample day, or go to `#/visits/V-1002` (two appointments under one visit, one invoice). Ava Thompson’s March 12 visit (`#/visits/V-1001`) is a completed historical example.
- **Checkout / FEFO:** `#/checkout/INV-1003`. Inventory posts only when the invoice is finalized. Amounts are TBD. This flow is labeled **Concept** where the design is not approved.
- Appointment status and payment status are independent: **Completed does not require payment**. Appointments that share an invoice show that invoice’s status.
- **Visit status** is one field shared by the schedule and the rooming board: Scheduled, Confirmed, Checked in, No-show, Canceled (schedule-only), then Ready for clinical, With clinical, Ready for provider, With provider, Ready for checkout, Checked out (also on the rooming board). Setting Ready for clinical adds the patient to the board; board moves update the schedule. A compact status dropdown is on each schedule card (list, and day/week calendar). Completing paperwork is a badge on Checked-in cards. Schedule cards show a colored dot for back-of-house status. Payment and invoice status stay independent.
- **Rooming:** `#/rooming` (seeded board: `#/rooming/2026-11-18`). Two boards: **Patient Flow** (board statuses, no Checked-in column; Checked out stays) on top and **Rooms** below (Suite 1 Aesthetics, Suite 2 Injectables, Suite 3 Injectables). Patients can be dragged between statuses and into a suite’s Clinical or Provider zone (which sets With clinical or With provider). Each card has a waiting timer that turns gold after 15 minutes. Each move logs time, staff, and an audit entry. A suite shows occupied or available and how long it has been occupied. Room is its own field. The **Acting as** selector lives in the sidebar (DB-014 roles).
- **Admin blocks** (Meeting, Rep meeting, Lunch, Personal, OFF) appear on the list and calendar, styled distinctly from appointments. Use **Admin block** to add one (provider/staff, weekday date, start/end within clinic hours, reason).
- **Appointment Types and Reasons** (Clinic nav) are data-driven and editable in memory. Types include Consultation (15), Neurotoxin (30), Filler (30), Dissolve (45), Facial (60), Chemical Peel (60), Microneedling (75), Wax (30), and Follow-up (15). Reasons may override length (Mini Facial 30, Hydrafacial 75, Toxin Touch-up 15). Lengths include buffers. Friendly confirmation names are plain draft labels. Booking uses the reason length when set, otherwise the type length.
- **Point of Sale** is in the Workspace nav. From the Worklist, Invoice opens a POS pop-up (add lines, take payment, convert a quote). Nicole-given prices are used when a quantity is entered: Botox and Jeuveau $21/unit, Juvederm $900/vial, Mini Facial $150, Hydrafacial $275, Clarifying Facial $275, Chemical Peel $295, Eyebrow Wax $35, Lip Wax $20, Eyebrow Tint $25. Other items stay TBD. Quote templates use those unit or vial prices; quantity is blank until staff enter it (no default unit counts or doses). Payments save a receipt document on the chart.
- **New appointment:** Location is a required dropdown even though there is only one location. New-patient visits also require **Consulting for** (Toxins, Fillers, Dissolve, Facial, Wax, Microneedling). That list lives in one place — `BRIZZA.consultingFor` in `assets/js/data.js` — so options are easy to add. Required fields are validated before the appointment is saved into the in-memory schedule with an audit entry.
- **Inventory** is in the Workspace nav and is usable when Acting as Clinic Manager or MD / Clinic Owner; other roles see a permission notice. It covers the catalog (price, cost TBD/editable, margin once a cost is entered), purchase orders with partial receiving (lot number, expiration, quantity), FEFO lots, open-vial units left, lot-to-patient recall search, low-stock alerts and reorder points, adjustments with required reasons, and an inventory audit log. Usage posts when an invoice is finalized.
- **Patients:** Clinical profile and treatment history are one section. Confirm Demographics writes the audit entry “Demographics manually confirmed” and updates the registration indicator. The former patient list is replaced by a Clinical notes list (date, Edit, View/Print, Open / Signed / Locked) with search; find-a-patient remains on the Worklist/calendar and in the chart header. Documents are grouped as Patient Intake, Consent, Payment (receipts, including those created from POS payments), and Quotes (every saved quote). View/Print opens a printable view.
- **History icon:** The same small clipboard-with-lines SVG is used site-wide for audit/history (aria-label and title “Audit log”). Clicking it opens a compact pop-up of that record’s history (who, role, when, field before/after), rather than a text link. This is one consistent mark, not a second icon.
- **Clinical notes:** Clinical roles see **Create Note**; non-clinical roles do not. Six draft templates (Injectables and Aesthetician Consult, Follow-up, and Procedure) are labeled Open question. Sign stays disabled until required fields are filled. Signing locks the note, records signer and time, writes audit, and stores a medical-history snapshot. Opening a past note highlights history that has changed since that snapshot. Units or amount fields stay empty and are not required.

## Tests (optional)

```bash
python3 tools/check_contrast.py
# with the static server already running:
/tmp/pw-venv/bin/python tools/test_mockup.py
```

See `HANDOFF.md` for what is done, what is next, and known bugs, and `OPEN_QUESTIONS.md` for labeled open questions.
