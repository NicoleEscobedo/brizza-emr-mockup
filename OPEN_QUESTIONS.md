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
12. **Brand and logo.** The remaining moodboard themes (01 Quiet Atelier, default; 03 Architectural Classic v2) are DRAFT explorations, not a finalized identity. Theme 02 Modern Sanctuary v2 was removed. Wordmarks are type tests, not logos.
13. **Fiscal calendar, weekly cutoff, and reporting audiences** remain open in the reporting architecture (out of scope here).

14. **Rooming status vs appointment status.** The rooming-manager statuses (Checked in (front desk), Completing paperwork, Ready, With clinical, Ready for provider, With provider, Ready for checkout, Checked out) are not mapped in the sources to the approved appointment-status catalog. This mockup stores rooming status as its own field and does not change appointment status when a rooming status is advanced or corrected.
15. **Admin schedule blocks.** Scheduling Standards mention blocked availability, but they do not define an Admin block type, the reason list used here (Meeting, Rep meeting, Lunch, Personal, OFF), whether a block prevents booking, or who may create or override a block beyond the already-sourced provider request rules.
