# Open questions

Items below are **not invented answers**. In the UI they appear as a labeled **Open question**, **Optional idea (undecided)**, or **Concept**. Each remaining line includes a suggested default for discussion only.

## Answered in Round 9

- **Staff roster.** Dr. Valentina A. Rossi, MD (Owner) is the only MD; Alessia Costa, NP (injector); Stella Hayes, LE (aesthetician); Lily Morgan (Clinic Manager); Blair Brooks (Marketing); Serena Collins (Clinic Coordinator).
- **Worklist buckets.** Pending = Scheduled or Confirmed; In progress = Checked in through Ready for checkout; Completed = Checked out; No-show/Canceled = those two statuses.
- **Unpaid or partial checkout.** Allowed, with an alert. Front desk may also use Left without paying, which moves the amount due to the patient balance and adds a collect-balance task.
- **Booking outside office hours.** Allowed, with a required reason that is logged. Non-office hours are shaded darker gray.

## Still open

Schedule and Worklist first:

1. **Cancellation and no-show reason catalog.** The appointment card now requires a free-text reason. Suggested default: keep the free-text field until an official who/why list (and any fees) is named; do not invent fees.
2. **Admin schedule blocks.** Reason list, prevent-booking, and override rules are not approved. Suggested default: keep the current draft reasons; blocks prevent booking unless an admin override reason is recorded.
3. **Official provider schedules.** Templates drive the availability lines under the date; official hours, lunch, and how Admin blocks interact remain open. Suggested default: keep templates as the preview source for those lines.
4. **Week-view provider columns.** Day view shows providers as side-by-side columns; week view stays one column per day so the grid does not get crowded. Suggested default: keep week as one column per day unless Nicole wants provider sub-columns there too.
5. **Worklist task-filter criteria.** Needs confirmation, missing forms/ID, unpaid, quotes, and collect balance are a prototype of front-desk prep work. Suggested default: keep the current filters until official readiness criteria are named.
6. **Rooming suites and the Room field.** Suite 1 (Aesthetics) and Suites 2–3 (Injectables) are a prototype layout. Suggested default: keep this catalog and one occupant per suite.
7. **Real clinic locations.** Long Island is a synthetic second location, labeled as such. Suggested default: Manhattan Clinic is official; Long Island stays a labeled synthetic example.

Other remaining items:

8. **Official visit-readiness and registration checklist.** ID uploaded, forms completed, and demographics confirmed are prototype indicators. Suggested default: keep those three until an official checklist is named.
9. **Clinical Notes as a main chart tab vs DB-005.** The tab was removed in Round 8; past notes for the open patient remain in the chart sidebar. Suggested default: keep notes in the sidebar only until DB-005 is updated.
10. **Note-status catalog.** Draft / Ready for review came from an earlier prototype. Suggested default: keep Open / Signed / Locked.
11. **Same-day documentation wording.** Journey §6 vs Sched §5. Suggested default: keep one Consultation note with procedure Yes/No, linked to the visit.
12. **Decisions 435–440 and inventory costing / bill-reopen rules.** Checkout / FEFO posting is labeled Concept. Suggested default: leave Concept and costs TBD until provided.
13. **Inactivity timeout, backup RPO/RTO, and customizable permission groups (DB-088).** The mockup has no sign-in. Suggested default: defer to production design; no sign-in in this preview.
14. **Service prices and appointment durations.** Nicole’s prices are shown; other items, pay rates, and doses stay off-screen or TBD. Suggested default: keep given prices, TBD for the rest, quantities blank until entered.
15. **Brand and logo.** Theme 01 Quiet Atelier is DRAFT; the wordmark is a type test. Suggested default: keep the Brizza wordmark on theme 01 for this preview.
16. **Fiscal calendar, weekly cutoff, and reporting audiences.** Out of scope here. Suggested default: leave out of the mockup.
17. **Rooming status vs appointment status.** Official mapping remains a database question. Suggested default: keep the merged visit-status list used since Round 5.
18. **Clinical note templates and who may Create / Sign.** Six draft templates are not from the SOPs; Create Note is limited to RN / NP Injector and Aesthetician. Suggested default: keep that role gate and the six draft templates, labeled Open question.
19. **Consulting for catalog.** Toxins, Fillers, Dissolve, Facial, Wax, Microneedling is easy to extend but not approved. Suggested default: keep the current list.
20. **Quote-to-room workflow.** Treat today / Return and quote expiry are not specified in V1. Suggested default: keep the preview handoff; no expiry until specified.
21. **Friendly confirmation names and type catalog.** Plain type names are labeled draft. Suggested default: keep plain names and the current type/reason list.
22. **Medical-history snapshots on clinical notes.** Snapshot-on-sign is prototype behavior. Suggested default: keep snapshots and later-change highlighting.
23. **Merged visit-status list and earlier consultation/treatment statuses.** Pending a database update; those catalogs were removed from the UI in Round 7. Suggested default: keep the merged list; leave consultation/treatment out of the UI.
24. **Product costs and margin.** Costs were not provided; fields are editable TBD; margin appears after a cost is entered. Suggested default: costs stay TBD; margin only after a numeric cost, visible to Manager/Owner only.
25. **Open-vial beyond-use dating.** Opened date and units left are tracked; the beyond-use period is unspecified. Suggested default: keep those two fields only until a period is specified.
26. **Where “No Charge” lives.** The payment labels stay Unpaid, Partially Paid, Paid, Refunded, and Voided; the balance lives on the invoice. Suggested default: record No Charge as a $0 Paid payment on the invoice.
27. **Address ZIP lookup source.** City/state auto-fill uses a small built-in list (NYC, Long Island, NJ, plus a handful more). Suggested default: keep the built-in list in the mockup; no live postal API.

Consultation outcome and treatment status were removed from the appointment UI in Round 7. The earlier catalogs are in `_superseded/consultation-treatment-status-r6.js`. Official status design remains an open database question (see 17 and 23).
