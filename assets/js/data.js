/* Synthetic sample data only. No real patients. No pay rates or doses.
   Nicole-given service/product prices may be shown; product costs were not given and stay TBD. */
window.BRIZZA = window.BRIZZA || {};

BRIZZA.SAMPLE_DAY = "2026-11-16";
BRIZZA.DEMO_CLOCK = { date: "2026-11-18", time: "11:25", label: "11:25 a.m. ET" };
BRIZZA.CLINIC = {
  name: "Brizza Aesthetics",
  location: "Manhattan Clinic",
  hours: "Monday–Friday, 10:00 a.m.–6:00 p.m. ET",
  tz: "America/New_York",
  payModel: "Cash-pay"
};

/* Manhattan Clinic is the sourced location. Long Island is a synthetic sample location (Open question 26). */
BRIZZA.LOCATIONS = [
  { id: "LOC-MANHATTAN", name: "Manhattan Clinic", short: "Manhattan", hours: "Monday–Friday, 10:00 a.m.–6:00 p.m. ET", tz: "America/New_York", synthetic: false },
  { id: "LOC-LONGISLAND", name: "Long Island", short: "Long Island", hours: "Monday–Friday, 10:00 a.m.–6:00 p.m. ET", tz: "America/New_York" }
];
BRIZZA.DEFAULT_LOCATION = "LOC-MANHATTAN";
/* Built-in ZIP lookup for address auto-fill (NYC / Long Island / NJ plus a handful more). Prototype only. */
BRIZZA.ZIP_LOOKUP = {
  "10001": { city: "New York", state: "NY" },
  "10003": { city: "New York", state: "NY" },
  "10010": { city: "New York", state: "NY" },
  "10011": { city: "New York", state: "NY" },
  "10013": { city: "New York", state: "NY" },
  "10014": { city: "New York", state: "NY" },
  "10016": { city: "New York", state: "NY" },
  "10019": { city: "New York", state: "NY" },
  "10022": { city: "New York", state: "NY" },
  "10023": { city: "New York", state: "NY" },
  "10024": { city: "New York", state: "NY" },
  "10025": { city: "New York", state: "NY" },
  "10036": { city: "New York", state: "NY" },
  "11201": { city: "Brooklyn", state: "NY" },
  "11215": { city: "Brooklyn", state: "NY" },
  "11101": { city: "Long Island City", state: "NY" },
  "11050": { city: "Port Washington", state: "NY" },
  "11530": { city: "Garden City", state: "NY" },
  "11561": { city: "Long Beach", state: "NY" },
  "11702": { city: "Babylon", state: "NY" },
  "11743": { city: "Huntington", state: "NY" },
  "11746": { city: "Huntington Station", state: "NY" },
  "11901": { city: "Riverhead", state: "NY" },
  "07030": { city: "Hoboken", state: "NJ" },
  "07002": { city: "Bayonne", state: "NJ" },
  "07102": { city: "Newark", state: "NJ" },
  "07302": { city: "Jersey City", state: "NJ" },
  "07601": { city: "Hackensack", state: "NJ" },
  "06830": { city: "Greenwich", state: "CT" },
  "02108": { city: "Boston", state: "MA" }
};
BRIZZA.COUNTRIES = ["United States", "Canada", "United Kingdom", "Mexico"];



BRIZZA.THEMES = {
  "01": { id: "01", name: "Quiet Atelier", short: "01 Atelier", status: "DRAFT", default: true }
};

/* Body-text pairs plus appointment-type chips. WCAG 2.1 AA (≥4.5:1) for body text. */
BRIZZA.CONTRAST_PAIRS = {
  "01": [
    { fg: "#352820", bg: "#F4F0E9", use: "body ink on ivory", min: 4.5 },
    { fg: "#6E6055", bg: "#F4F0E9", use: "muted on ivory", min: 4.5 },
    { fg: "#352820", bg: "#E7D7CC", use: "ink on chalk blush / notices", min: 4.5 },
    { fg: "#352820", bg: "#B8AA9B", use: "ink on taupe — large only if <4.5", min: 3 },
    { fg: "#F4F0E9", bg: "#352820", use: "sidebar and primary button", min: 4.5 },
    { fg: "#352820", bg: "#FBF8F3", use: "ink on paper", min: 4.5 },
    { fg: "#6E6055", bg: "#FBF8F3", use: "muted on paper", min: 4.5 },
    { fg: "#352820", bg: "#FFFCF6", use: "ink on creamy appointment card", min: 4.5 },
    { fg: "#6E6055", bg: "#FFFCF6", use: "muted on creamy appointment card", min: 4.5 },
    { fg: "#352820", bg: "#E4D5C4", use: "Admin block", min: 4.5 },
    { fg: "#352820", bg: "#E8C547", use: "rooming wait timer gold (≥15 min)", min: 4.5 },
    { fg: "#352820", bg: "#F3D8DC", use: "worklist next-pending row (soft blush)", min: 4.5 },
    { fg: "#6B1C1C", bg: "#F6E4E0", use: "worklist Late tag", min: 4.5 },
    { fg: "#8A1F2B", bg: "#FFFCF6", use: "required asterisk on clinical notes", min: 4.5 },
    { fg: "#352820", bg: "#C9C3BA", use: "ink on non-office-hours calendar shading", min: 4.5 },
    { fg: "#FFFCF6", bg: "#5A3510", use: "status dropdown Checked in", min: 4.5 },
    { fg: "#FFFCF6", bg: "#2A5EA8", use: "status dropdown Ready for clinical", min: 4.5 },
    { fg: "#FFFCF6", bg: "#2E7A4F", use: "status dropdown With clinical", min: 4.5 },
    { fg: "#FFFCF6", bg: "#6B4CA0", use: "status dropdown Ready for provider", min: 4.5 },
    { fg: "#FFFCF6", bg: "#A44D68", use: "status dropdown With provider", min: 4.5 },
    { fg: "#FFFCF6", bg: "#8A6A28", use: "status dropdown Ready for checkout", min: 4.5 },
    { fg: "#FFFCF6", bg: "#1E3044", use: "status dropdown Checked out", min: 4.5 },
    { fg: "#FFFCF6", bg: "#6E6055", use: "status dropdown Confirmed / Canceled", min: 4.5 },
    { fg: "#FFFCF6", bg: "#7A2E22", use: "status dropdown No-show", min: 4.5 }
  ]
};

/* Appointment types and reasons are data-driven and editable in memory (Admin pages).
   Lengths include buffers. Friendly confirmation names were not provided; plain names are labeled draft. */
BRIZZA.appointmentReasons = [
  { id: "new-patient", name: "New Patient" },
  { id: "existing-patient", name: "Existing Patient" },
  { id: "botox", name: "Botox" },
  { id: "jeuveau", name: "Jeuveau" },
  { id: "juvederm", name: "Juvederm" },
  { id: "volbella", name: "Volbella" },
  { id: "toxin-touch-up", name: "Toxin Touch-up", minutes: 15 },
  { id: "dissolve", name: "Dissolve" },
  { id: "mini-facial", name: "Mini Facial", minutes: 30 },
  { id: "facial", name: "Facial" },
  { id: "hydrafacial", name: "Hydrafacial", minutes: 75 },
  { id: "chemical-peel", name: "Chemical Peel" },
  { id: "microneedling", name: "Microneedling" },
  { id: "eyebrows", name: "Eyebrows" },
  { id: "lips", name: "Lips" },
  { id: "face", name: "Face" },
  { id: "follow-up", name: "Follow-up" }
];

BRIZZA.appointmentTypes = [
  { id: "consultation", name: "Consultation", minutes: 15, confirmName: "Consultation", confirmDraft: true, reasonIds: ["new-patient", "existing-patient"], deposit: 50 },
  { id: "neurotoxin", name: "Neurotoxin", minutes: 30, confirmName: "Neurotoxin", confirmDraft: true, reasonIds: ["botox", "jeuveau", "toxin-touch-up"] },
  { id: "filler", name: "Filler", minutes: 30, confirmName: "Filler", confirmDraft: true, reasonIds: ["juvederm", "volbella"] },
  { id: "dissolve", name: "Dissolve", minutes: 45, confirmName: "Dissolve", confirmDraft: true, reasonIds: ["dissolve"], requiredRole: "MD / Clinic Owner" },
  { id: "facial", name: "Facial", minutes: 60, confirmName: "Facial", confirmDraft: true, reasonIds: ["mini-facial", "facial", "hydrafacial"] },
  { id: "chemical-peel", name: "Chemical Peel", minutes: 60, confirmName: "Chemical Peel", confirmDraft: true, reasonIds: ["chemical-peel"] },
  { id: "microneedling", name: "Microneedling", minutes: 75, confirmName: "Microneedling", confirmDraft: true, reasonIds: ["microneedling"] },
  { id: "wax", name: "Wax", minutes: 30, confirmName: "Wax", confirmDraft: true, reasonIds: ["eyebrows", "lips", "face"], requiredRole: "Aesthetician" },
  { id: "follow-up", name: "Follow-up", minutes: 15, confirmName: "Follow-up", confirmDraft: true, reasonIds: ["follow-up", "botox", "jeuveau", "juvederm", "volbella", "mini-facial", "facial", "hydrafacial", "chemical-peel", "microneedling", "toxin-touch-up"] }
];

/* Cards fill by type family; the left stripe is visit status. Text is ink (AA). */
BRIZZA.CARD_CREAM = "#FFFCF6";
BRIZZA.TYPE_FAMILIES = [
  { id: "injectables", name: "Injectables", types: ["Neurotoxin", "Filler", "Dissolve"], bg: "#F3E4D8", fg: "#352820" },
  { id: "skin", name: "Skin", types: ["Facial", "Chemical Peel", "Microneedling", "Hydrafacial", "Mini Facial", "Customized Facial"], bg: "#E8E0F0", fg: "#352820" },
  { id: "wax", name: "Wax", types: ["Wax"], bg: "#F3DDD8", fg: "#352820" },
  { id: "consult", name: "Consult / Follow-up", types: ["Consultation", "Follow-up"], bg: "#E4EAF3", fg: "#352820" },
  { id: "admin", name: "Admin", types: ["Admin", "Meeting", "Rep meeting", "Lunch", "Personal", "OFF"], bg: "#EDE8E0", fg: "#352820" }
];
BRIZZA.TYPE_COLORS = {
  "Consultation": { bg: "#E4EAF3", fg: "#352820", bar: "#B7C9E8" },
  "Neurotoxin": { bg: "#F3E4D8", fg: "#352820", bar: "#E6C8B4" },
  "Filler": { bg: "#F3E4D8", fg: "#352820", bar: "#E8C2D3" },
  "Dissolve": { bg: "#F3E4D8", fg: "#352820", bar: "#E8D0B8" },
  "Facial": { bg: "#E8E0F0", fg: "#352820", bar: "#D4C4E8" },
  "Chemical Peel": { bg: "#E8E0F0", fg: "#352820", bar: "#E6D6A8" },
  "Microneedling": { bg: "#E8E0F0", fg: "#352820", bar: "#D5C6DE" },
  "Wax": { bg: "#F3DDD8", fg: "#352820", bar: "#E8C8C0" },
  "Follow-up": { bg: "#E4EAF3", fg: "#352820", bar: "#C5D0DC" }
};

/* Nicole-given prices (2026-11-18). Costs were not given — cost stays null/TBD. Quantity is entered by staff. */
BRIZZA.TAX_RATE = 0.08875;
BRIZZA.CATALOG = [
  { id: "botox", name: "Botox", kind: "product", unit: "unit", price: 21, cost: null, reorderPoint: 10, trackLots: true, trackOpenVial: true },
  { id: "jeuveau", name: "Jeuveau", kind: "product", unit: "unit", price: 17, cost: null, reorderPoint: 8, trackLots: true, trackOpenVial: true },
  { id: "juvederm", name: "Juvederm 1.0 cc", kind: "product", unit: "syringe", price: 900, cost: null, reorderPoint: 2, trackLots: true, trackOpenVial: true },
  { id: "volbella-055", name: "Volbella 0.55 cc", kind: "product", unit: "syringe", price: 750, cost: null, reorderPoint: 1, trackLots: true, trackOpenVial: true },
  { id: "volbella", name: "Volbella 1.0 cc", kind: "product", unit: "syringe", price: 900, cost: null, reorderPoint: 1, trackLots: true, trackOpenVial: true },
  { id: "consultation", name: "Consultation deposit", kind: "service", unit: "visit", price: 50, cost: null, reorderPoint: null, trackLots: false },
  { id: "follow-up", name: "Follow-up", kind: "service", unit: "visit", price: 150, cost: null, reorderPoint: null, trackLots: false, note: "Complimentary within 14 days of a paid treatment" },
  { id: "dissolve", name: "Dissolve", kind: "service", unit: "session", price: 550, cost: null, reorderPoint: null, trackLots: false },
  { id: "dissolve-extra", name: "Dissolve extra vial", kind: "service", unit: "vial", price: 400, cost: null, reorderPoint: null, trackLots: false },
  { id: "mini-facial", name: "Mini Facial", kind: "service", unit: "session", price: 225, cost: null, reorderPoint: null, trackLots: false },
  { id: "facial", name: "Facial", kind: "service", unit: "session", price: 325, cost: null, reorderPoint: null, trackLots: false },
  { id: "hydrafacial", name: "Hydrafacial", kind: "service", unit: "session", price: 375, cost: null, reorderPoint: null, trackLots: false },
  { id: "chemical-peel", name: "Chemical Peel", kind: "service", unit: "session", price: 425, cost: null, reorderPoint: 2, trackLots: true, trackOpenVial: false },
  { id: "microneedling", name: "Microneedling", kind: "service", unit: "session", price: 550, cost: null, reorderPoint: null, trackLots: false },
  { id: "eyebrow-wax", name: "Eyebrow Wax", kind: "service", unit: "session", price: 55, cost: null, reorderPoint: null, trackLots: false },
  { id: "lip-wax", name: "Lip Wax", kind: "service", unit: "session", price: 25, cost: null, reorderPoint: null, trackLots: false },
  { id: "face-wax", name: "Face Wax", kind: "service", unit: "session", price: 85, cost: null, reorderPoint: null, trackLots: false },
  { id: "membership-bank", name: "Treatment Bank", kind: "membership", unit: "month", price: 150, cost: null, reorderPoint: null, trackLots: false },
  { id: "membership-skin", name: "Skin plan", kind: "membership", unit: "month", price: 225, cost: null, reorderPoint: null, trackLots: false },
  { id: "retail-ce-ferulic", name: "SkinCeuticals C E Ferulic 30 ml", kind: "retail", unit: "bottle", price: 185, cost: null, reorderPoint: 2, trackLots: false },
  { id: "retail-triple-lipid", name: "SkinCeuticals Triple Lipid Restore 2:4:2", kind: "retail", unit: "bottle", price: 155, cost: null, reorderPoint: 2, trackLots: false },
  { id: "retail-spf", name: "SkinCeuticals Physical Fusion UV Defense SPF 50", kind: "retail", unit: "bottle", price: 45, cost: null, reorderPoint: 2, trackLots: false },
  { id: "retail-eltamd", name: "EltaMD UV Clear SPF 46 1.7 oz", kind: "retail", unit: "bottle", price: 46, cost: null, reorderPoint: 2, trackLots: false },
  { id: "retail-ptiox", name: "SkinCeuticals P-TIOX Anti-Wrinkle Peptide Cream", kind: "retail", unit: "bottle", price: 150, cost: null, reorderPoint: 2, trackLots: false }
];

BRIZZA.QUOTE_TEMPLATES = [
  { id: "full-face-toxin", name: "Full-face toxin", lines: [{ kind: "product", catalogId: "botox", name: "Botox", unit: "unit", unitPrice: 21, qty: null }] },
  { id: "lip-filler", name: "Lip filler", lines: [{ kind: "product", catalogId: "juvederm", name: "Juvederm", unit: "vial", unitPrice: 900, qty: null }] },
  { id: "facial-series-3", name: "Facial series of 3", lines: [{ kind: "package", catalogId: "hydrafacial", name: "Hydrafacial", unit: "session", unitPrice: 375, qty: null }] }
];

BRIZZA.ADJUST_REASONS = ["Waste", "Expired", "Damaged", "Count correction", "Return to vendor", "Other"];
BRIZZA.DOC_CATEGORIES = ["Patient Intake", "Consent", "Payment", "Quotes"];
BRIZZA.NOTE_STATUSES = ["Draft", "Ready for review", "Finalized", "Amended"];
BRIZZA.INVENTORY_ROLES = ["MD / Clinic Owner", "Clinic Manager"];
BRIZZA.VENDORS = ["Allergan (sample vendor)", "SkinMedica (sample vendor)", "Clinic supply (sample)"];

BRIZZA.POS_LINE_KINDS = ["service", "product", "membership", "package", "prepayment", "quote"];
BRIZZA.QUOTE_STATUSES = ["Open", "Prepaid", "Converted", "Expired"];

/* Facial reasons Mini Facial / Facial / Hydrafacial now attach to the Facial appointment type. */

/* One merged visit-status list (schedule + rooming). Canceled is schedule-only.
   Ready for clinical and later also appear on the rooming board. */
BRIZZA.VISIT_STATUSES = [
  "Scheduled", "Confirmed", "Checked in", "No-show", "Canceled",
  "Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout", "Checked out"
];
BRIZZA.SCHEDULE_ONLY_STATUSES = ["Scheduled", "Confirmed", "Checked in", "No-show", "Canceled"];
BRIZZA.ROOMING_BOARD_STATUSES = ["Checked in", "Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout", "Checked out"];
/* Patient flow columns use official visit statuses (Nicole, Ops Q13). Architect had modeled separate rooming-step labels; see Round 16 conflicts. */
BRIZZA.ROOMING_FLOW_BUCKETS = [
  { id: "checked-in", label: "Checked in", statuses: ["Checked in"] },
  { id: "ready-clinical", label: "Ready for clinical", statuses: ["Ready for clinical"] },
  { id: "with-clinical", label: "With clinical", statuses: ["With clinical"] },
  { id: "ready-provider", label: "Ready for provider", statuses: ["Ready for provider"] },
  { id: "with-provider", label: "With provider", statuses: ["With provider"] },
  { id: "ready-checkout", label: "Ready for checkout", statuses: ["Ready for checkout"] },
  { id: "checked-out", label: "Checked out", statuses: ["Checked out"] }
];
BRIZZA.STATUS_DOTS = {
  "Scheduled": "#B8AA9B",
  "Confirmed": "#6E6055",
  "Checked in": "#5A3510",
  "No-show": "#7A2E22",
  "Canceled": "#6E6055",
  "Ready for clinical": "#2A5EA8",
  "With clinical": "#2E7A4F",
  "Ready for provider": "#6B4CA0",
  "With provider": "#A44D68",
  "Ready for checkout": "#8A6A28",
  "Checked out": "#1E3044"
};
/* Back-compat alias used by a few leftover labels; prefer VISIT_STATUSES. */
BRIZZA.appointmentStatuses = BRIZZA.VISIT_STATUSES;
/* consultationOutcomes and treatmentStatuses moved to _superseded/consultation-treatment-status-r6.js (Round 7). */
BRIZZA.patientStatuses = ["Active", "Inactive", "Discharged/Closed"];
BRIZZA.paymentStatuses = ["Unpaid", "Partially Paid", "Paid", "Refunded", "Voided"];
BRIZZA.invoiceStatuses = ["Draft", "Issued", "Partially Paid", "Paid", "Overdue", "Voided", "Refunded"];
BRIZZA.BOOKING_TIMES = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
/* Treatment rooms are Suites only (BRIZZA.SUITES). The old Room 1–3 field was removed. */
BRIZZA.STAFF = [
  { id: "rossi", short: "Rossi", name: "Dr. Valentina A. Rossi, MD", role: "MD / Clinic Owner", title: "Owner", credential: "MD", isProvider: true, isMd: true },
  { id: "costa", short: "Costa", name: "Alessia Costa, NP", role: "RN / NP Injector", title: "Injector", credential: "NP", isProvider: true },
  { id: "hayes", short: "Hayes", name: "Stella Hayes, LE", role: "Aesthetician", title: "Aesthetician", credential: "LE", isProvider: true },
  { id: "lily", short: "Morgan", name: "Lily Morgan", role: "Clinic Manager", title: "Clinic Manager", isProvider: false },
  { id: "blair", short: "Brooks", name: "Blair Brooks", role: "Marketing Specialist", title: "Marketing", isProvider: false },
  { id: "serena", short: "Collins", name: "Serena Collins", role: "Clinic Coordinator", title: "Clinic Coordinator", isProvider: false },
  { id: "ortiz", short: "Ortiz", name: "Camila Ortiz", role: "Medical Assistant", title: "Medical Assistant", isProvider: false }
];
/* Real calendar holidays — not shifted with sample data. */
BRIZZA.HOLIDAYS = { "2026-11-26": "Thanksgiving" };
BRIZZA.PROVIDERS = BRIZZA.STAFF.filter(function (s) { return s.isProvider; }).map(function (s) { return s.name; });


BRIZZA.ROLES = [
  "MD / Clinic Owner",
  "Clinic Manager",
  "Clinic Coordinator",
  "RN / NP Injector",
  "Aesthetician",
  "Medical Assistant",
  "Marketing Specialist"
];
BRIZZA.ROOMING_STATUSES = BRIZZA.ROOMING_BOARD_STATUSES;
/* Admin block reasons as specified for this mockup; not an approved V1 catalog. */

/* Mockup lunch windows (Nicole asked to stagger front desk and MA; exact times were not given).
   Front desk 12:00–1:00 p.m., MA 1:00–2:00 p.m. Providers use a Lunch block on the date,
   a same-location gap in their availability template, or 1:00–2:00 p.m. as a default. */
BRIZZA.STAFF_LUNCH = {
  "Clinic Coordinator": { start: "12:00", end: "13:00" },
  "Medical Assistant": { start: "13:00", end: "14:00" }
};

BRIZZA.BLOCK_REASONS = ["Meeting", "Rep meeting", "Lunch", "Personal", "OFF"];
BRIZZA.CLINIC_TIMES = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

/* Config list for new-patient visits. Add options here (see README). */
BRIZZA.consultingFor = ["Toxins", "Fillers", "Dissolve", "Facial", "Wax", "Microneedling"];

BRIZZA.CLINICAL_NOTE_ROLES = ["RN / NP Injector", "Aesthetician"];

BRIZZA.SUITES = [
  { id: "SUITE-1", name: "Suite 1", service: "Aesthetics" },
  { id: "SUITE-2", name: "Suite 2", service: "Injectables" },
  { id: "SUITE-3", name: "Suite 3", service: "Injectables" }
];

/* Availability templates (in-memory). Color defaults to a white/cream card. */
BRIZZA.AVAILABILITY_ROLES = ["MD / Clinic Owner", "Clinic Manager"];
BRIZZA.availabilityTemplates = [
  { id: "AVT-1001", provider: "Dr. Valentina A. Rossi, MD", color: "#FFFCF6", startDate: "2026-11-02", endDate: null, everyNWeeks: 1, days: [1, 2, 3, 4, 5],
    blocks: [
      { locationId: "LOC-MANHATTAN", start: "10:00", end: "11:00" },
      { locationId: "LOC-LONGISLAND", start: "14:00", end: "18:00" }
    ] },
  { id: "AVT-1002", provider: "Alessia Costa, NP", color: "#FFFCF6", startDate: "2026-11-02", endDate: null, everyNWeeks: 1, days: [1, 2, 3, 4, 5],
    blocks: [
      { locationId: "LOC-MANHATTAN", start: "10:00", end: "12:00" },
      { locationId: "LOC-MANHATTAN", start: "13:30", end: "18:00" }
    ] },
  { id: "AVT-1003", provider: "Stella Hayes, LE", color: "#FFFCF6", startDate: "2026-11-02", endDate: null, everyNWeeks: 1, days: [1, 2, 3, 4, 5],
    blocks: [
      { locationId: "LOC-MANHATTAN", start: "10:00", end: "18:00" }
    ] }
];


/* Draft clinical note templates — Open question. Not taken from the SOPs or V1 documents.
   Unit/amount fields stay empty (no example values) and are not required. */
BRIZZA.NOTE_TEMPLATES = [
  { id: "inj-consult", name: "Injectables Consult", draft: true, source: "Draft templates – Open question.",
    sections: [
      { id: "visit", title: "Visit", fields: [
        { id: "chiefConcern", label: "Chief concern", required: true, type: "text" },
        { id: "areasDiscussed", label: "Areas discussed", required: true, type: "text" },
        { id: "recommendations", label: "Recommendations", required: true, type: "textarea" }
      ]},
    ]},
  { id: "inj-followup", name: "Injectables Follow-up", draft: true, source: "Draft templates – Open question.",
    sections: [
      { id: "visit", title: "Visit", fields: [
        { id: "visitReason", label: "Visit reason", required: true, type: "text" },
        { id: "responseSince", label: "Response since last visit", required: true, type: "textarea" },
        { id: "plan", label: "Plan", required: true, type: "textarea" }
      ]}
    ]},
  { id: "inj-procedure", name: "Injectables Procedure", draft: true, source: "Draft templates – Open question.",
    sections: [
      { id: "treatment", title: "Treatment", fields: [
        { id: "areasTreated", label: "Areas treated", required: true, type: "text" },
        { id: "productLot", label: "Product / lot", required: true, type: "text" },
        { id: "unitsDocumented", label: "Units documented", required: false, type: "text" },
        { id: "techniqueNotes", label: "Technique notes", required: true, type: "textarea" }
      ]},
      { id: "consent", title: "Consent and aftercare", fields: [
        { id: "consentConfirmed", label: "Consent confirmed", required: true, type: "select", options: ["Yes", "No"] },
        { id: "aftercareGiven", label: "Aftercare given", required: true, type: "select", options: ["Yes", "No"] }
      ]}
    ]},
  { id: "aes-consult", name: "Aesthetician Consult", draft: true, source: "Draft templates – Open question.",
    sections: [
      { id: "visit", title: "Visit", fields: [
        { id: "chiefConcern", label: "Chief concern", required: true, type: "text" },
        { id: "skinObservations", label: "Skin observations", required: true, type: "textarea" },
        { id: "recommendedService", label: "Recommended service", required: true, type: "text" }
      ]}
    ]},
  { id: "aes-followup", name: "Aesthetician Follow-up", draft: true, source: "Draft templates – Open question.",
    sections: [
      { id: "visit", title: "Visit", fields: [
        { id: "visitReason", label: "Visit reason", required: true, type: "text" },
        { id: "responseSince", label: "Response since last visit", required: true, type: "textarea" },
        { id: "plan", label: "Plan", required: true, type: "textarea" },
        { id: "aftercareGiven", label: "Aftercare given", required: true, type: "select", options: ["Yes", "No"] }
      ]}
    ]},
  { id: "aes-procedure", name: "Aesthetician Procedure", draft: true, source: "Draft templates – Open question.",
    sections: [
      { id: "treatment", title: "Treatment", fields: [
        { id: "skinType", label: "Skin type / Fitzpatrick", required: true, type: "select", options: ["Fitzpatrick I", "Fitzpatrick II", "Fitzpatrick III", "Fitzpatrick IV", "Fitzpatrick V", "Fitzpatrick VI"] },
        { id: "skinConcerns", label: "Skin concerns", required: true, type: "textarea" },
        { id: "servicePerformed", label: "Service performed", required: true, type: "text" },
        { id: "treatmentSettings", label: "Treatment / settings", required: false, type: "textarea" },
        { id: "tolerability", label: "Tolerability", required: true, type: "select", options: ["Well tolerated", "Some discomfort was recorded", "Other"] },
        { id: "postCare", label: "Post-care", required: true, type: "textarea" }
      ]},
      { id: "consent", title: "Consent", fields: [
        { id: "consentConfirmed", label: "Consent confirmed", required: true, type: "select", options: ["Yes", "No"] }
      ]}
    ]}
];


BRIZZA.NOTE_BUILDER = {
  "inj-consult": [
    { id: "chiefConcernTopic", label: "Chief concern", type: "select", required: true,
      options: ["Wrinkle relaxation", "Volume", "Facial balancing", "Skin quality", "Other"],
      sentence: "The chief concern documented for this visit is {chiefConcernTopic}." },
    { id: "chiefConcern", label: "Chief concern in the patient's words", type: "text", required: true,
      showIf: { field: "chiefConcernTopic", filled: true },
      sentence: "In the patient's words, the concern was described as follows: {chiefConcern}." },
    { id: "areasDiscussed", label: "Areas discussed", type: "select", required: true,
      options: ["Upper face", "Midface", "Lower face", "Neck", "More than one area", "Other"],
      sentence: "The areas discussed during this visit were recorded as {areasDiscussed}." },
    { id: "areasDiscussedDetail", label: "Which areas were discussed?", type: "text", required: true,
      showIf: { field: "areasDiscussed", in: ["More than one area", "Other"] },
      sentence: "Additional detail about the areas discussed was recorded as follows: {areasDiscussedDetail}." },
    { id: "recommendationsKind", label: "Recommendations", type: "select", required: true,
      options: ["Review options at a later visit", "Treatment options were discussed", "Other"] },
    { id: "recommendations", label: "Recommendation detail", type: "textarea", required: true,
      showIf: { field: "recommendationsKind", filled: true },
      sentence: "The recommendation documented for this visit is as follows: {recommendations}." }
  ],
  "inj-followup": [
    { id: "visitReason", label: "Visit reason", type: "select", required: true,
      options: ["Planned follow-up", "Concern since last visit", "Other"],
      sentence: "The reason documented for this follow-up visit is {visitReason}." },
    { id: "visitReasonDetail", label: "Visit reason detail", type: "text", required: true,
      showIf: { field: "visitReason", in: ["Concern since last visit", "Other"] },
      sentence: "Additional detail about the visit reason was recorded as follows: {visitReasonDetail}." },
    { id: "responseSince", label: "Response since last visit", type: "textarea", required: true,
      sentence: "The response since the last visit was recorded as follows: {responseSince}." },
    { id: "plan", label: "Plan", type: "textarea", required: true,
      sentence: "The plan documented for this visit is as follows: {plan}." }
  ],
  "inj-procedure": [
    { id: "areasTreated", label: "Areas treated", type: "text", required: true,
      sentence: "The areas treated were recorded as {areasTreated}." },
    { id: "productLot", label: "Product / lot", type: "text", required: true,
      sentence: "The product and lot information documented for this visit is {productLot}." },
    { id: "unitsDocumented", label: "Units documented", type: "text", required: false,
      sentence: "Units were documented as {unitsDocumented}." },
    { id: "techniqueNotes", label: "Technique notes", type: "textarea", required: true,
      sentence: "Technique notes were recorded as follows: {techniqueNotes}." },
    { id: "consentConfirmed", label: "Consent confirmed", type: "select", required: true,
      options: ["Yes", "No"],
      sentence: "Consent confirmed was recorded as {consentConfirmed}." },
    { id: "aftercareGiven", label: "Aftercare given", type: "select", required: true,
      options: ["Yes", "No"],
      sentence: "Aftercare given was recorded as {aftercareGiven}." }
  ],
  "aes-consult": [
    { id: "chiefConcernTopic", label: "Chief concern", type: "select", required: true,
      options: ["Skin texture", "Tone", "Dryness", "Other"],
      sentence: "The chief concern documented for this visit is {chiefConcernTopic}." },
    { id: "chiefConcern", label: "Chief concern in the patient's words", type: "text", required: true,
      showIf: { field: "chiefConcernTopic", filled: true },
      sentence: "In the patient's words, the concern was described as follows: {chiefConcern}." },
    { id: "skinObservations", label: "Skin observations", type: "textarea", required: true,
      sentence: "Skin observations documented for this visit were recorded as follows: {skinObservations}." },
    { id: "recommendedService", label: "Recommended service", type: "select", required: true,
      options: ["Mini Facial", "Facial", "Hydrafacial", "Wax", "Other"],
      sentence: "The recommended service documented for this visit is {recommendedService}." },
    { id: "recommendedServiceDetail", label: "Recommended service detail", type: "text", required: true,
      showIf: { field: "recommendedService", equals: "Other" },
      sentence: "Additional detail about the recommended service was recorded as follows: {recommendedServiceDetail}." }
  ],
  "aes-followup": [
    { id: "visitReason", label: "Visit reason", type: "select", required: true,
      options: ["Planned follow-up", "Concern since last visit", "Other"],
      sentence: "The reason documented for this follow-up visit is {visitReason}." },
    { id: "responseSince", label: "Response since last visit", type: "textarea", required: true,
      sentence: "The response since the last visit was recorded as follows: {responseSince}." },
    { id: "plan", label: "Plan", type: "textarea", required: true,
      sentence: "The plan documented for this visit is as follows: {plan}." },
    { id: "aftercareGiven", label: "Aftercare given", type: "select", required: true,
      options: ["Yes", "No"],
      sentence: "Aftercare given was recorded as {aftercareGiven}." }
  ],
  "aes-procedure": [
    { id: "skinType", label: "Skin type / Fitzpatrick", type: "select", required: true,
      options: ["Fitzpatrick I", "Fitzpatrick II", "Fitzpatrick III", "Fitzpatrick IV", "Fitzpatrick V", "Fitzpatrick VI"],
      sentence: "The skin type / Fitzpatrick recorded for this visit is {skinType}." },
    { id: "skinConcerns", label: "Skin concerns", type: "textarea", required: true,
      sentence: "The skin concerns documented for this visit were recorded as follows: {skinConcerns}." },
    { id: "servicePerformed", label: "Service performed", type: "select", required: true,
      options: ["Mini Facial", "Facial", "Hydrafacial", "Wax", "Other"],
      sentence: "The service performed was recorded as {servicePerformed}." },
    { id: "servicePerformedDetail", label: "Service detail", type: "text", required: true,
      showIf: { field: "servicePerformed", equals: "Other" },
      sentence: "Additional detail about the service performed was recorded as follows: {servicePerformedDetail}." },
    { id: "treatmentSettings", label: "Treatment / settings", type: "textarea", required: false,
      sentence: "The treatment or settings documented for this visit were recorded as follows: {treatmentSettings}." },
    { id: "tolerability", label: "Tolerability", type: "select", required: true,
      options: ["Well tolerated", "Some discomfort was recorded", "Other"],
      sentence: "Tolerability was recorded as {tolerability}." },
    { id: "tolerabilityDetail", label: "Tolerability detail", type: "text", required: true,
      showIf: { field: "tolerability", equals: "Other" },
      sentence: "Additional detail about tolerability was recorded as follows: {tolerabilityDetail}." },
    { id: "postCare", label: "Post-care", type: "textarea", required: true,
      sentence: "Post-care documented for this visit was recorded as follows: {postCare}." },
    { id: "consentConfirmed", label: "Consent confirmed", type: "select", required: true,
      options: ["Yes", "No"],
      sentence: "Consent confirmed was recorded as {consentConfirmed}." }
  ]
};








/* Structured audit events for seed records. Live edits append more in app.js. */
BRIZZA.buildSeedAudit = function (data) {
  const events = [];
  let n = 1;
  const nid = function () { return "AUD-" + String(n++).padStart(4, "0"); };
  const staff = { who: "Clinic staff", role: "Not recorded" };
  data.appointments.forEach(function (a) {
    (a.history || []).forEach(function (h) {
      const changes = [];
      const m = /^([^·]+?) → ([^·]+)$/.exec(h.trim());
      if (m) changes.push({ field: "status", before: m[1].trim(), after: m[2].trim() });
      else changes.push({ field: "history", before: "—", after: h });
      events.push({
        id: nid(),
        when: a.date + " " + a.time + " ET",
        who: staff.who,
        role: staff.role,
        action: h,
        recordType: "Appointment",
        recordId: a.id,
        recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: "list" },
        changes: changes
      });
    });
  });
  data.invoices.forEach(function (inv) {
    (inv.payments || []).forEach(function (pay) {
      events.push({
        id: nid(),
        when: (pay.recorded && String(pay.recorded).indexOf("ET") >= 0) ? pay.recorded : (pay.recorded || inv.finalizedAt || "") + (String(pay.recorded || "").indexOf("ET") >= 0 ? "" : " 16:00 ET"),
        who: staff.who,
        role: staff.role,
        action: "Recorded payment " + pay.status,
        recordType: "Invoice",
        recordId: inv.id,
        recordPath: { page: "checkout", invoiceId: inv.id },
        changes: [
          { field: "payment status", before: "—", after: pay.status },
          { field: "invoice status", before: "Issued", after: inv.status }
        ]
      });
    });
    if (inv.finalized) {
      const lot = (inv.movements && inv.movements[0]) ? inv.movements[0].lotId : "—";
      events.push({
        id: nid(),
        when: inv.finalizedAt,
        who: staff.who,
        role: staff.role,
        action: "Finalized invoice and posted inventory",
        recordType: "Invoice",
        recordId: inv.id,
        recordPath: { page: "checkout", invoiceId: inv.id },
        changes: [
          { field: "finalized", before: "No", after: "Yes" },
          { field: "inventory movement", before: "None", after: lot }
        ]
      });
    }
  });
  data.patients.forEach(function (p) {
    const r = p.registration || {};
    if (r.demographicsConfirmed && r.demographicsConfirmed.status === "Confirmed") {
      events.push({
        id: nid(),
        when: r.demographicsConfirmed.date + " 10:15 ET",
        who: staff.who,
        role: staff.role,
        action: "Confirmed demographics",
        recordType: "Patient",
        recordId: p.id,
        recordPath: { page: "patients", selected: p.id, tab: "demographics" },
        changes: [{ field: "demographics confirmed", before: "Not confirmed", after: "Confirmed" }]
      });
    }
  });
  return events;
};

BRIZZA.seed = function () {
  const data = {
    patients: [
      {id:"BZ0001",name:"Maya Chen",dob:"1989-04-16",sex:"Female",phone:"(212) 555-0184",email:"maya.chen@example.com",status:"Active",
        allergies:["Hyaluronic acid — swelling","Lidocaine — sensitivity noted Nov 10, 2026"],meds:["Cetirizine · as needed"],conditions:["History of cold sores"],pharmacy:"Mercer Street Pharmacy, New York",
        notes:[{id:"N-1",date:"2026-10-28",type:"Injectables Consult",templateId:"inj-consult",procedurePerformed:"No",provider:"Dr. Valentina A. Rossi, MD",role:"RN / NP Injector",status:"Finalized",locked:true,signedAt:"Oct 28, 2026, 2:40 p.m. ET",
          text:"Chief concern: Wants time to decide. Areas discussed: Upper face. Recommendations: Review options at a later visit. Consent confirmed: Yes. Questions addressed: Yes.",
          values:{chiefConcern:"Wants time to decide",areasDiscussed:"Upper face",recommendations:"Review options at a later visit",consentConfirmed:"Yes",questionsAddressed:"Yes"},
          historySnapshot:{allergies:["Hyaluronic acid — swelling"],meds:["Cetirizine · as needed"],conditions:["History of cold sores"],consents:{clinical:"Current · signed Oct 28, 2026",marketing:"Not authorized"}}},
          {id:"N-5",date:"2026-11-18",type:"Injectables Consult",templateId:"inj-consult",appointmentId:"A-6214",procedurePerformed:"No",provider:"Dr. Valentina A. Rossi, MD",role:"RN / NP Injector",status:"Draft",
          text:"Visit note is in progress.",values:{}}],
        consents:{clinical:"Current · signed Oct 28, 2026",marketing:"Not authorized"},
        photos:["Clinical baseline · Oct 28, 2026"],documents:["Intake and medical history · Oct 28, 2026"],
        treatments:[],followups:[{id:"F-1",text:"Check in after consultation",due:"2026-11-25"}],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-10-28"},formsCompleted:{status:"Completed",date:"2026-10-28"},demographicsConfirmed:{status:"Confirmed",date:"2026-10-28"}}},
      {id:"BZ0002",name:"Jordan Patel",dob:"1976-09-02",sex:"Male",phone:"(212) 555-0132",email:"j.patel@example.com",status:"Active",
        allergies:["No known allergies"],meds:[],conditions:["Skin sensitivity"],
        notes:[{id:"N-2",date:"2026-11-03",type:"Consultation",procedurePerformed:"Yes",provider:"Dr. Valentina A. Rossi, MD",status:"Ready for review",
          text:"Treatment completed; aftercare instructions provided and acknowledged."}],
        consents:{clinical:"Current · signed Nov 3, 2026",marketing:"Not authorized"},
        photos:["Clinical before/after · Nov 3, 2026"],documents:["Treatment consent · Nov 3, 2026"],
        treatments:["Botox · Completed Nov 3, 2026"],followups:[{id:"F-2",text:"Two-week follow-up",due:"2026-11-17"}],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-10-09"},formsCompleted:{status:"Completed",date:"2026-10-09"},demographicsConfirmed:{status:"Confirmed",date:"2026-10-09"}}},
      {id:"BZ0003",name:"Sofia Williams",dob:"1994-12-21",sex:"Female",phone:"(917) 555-0127",email:"sofia.w@example.com",status:"Active",
        allergies:["Latex"],meds:[],conditions:[],notes:[],
        consents:{clinical:"Not yet recorded",marketing:"Not authorized"},photos:[],
        documents:["Registration and intake pending"],treatments:[],followups:[],demoHistory:[],
        registration:{idUploaded:{status:"Not uploaded",date:null},formsCompleted:{status:"Not completed",date:null},demographicsConfirmed:{status:"Not confirmed",date:null}}},
      {id:"BZ0004",name:"Ava Thompson",dob:"1997-07-09",sex:"Female",phone:"(646) 555-0148",email:"ava.thompson@example.com",status:"Inactive",
        allergies:["No known allergies"],meds:[],conditions:[],
        notes:[{id:"N-3",date:"2026-03-12",type:"Consultation",procedurePerformed:"Yes",provider:"Alessia Costa, NP",status:"Finalized",
          text:"Consultation and same-day chemical peel documented; consent and aftercare instructions recorded. No activity since; status set to Inactive.",visitId:"V-1001"}],
        consents:{clinical:"Signed Mar 12, 2026",marketing:"Not authorized"},
        photos:["Clinical baseline · Mar 12, 2026"],
        documents:["Intake and medical history · Mar 12, 2026","Treatment consent · Mar 12, 2026"],
        treatments:["Chemical Peel · Completed Mar 12, 2026"],followups:[],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-03-12"},formsCompleted:{status:"Completed",date:"2026-03-12"},demographicsConfirmed:{status:"Confirmed",date:"2026-03-12"}}},
      {id:"BZ0005",name:"Noah Kim",dob:"1985-03-11",sex:"Male",phone:"(212) 555-0190",email:"noah.kim@example.com",status:"Active",
        allergies:["No known allergies"],meds:[],conditions:[],notes:[],
        consents:{clinical:"Current · signed Nov 2, 2026",marketing:"Not authorized"},photos:[],
        documents:[{id:"DOC-BZ0005-1",category:"Patient Intake",title:"Intake and medical history · Nov 2, 2026",date:"2026-11-02",printable:true},
                   {id:"DOC-BZ0005-2",category:"Consent",title:"Treatment consent · Nov 2, 2026",date:"2026-11-02",printable:true}],
        treatments:[],followups:[],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-11-02"},formsCompleted:{status:"Completed",date:"2026-11-02"},demographicsConfirmed:{status:"Confirmed",date:"2026-11-02"}}},
      {id:"BZ0006",name:"Riley Brooks",dob:"1991-06-04",sex:"Female",phone:"(646) 555-0177",email:"riley.brooks@example.com",status:"Active",
        allergies:[],meds:[],conditions:[],notes:[],
        consents:{clinical:"Not yet recorded",marketing:"Not authorized"},photos:[],
        documents:[],treatments:[],followups:[],demoHistory:[],
        registration:{idUploaded:{status:"Not uploaded",date:null},formsCompleted:{status:"Not completed",date:null},demographicsConfirmed:{status:"Not confirmed",date:null}}},
      {id:"BZ0007",name:"Priya Shah",dob:"1982-01-28",sex:"Female",phone:"(917) 555-0161",email:"priya.shah@example.com",status:"Active",
        allergies:["No known allergies"],meds:[],conditions:[],
        notes:[{id:"N-4",date:"2026-11-10",type:"Aesthetician Consult",status:"Draft",provider:"Stella Hayes, LE",role:"Aesthetician",
          text:"Skin goals reviewed. Mini Facial recommended."}],
        consents:{clinical:"Current · signed Nov 10, 2026",marketing:"Not authorized"},photos:[],
        documents:[{id:"DOC-BZ0007-1",category:"Patient Intake",title:"Intake and medical history · Nov 10, 2026",date:"2026-11-10",printable:true},
                   {id:"DOC-BZ0007-2",category:"Consent",title:"Treatment consent · Nov 10, 2026",date:"2026-11-10",printable:true}],
        treatments:[],followups:[],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-11-10"},formsCompleted:{status:"Completed",date:"2026-11-10"},demographicsConfirmed:{status:"Confirmed",date:"2026-11-10"}}},
      {id:"BZ0008",name:"Chloe Martin",dob:"1999-08-15",sex:"Female",phone:"(212) 555-0114",email:"chloe.martin@example.com",status:"Active",
        allergies:[],meds:[],conditions:[],notes:[],
        consents:{clinical:"Not yet recorded",marketing:"Not authorized"},photos:[],
        documents:[{id:"DOC-BZ0008-1",category:"Patient Intake",title:"Partial intake · Nov 17, 2026",date:"2026-11-17",printable:true}],
        treatments:[],followups:[],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-11-17"},formsCompleted:{status:"Not completed",date:null},demographicsConfirmed:{status:"Not confirmed",date:null}}}
    ],
    appointments: [
      {id:"A-6201",time:"11:00",patientId:"BZ0004",type:"Consultation",reasons:["New Patient"],consultingFor:"Facial",provider:"Alessia Costa, NP",durationLabel:"15 min",durationMinutes:15,status:"Checked out",consultation:"Treatment performed during visit",treatment:"",date:"2026-03-12",visitId:"V-1001",invoiceId:"INV-1001",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6202",time:"11:45",patientId:"BZ0004",type:"Chemical Peel",reasons:["Chemical Peel"],provider:"Alessia Costa, NP",durationLabel:"60 min",durationMinutes:60,status:"Checked out",consultation:"",treatment:"Completed",date:"2026-03-12",visitId:"V-1001",invoiceId:"INV-1001",relatedAppointmentId:"A-6201",locationId:"LOC-MANHATTAN",history:["Scheduled","Scheduled → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6203",time:"14:00",patientId:"BZ0001",type:"Consultation",reasons:["New Patient"],consultingFor:"Toxins",provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Checked out",consultation:"Patient wants time to decide",treatment:"",date:"2026-10-28",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6204",time:"15:00",patientId:"BZ0002",type:"Neurotoxin",reasons:["Botox"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"30 min",durationMinutes:30,status:"Checked out",consultation:"",treatment:"Completed",date:"2026-11-03",invoiceId:"INV-1002",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6205",time:"13:00",patientId:"BZ0002",type:"Follow-up",reasons:["Botox"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Checked in",paperwork:true,consultation:"",treatment:"",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In"]},
      {id:"A-6206",time:"10:00",patientId:"BZ0001",type:"Consultation",reasons:["Existing Patient"],consultingFor:"Toxins",provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Confirmed",consultation:"",treatment:"",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6207",time:"11:30",patientId:"BZ0003",type:"Consultation",reasons:["New Patient"],consultingFor:"Facial",provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Confirmed",consultation:"",treatment:"",date:"2026-11-16",visitId:"V-1002",invoiceId:"INV-1003",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6210",time:"12:30",patientId:"BZ0003",type:"Facial",reasons:["Facial"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"60 min",durationMinutes:60,status:"Confirmed",consultation:"",treatment:"",date:"2026-11-16",visitId:"V-1002",invoiceId:"INV-1003",relatedAppointmentId:"A-6207",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6208",time:"13:30",patientId:"BZ0001",type:"Follow-up",reasons:["Juvederm"],provider:"Alessia Costa, NP",durationLabel:"15 min",durationMinutes:15,status:"Scheduled",consultation:"",treatment:"",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6209",time:"14:30",patientId:"BZ0002",type:"Microneedling",reasons:["Microneedling"],provider:"Alessia Costa, NP",durationLabel:"75 min",durationMinutes:75,status:"Confirmed",consultation:"",treatment:"",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6240",time:"16:00",patientId:"BZ0001",type:"Consultation",reasons:["Existing Patient"],consultingFor:"Toxins",provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Canceled",consultation:"",treatment:"",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Canceled"]},

      {id:"A-6211",time:"11:00",patientId:"BZ0002",type:"Consultation",reasons:["New Patient"],consultingFor:"Toxins",provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Checked out",consultation:"Treatment scheduled for later date",treatment:"",date:"2026-10-09",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6212",time:"15:00",patientId:"BZ0002",type:"Facial",reasons:["Facial"],provider:"Alessia Costa, NP",durationLabel:"60 min",durationMinutes:60,status:"Confirmed",consultation:"",treatment:"",date:"2026-11-13",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6213",time:"10:00",patientId:"BZ0002",type:"Follow-up",reasons:["Botox"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Scheduled",consultation:"",treatment:"",date:"2026-11-17",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6214",time:"11:00",patientId:"BZ0001",type:"Consultation",reasons:["Existing Patient"],consultingFor:"Toxins",provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"With clinical",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",suiteId:"SUITE-1",history:["Scheduled → Confirmed","Confirmed → With clinical"]},
      {id:"A-6215",time:"10:30",patientId:"BZ0003",type:"Follow-up",reasons:["Facial"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Scheduled",consultation:"",treatment:"",date:"2026-11-23",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6216",time:"13:00",patientId:"BZ0001",type:"Filler",reasons:["Juvederm"],provider:"Alessia Costa, NP",durationLabel:"30 min",durationMinutes:30,status:"Confirmed",consultation:"",treatment:"",date:"2026-11-24",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6217",time:"10:00",patientId:"BZ0001",type:"Follow-up",reasons:["Juvederm"],provider:"Alessia Costa, NP",durationLabel:"15 min",durationMinutes:15,status:"Scheduled",consultation:"",treatment:"",date:"2026-12-01",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6218",time:"14:30",patientId:"BZ0003",type:"Facial",reasons:["Hydrafacial"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"75 min",durationMinutes:75,status:"Scheduled",consultation:"",treatment:"",date:"2026-12-03",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6219",time:"15:00",patientId:"BZ0002",type:"Follow-up",reasons:["Botox"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Scheduled",consultation:"",treatment:"",date:"2026-12-10",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6220",time:"10:00",patientId:"BZ0002",type:"Follow-up",reasons:["Botox"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Ready for clinical",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Ready for clinical"]},
      {id:"A-6221",time:"14:00",patientId:"BZ0003",type:"Follow-up",reasons:["Facial"],provider:"Alessia Costa, NP",durationLabel:"15 min",durationMinutes:15,status:"With provider",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",suiteId:"SUITE-2",history:["Scheduled → Confirmed","Confirmed → With provider"]},
      {id:"A-6230",time:"10:30",patientId:"BZ0006",type:"Wax",reasons:["Eyebrows"],provider:"Stella Hayes, LE",durationLabel:"30 min",durationMinutes:30,status:"Scheduled",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",prepNotes:"New guest — confirm ID at check-in.",history:["Scheduled"]},
      {id:"A-6231",time:"12:00",patientId:"BZ0005",type:"Facial",reasons:["Hydrafacial"],provider:"Alessia Costa, NP",durationLabel:"75 min",durationMinutes:75,status:"Ready for checkout",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",invoiceId:"INV-1010",prepNotes:"Package: first Hydrafacial of a series — confirm remaining visits.",history:["Scheduled → Confirmed","Confirmed → Ready for checkout"]},
      {id:"A-6232",time:"13:00",patientId:"BZ0007",type:"Neurotoxin",reasons:["Botox"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"30 min",durationMinutes:30,status:"Scheduled",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",prepNotes:"Wants upper face discussed; no unit count recorded.",history:["Scheduled"]},
      {id:"A-6233",time:"11:30",patientId:"BZ0008",type:"Facial",reasons:["Mini Facial"],provider:"Stella Hayes, LE",durationLabel:"30 min",durationMinutes:30,status:"Confirmed",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6234",time:"15:30",patientId:"BZ0007",type:"Wax",reasons:["Eyebrows"],provider:"Stella Hayes, LE",durationLabel:"30 min",durationMinutes:30,status:"Confirmed",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6235",time:"10:30",patientId:"BZ0004",type:"Follow-up",reasons:["Existing Patient"],provider:"Dr. Valentina A. Rossi, MD",durationLabel:"15 min",durationMinutes:15,status:"Checked out",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked out"]},
      {id:"A-6236",time:"16:00",patientId:"BZ0004",type:"Consultation",reasons:["New Patient"],consultingFor:"Fillers",provider:"Alessia Costa, NP",durationLabel:"30 min",durationMinutes:30,status:"No-show",consultation:"",treatment:"",date:"2026-11-18",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → No-show"]}
        ],
    visits: [
      {id:"V-1001",patientId:"BZ0004",date:"2026-03-12",appointmentIds:["A-6201","A-6202"],invoiceId:"INV-1001",noteId:"N-3",label:"Same-day consult and Chemical Peel"},
      {id:"V-1002",patientId:"BZ0003",date:"2026-11-16",appointmentIds:["A-6207","A-6210"],invoiceId:"INV-1003",noteId:null,label:"Same-day consult and Customized Facial (Facial)"}
    ],
    invoices: [
      {id:"INV-1001",patientId:"BZ0004",visitId:"V-1001",appointmentIds:["A-6201","A-6202"],status:"Paid",balance:"None",
        lines:[{kind:"service",name:"Consultation · New Patient",amount:"TBD"},{kind:"service",name:"Chemical Peel",amount:"TBD"}],
        payments:[{id:"PAY-1001",method:"Card (processor reference only)",status:"Paid",recorded:"2026-03-12"}],
        finalized:true,finalizedAt:"2026-03-12 15:10 ET",movements:[{lotId:"LOT-PEEL-08",product:"Chemical Peel",type:"TREATMENT_USAGE",posted:"2026-03-12 15:10 ET"}]},
      {id:"INV-1002",patientId:"BZ0002",visitId:null,appointmentIds:["A-6204"],status:"Paid",balance:"None",
        lines:[{kind:"service",name:"Neurotoxin · Botox",amount:"TBD"}],
        payments:[{id:"PAY-1002",method:"Card (processor reference only)",status:"Paid",recorded:"2026-11-03"}],
        finalized:true,finalizedAt:"2026-11-03 16:05 ET",movements:[{lotId:"LOT-BTX-031",product:"Botox",type:"TREATMENT_USAGE",posted:"2026-11-03 16:05 ET"}]},
      {id:"INV-1003",patientId:"BZ0003",visitId:"V-1002",appointmentIds:["A-6207","A-6210"],status:"Issued",balance:"Outstanding (amount TBD)",
        lines:[{kind:"service",name:"Consultation · New Patient",amount:"TBD",catalogId:"consultation",qty:null,unitPrice:null},
               {kind:"service",name:"Facial",amount:"TBD",catalogId:"facial",qty:null,unitPrice:null}],
        payments:[],finalized:false,finalizedAt:null,movements:[]},
      {id:"INV-1010",patientId:"BZ0005",visitId:null,appointmentIds:["A-6231"],status:"Issued",balance:375,
        lines:[{kind:"service",catalogId:"hydrafacial",name:"Hydrafacial",unit:"session",qty:1,unitPrice:375,amount:375}],
        payments:[],finalized:false,finalizedAt:null,movements:[]}
    ],
    quotes: [
      {id:"Q-1001",patientId:"BZ0001",appointmentId:"A-6203",templateId:"full-face-toxin",name:"Full-face toxin",status:"Open",
        lines:[{kind:"product",catalogId:"botox",name:"Botox",unit:"unit",unitPrice:21,qty:null,amount:"TBD"}],created:"2026-10-28",broughtToRoom:false,invoiceId:null,visitKind:null},
      {id:"Q-1002",patientId:"BZ0003",appointmentId:"A-6207",templateId:"facial-series-3",name:"Facial series of 3",status:"Open",
        lines:[{kind:"package",catalogId:"hydrafacial",name:"Hydrafacial",unit:"session",unitPrice:375,qty:null,amount:"TBD"}],created:"2026-11-16",broughtToRoom:true,invoiceId:null,visitKind:null}
    ],
    lots: [
      {id:"LOT-BTX-031",productId:"botox",product:"Botox",lotNumber:"BTX-031",onHand:0,originalQty:1,expiry:"2026-10-20",status:"Used",released:true,receivedAt:"2026-08-01",poId:"PO-1000",
        openVial:null, patientIds:["BZ0002"]},
      {id:"LOT-BTX-038",productId:"botox",product:"Botox",lotNumber:"BTX-038",onHand:2,originalQty:2,expiry:"2026-11-30",status:"Released",released:true,receivedAt:"2026-09-15",poId:"PO-1001",
        openVial:{openedAt:"2026-11-16",unitsLeft:22,beyondUseNote:null}, patientIds:[]},
      {id:"LOT-BTX-041",productId:"botox",product:"Botox",lotNumber:"BTX-041",onHand:4,originalQty:4,expiry:"2026-12-15",status:"Released",released:true,receivedAt:"2026-10-01",poId:"PO-1001",
        openVial:null, patientIds:[]},
      {id:"LOT-JUV-014",productId:"juvederm",product:"Juvederm",lotNumber:"JUV-014",onHand:1,originalQty:1,expiry:"2027-03-01",status:"Released",released:true,receivedAt:"2026-10-20",poId:"PO-1002",
        openVial:null, patientIds:[]},
      {id:"LOT-PEEL-08",productId:"chemical-peel",product:"Chemical Peel",lotNumber:"PEEL-08",onHand:0,originalQty:2,expiry:"2026-09-01",status:"Used",released:true,receivedAt:"2026-02-01",poId:"PO-1000",
        openVial:null, patientIds:["BZ0004"]},
      {id:"LOT-PEEL-12",productId:"chemical-peel",product:"Chemical Peel",lotNumber:"PEEL-12",onHand:3,originalQty:3,expiry:"2026-12-01",status:"Released",released:true,receivedAt:"2026-08-20",poId:"PO-1001",
        openVial:null, patientIds:[]},
      {id:"LOT-FACE-04",productId:"facial",product:"Facial",lotNumber:"FACE-04",onHand:5,originalQty:5,expiry:"2027-02-15",status:"Released",released:true,receivedAt:"2026-09-01",poId:"PO-1002",
        openVial:null, patientIds:[]},
      {id:"LOT-FACE-02",productId:"facial",product:"Facial",lotNumber:"FACE-02",onHand:1,originalQty:2,expiry:"2026-12-20",status:"Released",released:true,receivedAt:"2026-08-15",poId:"PO-1001",
        openVial:null, patientIds:[]}
    ],
    purchaseOrders: [
      {id:"PO-1000",vendor:"Allergan (sample vendor)",status:"Received",created:"2026-08-01",expected:"2026-08-10",
        lines:[{productId:"botox",name:"Botox",orderedQty:1,receivedQty:1},{productId:"chemical-peel",name:"Chemical Peel",orderedQty:2,receivedQty:2}]},
      {id:"PO-1001",vendor:"Allergan (sample vendor)",status:"Received",created:"2026-09-10",expected:"2026-09-20",
        lines:[{productId:"botox",name:"Botox",orderedQty:6,receivedQty:6},{productId:"chemical-peel",name:"Chemical Peel",orderedQty:3,receivedQty:3},{productId:"facial",name:"Facial",orderedQty:2,receivedQty:2}]},
      {id:"PO-1002",vendor:"SkinMedica (sample vendor)",status:"Partial",created:"2026-10-15",expected:"2026-10-25",
        lines:[{productId:"juvederm",name:"Juvederm",orderedQty:3,receivedQty:1},{productId:"facial",name:"Facial",orderedQty:5,receivedQty:5}]},
      {id:"PO-1003",vendor:"Allergan (sample vendor)",status:"Open",created:"2026-11-12",expected:"2026-11-25",
        lines:[{productId:"jeuveau",name:"Jeuveau",orderedQty:4,receivedQty:0},{productId:"botox",name:"Botox",orderedQty:6,receivedQty:0}]}
    ],
    adjustments: [
      {id:"ADJ-1001",lotId:"LOT-FACE-02",productId:"facial",product:"Facial",qty:-1,reason:"Waste",note:"Opened in error (sample)",when:"2026-11-10 11:20 ET",who:"Serena Collins",role:"Clinic Manager"}
    ],
    inventoryMovements: [
      {id:"MOV-1001",lotId:"LOT-PEEL-08",product:"Chemical Peel",type:"TREATMENT_USAGE",qty:-2,patientId:"BZ0004",invoiceId:"INV-1001",when:"2026-03-12 15:10 ET"},
      {id:"MOV-1002",lotId:"LOT-BTX-031",product:"Botox",type:"TREATMENT_USAGE",qty:-1,patientId:"BZ0002",invoiceId:"INV-1002",when:"2026-11-03 16:05 ET"},
      {id:"MOV-1003",lotId:"LOT-FACE-02",product:"Facial",type:"ADJUSTMENT",qty:-1,reason:"Waste",when:"2026-11-10 11:20 ET"}
    ],
    reservations: [
      {id:"RES-1",invoiceId:"INV-1003",lotId:"LOT-FACE-02",product:"Facial",status:"Suggested"}
    ],
    audit: []
  };
  data.audit = BRIZZA.buildSeedAudit(data);
  data.blocks = [
    {id:"BLK-1001",type:"Admin",reason:"Lunch",staff:"Dr. Valentina A. Rossi, MD",date:"2026-11-18",start:"12:00",end:"13:00",locationId:"LOC-MANHATTAN"},
    {id:"BLK-1002",type:"Admin",reason:"Meeting",staff:"Alessia Costa, NP",date:"2026-11-16",start:"10:00",end:"11:00",locationId:"LOC-MANHATTAN"},
    {id:"BLK-1003",type:"Admin",reason:"OFF",staff:"Alessia Costa, NP",date:"2026-11-20",start:"10:00",end:"18:00",locationId:"LOC-MANHATTAN"},
    {id:"BLK-1004",type:"Admin",reason:"Rep meeting",staff:"Dr. Valentina A. Rossi, MD",date:"2026-11-17",start:"16:00",end:"17:00",locationId:"LOC-MANHATTAN"},
    {id:"BLK-1005",type:"Admin",reason:"Personal",staff:"Dr. Valentina A. Rossi, MD",date:"2026-12-01",start:"11:00",end:"12:00",locationId:"LOC-MANHATTAN"}
  ];
  const now = Date.now();
  data.rooming = [
    {id:"RM-1001",appointmentId:"A-6220",patientId:"BZ0002",date:"2026-11-18",status:"Ready for clinical",statusSince: now - 18 * 60000, suiteId: null, suiteSince: null},
    {id:"RM-1002",appointmentId:"A-6214",patientId:"BZ0001",date:"2026-11-18",status:"With clinical",statusSince: now - 7 * 60000, suiteId: "SUITE-1", suiteSince: now - 7 * 60000},
    {id:"RM-1003",appointmentId:"A-6221",patientId:"BZ0003",date:"2026-11-18",status:"With provider",statusSince: now - 31 * 60000, suiteId: "SUITE-2", suiteSince: now - 20 * 60000}
  ];
  (data.rooming || []).forEach(function (r) {
    const a = data.appointments.find((x) => x.id === r.appointmentId);
    if (!a) return;
    a.status = r.status;
    a.statusSince = r.statusSince;
    if (r.suiteId) { a.suiteId = r.suiteId; a.suiteSince = r.suiteSince; }
  });
  data.appointments.forEach(function (a) {
    if (!a.statusSince) a.statusSince = Date.now() - 60000;
  });
    data.appointmentTypes = JSON.parse(JSON.stringify(BRIZZA.appointmentTypes));
  data.appointmentReasons = JSON.parse(JSON.stringify(BRIZZA.appointmentReasons));
  if (!data.quotes) data.quotes = [];
  if (!data.catalog) data.catalog = JSON.parse(JSON.stringify(BRIZZA.CATALOG));
  if (!data.purchaseOrders) data.purchaseOrders = [];
  if (!data.adjustments) data.adjustments = [];
  if (!data.inventoryMovements) data.inventoryMovements = [];
  (data.patients || []).forEach(function (pt, pi) {
    (pt.notes || []).forEach(function (n) {
      if (n.locked) n.status = "Locked";
      else if (n.status === "Signed") n.status = "Signed";
      else n.status = "Open";
    });
    const docs = [];
    (pt.documents || []).forEach(function (d, di) {
      if (d && typeof d === "object") { docs.push(d); return; }
      const title = String(d || "Document");
      let category = "Patient Intake";
      if (/consent/i.test(title)) category = "Consent";
      if (/receipt|payment/i.test(title)) category = "Payment";
      if (/quote/i.test(title)) category = "Quotes";
      docs.push({ id: "DOC-" + pt.id + "-" + (di + 1), category: category, title: title, date: (pt.registration && pt.registration.idUploaded && pt.registration.idUploaded.date) || "", printable: true });
    });
    pt.documents = docs;
  });
  (data.quotes || []).forEach(function (q) {
    const pt = data.patients.find((x) => x.id === q.patientId);
    if (!pt) return;
    const exists = (pt.documents || []).some((d) => d.relatedId === q.id || (d.category === "Quotes" && d.title && d.title.indexOf(q.name) >= 0));
    if (!exists) {
      pt.documents = pt.documents || [];
      pt.documents.push({ id: "DOC-" + q.id, category: "Quotes", title: "Quote · " + q.name + " · " + q.id, date: q.created, relatedId: q.id, kind: "quote", printable: true });
    }
  });
  (data.invoices || []).forEach(function (inv) {
    (inv.payments || []).forEach(function (pay) {
      const pt = data.patients.find((x) => x.id === inv.patientId);
      if (!pt) return;
      const exists = (pt.documents || []).some((d) => d.relatedId === pay.id);
      if (!exists) {
        pt.documents = pt.documents || [];
        pt.documents.push({ id: "DOC-" + pay.id, category: "Payment", title: "Receipt · " + pay.id + " · " + inv.id, date: (pay.recorded || "").slice(0, 10), relatedId: pay.id, invoiceId: inv.id, kind: "receipt", printable: true });
      }
    });
  });

  data.availabilityTemplates = JSON.parse(JSON.stringify(BRIZZA.availabilityTemplates || []));
  const extras = {
    BZ0001: { addressParts: { address1: "14 Mercer Street", address2: "", city: "New York", state: "NY", zip: "10013", country: "United States" }, credit: 50,
      alerts: [{ id: "AL-1001", kind: "preference", text: "Prefers email confirmation" }],
      patientNotes: [{ id: "PN-1", text: "Asked about a fall membership package.", when: "2026-10-28 3:10 p.m. ET", who: "Serena Collins" }] },
    BZ0002: { addressParts: { address1: "88 West 12th Street", address2: "", city: "New York", state: "NY", zip: "10011", country: "United States" }, credit: 0,
      alerts: [{ id: "AL-1002", kind: "preference", text: "Prefers a call before confirming" }] },
    BZ0003: { addressParts: { address1: "201 East 15th Street", address2: "", city: "New York", state: "NY", zip: "10003", country: "United States" }, credit: 0,
      alerts: [{ id: "AL-1003", kind: "allergy", text: "Allergy: latex" }, { id: "AL-1004", kind: "preference", text: "Prefers text messages" }] },
    BZ0004: { addressParts: { address1: "9 Jane Street", address2: "", city: "New York", state: "NY", zip: "10014", country: "United States" }, credit: 0 },
    BZ0005: { addressParts: { address1: "320 West 23rd Street", address2: "", city: "New York", state: "NY", zip: "10011", country: "United States" }, credit: 0 },
    BZ0006: { addressParts: { address1: "", address2: "", city: "", state: "", zip: "", country: "United States" }, credit: 0 },
    BZ0007: { addressParts: { address1: "55 West 21st Street", address2: "", city: "New York", state: "NY", zip: "10010", country: "United States" }, credit: 0 },
    BZ0008: { addressParts: { address1: "", address2: "", city: "", state: "", zip: "", country: "United States" }, credit: 0 }
  };
  (data.patients || []).forEach(function (pt) {
    const parts = String(pt.name || "").trim().split(/\s+/);
    pt.firstName = pt.firstName || parts[0] || "";
    pt.lastName = pt.lastName || parts.slice(1).join(" ");
    const ex = extras[pt.id] || {};
    if (!pt.addressParts) pt.addressParts = Object.assign({ address1: "", address2: "", city: "", state: "", zip: "", country: "United States" }, ex.addressParts || {});
    if (pt.address == null) pt.address = [pt.addressParts.address1, pt.addressParts.address2, [pt.addressParts.city, pt.addressParts.state, pt.addressParts.zip].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(), pt.addressParts.country].filter(Boolean).join(", ");
    if (pt.credit == null) pt.credit = ex.credit || 0;
    if (pt.accountBalance == null) pt.accountBalance = 0;
    pt.alerts = pt.alerts || ex.alerts || [];
    pt.patientNotes = pt.patientNotes || ex.patientNotes || [];
  });
  return data;
};


BRIZZA.DEMO_STEPS = [
  {id:"d1",ms:12000,hash:"#/patients/BZ0003",title:"Patient chart",
    caption:"Sofia Williams (BZ0003) is a synthetic new-patient chart. Sections follow the approved longitudinal record (DB-005). Clinical Notes is shown as a tab and flagged as an open question versus the eight named sections.",
    decisions:"DB-005, DB-003"},
  {id:"d2",ms:14000,hash:"#/visits/V-1002",title:"Same-day consult then treat",
    caption:"One Visit holds two appointments: a Consult and a same-day Skin Treatment (Customized Facial · Facial). Each appointment keeps its own provider, status, and history (Headquarters 1a; Journey §6; Sched §5).",
    decisions:"HQ 1a, DB-018, Sched §5"},
  {id:"d3",ms:12000,hash:"#/patients/BZ0003/appointments",title:"Independent statuses and history",
    caption:"Appointment status, consultation outcome, treatment status, and payment remain independent. Completed does not require payment (Nicole, 2026-11-18). Status history is retained on each appointment (DB-009, DB-023, DB-030).",
    decisions:"DB-009, DB-023, DB-030"},
  {id:"d4",ms:12000,hash:"#/queue/2026-11-16",title:"Visit readiness",
    caption:"The work queue lists the selected day's appointments and derived prep indicators from the chart (consent, intake, allergies). Official readiness criteria are still an open question.",
    decisions:"Journey visit flow, Records §7 / §23 (inputs only)"},
  {id:"d5",ms:16000,hash:"#/checkout/INV-1003",title:"Checkout and FEFO (Concept)",
    caption:"Appointments that share an invoice show that invoice's status. Payment records use the five approved labels; the balance lives on the invoice, with amounts TBD. Inventory posts once, on invoice finalization, using a FEFO lot suggestion. Steps that are not approved are marked Concept.",
    decisions:"Nicole payments 2–3; DB-029 inventory posting"},
  {id:"d6",ms:10000,hash:"#/configuration",title:"Synthetic prototype",
    caption:"This is an interactive mockup with in-memory synthetic records. It is not a production EMR, has no live database, and must not be used with real patient data.",
    decisions:"Project data policy"}
];
