# Open questions

Items below are **not invented answers**. In the UI they appear as a labeled **Open question**, **Optional idea (undecided)**, or **Concept**. Each line includes a suggested default for discussion only.

1. **Non-blocking payment warning when completing an unpaid invoice.** Appointment and payment statuses stay independent; a warning is undecided. Suggested default: show a non-blocking warning when moving to Checked out if the invoice is not Paid.
2. **Where “No Charge” lives.** The payment labels stay Unpaid, Partially Paid, Paid, Refunded, and Voided; the balance lives on the invoice. Suggested default: record No Charge as a $0 Paid payment on the invoice.
3. **Staff roles for “Dr. Elena Ruiz” and “Dr. Samir Shah.”** These names are placeholders; Lina Park is a synthetic aesthetician. Suggested default: Elena Ruiz = MD / Clinic Owner; Samir Shah = RN / NP Injector; Lina Park = Aesthetician.
4. **Official visit-readiness and registration checklist.** ID uploaded, forms completed, and demographics confirmed are prototype indicators. Suggested default: keep those three indicators until an official checklist is named.
5. **Clinical Notes as a main chart tab vs DB-005.** The Clinical Notes tab was removed in Round 8; past notes for the open patient remain in the chart sidebar. Suggested default: keep notes in the sidebar only (no main tab) until DB-005 is updated.
6. **Note-status catalog.** Draft / Ready for review came from an earlier prototype. Suggested default: keep Open / Signed / Locked.
7. **Same-day documentation wording.** Journey §6 vs Sched §5. Suggested default: keep one Consultation note with procedure Yes/No, linked to the visit.
8. **Cancellation reasons and initiator.** Not defined (patient vs clinic; no fee amounts). Suggested default: add a later who/why form; do not invent fees.
9. **Decisions 435–440 and inventory costing / bill-reopen rules.** Checkout / FEFO posting is labeled Concept. Suggested default: leave Concept and costs TBD until provided.
10. **Inactivity timeout, backup RPO/RTO, and customizable permission groups (DB-088).** The mockup has no sign-in. Suggested default: defer to production design; no sign-in in this preview.
11. **Service prices and appointment durations.** Nicole’s prices are shown; other items, pay rates, and doses stay off-screen or TBD. Suggested default: keep given prices, TBD for the rest, quantities blank until entered.
12. **Brand and logo.** Theme 01 Quiet Atelier is DRAFT; the wordmark is a type test. Suggested default: keep the Brizza wordmark on theme 01 for this preview.
13. **Fiscal calendar, weekly cutoff, and reporting audiences.** Out of scope here. Suggested default: leave out of the mockup.
14. **Rooming status vs appointment status.** Official mapping remains a database question. Suggested default: keep the merged visit-status list used since Round 5.
15. **Admin schedule blocks.** Reason list, prevent-booking, and override rules are not approved. Suggested default: keep the current draft reasons; blocks prevent booking unless an admin override reason is recorded.
16. **Rooming suites and the Room field.** Suite 1 (Aesthetics) and Suites 2–3 (Injectables) are a prototype layout. Suggested default: keep this catalog and one occupant per suite.
17. **Clinical note templates and who may Create / Sign.** Six draft templates are not from the SOPs; Create Note is limited to RN / NP Injector and Aesthetician. Suggested default: keep that role gate and the six draft templates, labeled Open question.
18. **Official provider schedules.** Templates now drive shading and hovers; official hours, lunch, and Admin-block interaction remain open. Suggested default: keep templates as the preview source for shading and hovers.
19. **Consulting for catalog.** Toxins, Fillers, Dissolve, Facial, Wax, Microneedling is easy to extend but not approved. Suggested default: keep the current list.
20. **Quote-to-room workflow.** Treat today / Return and quote expiry are not specified in V1. Suggested default: keep the preview handoff; no expiry until specified.
21. **Friendly confirmation names and type catalog.** Plain type names are labeled draft. Suggested default: keep plain names and the current type/reason list.
22. **Medical-history snapshots on clinical notes.** Snapshot-on-sign is prototype behavior. Suggested default: keep snapshots and later-change highlighting.
23. **Merged visit-status list and earlier consultation/treatment statuses.** Pending a database update; those catalogs were removed from the UI in Round 7. Suggested default: keep the merged list; leave consultation/treatment out of the UI.
24. **Product costs and margin.** Costs were not provided; fields are editable TBD; margin appears after a cost is entered. Suggested default: costs stay TBD; margin only after a numeric cost, visible to Manager/Owner only.
25. **Open-vial beyond-use dating.** Opened date and units left are tracked; the beyond-use period is unspecified. Suggested default: keep those two fields only until a period is specified.
26. **Real clinic locations.** Long Island is a synthetic second location, labeled as such. Suggested default: Manhattan Clinic is official; Long Island stays a labeled synthetic example.
27. **Provider hours versus clinic hours.** Clinic hours remain Mon–Fri 10:00 a.m.–6:00 p.m. ET; 9–11 a.m. template blocks are shown and flagged. Suggested default: allow templates outside clinic hours, shown and flagged, until decided otherwise.
28. **Worklist bucket membership.** Which visit statuses belong in In progress, Pending, Completed, and No-show/Canceled is a preview mapping. Suggested default: Pending = Scheduled or Confirmed; In progress = Checked in through Ready for checkout; Completed = Checked out; No-show/Canceled = those two statuses.
29. **Address ZIP lookup source.** City/state auto-fill uses a small built-in list (NYC, Long Island, NJ, plus a handful more). Suggested default: keep the built-in list in the mockup; no live postal API.

Consultation outcome and treatment status were removed from the appointment UI in Round 7. The earlier catalogs are in `_superseded/consultation-treatment-status-r6.js`. Official status design remains an open database question (see 14 and 23).
