# Open questions

Items below are **not invented answers**. In the UI they appear as a labeled **Open question**, **Optional idea (undecided)**, or **Concept**. Each remaining line includes a suggested default for discussion only.

## Answered in Round 9

- **Staff roster.** Dr. Valentina A. Rossi, MD (Owner) is the only MD; Alessia Costa, NP (injector); Stella Hayes, LE (aesthetician); Lily Morgan (Clinic Manager); Blair Brooks (Marketing); Serena Collins (Clinic Coordinator).
- **Worklist buckets.** Pending = Scheduled or Confirmed; In progress = Checked in through Ready for checkout; Completed = Checked out; No-show/Canceled = those two statuses.
- **Unpaid or partial checkout.** Allowed, with an alert. Front desk may also use Left without paying, which moves the amount due to the patient balance and adds a collect-balance task.
- **Booking outside office hours.** Allowed, with a required reason that is logged. Non-office hours are shaded darker gray.

## Decided in Round 10 (Round 9 suggested defaults, approved)

1. **Cancellation and no-show reason catalog.** Keep the free-text reason on the appointment card until an official who/why list (and any fees) is named; do not invent fees.
2. **Admin schedule blocks.** Keep the current draft reasons; blocks prevent booking unless an admin override reason is recorded.
3. **Official provider schedules.** Keep templates as the preview source for the availability lines under the date.
4. **Week-view provider columns.** Keep week view as one column per day (Day view stays side-by-side provider columns).
5. **Worklist task-filter criteria.** Keep the current filters until official readiness criteria are named.
6. **Rooming suites and the Room field.** Keep Suite 1 (Aesthetics) and Suites 2–3 (Injectables), with one occupant per suite.
7. **Real clinic locations.** Manhattan Clinic is official; Long Island stays a labeled synthetic example.
8. **Official visit-readiness and registration checklist.** Keep ID uploaded, forms completed, and demographics confirmed until an official checklist is named.
9. **Clinical Notes as a main chart tab vs DB-005.** Keep notes in the chart sidebar only until DB-005 is updated.
10. **Note-status catalog.** Keep Open / Signed / Locked.
11. **Same-day documentation wording.** Keep one Consultation note with procedure Yes/No, linked to the visit.
12. **Decisions 435–440 and inventory costing / bill-reopen rules.** Leave Concept; costs stay TBD until provided.
13. **Inactivity timeout, backup RPO/RTO, and customizable permission groups (DB-088).** Defer to production design; no sign-in in this preview.
14. **Service prices and appointment durations.** Keep Nicole’s prices; other items, pay rates, and doses stay off-screen or TBD; quantities stay blank until entered.
15. **Brand and logo.** Keep the Brizza wordmark on theme 01 Quiet Atelier for this preview.
16. **Fiscal calendar, weekly cutoff, and reporting audiences.** Leave out of the mockup.
17. **Rooming status vs appointment status.** Keep the merged visit-status list used since Round 5.
18. **Clinical note templates and who may Create / Sign.** Round 10 kept the six draft templates, labeled Open question, with a role gate for RN / NP Injector and Aesthetician. Round 12 keeps that per-role template filter and lets MD / Clinic Owner open, create, edit, and sign any note (see Still open #30).
19. **Consulting for catalog.** Keep Toxins, Fillers, Dissolve, Facial, Wax, and Microneedling.
20. **Quote-to-room workflow.** Keep the preview handoff; no expiry until specified.
21. **Friendly confirmation names and type catalog.** Keep plain type names and the current type/reason list.
22. **Medical-history snapshots on clinical notes.** Keep snapshots and later-change highlighting.
23. **Merged visit-status list and earlier consultation/treatment statuses.** Keep the merged list; leave consultation/treatment status out of the UI. Earlier catalogs remain in `_superseded/consultation-treatment-status-r6.js`.
24. **Product costs and margin.** Costs stay TBD; margin only after a numeric cost, visible to Manager/Owner only.
25. **Open-vial beyond-use dating.** Keep opened date and units left only until a period is specified.
26. **Where “No Charge” lives.** Record No Charge as a $0 Paid payment on the invoice; payment labels stay Unpaid, Partially Paid, Paid, Refunded, and Voided.
27. **Address ZIP lookup source.** Keep the built-in list in the mockup; no live postal API.

## Still open

1. **Print receipt contents.** The invoice Print receipt button opens a print-friendly page (clinic name, invoice id, date, patient, line prices, totals, payments) and calls `window.print`. Suggested default: keep that set; no costs, doses, tax line, or signature block until named.
2. **Consultation card wording.** New consults show `New Patient – {service}`; existing consults show `Established Patient – {service}`; other consults show `Consult · {service}`. Toxins displays as Toxin. Suggested default: keep this mapping.
3. **Provider field on the new-appointment window.** The simplified form hides the provider and sets it from the clicked slot. Suggested default: keep it hidden and assigned from the slot.
4. **Booking duration increments.** Start, end, and duration stay in sync. Suggested default: 15-minute steps, defaulted from the appointment type.
5. **Invoice payment default.** Payment status opens as Paid with the full balance filled in. Suggested default: keep Paid + full amount; staff can change the status or amount before recording.
6. **Duplicate catalog lines.** Adding the same product twice creates two cart lines, each with its own Remove. Suggested default: keep separate lines rather than merging quantities.
7. **Week-view row height at 30-minute intervals.** Week slots are slightly tighter than Day view so the longer grid still fits. Suggested default: keep the tighter week slots; leave Day view as it is.
8. **Worklist next-pending color.** The next pending row uses soft blush `#F3D8DC` with ink `#352820` (AA). Suggested default: keep this blush; Late stays rose, and the rooming wait timer stays gold.

9. **Face-map region catalog.** The muscle-view map marks forehead, glabella, brows, crow’s feet, bunny lines, masseter, DAO, perioral, and chin. Suggested default: keep this region set until an official muscle list is named.
10. **Units on the face map.** Units start empty and are never suggested. Suggested default: keep units optional and typable only; do not add doses or defaults.
11. **Note-builder question trees.** Follow-up questions and the generated sentences only echo what was selected or typed. Suggested default: keep the current trees for the six draft templates, labeled Open question with the templates.
12. **Addendum rules after signing.** Signed notes change only by addendum. Suggested default: keep addenda appended under the note with author and time; do not reopen the body for editing.
13. **Ledger prepayments.** A blank Add payment amount becomes patient credit. Suggested default: keep prepayments as credit until an official unapplied-payment ledger is named.
14. **Provider Notes dashboard audience.** The nav item is available to every role and lists clinic-wide unsigned and signed notes. Suggested default: keep it clinic-wide in this preview; a provider-only filter can wait.

15. **Hide canceled on the calendar.** The toggle is remembered in localStorage and defaults to showing canceled visits (muted, strikethrough, Canceled badge). Suggested default: keep the remembered toggle; default is shown.
16. **Combined rooming columns.** Dropping onto a combined bucket keeps the current status if it already belongs to that group; otherwise it uses the first status (Checked in, or Ready for checkout). Suggested default: keep this drop rule.
17. **Worklist status dropdown.** Front desk pick from Scheduled → Confirmed → Checked in → Checked out → No-show → Canceled. Clinical statuses show as a read-only badge; Ready for checkout is not a dropdown choice (staff pick Checked out). The appointment card still uses the full visit-status list. Suggested default: keep this split; keep the unpaid-checkout alert and Left without paying.
18. **Clinical notes column empty state.** Visits without a note show a calm dash, not the word None. Suggested default: keep the dash.
19. **Notes dashboard Today and default range.** Today is the demo day (2026-11-18), not the real clock. The default view is unfiltered (All dates). Suggested default: keep Today bound to the demo clock, and All dates as the starting range.
20. **Forms tab content.** HIPAA, procedure, aftercare, and marketing consents are labeled placeholders (“Placeholder, to be written by compliance”) with Signed or Pending status only. Suggested default: keep placeholder copy until compliance writes the forms; do not invent legal text.
21. **Aesthetician procedure settings and Fitzpatrick options.** Treatment/settings is optional free text and is never prefilled. Skin type uses Fitzpatrick I–VI. Suggested default: keep settings empty and typable only; keep this scale until an official list is named.
22. **Consent confirmed placement.** The field appears only on procedure notes, not on consults or follow-ups. Suggested default: keep it off consults and follow-ups.
23. **Reviewed, no changes lock.** Checking the box persists on save and reopen. Lock confirmation records the acting user, role, and timestamp and disables the checkbox; editing history fields clears the lock. Suggested default: keep lock as an explicit action; do not auto-lock on Sign.
24. **Generated note framing.** A lead sentence states that the note records only selected or entered details, followed by longer clinic-grade sentences that echo those facts. Suggested default: keep this framing; never invent findings, doses, settings, or claims.

## Approved in Round 13 (Round 12 suggested defaults)

25. **Rooming at narrower widths.** Keep the compact timers and in-column scroll so the Patient Flow board and Suites 1–3 fit a 1280×800 viewport without vertical page scroll; allow page scroll only below about 1100px.
26. **Open clinical notes on the Worklist.** Keep the grouping after Collect balance as clinic-wide unsigned notes for the Worklist date, with provider initials and Open note; do not filter to the acting provider in this preview.
27. **Other treatment area on Injectable Procedure notes.** Keep a single optional Other row (label + units, both starting empty) added to the face-map units; do not invent area names or unit amounts.
28. **Units documented auto-sum.** Keep Units documented in sync with face-map plus Other units; do not require it to sign and do not suggest doses.
29. **Last reviewed stamp.** Keep “Last reviewed: [date/time] by [user]” under Confirm Demographics (an em dash until the first confirm in the session); persistence can wait with the rest of the in-memory mockup.
30. **Who may create or sign notes besides clinical roles and the MD / Owner.** Keep the current gate: Aesthetician, RN / NP Injector, and MD / Clinic Owner can create notes as already gated; Medical Assistant and other non-clinical roles cannot, until an official MA or front-desk documentation rule is named.
31. **New appointment date field.** Keep the date in the modal title only, taken from the current screen or slot; do not add a visible Date field.
32. **View vs Print on clinical notes.** Keep View on the notes list, with Print inside the View window so print happens from the readable view.

## Still open (Round 13)

25. **Worklist hash.** New links use `#/worklist/DATE`; `#/schedule/worklist/DATE` and `#/schedule/list/DATE` still open the Worklist. Suggested default: keep this compatibility; do not break old bookmarks.
26. **Schedule default route.** `#/schedule` and `#/schedule/DATE` open the calendar (week mode unless a day/month segment is in the hash), not the Worklist. Suggested default: keep Schedule calendar-only.
27. **Tasks page contents.** Tasks (`#/tasks/DATE`; `#/queue/` still works) shows only the Follow-up tasks card. Suggested default: keep Visit readiness off this page, since readiness now appears as the Worklist Prep column.
28. **Prep readiness checklist.** The Prep pill uses the former Work queue indicators (clinical consent, intake documents, allergies recorded, and an unsigned/draft note flag). Suggested default: keep this prototype checklist until official readiness criteria are named.
29. **Global density.** Body type is 14.4px with slightly tighter padding and spacing (~95% of the prior density) so 100% zoom is closer to a 94–96% view. Suggested default: keep this density; do not shrink further if Rooming must stay on one 1280×800 screen.
30. **Unassigned suite under Time.** When no suite is set, Time shows an em dash under the clock (the same stack as the Late tag). Suggested default: keep the dash so the Time column stays consistent.
31. **Type / Reason column.** Type and Reason share one column, with the reason set in muted type. Suggested default: keep this combined cell.
32. **Left without paying placement.** The control is only inside the Checkout / Invoice modal, not on the main Worklist row. Suggested default: keep it off the row.
33. **New appointment and Admin block placement.** Both actions sit on the Schedule (calendar) header, not the Worklist header. Suggested default: keep booking and blocks on the calendar header; calendar slot ＋ Add remains.
34. **Demographics confirm from the Worklist.** The main row shows only the [ID][F][D] widget. Confirmed / Not confirmed, Edit, and Confirm demographics appear in the expanded registration panel; Edit still opens the demographics pop-up. Suggested default: keep both the in-panel Confirm and the pop-up path.

## Still open (Round 14a)

35. **Team & Access name.** The new Admin section is labeled Team & Access. Suggested default: keep Team & Access until Nicole picks another name.
36. **Who may invite or deactivate users.** Invite and Edit work in memory for this preview, with no sign-in. Suggested default: only MD / Owner and Clinic Manager, until an official rule is named.
37. **Access-level labels.** Access is derived from the existing acting-role permissions (Full access, Manager, Front desk, Clinical · Injectables, Clinical · Aesthetics, Marketing, Clinical support). Suggested default: keep these labels until official permission names are provided.
38. **Chart booking locks the patient.** + Appointment from the Patient chart shows a read-only chip (name, DOB, #ID) with no search and no + Add new patient. Suggested default: keep the patient locked from the chart; allow search only when booking from Schedule.
39. **EMR overview.** The new EMR section is a simple provider page with today's patients, a short snapshot, ＋ New note, and pending notes. Notes stays in Workspace. Suggested default: keep this overview until Nicole asks for more on the page.
