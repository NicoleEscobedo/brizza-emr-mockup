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
18. **Clinical note templates and who may Create / Sign.** Keep the role gate (RN / NP Injector and Aesthetician) and the six draft templates, labeled Open question.
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
