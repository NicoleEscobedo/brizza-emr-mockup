/* Synthetic sample data only. No real patients, no prices, pay rates, or doses. */
window.BRIZZA = window.BRIZZA || {};

BRIZZA.SAMPLE_DAY = "2026-11-16";
BRIZZA.CLINIC = {
  name: "Brizza Clinic",
  location: "Manhattan Clinic",
  hours: "Monday–Friday, 10:00 a.m.–6:00 p.m. ET",
  tz: "America/New_York",
  payModel: "Cash-pay"
};

/* Location-aware model. Manhattan Clinic is the only real location in the sources. */
BRIZZA.LOCATIONS = [
  { id: "LOC-MANHATTAN", name: "Manhattan Clinic", hours: "Monday–Friday, 10:00 a.m.–6:00 p.m. ET", tz: "America/New_York" }
];
BRIZZA.DEFAULT_LOCATION = "LOC-MANHATTAN";

BRIZZA.THEMES = {
  "01": { id: "01", name: "Quiet Atelier", short: "01 Atelier", status: "DRAFT", default: true },
  "03": { id: "03", name: "Architectural Classic v2", short: "03 Classic", status: "DRAFT" }
};

/* Body-text pairs from MOODBOARDS.md plus UI pairs that must also pass AA 4.5:1. */
BRIZZA.CONTRAST_PAIRS = {
  "01": [
    { fg: "#352820", bg: "#F4F0E9", use: "body ink on ivory", min: 4.5 },
    { fg: "#6E6055", bg: "#F4F0E9", use: "muted on ivory", min: 4.5 },
    { fg: "#352820", bg: "#E7D7CC", use: "ink on chalk blush / notices", min: 4.5 },
    { fg: "#352820", bg: "#B8AA9B", use: "ink on taupe — large only if <4.5", min: 3 },
    { fg: "#F4F0E9", bg: "#352820", use: "sidebar and primary button", min: 4.5 },
    { fg: "#352820", bg: "#FBF8F3", use: "ink on paper", min: 4.5 },
    { fg: "#6E6055", bg: "#FBF8F3", use: "muted on paper", min: 4.5 }
  ],
  "03": [
    { fg: "#352820", bg: "#F3F1EC", use: "ink on chalk", min: 4.5 },
    { fg: "#352820", bg: "#C8C0B4", use: "ink on greige", min: 4.5 },
    { fg: "#F3F1EC", bg: "#352820", use: "sidebar and primary button", min: 4.5 },
    { fg: "#5F574D", bg: "#F3F1EC", use: "muted on chalk", min: 4.5 },
    { fg: "#352820", bg: "#9A9184", use: "ink on stone greige", min: 4.5 },
    { fg: "#352820", bg: "#FFFCF8", use: "ink on paper", min: 4.5 },
    { fg: "#5F574D", bg: "#FFFCF8", use: "muted on paper", min: 4.5 }
  ]
};

/* Scheduling Standards §1.1. Customized Facial is Nicole's approved umbrella over Mini Facial, Facial, Hydrafacial. */
BRIZZA.FACIAL_REASONS = ["Mini Facial", "Facial", "Hydrafacial"];
BRIZZA.reasonCatalog = {
  Consult: ["New Patient", "Existing Patient"],
  "Toxin/Filler Treatment": ["Botox", "Jeuveau", "Juvederm", "Volbella"],
  "Skin Treatment": ["Customized Facial", "Chemical Peel", "Microneedling"],
  "Follow Up": ["Botox", "Jeuveau", "Juvederm", "Volbella", "Mini Facial", "Facial", "Hydrafacial", "Chemical Peel", "Microneedling"]
};

BRIZZA.appointmentStatuses = ["Scheduled", "Confirmed", "Checked In", "In Progress", "Completed", "Canceled", "No-Show", "Rescheduled"];
BRIZZA.consultationOutcomes = [
  "Treatment performed during visit",
  "Treatment scheduled for later date",
  "Patient wants time to decide",
  "Patient declined treatment",
  "Provider determined treatment was not appropriate",
  "Follow-up recommended",
  "Other approved outcome"
];
BRIZZA.treatmentStatuses = ["In Progress", "Completed", "Stopped", "Entered in Error"];
BRIZZA.patientStatuses = ["Active", "Inactive", "Discharged/Closed"];
BRIZZA.paymentStatuses = ["Unpaid", "Partially Paid", "Paid", "Refunded", "Voided"];
BRIZZA.invoiceStatuses = ["Draft", "Issued", "Partially Paid", "Paid", "Overdue", "Voided", "Refunded"];
BRIZZA.BOOKING_TIMES = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00"];
BRIZZA.ROOMS = ["No room assigned", "Room 1", "Room 2", "Room 3"];
BRIZZA.PROVIDERS = ["Dr. Elena Ruiz", "Dr. Samir Shah"]; /* Open question: which of the seven roles these names hold. */


BRIZZA.ROLES = [
  "MD / Clinic Owner",
  "Clinic Manager",
  "Clinic Coordinator",
  "RN / NP Injector",
  "Aesthetician",
  "Medical Assistant",
  "Marketing Specialist"
];
BRIZZA.ROOMING_STATUSES = [
  "Checked in (front desk)",
  "Completing paperwork",
  "Ready",
  "With clinical",
  "Ready for provider",
  "With provider",
  "Ready for checkout",
  "Checked out"
];
/* Admin block reasons as specified for this mockup; not an approved V1 catalog. */
BRIZZA.BLOCK_REASONS = ["Meeting", "Rep meeting", "Lunch", "Personal", "OFF"];
BRIZZA.CLINIC_TIMES = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];



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
      {id:"BRZ0001",name:"Maya Chen",dob:"1989-04-16",sex:"Female",phone:"(212) 555-0184",email:"maya.chen@example.com",status:"Active",
        allergies:["Hyaluronic acid — swelling"],meds:["Cetirizine · as needed"],conditions:["History of cold sores"],
        notes:[{id:"N-1",date:"2026-10-28",type:"Consultation",procedurePerformed:"No",provider:"Dr. Elena Ruiz",status:"Ready for review",
          text:"Consultation completed. Patient wants time to decide; risks, alternatives, and expected results reviewed."}],
        consents:{clinical:"Current · signed Oct 28, 2026",marketing:"Not authorized"},
        photos:["Clinical baseline · Oct 28, 2026"],documents:["Intake and medical history · Oct 28, 2026"],
        treatments:[],followups:[{id:"F-1",text:"Check in after consultation",due:"2026-11-25"}],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-10-28"},formsCompleted:{status:"Completed",date:"2026-10-28"},demographicsConfirmed:{status:"Confirmed",date:"2026-10-28"}}},
      {id:"BRZ0002",name:"Jordan Patel",dob:"1976-09-02",sex:"Male",phone:"(212) 555-0132",email:"j.patel@example.com",status:"Active",
        allergies:["No known allergies"],meds:[],conditions:["Skin sensitivity"],
        notes:[{id:"N-2",date:"2026-11-03",type:"Consultation",procedurePerformed:"Yes",provider:"Dr. Elena Ruiz",status:"Ready for review",
          text:"Treatment completed; aftercare instructions provided and acknowledged."}],
        consents:{clinical:"Current · signed Nov 3, 2026",marketing:"Not authorized"},
        photos:["Clinical before/after · Nov 3, 2026"],documents:["Treatment consent · Nov 3, 2026"],
        treatments:["Botox · Completed Nov 3, 2026"],followups:[{id:"F-2",text:"Two-week follow-up",due:"2026-11-17"}],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-10-09"},formsCompleted:{status:"Completed",date:"2026-10-09"},demographicsConfirmed:{status:"Confirmed",date:"2026-10-09"}}},
      {id:"BRZ0003",name:"Sofia Williams",dob:"1994-12-21",sex:"Female",phone:"(917) 555-0127",email:"sofia.w@example.com",status:"Active",
        allergies:["Latex"],meds:[],conditions:[],notes:[],
        consents:{clinical:"Not yet recorded",marketing:"Not authorized"},photos:[],
        documents:["Registration and intake pending"],treatments:[],followups:[],demoHistory:[],
        registration:{idUploaded:{status:"Not uploaded",date:null},formsCompleted:{status:"Not completed",date:null},demographicsConfirmed:{status:"Not confirmed",date:null}}},
      {id:"BRZ0004",name:"Ava Thompson",dob:"1997-07-09",sex:"Female",phone:"(646) 555-0148",email:"ava.thompson@example.com",status:"Inactive",
        allergies:["No known allergies"],meds:[],conditions:[],
        notes:[{id:"N-3",date:"2026-03-12",type:"Consultation",procedurePerformed:"Yes",provider:"Dr. Samir Shah",status:"Ready for review",
          text:"Consultation and same-day chemical peel documented; consent and aftercare instructions recorded. No activity since; status set to Inactive.",visitId:"V-1001"}],
        consents:{clinical:"Signed Mar 12, 2026",marketing:"Not authorized"},
        photos:["Clinical baseline · Mar 12, 2026"],
        documents:["Intake and medical history · Mar 12, 2026","Treatment consent · Mar 12, 2026"],
        treatments:["Chemical Peel · Completed Mar 12, 2026"],followups:[],demoHistory:[],
        registration:{idUploaded:{status:"Uploaded",date:"2026-03-12"},formsCompleted:{status:"Completed",date:"2026-03-12"},demographicsConfirmed:{status:"Confirmed",date:"2026-03-12"}}}
    ],
    appointments: [
      {id:"A-6201",time:"11:00",patientId:"BRZ0004",type:"Consult",reasons:["New Patient"],provider:"Dr. Samir Shah",durationLabel:"TBD",status:"Completed",consultation:"Treatment performed during visit",treatment:"",room:"Room 3",date:"2026-03-12",visitId:"V-1001",invoiceId:"INV-1001",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6202",time:"11:45",patientId:"BRZ0004",type:"Skin Treatment",reasons:["Chemical Peel"],provider:"Dr. Samir Shah",durationLabel:"TBD",status:"Completed",consultation:"",treatment:"Completed",room:"Room 3",date:"2026-03-12",visitId:"V-1001",invoiceId:"INV-1001",relatedAppointmentId:"A-6201",locationId:"LOC-MANHATTAN",history:["Scheduled","Scheduled → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6203",time:"14:00",patientId:"BRZ0001",type:"Consult",reasons:["New Patient"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Completed",consultation:"Patient wants time to decide",treatment:"",room:"Room 1",date:"2026-10-28",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6204",time:"15:00",patientId:"BRZ0002",type:"Toxin/Filler Treatment",reasons:["Botox"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Completed",consultation:"",treatment:"Completed",room:"Room 2",date:"2026-11-03",invoiceId:"INV-1002",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6205",time:"13:00",patientId:"BRZ0002",type:"Follow Up",reasons:["Botox"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Checked In",consultation:"",treatment:"",room:"Room 2",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In"]},
      {id:"A-6206",time:"10:00",patientId:"BRZ0001",type:"Consult",reasons:["Existing Patient"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 1",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6207",time:"11:30",patientId:"BRZ0003",type:"Consult",reasons:["New Patient"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 3",date:"2026-11-16",visitId:"V-1002",invoiceId:"INV-1003",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6210",time:"12:30",patientId:"BRZ0003",type:"Skin Treatment",reasons:["Facial"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 3",date:"2026-11-16",visitId:"V-1002",invoiceId:"INV-1003",relatedAppointmentId:"A-6207",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6208",time:"13:30",patientId:"BRZ0001",type:"Follow Up",reasons:["Juvederm"],provider:"Dr. Samir Shah",durationLabel:"TBD",status:"Scheduled",consultation:"",treatment:"",room:"Room 2",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6209",time:"14:30",patientId:"BRZ0002",type:"Skin Treatment",reasons:["Microneedling"],provider:"Dr. Samir Shah",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 1",date:"2026-11-16",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},

      {id:"A-6211",time:"11:00",patientId:"BRZ0002",type:"Consult",reasons:["New Patient"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Completed",consultation:"Treatment scheduled for later date",treatment:"",room:"Room 2",date:"2026-10-09",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed","Confirmed → Checked In","Checked In → In Progress","In Progress → Completed"]},
      {id:"A-6212",time:"15:00",patientId:"BRZ0002",type:"Skin Treatment",reasons:["Facial"],provider:"Dr. Samir Shah",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 1",date:"2026-11-13",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6213",time:"10:00",patientId:"BRZ0002",type:"Follow Up",reasons:["Botox"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Scheduled",consultation:"",treatment:"",room:"Room 2",date:"2026-11-17",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6214",time:"11:00",patientId:"BRZ0001",type:"Consult",reasons:["Existing Patient"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 1",date:"2026-11-18",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6215",time:"10:30",patientId:"BRZ0003",type:"Follow Up",reasons:["Facial"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Scheduled",consultation:"",treatment:"",room:"Room 3",date:"2026-11-23",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6216",time:"13:00",patientId:"BRZ0001",type:"Toxin/Filler Treatment",reasons:["Juvederm"],provider:"Dr. Samir Shah",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 2",date:"2026-11-24",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6217",time:"10:00",patientId:"BRZ0001",type:"Follow Up",reasons:["Juvederm"],provider:"Dr. Samir Shah",durationLabel:"TBD",status:"Scheduled",consultation:"",treatment:"",room:"Room 2",date:"2026-12-01",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6218",time:"14:30",patientId:"BRZ0003",type:"Skin Treatment",reasons:["Hydrafacial"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Scheduled",consultation:"",treatment:"",room:"Room 3",date:"2026-12-03",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6219",time:"15:00",patientId:"BRZ0002",type:"Follow Up",reasons:["Botox"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Scheduled",consultation:"",treatment:"",room:"Room 2",date:"2026-12-10",locationId:"LOC-MANHATTAN",history:["Scheduled"]},
      {id:"A-6220",time:"10:00",patientId:"BRZ0002",type:"Follow Up",reasons:["Botox"],provider:"Dr. Elena Ruiz",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 2",date:"2026-11-18",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]},
      {id:"A-6221",time:"14:00",patientId:"BRZ0003",type:"Follow Up",reasons:["Facial"],provider:"Dr. Samir Shah",durationLabel:"TBD",status:"Confirmed",consultation:"",treatment:"",room:"Room 3",date:"2026-11-18",locationId:"LOC-MANHATTAN",history:["Scheduled → Confirmed"]}
        ],
    visits: [
      {id:"V-1001",patientId:"BRZ0004",date:"2026-03-12",appointmentIds:["A-6201","A-6202"],invoiceId:"INV-1001",noteId:"N-3",label:"Same-day consult and Chemical Peel"},
      {id:"V-1002",patientId:"BRZ0003",date:"2026-11-16",appointmentIds:["A-6207","A-6210"],invoiceId:"INV-1003",noteId:null,label:"Same-day consult and Customized Facial (Facial)"}
    ],
    invoices: [
      {id:"INV-1001",patientId:"BRZ0004",visitId:"V-1001",appointmentIds:["A-6201","A-6202"],status:"Paid",balance:"None",
        lines:[{service:"Consult · New Patient",amount:"TBD"},{service:"Skin Treatment · Chemical Peel",amount:"TBD"}],
        payments:[{id:"PAY-1001",method:"Card (processor reference only)",status:"Paid",recorded:"2026-03-12"}],
        finalized:true,finalizedAt:"2026-03-12 15:10 ET",movements:[{lotId:"LOT-PEEL-08",product:"Chemical Peel",type:"TREATMENT_USAGE",posted:"2026-03-12 15:10 ET"}]},
      {id:"INV-1002",patientId:"BRZ0002",visitId:null,appointmentIds:["A-6204"],status:"Paid",balance:"None",
        lines:[{service:"Toxin/Filler Treatment · Botox",amount:"TBD"}],
        payments:[{id:"PAY-1002",method:"Card (processor reference only)",status:"Paid",recorded:"2026-11-03"}],
        finalized:true,finalizedAt:"2026-11-03 16:05 ET",movements:[{lotId:"LOT-BTX-031",product:"Botox",type:"TREATMENT_USAGE",posted:"2026-11-03 16:05 ET"}]},
      {id:"INV-1003",patientId:"BRZ0003",visitId:"V-1002",appointmentIds:["A-6207","A-6210"],status:"Issued",balance:"Outstanding (amount TBD)",
        lines:[{service:"Consult · New Patient",amount:"TBD"},{service:"Customized Facial · Facial",amount:"TBD"}],
        payments:[],finalized:false,finalizedAt:null,movements:[]}
    ],
    lots: [
      {id:"LOT-BTX-031",product:"Botox",onHand:0,expiry:"2026-10-20",status:"Used",released:true},
      {id:"LOT-BTX-038",product:"Botox",onHand:2,expiry:"2026-11-30",status:"Released",released:true},
      {id:"LOT-BTX-041",product:"Botox",onHand:4,expiry:"2026-12-15",status:"Released",released:true},
      {id:"LOT-PEEL-08",product:"Chemical Peel",onHand:0,expiry:"2026-09-01",status:"Used",released:true},
      {id:"LOT-PEEL-12",product:"Chemical Peel",onHand:3,expiry:"2026-12-01",status:"Released",released:true},
      {id:"LOT-FACE-04",product:"Facial",onHand:5,expiry:"2027-02-15",status:"Released",released:true},
      {id:"LOT-FACE-02",product:"Facial",onHand:1,expiry:"2026-12-20",status:"Released",released:true}
    ],
    reservations: [
      {id:"RES-1",invoiceId:"INV-1003",lotId:"LOT-FACE-02",product:"Facial",status:"Suggested"}
    ],
    audit: []
  };
  data.audit = BRIZZA.buildSeedAudit(data);
  data.blocks = [
    {id:"BLK-1001",type:"Admin",reason:"Lunch",staff:"Dr. Elena Ruiz",date:"2026-11-18",start:"12:00",end:"13:00",locationId:"LOC-MANHATTAN"},
    {id:"BLK-1002",type:"Admin",reason:"Meeting",staff:"Dr. Samir Shah",date:"2026-11-16",start:"10:00",end:"11:00",locationId:"LOC-MANHATTAN"},
    {id:"BLK-1003",type:"Admin",reason:"OFF",staff:"Dr. Samir Shah",date:"2026-11-20",start:"10:00",end:"18:00",locationId:"LOC-MANHATTAN"},
    {id:"BLK-1004",type:"Admin",reason:"Rep meeting",staff:"Dr. Elena Ruiz",date:"2026-11-17",start:"16:00",end:"17:00",locationId:"LOC-MANHATTAN"},
    {id:"BLK-1005",type:"Admin",reason:"Personal",staff:"Dr. Elena Ruiz",date:"2026-12-01",start:"11:00",end:"12:00",locationId:"LOC-MANHATTAN"}
  ];
  const now = Date.now();
  data.rooming = [
    {id:"RM-1001",appointmentId:"A-6220",patientId:"BRZ0002",date:"2026-11-18",status:"Checked in (front desk)",statusSince: now - 18 * 60000},
    {id:"RM-1002",appointmentId:"A-6214",patientId:"BRZ0001",date:"2026-11-18",status:"Ready",statusSince: now - 7 * 60000},
    {id:"RM-1003",appointmentId:"A-6221",patientId:"BRZ0003",date:"2026-11-18",status:"With clinical",statusSince: now - 31 * 60000}
  ];
  return data;
};

BRIZZA.DEMO_STEPS = [
  {id:"d1",ms:12000,hash:"#/patients/BRZ0003",title:"Patient chart",
    caption:"Sofia Williams (BRZ0003) is a synthetic new-patient chart. Sections follow the approved longitudinal record (DB-005). Clinical Notes is shown as a tab and flagged as an open question versus the eight named sections.",
    decisions:"DB-005, DB-003"},
  {id:"d2",ms:14000,hash:"#/visits/V-1002",title:"Same-day consult then treat",
    caption:"One Visit holds two appointments: a Consult and a same-day Skin Treatment (Customized Facial · Facial). Each appointment keeps its own provider, status, and history (Headquarters 1a; Journey §6; Sched §5).",
    decisions:"HQ 1a, DB-018, Sched §5"},
  {id:"d3",ms:12000,hash:"#/patients/BRZ0003/appointments",title:"Independent statuses and history",
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
