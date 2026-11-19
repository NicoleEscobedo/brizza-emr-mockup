# Open questions

Items below are **not invented answers**. In the UI they appear as a labeled **Open question**, **Optional idea (undecided)**, or **Concept**.

1. **Non-blocking payment warning when completing an unpaid invoice.** Nicole decided appointment and payment statuses are independent, and that Completed does not require payment. A non-blocking warning is undecided and is shown only as an optional idea on the appointment status window.
2. **Where “No Charge” lives.** The payment record keeps the five labels Unpaid, Partially Paid, Paid, Refunded, and Voided. The balance lives on the invoice. The earlier appointment payment-summary value “No Charge” is not one of those five labels and is not on the invoice status list.
3. **Staff roles for “Dr. Elena Ruiz” and “Dr. Samir Shah”.** These names are prototype placeholders. No V1 document assigns them to a DB-014 role. The treating role for Chemical Peel and Microneedling is also not named (qualified / treating provider only).
4. **Official visit-readiness and registration checklist.** Records §7 and §23 supply intake and registration-completion inputs, but there is no named work-queue or registration checklist. The queue uses derived prototype indicators (clinical consent, intake documents, allergies, draft notes). The schedule list registration panel shows ID uploaded, intake/consent forms completed, and demographics confirmed — also prototype indicators, each with a status and date.
5. **Clinical Notes as a main chart tab vs DB-005’s eight sections.** Records audits Clinical Notes as a section; DB-005 does not list it. The tab is shown and flagged.
6. **Note-status catalog.** Draft / Ready for review is carried from the prior prototype and is not an approved catalog.
7. **Same-day documentation wording.** Journey §6 says each appointment keeps its own documentation; Sched §5 says avoid duplicate notes. This mockup uses one Consultation note with procedure performed Yes/No, linked to the visit.
8. **Cancellation reasons and initiator.** Not defined in V1 documents (patient vs clinic; fee amounts are also not established).
9. **Decisions 435–440** (product taxation, checkout discounts, staff-level retail sales reporting, product images/descriptions, online catalog visibility, staff inventory display) and related inventory costing / bill-reopen rules. Checkout / FEFO posting is labeled **Concept**.
10. **Inactivity timeout value, backup RPO/RTO, and customizable permission groups (DB-088)** remain unset or unapproved. This mockup has no sign-in.
11. **Service prices and appointment durations.** Dropdowns show TBD. No prices, pay rates, or doses are displayed.
12. **Brand and logo.** The runtime theme is 01 Quiet Atelier (DRAFT, not a finalized identity). Lapis Conservatory and Architectural Classic were retired to `_superseded/`. Wordmarks are type tests, not logos.
13. **Fiscal calendar, weekly cutoff, and reporting audiences** remain open in the reporting architecture (out of scope here).

14. **Rooming status vs appointment status.** The rooming-manager statuses (Checked in (front desk), Completing paperwork, Ready, With clinical, Ready for provider, With provider, Ready for checkout, Checked out) are not mapped in the sources to the approved appointment-status catalog. This mockup stores rooming status as its own field and does not change appointment status when a rooming status is advanced or corrected.
15. **Admin schedule blocks.** Scheduling Standards mention blocked availability, but they do not define an Admin block type, the reason list used here (Meeting, Rep meeting, Lunch, Personal, OFF), whether a block prevents booking, or who may create or override a block beyond the already-sourced provider request rules.

16. **Rooming suites and the Room field.** Suite 1 (Aesthetics) and Suites 2 and 3 (Injectables) are a prototype layout. V1 documents do not approve this suite catalog, occupancy rules (this mockup allows one patient per suite), or how the Room field relates to appointment room and rooming status.

17. **Clinical note templates and who may Create / Sign notes.** The Consult template keeps the single Consultation note with procedure Yes/No (Sched §5 / §14). Toxin, Filler, Facial, and Microneedling templates are labeled **Draft templates – Open question** and are not taken from the SOPs or V1 documents. Create Note is shown only for RN / NP Injector and Aesthetician (from the V1-sourced role profiles, using Acting as). Whether MD / Clinic Owner or Medical Assistant may create or sign notes is not established.

18. **Provider office availability.** Shaded in-office hours (for example Manhattan 10–12 and 1–6, with a midday gap) are synthetic sample data, not taken from the V1 documents. Official provider schedules, lunch coverage, and how availability interacts with Admin blocks remain open.

19. **Consulting for catalog.** New-patient visits require a Consulting for value drawn from `BRIZZA.consultingFor` in `assets/js/data.js` (Toxins, Fillers, Dissolve, Facial, Wax, Microneedling). That list is easy to extend, but it is not an approved catalog in the V1 documents.

20. **Quote-to-room workflow.** After a consult, the coordinator can bring a POS quote to the room and the clinician can choose Treat today (convert to a same-day invoice) or Return (book a return visit or keep the quote open). This handoff, and when a quote expires, is not specified in the V1 documents.

21. **Friendly confirmation names and type catalog.** Confirmation names were not provided, so the mockup uses the plain type name labeled draft. Whether the nine types and the reason length overrides (Mini Facial, Hydrafacial, Toxin Touch-up, Wax reasons without overrides) are the official catalog remains open.

22. **Medical-history snapshots on clinical notes.** Storing a snapshot at signing and highlighting later changes is a prototype behavior, not an approved Records rule.
