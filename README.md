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

- **Schedule, Patients, Work queue, Rooming, Checkout, Configuration** are in the left navigation. Each screen has its own hash URL (for example `#/schedule/2026-11-16?theme=01`, `#/schedule/calendar/week/2026-11-16?theme=01`, `#/rooming/2026-11-18?theme=01`, `#/visits/V-1002?theme=01`, or `#/audit/AUD-0001?theme=01`).
- **Schedule** has List and Calendar views. Calendar has Day, Week, and Month modes, with previous/next and Today. Clinic hours are Monday–Friday, 10:00 a.m.–6:00 p.m. ET; weekends are shown as closed (month) or omitted (week columns). The List view has a location selector (Manhattan Clinic is the only real location) and expandable registration status on each appointment. Each appointment type has its own color and a legend. Provider office availability is shaded separately from clinic open hours (synthetic sample, labeled as an open question). Patient counts appear next to each date in day, week, and month views. A patient search bar finds patients and their appointments. Clicking an appointment on the calendar or in the list opens its card, which includes **Open Chart**. Click an empty slot on the day or week calendar, or an add action in the list, to open a new-appointment window prefilled with that date, time, and provider.
- The **sample day** is Monday, November 16, 2026. Use **Sample day** on the schedule to return to it. Clinic hours are Monday–Friday, 10:00 a.m.–6:00 p.m. ET. The clinic is cash-pay.
- **Theme switcher** (top right, labeled DRAFT): **01 Quiet Atelier (default)** and **Lapis Conservatory** (a new cool jewel-tone theme, not from the moodboards). Fonts are hosted locally (Cormorant Garamond + Jost for 01; Syne + IBM Plex Sans for Lapis); no CDN requests are made at runtime. Theme 02 was removed in a prior round. Theme 03 Architectural Classic was retired from the runtime and moved to `_superseded/` (kept in the repo, excluded from the deploy).
- **Start guided demo** is on the Configuration page, or go to `#/demo`. It runs about 60–90 seconds, with captions tied to decision IDs, and can be stepped or stopped.
- **Same-day consult-then-treat:** open Sofia Williams on the sample day, or go to `#/visits/V-1002` (two appointments under one visit, one invoice). Ava Thompson’s March 12 visit (`#/visits/V-1001`) is a completed historical example.
- **Checkout / FEFO:** `#/checkout/INV-1003`. Inventory posts only when the invoice is finalized. Amounts are TBD. This flow is labeled **Concept** where the design is not approved.
- Appointment status and payment status are independent: **Completed does not require payment**. Appointments that share an invoice show that invoice’s status.
- **Rooming:** `#/rooming` (seeded board: `#/rooming/2026-11-18`). Two boards: **Patient Flow** (the eight statuses) on top and **Rooms** below (Suite 1 Aesthetics, Suite 2 Injectables, Suite 3 Injectables). Patients can be dragged between statuses and into or out of a suite (HTML5 drag and drop, with a keyboard/click fallback). Each move logs time, staff, and an audit entry. A suite shows occupied or available and how long it has been occupied. Room is its own field. The **Acting as** selector lives in the sidebar (DB-014 roles).
- **Admin blocks** (Meeting, Rep meeting, Lunch, Personal, OFF) appear on the list and calendar, styled distinctly from appointments. Use **Admin block** to add one (provider/staff, weekday date, start/end within clinic hours, reason).
- **New appointment:** Location is a required dropdown even though there is only one location. New-patient visits also require **Consulting for** (Toxins, Fillers, Dissolve, Facial, Wax, Microneedling). That list lives in one place — `BRIZZA.consultingFor` in `assets/js/data.js` — so options are easy to add. Required fields are validated before the appointment is saved into the in-memory schedule with an audit entry.
- **Clinical notes:** Clinical roles (RN / NP Injector, Aesthetician, using **Acting as**) see a **Create Note** button in the chart and on the appointment card; non-clinical roles do not. Notes are template-based: pick a template (Consult, Toxin, Filler, Facial, Microneedling), fill required sections, and Sign stays disabled with a list of missing fields until every required field is filled. Signing locks the note, records signer and time, and writes audit. Templates other than the single Consultation note with procedure Yes/No are labeled **Draft templates – Open question**. Units or amount fields stay empty, with no example values, and are not required.

## Tests (optional)

```bash
python3 tools/check_contrast.py
# with the static server already running:
/tmp/pw-venv/bin/python tools/test_mockup.py
```

See `HANDOFF.md` for what is done, what is next, and known bugs, and `OPEN_QUESTIONS.md` for labeled open questions.
