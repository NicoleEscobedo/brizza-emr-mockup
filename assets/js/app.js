/* Brizza Clinic EMR mockup — synthetic data only. */
(function () {
  "use strict";
  // Round 6 — Worklist, given prices, inventory, merged clinical profile, history pop-up.

  function fmtTime(t) {
    if (!t) return "";
    const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return String(t);
    let h = Number(m[1]);
    const min = m[2];
    const suf = h >= 12 ? "p.m." : "a.m.";
    h = h % 12;
    if (h === 0) h = 12;
    return h + ":" + min + " " + suf;
  }
  function timeOptions(selected, times) {
    return (times || BRIZZA.BOOKING_TIMES).map((tm) =>
      "<option value=\"" + tm + "\"" + (tm === selected ? " selected" : "") + ">" + esc(fmtTime(tm)) + "</option>"
    ).join("");
  }
  function patientLink(pOrId) {
    const p = typeof pOrId === "object" ? pOrId : patient(pOrId);
    if (!p) return esc(pOrId || "");
    return '<a class="patient-link" href="' + hashFor({ page: "patients", selected: p.id, tab: "demographics" }) + '">' + esc(p.name) + "</a>";
  }
  function typesList() { return store.appointmentTypes || BRIZZA.appointmentTypes || []; }
  function reasonsList() { return store.appointmentReasons || BRIZZA.appointmentReasons || []; }
  function typeByName(name) { return typesList().find((t) => t.name === name) || null; }
  function reasonsForType(typeName) {
    const typ = typeByName(typeName);
    if (!typ) return [];
    return (typ.reasonIds || []).map((id) => reasonsList().find((r) => r.id === id)).filter(Boolean);
  }
  function durationMinutes(typeName, reasonNames) {
    const typ = typeByName(typeName);
    let mins = typ ? typ.minutes : 0;
    (reasonNames || []).forEach((n) => {
      const r = reasonsList().find((x) => x.name === n);
      if (r && r.minutes != null) mins = r.minutes;
    });
    return mins;
  }
  function durationLabelFor(typeName, reasonNames) {
    const n = durationMinutes(typeName, reasonNames);
    return n ? n + " min" : "TBD";
  }
  function toMinutes(t) {
    const m = String(t || "").match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  }
  function apptSpan(a) {
    const start = toMinutes(a.time);
    const dur = a.durationMinutes || durationMinutes(a.type, a.reasons) || 30;
    return { start: start, end: start + dur };
  }
  function overlappingBlocks(date, time, typeName, reasonNames, provider) {
    const start = toMinutes(time);
    const end = start + (durationMinutes(typeName, reasonNames) || 30);
    return dayBlocks(date).filter((b) => {
      if (provider && b.staff && b.staff !== provider) return false;
      return toMinutes(b.start) < end && toMinutes(b.end) > start;
    });
  }
  function historySnapshotOf(p) {
    return {
      allergies: (p.allergies || []).slice(),
      meds: (p.meds || []).slice(),
      conditions: (p.conditions || []).slice(),
      consents: Object.assign({}, p.consents || {})
    };
  }
  function historyDiffHtml(snapshot, p) {
    if (!snapshot) return '<p class="row-sub">No medical-history snapshot is stored on this note.</p>';
    const now = historySnapshotOf(p);
    const rows = ["allergies", "meds", "conditions"].map((k) => {
      const before = (snapshot[k] || []).join(", ") || "—";
      const after = (now[k] || []).join(", ") || "—";
      const changed = before !== after;
      return '<div class="row"><div><div class="row-title">' + esc(k) + "</div>" +
        '<div class="row-sub">At signing: ' + esc(before) + "</div>" +
        '<div class="' + (changed ? "changed" : "row-sub") + '">Now: ' + esc(after) + (changed ? " (changed)" : "") + "</div></div></div>";
    }).join("");
    return '<div class="history-diff"><h3 class="section-title">Medical history since this note</h3>' + rows + "</div>";
  }


  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => n.split(" ").map((x) => x[0]).join("");

  function age(dob) {
    const b = new Date(dob + "T00:00:00");
    const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (new Date(n.getFullYear(), b.getMonth(), b.getDate()) > n) a--;
    return a;
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function fmtLong(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  function nowET() {
    return new Date().toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET";
  }
  function addDays(iso, n) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${mm}-${dd}`;
  }


  function todayET() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  function weekdayNum(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  }
  function isWeekend(iso) {
    const d = weekdayNum(iso);
    return d === 0 || d === 6;
  }
  function weekMonday(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return dt.getFullYear() + "-" + mm + "-" + dd;
  }
  function addMonths(iso, n) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1 + n, 1);
    const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    const day = Math.min(d, last);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return dt.getFullYear() + "-" + mm + "-" + dd;
  }
  function monthLabel(iso) {
    const [y, m] = iso.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  function locationName(id) {
    const loc = (BRIZZA.LOCATIONS || []).find((l) => l.id === id);
    return loc ? loc.name : (id || "—");
  }
  function auditsFor(type, id) {
    return store.audit.filter((e) => e.recordType === type && e.recordId === id);
  }
  function addAudit(spec) {
    const ev = {
      id: nextId("AUD-", store.audit),
      when: spec.when || nowET(),
      who: spec.who || actingName(),
      role: spec.role || state.actingRole || "Synthetic session user",
      action: spec.action,
      recordType: spec.recordType,
      recordId: spec.recordId,
      recordPath: spec.recordPath || {},
      changes: spec.changes || []
    };
    store.audit.push(ev);
    return ev;
  }
  const AUDIT_SVG = '<svg class="audit-icon-svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="3.5" y="2.5" width="9" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 6.5h4M6 9h4M6 11.5h2.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  function auditIcon(href) {
    if (!href) return "";
    return '<a class="audit-icon" href="' + href + '" title="Audit log" aria-label="Audit log">' + AUDIT_SVG + "</a>";
  }
  function auditIconFor(type, id) {
    return historyIcon(type, id);
  }
  function historyLinks(type, id, fallback) {
    return auditIconFor(type, id);
  }
  function timelineHtml(type, id) {
    const evs = auditsFor(type, id);
    if (!evs.length) return '<div class="empty">No audit events</div>';
    return evs.map((e) => '<div class="event"><div class="event-date">' + esc(e.when) + "</div>" + auditIcon(hashFor({ page: "audit", auditId: e.id })) + '<span class="event-action">' + esc(e.action) + "</span></div>").join("");
  }
  function registrationItems(p) {
    const r = (p && p.registration) || {};
    const item = (key, label, doneWord, pendingWord) => {
      const rec = r[key] || { status: pendingWord, date: null };
      const ok = rec.status === doneWord || rec.status === "Completed" || (key === "formsCompleted" && rec.status === "Checked out");
      return { key: key, label: label, status: rec.status || pendingWord, date: rec.date, ok: ok };
    };
    return [
      item("idUploaded", "ID uploaded", "Uploaded", "Not uploaded"),
      item("formsCompleted", "Intake/consent forms completed", "Completed", "Not completed"),
      item("demographicsConfirmed", "Demographics confirmed", "Confirmed", "Not confirmed")
    ];
  }
  function registrationPanel(a) {
    const p = patient(a.patientId);
    const items = registrationItems(p);
    const rows = items.map((it) => '<div class="reg-item"><div><div class="row-title">' + esc(it.label) + '</div><div class="row-sub">' + (it.date ? esc(fmtDate(it.date)) : "No date recorded") + "</div></div>" + badge(it.status) + "</div>").join("");
    return '<div class="reg-panel" id="reg-panel-' + esc(a.id) + '"><h3 class="section-title">Registration status</h3>' + rows +
      openQ("The official visit-readiness and registration checklist is not named in the sources (Open question 4). ID uploaded, intake/consent forms, and demographics confirmed are prototype indicators only.") + "</div>";
  }
  function scheduleShift(iso, dir) {
    if (state.scheduleView === "calendar" && state.calMode === "week") return addDays(weekMonday(iso), dir * 7);
    if (state.scheduleView === "calendar" && state.calMode === "month") return addMonths(iso, dir);
    return addDays(iso, dir);
  }


  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 8) hex = hex.slice(0, 6);
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function relLum({ r, g, b }) {
    const f = (v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const R = f(r), G = f(g), B = f(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }
  function contrastRatio(fg, bg) {
    const L1 = relLum(hexToRgb(fg));
    const L2 = relLum(hexToRgb(bg));
    const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function checkContrast() {
    const out = {};
    let failed = 0;
    for (const [theme, pairs] of Object.entries(BRIZZA.CONTRAST_PAIRS)) {
      out[theme] = pairs.map((p) => {
        const ratio = contrastRatio(p.fg, p.bg);
        const pass = ratio + 1e-6 >= p.min;
        if (!pass) failed++;
        return Object.assign({}, p, { ratio: Number(ratio.toFixed(2)), pass });
      });
    }
    return { failed, results: out };
  }
  BRIZZA.contrastRatio = contrastRatio;
  BRIZZA.checkContrast = checkContrast;

  const store = BRIZZA.seed();
  const state = {
    theme: "01", page: "patients", date: BRIZZA.SAMPLE_DAY, selected: "BRZ0001",
    tab: "demographics", visitId: null, invoiceId: null, appointmentId: null,
    providerFilter: "All providers", search: "", reschedulingId: null, modal: null,
    demo: { running: false, index: 0, timer: null }, contrast: null,
    scheduleView: "list", calMode: "week", locationId: BRIZZA.DEFAULT_LOCATION,
    expandedAppt: null, auditId: null,
    actingRole: "Clinic Coordinator", roomingDate: null, scheduleSearch: "", noteDraft: null
  };

  const patient = (id) => store.patients.find((p) => p.id === id);
  const appt = (id) => store.appointments.find((a) => a.id === id);
  const visit = (id) => store.visits.find((v) => v.id === id);
  const invoice = (id) => store.invoices.find((i) => i.id === id);
  const apptsFor = (p) => store.appointments.filter((a) => a.patientId === p.id);
  const invoiceForAppt = (a) => (a.invoiceId ? invoice(a.invoiceId) : null);

  const ACTIVE = new Set(["Scheduled", "Confirmed", "Checked in", "Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout"]);
  const NEEDS_REASON = new Set(["Confirmed", "Checked in", "Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout", "Checked out"]);

  function nextAppt(p) {
    return apptsFor(p).filter((a) => ACTIVE.has(a.status) && a.date >= BRIZZA.SAMPLE_DAY)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0] || null;
  }
  function lastAppt(p) {
    return apptsFor(p).filter((a) => a.status === "Checked out")
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0] || null;
  }
  function isNewPatient(p) {
    return !apptsFor(p).some((a) => a.status === "Checked out") && !(p.treatments && p.treatments.length);
  }
  function reasonText(a) {
    return (a.reasons && a.reasons.length) ? a.reasons.join(", ") : "No reason selected";
  }
  function nextId(prefix, list, key) {
    key = key || "id";
    const nums = list.map((x) => parseInt(String(x[key]).replace(/^\D+/, ""), 10)).filter((n) => !isNaN(n));
    return prefix + String(Math.max(0, ...nums) + 1);
  }

  const TABS = {
    demographics: "Demographics",
    "clinical-profile": "Clinical profile",
    appointments: "Appointments",
    photos: "Photos",
    documents: "Documents",
    ledger: "Ledger",
    quotes: "Quotes",
    "follow-up": "Follow-up history",
    "clinical-notes": "Clinical notes"
  };

  function parseHash() {
    const raw = (location.hash || "#/patients").replace(/^#/, "");
    const [pathPart, queryPart] = raw.split("?");
    const q = new URLSearchParams(queryPart || "");
    const parts = pathPart.split("/").filter(Boolean);
    state.theme = "01";
    let route = { page: "patients" };
    const p0 = parts[0] || "patients";
    if (p0 === "schedule") {
      let i = 1;
      let view = "worklist";
      let calMode = state.calMode || "week";
      if (parts[1] === "list" || parts[1] === "worklist") { view = "worklist"; i = 2; }
      else if (parts[1] === "calendar") {
        view = "calendar";
        const mode = parts[2];
        if (mode === "day" || mode === "week" || mode === "month") { calMode = mode; i = 3; }
        else { calMode = "week"; i = 2; }
      }
      let date = state.date || todayET();
      let appointmentId = null;
      if (parts[i] && /^\d{4}-\d{2}-\d{2}$/.test(parts[i])) { date = parts[i]; i += 1; }
      if (parts[i] === "appointment") appointmentId = parts[i + 1] || null;
      route = { page: "schedule", view: view, calMode: calMode, date: date, appointmentId: appointmentId };
    } else if (p0 === "patients") {
      route = { page: "patients", selected: parts[1] || state.selected, tab: parts[2] || "demographics" };
    } else if (p0 === "queue") {
      route = { page: "queue", date: parts[1] || state.date || BRIZZA.SAMPLE_DAY };
    } else if (p0 === "configuration") {
      route = { page: "configuration" };
    } else if (p0 === "appointment-types") {
      route = { page: "types" };
    } else if (p0 === "appointment-reasons") {
      route = { page: "reasons" };
    } else if (p0 === "visits") {
      route = { page: "visit", visitId: parts[1] };
    } else if (p0 === "checkout") {
      route = { page: "pos", invoiceId: parts[1], posTab: "invoice" };
    } else if (p0 === "pos") {
      route = { page: "pos", posTab: "invoice" };
      if (parts[1] === "quotes") route.posTab = "quotes";
      else if (parts[1] === "quote") { route.posTab = "quotes"; route.quoteId = parts[2]; }
      else if (parts[1] === "invoice") { route.posTab = "invoice"; route.invoiceId = parts[2]; }
      else if (parts[1] === "appointment") { route.posTab = "invoice"; route.appointmentId = parts[2]; }
    } else if (p0 === "demo") {
      route = { page: "demo" };
    } else if (p0 === "audit") {
      route = { page: "audit", auditId: parts[1] };
    } else if (p0 === "rooming") {
      const date = (parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) ? parts[1] : (state.roomingDate || todayET());
      route = { page: "rooming", date: date };
    } else if (p0 === "inventory") {
      route = { page: "inventory", invTab: parts[1] || state.invTab || "catalog" };
    }
    return route;
  }

  function hashFor(route, theme) {
    const t = theme || state.theme;
    let path = "/patients";
    if (route.page === "schedule") {
      const date = route.date || state.date;
      const view = route.view || state.scheduleView || "worklist";
      const calMode = route.calMode || state.calMode || "week";
      if (view === "calendar") path = "/schedule/calendar/" + calMode + "/" + date;
      else path = "/schedule/worklist/" + date;
      if (route.appointmentId) path += "/appointment/" + route.appointmentId;
    } else if (route.page === "patients") {
      path = route.selected ? "/patients/" + route.selected + "/" + (route.tab || "demographics") : "/patients";
    } else if (route.page === "queue") path = "/queue/" + (route.date || state.date);
    else if (route.page === "configuration") path = "/configuration";
    else if (route.page === "types") path = "/appointment-types";
    else if (route.page === "reasons") path = "/appointment-reasons";
    else if (route.page === "visit") path = "/visits/" + route.visitId;
    else if (route.page === "checkout") path = "/pos/invoice/" + route.invoiceId;
    else if (route.page === "pos") {
      if (route.quoteId) path = "/pos/quote/" + route.quoteId;
      else if (route.posTab === "quotes") path = "/pos/quotes";
      else if (route.invoiceId) path = "/pos/invoice/" + route.invoiceId;
      else if (route.appointmentId) path = "/pos/appointment/" + route.appointmentId;
      else path = "/pos";
    }
    else if (route.page === "demo") path = "/demo";
    else if (route.page === "audit") path = "/audit/" + route.auditId;
    else if (route.page === "rooming") path = "/rooming/" + (route.date || state.roomingDate || todayET());
    else if (route.page === "inventory") path = "/inventory/" + (route.invTab || state.invTab || "catalog");
    return "#" + path + "?theme=01";
  }

  function go(route) {
    location.hash = hashFor(route).replace(/^#/, "#");
  }

  function applyRoute() {
    const r = parseHash();
    state.page = r.page;
    if (r.date && r.page !== "rooming") state.date = r.date;
    if (r.page === "rooming" && r.date) state.roomingDate = r.date;
    if (r.view) state.scheduleView = r.view;
    if (r.calMode) state.calMode = r.calMode;
    if (r.selected && patient(r.selected)) {
      state.selected = r.selected;
      state.tab = TABS[r.tab] ? r.tab : (r.tab === "treatment-history" ? "clinical-profile" : "demographics");
    }
    if (r.invTab) state.invTab = r.invTab;
    if (r.visitId) state.visitId = r.visitId;
    if (r.invoiceId) state.invoiceId = r.invoiceId;
    state.quoteId = r.quoteId || null;
    state.posTab = r.posTab || state.posTab || "invoice";
    if (r.appointmentId && r.page === "pos") state.posAppointmentId = r.appointmentId;

    if (r.appointmentId) state.appointmentId = r.appointmentId;
    if (r.auditId) state.auditId = r.auditId;
    document.documentElement.setAttribute("data-theme", state.theme);
    if (r.page === "demo" && !state.demo.running) {
      startDemo();
      return;
    }
    render();
    if (r.page === "schedule" && r.appointmentId && appt(r.appointmentId)) {
      openAppointmentModal(r.appointmentId);
    } else if ($("#modal") && $("#modal").classList.contains("open")) {
      closeModal({ cancelPending: true });
    }
  }

  function badge(status) {
    const warn = ["Scheduled", "Inactive", "Issued", "Draft", "Partially Paid", "Overdue"].indexOf(status) >= 0;
    const alert = ["Canceled", "No-show", "No-Show", "Voided", "Discharged/Closed", "Not yet recorded", "Needs prep"].indexOf(status) >= 0;
    const cls = alert ? "alert" : warn ? "warn" : "good";
    return '<span class="badge ' + cls + '">' + esc(status) + "</span>";
  }
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2800);
  }
  function openQ(text) {
    return '<div class="open-q" role="note"><strong>Open question</strong>' + text + "</div>";
  }
  function optionalIdea(text) {
    return '<div class="optional-idea" role="note"><strong>Optional idea (undecided)</strong>' + text + "</div>";
  }
  function concept(text) {
    return '<div class="open-q" role="note"><strong>Concept</strong>' + text + "</div>";
  }
  function invoiceBadge(a) {
    const inv = invoiceForAppt(a);
    if (!inv) return '<span class="row-sub">No invoice</span>';
    return '<a class="badge" href="' + hashFor({ page: "pos", invoiceId: inv.id, posTab: "invoice" }) + '">' + esc(inv.id) + " · " + esc(inv.status) + "</a>";
  }


  /* —— Round 6 helpers: money, catalog, worklist, history, inventory —— */
  function catalogItem(idOrName) {
    const list = store.catalog || BRIZZA.CATALOG || [];
    return list.find((c) => c.id === idOrName || c.name === idOrName) || null;
  }
  function lineSum(inv) {
    let sum = 0, tbd = false;
    (inv && inv.lines || []).forEach(function (l) {
      const a = lineAmount(l);
      if (a == null) tbd = true;
      else sum += a;
    });
    return { sum: Math.round(sum * 100) / 100, tbd: tbd };
  }
  function money(n) {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "TBD";
    const v = Number(n);
    const sign = v < 0 ? "-" : "";
    return sign + "$" + Math.abs(v).toFixed(2);
  }
  function lineAmount(l) {
    if (!l) return null;
    if (l.qty == null || l.qty === "" || l.unitPrice == null || l.unitPrice === "") return null;
    const q = Number(l.qty), p = Number(l.unitPrice);
    if (Number.isNaN(q) || Number.isNaN(p)) return null;
    return Math.round(q * p * 100) / 100;
  }
  function invoicePaid(inv) {
    let p = 0;
    const ls = lineSum(inv);
    (inv && inv.payments || []).forEach(function (pay) {
      if (pay.status === "Refunded" || pay.status === "Voided") return;
      if (typeof pay.amount === "number") p += pay.amount;
      else if (pay.status === "Paid" && !ls.tbd) p += ls.sum;
    });
    return Math.round(p * 100) / 100;
  }
  function invoiceTotals(inv) {
    const ls = lineSum(inv);
    const paid = invoicePaid(inv);
    let balance;
    if (inv && typeof inv.balance === "number" && inv._balanceLocked) balance = inv.balance;
    else if (!ls.tbd) balance = Math.round((ls.sum - paid) * 100) / 100;
    else balance = null;
    const label = ls.tbd && !ls.sum ? "TBD" : (money(ls.sum) + (ls.tbd ? " + TBD" : ""));
    return { sum: ls.sum, tbd: ls.tbd, paid: paid, balance: balance, label: label };
  }
  function refreshInvoiceBalance(inv) {
    if (!inv) return;
    const t = invoiceTotals(inv);
    if (t.balance == null) {
      if (inv.status === "Paid") inv.balance = "None";
      else if (!inv.balance || typeof inv.balance === "number") inv.balance = "Outstanding (amount TBD)";
    } else {
      inv.balance = t.balance;
      if (inv.status === "Voided" || inv.status === "Refunded") return;
      if (t.paid > 0 && t.balance <= 0 && !t.tbd) inv.status = "Paid";
      else if (t.paid > 0 && t.balance > 0) inv.status = "Partially Paid";
    }
  }
  function patientBalanceValue(pid) {
    let sum = 0, tbd = false;
    (store.invoices || []).filter((i) => i.patientId === pid).forEach(function (inv) {
      refreshInvoiceBalance(inv);
      if (typeof inv.balance === "number") sum += inv.balance;
      else if (inv.status !== "Paid" && inv.status !== "Voided" && inv.balance !== "None") tbd = true;
    });
    return { sum: Math.round(sum * 100) / 100, tbd: tbd };
  }
  function appointmentInvoices(a) {
    return (store.invoices || []).filter((inv) => (inv.appointmentIds || []).indexOf(a.id) >= 0 || a.invoiceId === inv.id);
  }
  function appointmentBalanceValue(a) {
    const invs = appointmentInvoices(a);
    if (!invs.length) return { sum: 0, tbd: false };
    let sum = 0, tbd = false;
    invs.forEach(function (inv) {
      refreshInvoiceBalance(inv);
      if (typeof inv.balance === "number") sum += inv.balance;
      else if (inv.status !== "Paid" && inv.status !== "Voided" && inv.balance !== "None") tbd = true;
    });
    return { sum: Math.round(sum * 100) / 100, tbd: tbd };
  }
  function balanceBadge(val) {
    if (!val) return '<span class="bal zero">—</span>';
    if (val.tbd && !val.sum) return '<span class="bal due">TBD due</span>';
    if (val.sum > 0) return '<span class="bal due">' + money(val.sum) + (val.tbd ? " + TBD" : "") + "</span>";
    if (val.sum < 0) return '<span class="bal credit">Credit ' + money(Math.abs(val.sum)) + "</span>";
    return '<span class="bal zero">' + money(0) + "</span>";
  }
  function marginDisplay(price, cost) {
    if (price == null || cost == null || cost === "" || Number.isNaN(Number(cost))) return "—";
    const p = Number(price), c = Number(cost);
    if (!p) return "—";
    const m = Math.round(((p - c) / p) * 1000) / 10;
    return m + "%";
  }

  function canManageInventory() {
    return (BRIZZA.INVENTORY_ROLES || []).indexOf(state.actingRole) >= 0;
  }
  function catalogOnHand(item) {
    if (!item || !item.trackLots) return null;
    return (store.lots || []).filter((l) => (l.productId === item.id || l.product === item.name) && l.status !== "Disposed")
      .reduce((n, l) => n + (Number(l.onHand) || 0), 0);
  }
  function lowStockItems() {
    return (store.catalog || BRIZZA.CATALOG || []).filter(function (c) {
      if (c.reorderPoint == null) return false;
      const on = catalogOnHand(c);
      return on != null && on <= c.reorderPoint;
    });
  }

  function historyIcon(type, id) {
    return '<button type="button" class="audit-icon hist-icon" data-history-type="' + esc(type) + '" data-history-id="' + esc(id || "") + '" title="Audit log" aria-label="Audit log">' + AUDIT_SVG + "</button>";
  }
  function openHistoryPop(type, id) {
    const evs = auditsFor(type, id).slice().reverse();
    const title = "History · " + (type || "Record") + (id ? " " + id : "");
    const rows = evs.length ? evs.map(function (e) {
      const ch = (e.changes || []).map(function (c) {
        return '<div class="hist-change"><strong>' + esc(c.field) + "</strong> · " + esc(c.before || "—") + " → " + esc(c.after || "—") + "</div>";
      }).join("");
      return '<div class="hist-item"><div class="when">' + esc(e.when) + " · " + esc(e.who) + " · " + esc(e.role) + '</div><div class="row-title">' + esc(e.action) + "</div>" + (ch || '<div class="row-sub">No field changes recorded</div>') + "</div>";
    }).join("") : '<div class="empty">No history recorded for this item yet.</div>';
    const foot = $("#modalSave");
    const back = $("#modal");
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = '<div class="hist-list">' + rows + "</div>";
    if (foot) { foot.textContent = "Close"; foot.onclick = function () { closeModal(); }; }
    back.classList.add("open", "hist-mode");
    back.classList.remove("pos-mode");
  }

  function addDocument(pid, spec) {
    const p = patient(pid);
    if (!p) return null;
    p.documents = p.documents || [];
    const doc = {
      id: spec.id || nextId("DOC-", p.documents),
      category: spec.category,
      title: spec.title,
      date: spec.date || todayET(),
      relatedId: spec.relatedId || null,
      invoiceId: spec.invoiceId || null,
      kind: spec.kind || null,
      body: spec.body || "",
      printable: true
    };
    p.documents.push(doc);
    return doc;
  }

  function printView(title, bodyHtml) {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { toast("Allow pop-ups to view or print"); return; }
    const html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + String(title).replace(/[<>]/g, "") + "</title>" +
      "<style>body{font:14px/1.5 sans-serif;color:#352820;padding:24px;background:#fff}h1{font-size:22px}</style></head>" +
      '<body class="print-root"><h1 id="print-title">' + esc(title) + "</h1>" + bodyHtml +
      '<p class="row-sub">Synthetic record · Brizza Clinic prototype</p></body></html>';
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(function () { try { w.focus(); } catch (e) {} }, 50);
  }

  function wlMatches(a, filters) {
    if (!filters || !filters.length) return true;
    const flags = wlFlags(a);
    return filters.every((f) => flags[f]);
  }
  function wlFlags(a) {
    const p = patient(a.patientId);
    const items = registrationItems(p);
    const missing = items.some((it) => !it.ok && (it.key === "idUploaded" || it.key === "formsCompleted"));
    const bal = patientBalanceValue(a.patientId);
    const unpaid = (bal.sum > 0) || bal.tbd;
    const openQuotes = (store.quotes || []).some((q) => q.patientId === a.patientId && (q.status === "Open" || q.status === "Prepaid"));
    return {
      confirm: a.status === "Scheduled",
      missing: missing,
      checkout: a.status === "Ready for checkout",
      unpaid: unpaid,
      quotes: openQuotes
    };
  }
  function wlFilterCounts(list) {
    const c = { confirm: 0, missing: 0, checkout: 0, unpaid: 0, quotes: 0 };
    list.forEach(function (a) {
      const f = wlFlags(a);
      Object.keys(c).forEach(function (k) { if (f[k]) c[k] += 1; });
    });
    return c;
  }
  function regMinis(p, apptId) {
    const items = registrationItems(p);
    const letter = { idUploaded: "ID", formsCompleted: "F", demographicsConfirmed: "D" };
    const full = { idUploaded: "ID", formsCompleted: "Forms", demographicsConfirmed: "Demographics" };
    const pills = items.map(function (it) {
      return '<span class="reg-mini ' + (it.ok ? "ok" : "miss") + '" title="' + esc(full[it.key] + " · " + it.status) + '">' + letter[it.key] + "</span>";
    }).join("");
    const open = state.expandedAppt === apptId;
    return '<div class="reg-minis"><button type="button" class="btn small" data-expand-reg="' + esc(apptId) + '" aria-expanded="' + (open ? "true" : "false") + '" aria-controls="reg-panel-' + esc(apptId) + '" title="Registration status">' + pills + "</button></div>";
  }

  function renderWorklist() {
    const date = state.date;
    const q = (state.scheduleSearch || "").trim().toLowerCase();
    const filters = state.worklistFilters || [];
    const locOpts = (BRIZZA.LOCATIONS || []).map((l) => "<option value=\"" + esc(l.id) + "\"" + (state.locationId === l.id ? " selected" : "") + ">" + esc(l.name) + "</option>").join("");
    const allDay = store.appointments
      .filter((a) => a.date === date && a.status !== "Rescheduled")
      .filter((a) => !state.locationId || a.locationId === state.locationId)
      .sort((a, b) => a.time.localeCompare(b.time) || a.provider.localeCompare(b.provider));
    const searched = q ? allDay.filter((a) => {
      const p = patient(a.patientId);
      return ((p && p.name) + " " + (p && p.dob || "") + " " + a.patientId + " " + a.type + " " + reasonText(a) + " " + a.id + " " + a.provider + " " + (a.prepNotes || "")).toLowerCase().includes(q);
    }) : allDay;
    const counts = wlFilterCounts(searched);
    const visible = searched.filter((a) => wlMatches(a, filters) && a.status !== "Canceled");
    const canceledShown = searched.filter((a) => a.status === "Canceled" && wlMatches(a, filters));
    const rows = visible.concat(canceledShown);
    const toggle = scheduleViewToggle();
    const head = pageHead("Front desk", "Worklist", esc(locationName(state.locationId)) + " · " + esc(BRIZZA.CLINIC.hours) + " · Do today’s work without leaving this page.",
      toggle + ' <a class="btn primary" href="#modal-book" data-open="book">＋ New appointment</a> <button class="btn" type="button" data-open="block">＋ Admin block</button>');
    const filtBtn = function (key, label, n) {
      const on = filters.indexOf(key) >= 0;
      return '<button type="button" class="wl-filter' + (on ? " active" : "") + '" data-wl-filter="' + key + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(label) + ' <span class="count">' + n + "</span></button>";
    };
    const filterBar = '<div class="wl-filters" role="group" aria-label="Task filters">' +
      '<button type="button" class="wl-filter' + (!filters.length ? " active" : "") + '" data-wl-filter="all" aria-pressed="' + (!filters.length ? "true" : "false") + '">All <span class="count">' + searched.length + "</span></button>" +
      filtBtn("confirm", "Needs confirmation", counts.confirm) +
      filtBtn("missing", "Missing forms/ID", counts.missing) +
      filtBtn("checkout", "Ready for checkout", counts.checkout) +
      filtBtn("unpaid", "Unpaid balance", counts.unpaid) +
      filtBtn("quotes", "Open quotes", counts.quotes) +
      "</div>";
    const hits = q ? scheduleSearchHits(q) : "";
    const providers = [];
    rows.forEach((a) => { if (providers.indexOf(a.provider) < 0) providers.push(a.provider); });
    BRIZZA.PROVIDERS.forEach(function (pr) { if (providers.indexOf(pr) < 0 && rows.some((a) => a.provider === pr)) providers.push(pr); });
    const colHead = '<div class="wl-head" aria-hidden="true"><div>Time</div><div>Patient</div><div>DOB</div><div>Provider</div><div>Type</div><div>Reason</div><div>Suite</div><div>Reg</div><div>Status</div><div>Appointment notes</div><div>Balance</div><div>Invoice</div></div>';
    let groups = "";
    if (isWeekend(date)) {
      groups = '<div class="cal-closed">Clinic closed · weekends are outside Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>';
    } else if (!rows.length) {
      groups = '<div class="empty">No appointments match the current filters.</div>';
    } else {
      providers.forEach(function (pr) {
        const set = rows.filter((a) => a.provider === pr);
        if (!set.length) return;
        const blks = dayBlocks(date).filter((b) => b.staff === pr);
        groups += '<section class="wl-group" aria-labelledby="wl-h-' + esc(pr.replace(/\s+/g, "-")) + '">' +
          '<h2 class="wl-group-h" id="wl-h-' + esc(pr.replace(/\s+/g, "-")) + '">' + esc(pr) + ' <span class="row-sub">' + set.length + (set.length === 1 ? " appointment" : " appointments") + (blks.length ? " · " + blks.length + " admin block" + (blks.length > 1 ? "s" : "") : "") + "</span></h2>" +
          colHead +
          set.map(wlRow).join("") +
          blks.map(function (b) { return '<div class="block-card" style="margin:8px 0">' + esc(fmtTime(b.start)) + "–" + esc(fmtTime(b.end)) + " · Admin · " + esc(b.reason) + "</div>"; }).join("") +
          "</section>";
      });
    }
    const body = `<div class="wl" data-worklist="1">
      <div class="card">
        <div class="cardhead">
          <div class="datebar">
            <a class="btn small" id="sched-prev" href="${hashFor({ page: "schedule", date: addDays(date, -1), view: "worklist" })}" aria-label="Previous day">‹</a>
            <strong>${esc(fmtLong(date))}</strong> <span class="count">${esc(patientCount(date))}</span>
            <a class="btn small" id="sched-next" href="${hashFor({ page: "schedule", date: addDays(date, 1), view: "worklist" })}" aria-label="Next day">›</a>
            <a class="btn small" id="sched-today" href="${hashFor({ page: "schedule", date: todayET(), view: "worklist" })}">Today</a>
            <a class="btn small" href="${hashFor({ page: "schedule", date: BRIZZA.SAMPLE_DAY, view: "worklist" })}">Sample day</a>
          </div>
          <div class="sched-tools">
            <label class="sr-only" for="sched-search">Search patients and appointments</label>
            <input id="sched-search" class="sched-search" type="search" placeholder="Search name, DOB, type…" value="${esc(state.scheduleSearch || "")}">
            <label class="sr-only" for="locationSel">Location</label>
            <select id="locationSel">${locOpts}</select>
          </div>
        </div>
        <div class="cardbody">
          <div class="wl-toolbar">${filterBar}</div>
          ${hits}
          ${typeLegend()}
          ${groups}
          ${openQ("Worklist task filters are a prototype of front-desk prep work. Official readiness criteria remain an open question (Open question 4).")}
        </div>
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "schedule", date: date, view: "worklist" }) + '">Worklist</a>', head, body);
    bindStatusStops();
  }

  function suiteName(id) {
    const s = (BRIZZA.SUITES || []).find((x) => x.id === id);
    return s ? s.name : "—";
  }
  function wlRow(a) {
    const p = patient(a.patientId);
    const open = state.expandedAppt === a.id;
    const suite = a.suiteId ? suiteName(a.suiteId) : "—";
    return '<div class="wl-row" data-type="' + esc(a.type) + '" data-wl-row="' + esc(a.id) + '">' +
      '<div class="wl-time">' + esc(fmtTime(a.time)) + "</div>" +
      '<div class="wl-patient">' + (p ? patientLink(p) : esc(a.patientId)) + " " + historyIcon("Appointment", a.id) + "</div>" +
      '<div class="wl-dob">' + (p ? esc(fmtDate(p.dob)) : "—") + "</div>" +
      '<div class="wl-prov">' + esc(a.provider) + "</div>" +
      '<div class="wl-type">' + esc(a.type) + "</div>" +
      '<div class="wl-reason">' + esc(reasonText(a)) + "</div>" +
      '<div class="wl-suite">' + esc(suite) + "</div>" +
      '<div>' + (p ? regMinis(p, a.id) : "") + "</div>" +
      "<div>" + statusSelect(a, "wl") + "</div>" +
      '<div class="wl-notes"><label class="sr-only" for="prep-' + esc(a.id) + '">Appointment notes</label>' +
        '<input id="prep-' + esc(a.id) + '" class="wl-note" data-prep-notes="' + esc(a.id) + '" value="' + esc(a.prepNotes || "") + '" placeholder="Prep, packages…"></div>' +
      "<div>" + balanceBadge(patientBalanceValue(a.patientId)) + "</div>" +
      '<div><button type="button" class="btn small wl-invoice" data-open-pos="' + esc(a.id) + '">Invoice</button></div>' +
      (open ? '<div class="reg-expand">' + registrationPanel(a) + "</div>" : "") +
      "</div>";
  }

  function ensureInvoiceForAppt(a) {
    if (!a) return null;
    let inv = a.invoiceId ? invoice(a.invoiceId) : null;
    if (!inv) inv = (store.invoices || []).find((i) => (i.appointmentIds || []).indexOf(a.id) >= 0) || null;
    if (inv) { a.invoiceId = inv.id; return inv; }
    const id = nextId("INV-", store.invoices);
    inv = { id: id, patientId: a.patientId, visitId: a.visitId || null, appointmentIds: [a.id], status: "Draft", balance: 0, lines: [], payments: [], finalized: false, finalizedAt: null, movements: [] };
    store.invoices.push(inv);
    a.invoiceId = id;
    addAudit({ action: "Opened invoice from Worklist", recordType: "Invoice", recordId: id,
      recordPath: { page: "pos", invoiceId: id },
      changes: [{ field: "invoice", before: "—", after: id }] });
    return inv;
  }

  function posLineEditor(inv, compact) {
    refreshInvoiceBalance(inv);
    const t = invoiceTotals(inv);
    const lines = (inv.lines || []).map(function (l, i) {
      const amt = lineAmount(l);
      return '<div class="row pos-lines"><div><span class="line-kind">' + esc(l.kind || "service") + "</span>" +
        '<div class="row-title">' + esc(l.name || "") + (l.unit ? " · " + esc(l.unit) : "") + "</div></div>" +
        (inv.finalized ? '<span>' + (amt == null ? "TBD" : money(amt)) + "</span>" :
          '<label class="sr-only" for="qty-' + i + '">Quantity</label>' +
          '<input class="qty" id="qty-' + i + '" data-line-qty="' + i + '" type="number" min="0" step="1" value="' + esc(l.qty == null ? "" : l.qty) + '" placeholder="Qty">' +
          "<span>" + (l.unitPrice == null ? "TBD" : money(l.unitPrice) + " each") + " · " + (amt == null ? "TBD" : money(amt)) + "</span>") +
        "</div>";
    }).join("") || '<div class="empty">No lines yet.</div>';
    const catOpts = (store.catalog || BRIZZA.CATALOG || []).map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + (c.price != null ? " · " + money(c.price) + "/" + esc(c.unit) : " · TBD") + "</option>").join("");
    const quotes = (store.quotes || []).filter((q) => q.patientId === inv.patientId && (q.status === "Open" || q.status === "Prepaid"));
    const qOpts = quotes.map((q) => '<option value="' + esc(q.id) + '">' + esc(q.name) + " · " + esc(q.status) + "</option>").join("");
    return lines +
      '<div class="pos-total">Total ' + esc(t.label) + (t.balance == null ? "" : " · Balance " + (t.tbd && t.balance === 0 ? "TBD" : money(t.balance))) + "</div>" +
      (inv.finalized ? '<div class="notice">Invoice finalized. Inventory already posted.</div>' :
      '<div class="field" style="margin-top:10px"><label for="posCatalog">Add line</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<select id="posCatalog">' + catOpts + "</select>" +
      '<input id="posQty" class="qty" type="number" min="0" step="1" placeholder="Qty" aria-label="Quantity">' +
      '<button class="btn small" type="button" data-pos-add-line="' + esc(inv.id) + '">Add</button></div>' +
      '<p class="row-sub">Quantity is blank until entered. Unit counts are not prefilled.</p></div>' +
      '<div class="field"><label for="pay-status">Take payment</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<select id="pay-status">' + BRIZZA.paymentStatuses.map((s) => "<option>" + s + "</option>").join("") + "</select>" +
      '<input id="pay-amount" class="qty" type="number" min="0" step="0.01" placeholder="Amount" aria-label="Payment amount" value="' + (t.balance != null && t.balance > 0 && !t.tbd ? esc(String(t.balance)) : "") + '">' +
      '<button class="btn small primary" type="button" data-record-pay="' + esc(inv.id) + '">Record payment</button></div></div>' +
      (qOpts ? '<div class="field"><label for="posQuote">Convert a quote</label><div style="display:flex;gap:8px;flex-wrap:wrap"><select id="posQuote">' + qOpts + '</select><button class="btn small" type="button" data-pos-convert-quote="' + esc(inv.id) + '">Convert to this invoice</button></div></div>' : "") +
      '<button class="btn" type="button" data-finalize="' + esc(inv.id) + '">Finalize and post inventory</button>');
  }

  function openPosPopup(apptId) {
    const a = appt(apptId);
    if (!a) return;
    const inv = ensureInvoiceForAppt(a);
    const p = patient(a.patientId);
    state.invoiceId = inv.id;
    state.posAppointmentId = a.id;
    $("#modalTitle").textContent = "Invoice · " + inv.id + " · " + (p ? p.name : a.patientId);
    $("#modalBody").innerHTML = '<p class="row-sub">' + esc(fmtLong(a.date)) + " · " + esc(fmtTime(a.time)) + " · " + esc(a.type) + " · " + esc(a.provider) + "</p>" + posLineEditor(inv, true) +
      '<p class="row-sub" style="margin-top:12px"><a href="' + hashFor({ page: "pos", invoiceId: inv.id, posTab: "invoice" }) + '">Open full Point of Sale page</a></p>';
    const save = $("#modalSave");
    save.textContent = "Done";
    save.onclick = function () { closeModal(); if (state.page === "schedule") renderWorklist(); else render(); };
    $("#modal").classList.add("open", "pos-mode");
    $("#modal").classList.remove("hist-mode");
    const first = $("#modalBody").querySelector("input,select,button");
    if (first) first.focus();
  }

  function addCatalogLine(invId, catalogId, qtyRaw) {
    const inv = invoice(invId);
    if (!inv || inv.finalized) return;
    const item = catalogItem(catalogId);
    if (!item) return;
    const qty = (qtyRaw === "" || qtyRaw == null) ? null : Number(qtyRaw);
    const line = { kind: item.kind, catalogId: item.id, name: item.name, unit: item.unit, qty: (qty == null || Number.isNaN(qty) ? null : qty), unitPrice: item.price, amount: "TBD" };
    const amt = lineAmount(line);
    if (amt != null) line.amount = amt;
    inv.lines.push(line);
    refreshInvoiceBalance(inv);
    addAudit({ action: "Added POS line", recordType: "Invoice", recordId: inv.id,
      recordPath: { page: "pos", invoiceId: inv.id },
      changes: [{ field: "line", before: "—", after: item.name + " · qty " + (line.qty == null ? "(blank)" : line.qty) }] });
    toast("Line added" + (amt != null ? " · " + money(amt) : " · amount TBD until quantity is entered"));
  }


  function fefoLots(productIdOrName) {
    return (store.lots || []).filter((l) => (l.productId === productIdOrName || l.product === productIdOrName) && l.released && (l.onHand > 0) && l.status === "Released")
      .sort((a, b) => String(a.expiry).localeCompare(String(b.expiry)));
  }
  function postUsageToLots(inv) {
    const movements = [];
    (inv.lines || []).forEach(function (l) {
      const item = catalogItem(l.catalogId || l.name);
      if (!item || !item.trackLots) return;
      const qty = lineAmount(l) != null ? Number(l.qty) : 1;
      if (!qty || qty <= 0) return;
      let left = qty;
      fefoLots(item.id).forEach(function (lot) {
        if (left <= 0) return;
        const take = Math.min(lot.onHand, left);
        lot.onHand = Math.round((lot.onHand - take) * 100) / 100;
        if (lot.onHand <= 0) { lot.onHand = 0; lot.status = "Used"; }
        if (inv.patientId) {
          lot.patientIds = lot.patientIds || [];
          if (lot.patientIds.indexOf(inv.patientId) < 0) lot.patientIds.push(inv.patientId);
        }
        const mov = { id: nextId("MOV-", store.inventoryMovements || []), lotId: lot.id, product: lot.product, type: "TREATMENT_USAGE", qty: -take, patientId: inv.patientId, invoiceId: inv.id, when: nowET() };
        store.inventoryMovements = store.inventoryMovements || [];
        store.inventoryMovements.push(mov);
        movements.push(mov);
        left -= take;
      });
    });
    return movements;
  }

  function renderInventory() {
    const head = pageHead("Inventory", "Inventory", "Lots follow FEFO. Usage posts when an invoice is finalized.", "");
    if (!canManageInventory()) {
      const body = '<div class="card"><div class="cardbody"><div class="notice">Inventory is available when acting as Clinic Manager or MD / Clinic Owner. Change Acting as in the sidebar to open this module.</div></div></div>';
      renderChrome("Inventory", head, body);
      return;
    }
    const tab = state.invTab || "catalog";
    const tabs = [["catalog","Catalog"],["orders","Purchase orders"],["lots","Lots"],["trace","Lot trace"],["adjust","Adjustments"],["alerts","Low-stock alerts"],["audit","Inventory audit"]].map(function (x) {
      return '<a class="tab ' + (tab === x[0] ? "active" : "") + '" href="' + hashFor({ page: "inventory", invTab: x[0] }) + '">' + x[1] + "</a>";
    }).join("");
    let body = '<div class="inv-tabs" role="tablist">' + tabs + "</div>";
    if (tab === "catalog") body += invCatalogHtml();
    else if (tab === "orders") body += invOrdersHtml();
    else if (tab === "lots") body += invLotsHtml();
    else if (tab === "trace") body += invTraceHtml();
    else if (tab === "adjust") body += invAdjustHtml();
    else if (tab === "alerts") body += invAlertsHtml();
    else body += invAuditHtml();
    body += openQ("Product costs were not provided. Cost fields are editable TBD values; margin appears only after a cost is entered in this session (Open question 24). Beyond-use dating for open vials is not specified (Open question 25).");
    renderChrome("Inventory", head, body);
  }
  function invCatalogHtml() {
    const rows = (store.catalog || []).map(function (c) {
      const on = catalogOnHand(c);
      const low = c.reorderPoint != null && on != null && on <= c.reorderPoint;
      const costVal = c.cost == null ? "" : c.cost;
      return "<tr" + (low ? ' class="inv-low"' : "") + "><td>" + esc(c.name) + '</td><td>' + esc(c.kind) + "</td><td>" + esc(c.unit) + "</td><td>" +
        (c.price == null ? "TBD" : money(c.price)) + '</td><td><input class="cost-input" data-cost="' + esc(c.id) + '" placeholder="TBD" value="' + esc(costVal) + '" inputmode="decimal" aria-label="Cost for ' + esc(c.name) + '"></td><td class="margin-val">' +
        marginDisplay(c.price, c.cost) + "</td><td>" + (on == null ? "—" : on) + "</td><td>" + (c.reorderPoint == null ? "—" : c.reorderPoint) + (low ? ' <span class="badge alert">Low</span>' : "") + "</td></tr>";
    }).join("");
    return '<div class="card"><div class="cardhead"><h2>Product catalog</h2></div><div class="cardbody"><table class="table"><thead><tr><th>Product</th><th>Kind</th><th>Unit</th><th>Price</th><th>Cost</th><th>Margin</th><th>On hand</th><th>Reorder point</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  }
  function invOrdersHtml() {
    const pos = (store.purchaseOrders || []).map(function (po) {
      const lines = po.lines.map(function (l) {
        const left = (l.orderedQty || 0) - (l.receivedQty || 0);
        const recv = left > 0 && po.status !== "Received" ? '<button class="btn small" type="button" data-po-receive="' + esc(po.id) + '" data-product="' + esc(l.productId) + '">Receive</button>' : "";
        return '<div class="row"><span>' + esc(l.name) + " · ordered " + l.orderedQty + " · received " + (l.receivedQty || 0) + "</span>" + recv + "</div>";
      }).join("");
      return '<div class="card" style="margin-bottom:12px"><div class="cardhead"><h2>' + esc(po.id) + " · " + esc(po.vendor) + "</h2>" + badge(po.status) + '</div><div class="cardbody"><div class="row-sub">Created ' + esc(po.created) + ' · Expected ' + esc(po.expected) + '</div>' + lines + '</div></div>';
    }).join("");
    return pos || '<div class="empty">No purchase orders</div>';
  }
  function invLotsHtml() {
    const lots = (store.lots || []).slice().sort((a, b) => String(a.expiry).localeCompare(String(b.expiry)));
    const rows = lots.map(function (l) {
      const ov = l.openVial ? ("Opened " + esc(l.openVial.openedAt) + " · units left " + esc(String(l.openVial.unitsLeft))) : "—";
      const openBtn = (!l.openVial && l.onHand > 0 && (catalogItem(l.productId) || {}).trackOpenVial) ? '<button class="btn small" type="button" data-open-vial="' + esc(l.id) + '">Open vial</button>' : "";
      return "<tr><td>" + esc(l.id) + "</td><td>" + esc(l.product) + "</td><td>" + esc(l.lotNumber || l.id) + "</td><td>" + esc(l.expiry) + "</td><td>" + l.onHand + "</td><td>" + esc(l.status) + "</td><td>" + ov + " " + openBtn + "</td><td>" + historyIcon("Lot", l.id) + "</td></tr>";
    }).join("");
    return '<div class="card"><div class="cardhead"><h2>Lots · FEFO order (earliest expiry first)</h2></div><div class="cardbody"><table class="table"><thead><tr><th>Lot</th><th>Product</th><th>Lot no.</th><th>Expiry</th><th>On hand</th><th>Status</th><th>Open vial</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>" +
      openQ("Open-vial tracking records the opened date and units left. The beyond-use period after opening is not specified (Open question 25).") + "</div></div>";
  }
  function invTraceHtml() {
    const q = (state.lotTrace || "").trim().toLowerCase();
    const movs = (store.inventoryMovements || []).filter(function (m) {
      if (!q) return true;
      const p = m.patientId ? patient(m.patientId) : null;
      return (m.lotId + " " + m.product + " " + (m.patientId || "") + " " + (p && p.name || "") + " " + (m.invoiceId || "")).toLowerCase().includes(q);
    }).slice().reverse();
    const rows = movs.map(function (m) {
      const p = m.patientId ? patient(m.patientId) : null;
      return "<tr><td>" + esc(m.when) + "</td><td>" + esc(m.lotId) + "</td><td>" + esc(m.product) + "</td><td>" + esc(m.type) + "</td><td>" + esc(String(m.qty)) + "</td><td>" + (p ? patientLink(p) : "—") + "</td><td>" + esc(m.invoiceId || m.reason || "—") + "</td></tr>";
    }).join("") || '<tr><td colspan="7">No movements match.</td></tr>';
    return '<div class="card"><div class="cardhead"><h2>Lot-to-patient traceability</h2></div><div class="cardbody">' +
      '<label class="sr-only" for="lot-trace">Search by lot, product, or patient</label>' +
      '<input id="lot-trace" class="searchbox" type="search" placeholder="Search lot, product, patient (recall)" value="' + esc(state.lotTrace || "") + '">' +
      '<table class="table"><thead><tr><th>When</th><th>Lot</th><th>Product</th><th>Type</th><th>Qty</th><th>Patient</th><th>Source</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  }
  function invAdjustHtml() {
    const lotOpts = (store.lots || []).filter((l) => l.status === "Released" || l.onHand > 0).map((l) => '<option value="' + esc(l.id) + '">' + esc(l.id) + " · " + esc(l.product) + " · on hand " + l.onHand + "</option>").join("");
    const reasonOpts = (BRIZZA.ADJUST_REASONS || []).map((r) => "<option>" + esc(r) + "</option>").join("");
    const list = (store.adjustments || []).slice().reverse().map(function (a) {
      return '<div class="row"><div><div class="row-title">' + esc(a.id) + " · " + esc(a.product) + " · " + esc(String(a.qty)) + '</div><div class="row-sub">' + esc(a.reason) + " · " + esc(a.when) + " · " + esc(a.who) + "</div></div></div>";
    }).join("") || '<div class="empty">No adjustments yet</div>';
    return '<div class="card"><div class="cardhead"><h2>Adjustments</h2></div><div class="cardbody">' +
      '<div class="formgrid"><div class="field"><label for="adj-lot">Lot <span class="req">required</span></label><select id="adj-lot">' + lotOpts + "</select></div>" +
      '<div class="field"><label for="adj-qty">Quantity change <span class="req">required</span></label><input id="adj-qty" type="number" step="1" placeholder="e.g. -1"></div>' +
      '<div class="field"><label for="adj-reason">Reason <span class="req">required</span></label><select id="adj-reason">' + reasonOpts + "</select></div>" +
      '<div class="field full"><label for="adj-note">Note</label><input id="adj-note" placeholder="Optional detail"></div></div>' +
      '<button class="btn primary" type="button" data-inv-adjust="1">Record adjustment</button>' +
      '<h3 class="section-title" style="margin-top:18px">History</h3>' + list + "</div></div>";
  }
  function invAlertsHtml() {
    const items = lowStockItems();
    const cards = items.map(function (c) {
      return '<div class="inv-alert"><strong>' + esc(c.name) + "</strong> · on hand " + catalogOnHand(c) + " · reorder point " + c.reorderPoint + "</div>";
    }).join("") || '<div class="empty">No low-stock alerts.</div>';
    return '<div class="card"><div class="cardhead"><h2>Low-stock alerts</h2></div><div class="cardbody">' + cards + "</div></div>";
  }
  function invAuditHtml() {
    const evs = (store.audit || []).filter((e) => e.recordType === "Inventory" || e.recordType === "Lot" || e.recordType === "PurchaseOrder" || e.recordType === "Adjustment").slice().reverse();
    const rows = evs.map(function (e) {
      const ch = (e.changes || []).map((c) => esc(c.field) + ": " + esc(c.before) + " → " + esc(c.after)).join("; ");
      return '<div class="hist-item"><div class="when">' + esc(e.when) + " · " + esc(e.who) + " · " + esc(e.role) + '</div><div class="row-title">' + esc(e.action) + '</div><div class="hist-change">' + esc(ch) + '</div></div>';
    }).join("") || '<div class="empty">No inventory audit events yet.</div>';
    return '<div class="card"><div class="cardhead"><h2>Inventory audit log</h2></div><div class="cardbody">' + rows + "</div></div>";
  }

  function receivePoLine(poId, productId) {
    const po = (store.purchaseOrders || []).find((x) => x.id === poId);
    if (!po) return;
    const line = po.lines.find((l) => l.productId === productId);
    if (!line) return;
    const remaining = (line.orderedQty || 0) - (line.receivedQty || 0);
    showModal("Receive " + line.name + " · " + po.id, `
      <div class="formgrid">
        <div class="field"><label for="recv-lot">Lot number <span class="req">required</span></label><input id="recv-lot" required></div>
        <div class="field"><label for="recv-exp">Expiration date <span class="req">required</span></label><input id="recv-exp" type="date" required></div>
        <div class="field"><label for="recv-qty">Quantity <span class="req">required</span></label><input id="recv-qty" type="number" min="1" max="${remaining}" value="${remaining > 0 ? remaining : 1}"></div>
      </div>
      <p class="row-sub">Partial receiving is allowed. Remaining on this line: ${remaining}.</p>
    `, function () {
      const lotNo = ($("#recv-lot") && $("#recv-lot").value.trim()) || "";
      const exp = ($("#recv-exp") && $("#recv-exp").value) || "";
      const qty = Number($("#recv-qty") && $("#recv-qty").value);
      if (!lotNo || !exp || !qty || qty <= 0) { toast("Lot number, expiration date, and quantity are required"); return; }
      const take = Math.min(qty, remaining);
      const item = catalogItem(productId);
      const lot = { id: nextId("LOT-", store.lots), productId: productId, product: item ? item.name : line.name, lotNumber: lotNo, onHand: take, originalQty: take, expiry: exp, status: "Released", released: true, receivedAt: todayET(), poId: po.id, openVial: null, patientIds: [] };
      store.lots.push(lot);
      line.receivedQty = (line.receivedQty || 0) + take;
      const open = po.lines.some((l) => (l.receivedQty || 0) < (l.orderedQty || 0));
      const done = po.lines.every((l) => (l.receivedQty || 0) >= (l.orderedQty || 0));
      po.status = done ? "Received" : "Partial";
      store.inventoryMovements = store.inventoryMovements || [];
      store.inventoryMovements.push({ id: nextId("MOV-", store.inventoryMovements), lotId: lot.id, product: lot.product, type: "RECEIVE", qty: take, poId: po.id, when: nowET() });
      addAudit({ action: "Received purchase-order line", recordType: "PurchaseOrder", recordId: po.id,
        recordPath: { page: "inventory", invTab: "orders" },
        changes: [{ field: "lot", before: "—", after: lot.id + " · " + lotNo }, { field: "quantity", before: "0", after: String(take) }, { field: "PO status", before: open && !done ? "Open" : po.status, after: po.status }] });
      addAudit({ action: "Created lot from receiving", recordType: "Lot", recordId: lot.id,
        recordPath: { page: "inventory", invTab: "lots" },
        changes: [{ field: "on hand", before: "—", after: String(take) }, { field: "expiry", before: "—", after: exp }] });
      closeModal();
      toast("Received " + take + " into " + lot.id);
      render();
    }, "Receive");
  }

  function recordAdjustment() {
    const lotId = $("#adj-lot") && $("#adj-lot").value;
    const qty = Number($("#adj-qty") && $("#adj-qty").value);
    const reason = $("#adj-reason") && $("#adj-reason").value;
    const note = ($("#adj-note") && $("#adj-note").value.trim()) || "";
    if (!lotId || !reason || !$("#adj-qty").value || Number.isNaN(qty) || qty === 0) { toast("Lot, quantity, and reason are required"); return; }
    const lot = (store.lots || []).find((l) => l.id === lotId);
    if (!lot) return;
    const before = lot.onHand;
    lot.onHand = Math.max(0, Math.round((lot.onHand + qty) * 100) / 100);
    if (lot.onHand === 0) lot.status = (reason === "Expired" || reason === "Waste" || reason === "Damaged") ? reason : "Used";
    const adj = { id: nextId("ADJ-", store.adjustments || []), lotId: lot.id, productId: lot.productId, product: lot.product, qty: qty, reason: reason, note: note, when: nowET(), who: actingName(), role: state.actingRole };
    store.adjustments = store.adjustments || [];
    store.adjustments.push(adj);
    store.inventoryMovements = store.inventoryMovements || [];
    store.inventoryMovements.push({ id: nextId("MOV-", store.inventoryMovements), lotId: lot.id, product: lot.product, type: "ADJUSTMENT", qty: qty, reason: reason, when: nowET() });
    addAudit({ action: "Inventory adjustment · " + reason, recordType: "Adjustment", recordId: adj.id,
      recordPath: { page: "inventory", invTab: "adjust" },
      changes: [{ field: "on hand", before: String(before), after: String(lot.onHand) }, { field: "reason", before: "—", after: reason }] });
    addAudit({ action: "Inventory adjustment · " + reason, recordType: "Lot", recordId: lot.id,
      recordPath: { page: "inventory", invTab: "lots" },
      changes: [{ field: "on hand", before: String(before), after: String(lot.onHand) }] });
    toast("Adjustment recorded");
    render();
  }

  function openVial(lotId) {
    const lot = (store.lots || []).find((l) => l.id === lotId);
    if (!lot) return;
    showModal("Open vial · " + lot.id, `
      <div class="field"><label for="ov-units">Units left in the opened vial</label><input id="ov-units" type="number" min="0" step="1"></div>
      ${openQ("The beyond-use period after a vial is opened is not specified (Open question 25). This records the opened date and units left only.")}
    `, function () {
      const units = $("#ov-units").value === "" ? null : Number($("#ov-units").value);
      lot.openVial = { openedAt: todayET(), unitsLeft: units, beyondUseNote: null };
      addAudit({ action: "Opened vial", recordType: "Lot", recordId: lot.id,
        recordPath: { page: "inventory", invTab: "lots" },
        changes: [{ field: "opened date", before: "—", after: todayET() }, { field: "units left", before: "—", after: units == null ? "—" : String(units) }] });
      closeModal(); toast("Open vial recorded"); render();
    }, "Save");
  }

  function notesListHtml() {
    const q = (state.notesSearch || "").trim().toLowerCase();
    const all = [];
    store.patients.forEach(function (p) {
      (p.notes || []).forEach(function (n) { all.push({ p: p, n: n }); });
    });
    all.sort((a, b) => String(b.n.date).localeCompare(String(a.n.date)));
    const rows = all.filter((x) => !q || (x.p.name + " " + x.p.id + " " + (x.n.type || "") + " " + (x.n.status || "") + " " + (x.n.text || "")).toLowerCase().includes(q));
    const list = rows.map(function (x) {
      const n = x.n, p = x.p;
      const st = n.status || "Open";
      const canEdit = st === "Open";
      return '<div class="row"><div><div class="row-title">' + esc(fmtDate(n.date)) + " · " + patientLink(p) + '</div><div class="row-sub">' + esc(n.type || "Note") + " · " + esc(n.provider || "") + "</div></div>" +
        badge(st) +
        '<div class="actions">' +
        (canEdit ? '<button class="btn small" type="button" data-open="note-view" data-pid="' + p.id + '" data-nid="' + n.id + '">Edit</button>' : '<span class="row-sub">Edit</span>') +
        '<button class="btn small" type="button" data-print-note="' + p.id + '" data-nid="' + n.id + '">View/Print</button></div></div>';
    }).join("") || '<div class="empty">No clinical notes match.</div>';
    return `<div class="card notes-list"><div class="cardhead"><h2>Clinical notes</h2>
      <a class="btn small" href="#modal-new-patient" data-open="new-patient">＋ New patient</a></div>
      <div class="cardbody" style="padding:12px">
        <label class="sr-only" for="notes-search">Search clinical notes</label>
        <input id="notes-search" class="searchbox" placeholder="Search notes, patient, status" value="${esc(state.notesSearch || "")}">
        <p class="row-sub">Patient search also lives on the Worklist and calendar.</p>
        <div>${list}</div>
      </div></div>`;
  }

  function findPatientHtml() {
    const q = (state.patientFind || "").trim().toLowerCase();
    const hits = q ? store.patients.filter((p) => (p.name + " " + p.id + " " + p.dob + " " + p.phone).toLowerCase().includes(q)).slice(0, 8) : [];
    const list = hits.map((p) => '<a class="row" href="' + hashFor({ page: "patients", selected: p.id, tab: state.tab || "demographics" }) + '"><div><div class="row-title">' + esc(p.name) + '</div><div class="row-sub">' + esc(p.id) + " · " + esc(p.dob) + "</div></div></a>").join("");
    return '<div class="field find-patient"><label class="sr-only" for="patient-find">Find patient</label><input id="patient-find" class="searchbox" placeholder="Find patient (name, DOB, ID)" value="' + esc(state.patientFind || "") + '">' + (q ? '<div>' + (list || '<div class="empty">No match</div>') + "</div>" : "") + "</div>";
  }

  function documentsHtml(p) {
    const groups = BRIZZA.DOC_CATEGORIES || ["Patient Intake", "Consent", "Payment", "Quotes"];
    return groups.map(function (cat) {
      const docs = (p.documents || []).filter((d) => (d.category || "Patient Intake") === cat);
      const rows = docs.map(function (d) {
        return '<div class="row"><div><div class="row-title">' + esc(d.title) + '</div><div class="row-sub">' + esc(d.date || "") + (d.relatedId ? " · " + esc(d.relatedId) : "") + "</div></div>" +
          '<button class="btn small" type="button" data-print-doc="' + p.id + '" data-did="' + esc(d.id) + '">View/Print</button></div>';
      }).join("") || '<div class="empty">No ' + esc(cat).toLowerCase() + " documents</div>";
      return '<div class="doc-group"><h3 class="section-title">' + esc(cat) + "</h3>" + rows + "</div>";
    }).join("");
  }

  function printNote(pid, nid) {
    const p = patient(pid); if (!p) return;
    const n = (p.notes || []).find((x) => x.id === nid); if (!n) return;
    printView("Clinical note · " + p.name, "<p><strong>" + esc(n.type || "Note") + "</strong> · " + esc(n.status || "") + " · " + esc(fmtDate(n.date)) + " · " + esc(n.provider || "") + (n.signedAt ? " · Signed " + esc(n.signedAt) : "") + "</p><p>" + esc(n.text || "") + "</p>");
  }
  function printDoc(pid, did) {
    const p = patient(pid); if (!p) return;
    const d = (p.documents || []).find((x) => x.id === did); if (!d) return;
    let extra = d.body || "";
    if (d.kind === "receipt" && d.invoiceId) {
      const inv = invoice(d.invoiceId);
      if (inv) {
        extra += "<h2>Receipt</h2><p>Invoice " + esc(inv.id) + " · " + esc(inv.status) + "</p>" +
          (inv.lines || []).map((l) => "<div>" + esc(l.name) + " · " + (lineAmount(l) == null ? "TBD" : money(lineAmount(l))) + "</div>").join("") +
          "<p>Total " + esc(invoiceTotals(inv).label) + "</p>";
      }
    }
    if (d.kind === "quote" && d.relatedId) {
      const q = (store.quotes || []).find((x) => x.id === d.relatedId);
      if (q) extra += "<h2>Quote</h2><p>" + esc(q.name) + " · " + esc(q.status) + "</p>" +
        (q.lines || []).map((l) => "<div>" + esc(l.name) + " · qty " + (l.qty == null ? "(blank)" : esc(String(l.qty))) + " · " + (lineAmount(l) == null ? "TBD" : money(lineAmount(l))) + "</div>").join("");
    }
    printView(d.title, "<p>" + esc(d.category) + " · " + esc(d.date || "") + "</p>" + extra);
  }




  function renderChrome(crumb, titleArea, body) {
    const nav = (href, key, label, icon) => {
      const active = (key === "patients" && (state.page === "patients" || state.page === "visit" || state.page === "demo")) ||
        (key === "schedule" && state.page === "schedule") ||
        (key === "queue" && state.page === "queue") ||
        (key === "rooming" && state.page === "rooming") ||
        (key === "pos" && (state.page === "pos" || state.page === "checkout")) ||
        (key === "inventory" && state.page === "inventory") ||
        (key === "types" && (state.page === "types" || state.page === "reasons")) ||
        (key === "configuration" && state.page === "configuration");
      return '<a href="' + href + '" class="' + (active ? "active" : "") + '" data-nav="' + key + '"><span class="ico">' + icon + "</span>" + label + "</a>";
    };
    $("#app-root").innerHTML = `
      <a class="skip" href="#main">Skip to content</a>
      <div class="shell">
        <aside class="side">
          <div class="brand"><span class="brand-name">brizza</span><small>clinic workspace</small></div>
          <div class="nav-label">Workspace</div>
          <nav class="nav" aria-label="Workspace">
            ${nav(hashFor({ page: "schedule", date: state.date, view: state.scheduleView, calMode: state.calMode }), "schedule", "Schedule", "▦")}
            ${nav(hashFor({ page: "patients", selected: state.selected, tab: state.tab }), "patients", "Patients", "♙")}
            ${nav(hashFor({ page: "queue", date: state.date }), "queue", "Work queue", "☷")}
            ${nav(hashFor({ page: "rooming" }), "rooming", "Rooming", "▣")}
            ${nav(hashFor({ page: "pos" }), "pos", "Point of Sale", "☰")}
            ${nav(hashFor({ page: "inventory" }), "inventory", "Inventory", "▦")}
          </nav>
          <div class="nav-label">Clinic</div>
          <nav class="nav" aria-label="Clinic">
            ${nav(hashFor({ page: "types" }), "types", "Appointment Types", "▤")}
            ${nav(hashFor({ page: "reasons" }), "types", "Appointment Reasons", "▤")}
            ${nav(hashFor({ page: "configuration" }), "configuration", "Configuration", "⚙")}
          </nav>
          <div class="profile"><div class="avatar">AM</div><div>Alex Morgan<small>Synthetic session</small>${actingSelectHtml()}</div></div>
        </aside>
        <main class="main" id="main">
          <header class="top">
            <div class="crumb">Brizza Clinic / ${crumb}</div>
            <div class="topright">
              <span class="disclaimer">Synthetic data · prototype, not a production EMR</span>
              <span class="clinic-pill">${esc(BRIZZA.CLINIC.location)}</span>
            </div>
          </header>
          <div class="content">${titleArea}${body}</div>
        </main>
      </div>
      <div class="demo-panel" id="demo-panel"></div>`;
  }

  function pageHead(eyebrow, title, sub, actions) {
    return `<div class="page-head"><div>${eyebrow ? '<p class="eyebrow">' + esc(eyebrow) + "</p>" : ""}<h1>${esc(title)}</h1>${sub ? '<div class="sub">' + sub + "</div>" : ""}</div><div class="actions">${actions || ""}</div></div>`;
  }

  function patientListHtml() {
    const q = state.search.trim().toLowerCase();
    const rows = store.patients.filter((p) => !q || (p.name + " " + p.id + " " + p.phone).toLowerCase().includes(q));
    return `<div class="card"><div class="cardhead"><h2>Patient list · ${store.patients.length}</h2>
      <a class="btn small" href="#modal-new-patient" data-open="new-patient">＋ New patient</a></div>
      <div class="cardbody" style="padding:12px">
        <label class="sr-only" for="patient-search">Search name, phone or ID</label>
        <input id="patient-search" class="searchbox" placeholder="Search name, phone or ID" value="${esc(state.search)}">
        <div id="patientRows">${rows.map((p) => `
          <a class="row" href="${hashFor({ page: "patients", selected: p.id, tab: "demographics" })}" style="padding:12px 5px">
            <div class="person"><div class="miniavatar">${esc(initials(p.name))}</div>
              <div><div class="row-title">${esc(p.name)}</div><div class="row-sub">${esc(p.id)} · ${age(p.dob)} yrs</div></div></div>
            ${badge(p.status)} ${state.selected === p.id ? '<span class="badge good">Open</span>' : ""}
          </a>`).join("") || '<div class="empty">No matching patients</div>'}
        </div>
      </div></div>`;
  }

  function appointmentRow(a) {
    const hist = historyLinks("Appointment", a.id, (a.history || []).join(" · "));
    const vlink = a.visitId ? ' · <a href="' + hashFor({ page: "visit", visitId: a.visitId }) + '">' + esc(a.visitId) + "</a>" : "";
    return `<div class="row">
      <div>
        <div class="row-title">${esc(a.type)} · ${esc(reasonText(a))}</div>
        <div class="row-sub">${esc(a.date)} · ${esc(fmtTime(a.time))} · ${esc(a.provider)} · ${esc(a.id)} · ${esc(a.room || "No room")}${vlink}</div>
        <div class="row-sub">Consultation: ${esc(a.consultation || "Not recorded")} · Treatment: ${esc(a.treatment || "Not recorded")} · Duration: ${esc(a.durationLabel || durationLabelFor(a.type, a.reasons))}</div>
        ${hist ? '<div class="row-sub">Status history: ' + hist + "</div>" : ""}
        <div class="row-sub">Invoice: ${invoiceBadge(a)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${badge(a.status)}
        <a class="btn small" href="${hashFor({ page: "schedule", date: a.date, appointmentId: a.id })}">Status</a>
      </div>
    </div>`;
  }

  function chartSection(p) {
    let body = "";
    if (state.tab === "demographics") {
      body = `<div class="two"><div><h3 class="section-title">Patient identity</h3>
        <div class="row"><span>Patient number</span><strong>${esc(p.id)}</strong></div>
        <div class="row"><span>Date of birth</span><strong>${esc(p.dob)}</strong></div>
        <div class="row"><span>Phone</span><strong>${esc(p.phone)}</strong></div>
        <div class="row"><span>Email</span><strong>${esc(p.email)}</strong></div></div>
        <div><h3 class="section-title">Patient status</h3>
        <label class="sr-only" for="pstatus">Patient status</label>
        <select id="pstatus" data-set-status="${p.id}">${BRIZZA.patientStatuses.map((s) => "<option" + (p.status === s ? " selected" : "") + ">" + s + "</option>").join("")}</select>
        <div class="notice">One centralized chart. Patient number is immutable and never reused.</div>
        <button class="btn primary" type="button" data-confirm-demo="${p.id}" style="margin-top:12px">Confirm Demographics</button>
        <h3 class="section-title">' + historyIcon("Patient", p.id) + ' History</h3>
        <div class="timeline">' + timelineHtml("Patient", p.id) + '</div>
        </div></div>`;
    } else if (state.tab === "clinical-profile") {
      const rows = (items, empty) => items.length ? items.map((x) => '<div class="row"><span>' + esc(Array.isArray(x) ? x.join(" · ") : x) + '</span><span class="badge">Recorded</span></div>').join("") : '<div class="empty">' + empty + "</div>";
      body = `<div class="profile-block"><div class="two"><div><h3 class="section-title">Medical history</h3>${rows(p.conditions, "No history items recorded")}
        <h3 class="section-title" style="margin-top:18px">Medications</h3>${rows(p.meds, "No current medications recorded")}</div>
        <div><h3 class="section-title">Allergies and alerts</h3>${rows(p.allergies, "No allergy information recorded")}</div></div></div>
        <div class="profile-block"><h3 class="section-title">Treatment history</h3>${p.treatments && p.treatments.length ? p.treatments.map((tr) => '<div class="row"><span>' + esc(tr) + '</span><span class="badge">Recorded</span></div>').join("") : '<div class="empty">No treatment recorded. Appointment or consultation completion does not imply treatment.</div>'}</div>`;
    } else if (state.tab === "appointments") {
      const list = apptsFor(p).slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      body = `<div class="labelrow"><h3 class="section-title">Appointment history</h3>
        <a class="btn small primary" href="#modal-book" data-open="book" data-pid="${p.id}">＋ Schedule appointment</a></div>
        <div class="scroll-list">${list.map(appointmentRow).join("") || '<div class="empty">No appointments</div>'}</div>`;
    } else if (state.tab === "photos") {
      body = `<div class="two"><div><h3 class="section-title">Clinical photography</h3>${p.photos.length ? p.photos.map((x) => '<div class="row"><span>' + esc(x) + "</span></div>").join("") : '<div class="empty">No clinical photos</div>'}</div>
        <div><h3 class="section-title">Authorization records</h3>
        <div class="row"><span>Clinical photography consent</span>${badge(p.consents.clinical)}</div>
        <div class="row"><span>Marketing photo authorization</span>${badge(p.consents.marketing)}</div>
        <div class="notice">Clinical photography consent is separate from marketing photo authorization.</div></div></div>`;
    } else if (state.tab === "documents") {
      body = `<h3 class="section-title">Patient documents</h3>
        <p class="row-sub">Receipts are saved when a payment is recorded. Saved quotes appear under Quotes. View/Print opens a printable page.</p>
        ${documentsHtml(p)}`;
    } else if (state.tab === "ledger") {
      const invs = store.invoices.filter((i) => i.patientId === p.id);
      body = `<h3 class="section-title">Patient ledger</h3>
        <div class="notice">Payment status is independent of appointment status. Amounts are TBD. The balance lives on the invoice.</div>
        ${invs.map((inv) => '<a class="row" href="' + hashFor({ page: "checkout", invoiceId: inv.id }) + '"><div><div class="row-title">' + esc(inv.id) + '</div><div class="row-sub">Balance: ' + esc(typeof inv.balance === 'number' ? money(inv.balance) : inv.balance) + "</div></div>" + badge(inv.status) + "</a>").join("") || '<div class="empty">No invoices</div>'}`;
    } else if (state.tab === "quotes") {
      const qs = (store.quotes || []).filter((q) => q.patientId === p.id);
      body = `<h3 class="section-title">Quotes</h3>
        ${qs.map((q) => '<a class="row" href="' + hashFor({ page: "pos", posTab: "quotes", quoteId: q.id }) + '"><div><div class="row-title">' + esc(q.name) + '</div><div class="row-sub">' + esc(q.id) + " · Amount: TBD</div></div>" + badge(q.status) + "</a>").join("") || '<div class="empty">No quotes</div>'}`;
        } else if (state.tab === "follow-up") {
      body = `<div class="labelrow"><h3 class="section-title">Follow-up history</h3>
        <a class="btn small" href="#modal-followup" data-open="followup" data-pid="${p.id}">＋ Add follow-up</a></div>
        ${p.followups.length ? p.followups.map((f) => '<div class="row"><div><div class="row-title">' + esc(f.text) + '</div><div class="row-sub">Due ' + esc(fmtDate(f.due || f)) + "</div></div></div>").join("") : '<div class="empty">No follow-up tasks</div>'}`;
    } else if (state.tab === "clinical-notes") {
      body = `<div class="labelrow"><h3 class="section-title">Clinical notes</h3>
        ${createNoteButton(p.id)}</div>
        ${openQ("Records audits Clinical Notes as a section; DB-005 lists eight chart sections and does not include this tab. Note statuses Draft / Ready for review are not an approved catalog.")}
        ${openQ("Draft templates – Open question. Templates other than the single Consultation note with procedure Yes/No are not taken from the SOPs or V1 documents. Create Note is shown only for clinical roles (RN / NP Injector, Aesthetician). Whether MD / Clinic Owner or Medical Assistant may create or sign notes is not established (Open question 17).")}
        ${openQ("Draft templates – Open question. Injectables and Aesthetician Consult / Follow-up / Procedure templates are not taken from the SOPs or V1 documents (Open question 17).")}
        ${p.notes.map((n) => '<button class="note-btn" type="button" data-open="note-view" data-pid="' + p.id + '" data-nid="' + n.id + '"><strong>' + esc(n.type || "Note") + "</strong> " + badge(n.status || "Draft") + (n.locked ? ' <span class="badge">Locked</span>' : "") + (n.historySnapshot ? ' <span class="badge">History snapshot</span>' : "") + ' <span class="row-sub" style="float:right">' + esc(fmtDate(n.date)) + '</span><div class="row-sub">' + esc(n.provider || "") + (n.signedAt ? " · Signed " + esc(n.signedAt) : "") + "</div><p>" + esc(n.text) + "</p></button>").join("") || '<div class="empty">No clinical notes</div>'}`;
    }
    return body + '<div class="row-sub" style="margin-top:18px">' + auditIconFor("Patient", p.id) + " · " + esc(TABS[state.tab] || state.tab) + "</div>";
  }

  function renderPatients() {
    const p = patient(state.selected) || store.patients[0];
    state.selected = p.id;
    const last = lastAppt(p);
    const next = nextAppt(p);
    const lastLabel = last ? fmtDate(last.date) : "None";
    const lastSub = last ? last.type : "";
    const nextLabel = next ? fmtDate(next.date) : "None scheduled";
    const nextSub = next ? next.time + " · " + next.type : "";
    const lastProv = last ? last.provider : "—";
    const tabs = Object.entries(TABS).map(([k, label]) =>
      '<a class="tab ' + (state.tab === k ? "active" : "") + '" href="' + hashFor({ page: "patients", selected: p.id, tab: k }) + '">' + esc(label) + "</a>"
    ).join("");
    const upcoming = apptsFor(p).filter((a) => ACTIVE.has(a.status) && a.date >= BRIZZA.SAMPLE_DAY).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const head = pageHead("Patient-centered chart", "Patient chart", findPatientHtml(), '<a class="btn small" href="#modal-edit" data-open="edit" data-pid="' + p.id + '">Edit chart</a><a class="btn small primary" href="#modal-book" data-open="book" data-pid="' + p.id + '">＋ Appointment</a>');
    const body = `<div class="grid">
      <div class="card">
        <div class="cardbody">
          <div class="patient-banner">
            <div class="patient-avatar">${esc(initials(p.name))}</div>
            <div style="flex:1">
              <div class="patient-name">${esc(p.name)} ${badge(p.status)}</div>
              <div class="patient-meta"><span>${esc(p.id)}</span><span>${age(p.dob)} yrs · ${esc(p.sex)}</span><span>${esc(p.phone)}</span><span>${esc(p.email)}</span></div>
            </div>
          </div>
          <div class="summary-strip">
            <div class="metric"><label>Last completed appointment</label><strong>${esc(lastLabel)}</strong><div class="sub">${esc(lastSub)}</div></div>
            <div class="metric"><label>Next appointment</label><strong>${esc(nextLabel)}</strong><div class="sub">${esc(nextSub)}</div></div>
            <div class="metric"><label>Last provider</label><strong>${esc(lastProv)}</strong></div>
            <div class="metric"><label>Patient number</label><strong>${esc(p.id)}</strong></div>
          </div>
        </div>
        <div class="tabs" role="tablist">${tabs}</div>
        <div class="cardbody">${chartSection(p)}</div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="cardhead"><h2>Next appointments</h2><a class="btn small" href="${hashFor({ page: "schedule", date: state.date })}">Schedule</a></div>
          <div class="cardbody">${upcoming.map((a) => '<div class="row"><div><div class="row-title">' + esc(a.type) + '</div><div class="row-sub">' + esc(a.date) + " · " + esc(fmtTime(a.time)) + " · " + esc(a.provider) + "</div></div>" + badge(a.status) + "</div>").join("") || '<div class="empty">None scheduled</div>'}</div>
        </div>
        ${notesListHtml()}
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "patients" }) + '">Patients</a> / ' + esc(p.name), head, body);
  }

  function dayAppointments(date) {
    return store.appointments
      .filter((a) => a.date === date && a.status !== "Rescheduled" && a.status !== "Canceled")
      .filter((a) => state.providerFilter === "All providers" || a.provider === state.providerFilter)
      .filter((a) => !state.locationId || a.locationId === state.locationId)
      .sort((a, b) => a.time.localeCompare(b.time));
  }


  let roomingTimer = null;
  function nowMs() { return (BRIZZA.now ? BRIZZA.now() : Date.now()); }
  function minutesInStatus(since) {
    return Math.max(0, Math.floor((nowMs() - Number(since || nowMs())) / 60000));
  }
  function minutesLabel(since) {
    return minutesInStatus(since) + " min";
  }
  function timerClass(since) {
    return "room-mins" + (minutesInStatus(since) >= 15 ? " wait-gold" : "");
  }
  function updateRoomingMins() {
    $$("[data-room-mins]").forEach((el) => {
      const since = el.getAttribute("data-room-mins");
      el.textContent = minutesLabel(since);
      el.className = timerClass(since);
    });
  }
  BRIZZA.updateRoomingMins = updateRoomingMins;
  BRIZZA.now = BRIZZA.now || (function () { return Date.now(); });
  function startRoomingTick() {
    if (roomingTimer) clearInterval(roomingTimer);
    updateRoomingMins();
    roomingTimer = setInterval(updateRoomingMins, 15000);
  }
  function stopRoomingTick() {
    if (roomingTimer) { clearInterval(roomingTimer); roomingTimer = null; }
  }
  function dayBlocks(date) {
    return (store.blocks || [])
      .filter((b) => b.date === date)
      .filter((b) => state.providerFilter === "All providers" || b.staff === state.providerFilter)
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  function rangeBlocks(start, end) {
    return (store.blocks || [])
      .filter((b) => b.date >= start && b.date <= end)
      .filter((b) => state.providerFilter === "All providers" || b.staff === state.providerFilter)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  }
  function blockCard(b) {
    return `<div class="block-card">
      <div>
        <strong>${esc(fmtTime(b.start))}–${esc(fmtTime(b.end))} · Admin block</strong>
        <div class="row-sub">${esc(b.reason)} · ${esc(b.staff)}</div>
      </div>
      <span class="badge">${esc(b.reason)}</span>
    </div>`;
  }
  function calendarBlock(b) {
    return '<div class="cal-block"><span class="t">' + esc(fmtTime(b.start)) + "–" + esc(fmtTime(b.end)) + "</span>Admin · " + esc(b.reason) + " · " + esc(b.staff) + "</div>";
  }
  function nextRoomingStatus(status) {
    const list = BRIZZA.ROOMING_BOARD_STATUSES || BRIZZA.ROOMING_STATUSES || [];
    const i = list.indexOf(status);
    if (i < 0 || i >= list.length - 1) return null;
    return list[i + 1];
  }
  function isBoardStatus(s) {
    return (BRIZZA.ROOMING_BOARD_STATUSES || []).indexOf(s) >= 0;
  }
  function visitStatuses() { return BRIZZA.VISIT_STATUSES || BRIZZA.appointmentStatuses || []; }
  function statusDot(status) {
    const color = (BRIZZA.STATUS_DOTS || {})[status] || "#6E6055";
    return '<span class="status-dot" style="background:' + color + '" title="' + esc(status) + '" aria-label="' + esc(status) + '"></span>';
  }
  function statusLegend() {
    const items = (BRIZZA.ROOMING_BOARD_STATUSES || []).map((s) =>
      '<span class="legend-item">' + statusDot(s) + " " + esc(s) + "</span>"
    ).join("");
    return '<div class="legend status-legend" aria-label="Back-of-house status">' + items + "</div>";
  }
  function statusSelect(a, idSuffix) {
    const id = "visit-status-" + a.id + (idSuffix ? "-" + idSuffix : "");
    return '<label class="sr-only" for="' + id + '">Visit status</label><select id="' + id + '" class="status-dd" data-visit-status="' + esc(a.id) + '">' +
      visitStatuses().map((s) => "<option" + (a.status === s ? " selected" : "") + ">" + esc(s) + "</option>").join("") + "</select>";
  }
  function paperworkBadge(a) {
    if (a.status !== "Checked in") return "";
    const on = !!a.paperwork;
    return '<button class="badge paperwork-badge' + (on ? " on" : "") + '" type="button" data-toggle-paperwork="' + esc(a.id) + '" aria-pressed="' + (on ? "true" : "false") + '">Completing paperwork</button>';
  }
  function bindStatusStops() {
    $$(".status-dd, [data-toggle-paperwork], .wl-note").forEach((el) => {
      el.addEventListener("click", function (e) { e.stopPropagation(); });
      el.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    });
  }
  function roomingRecFor(a) {
    return (store.rooming || []).find((r) => r.appointmentId === a.id && r.date === a.date);
  }
  function ensureRooming(a) {
    store.rooming = store.rooming || [];
    let rec = roomingRecFor(a);
    if (!rec) {
      rec = { id: nextId("RM-", store.rooming), appointmentId: a.id, patientId: a.patientId, date: a.date, status: a.status, statusSince: a.statusSince || nowMs(), suiteId: a.suiteId || null, suiteSince: a.suiteSince || null };
      store.rooming.push(rec);
    }
    rec.status = a.status;
    rec.statusSince = a.statusSince;
    rec.suiteId = a.suiteId || rec.suiteId || null;
    rec.suiteSince = a.suiteSince || rec.suiteSince || null;
    rec.patientId = a.patientId;
    return rec;
  }
  function setVisitStatus(appointmentId, next, opts) {
    opts = opts || {};
    const a = appt(appointmentId);
    if (!a || !next || a.status === next) {
      if (a && opts.suiteId !== undefined && a.status === next) return setAppointmentSuite(appointmentId, opts.suiteId, next);
      return;
    }
    if (visitStatuses().indexOf(next) < 0 && next !== "Rescheduled") return;
    const before = a.status;
    a.status = next;
    a.statusSince = nowMs();
    a.history = a.history || [];
    a.history.push(before + " → " + next + " · " + nowET());
    const changes = [{ field: "status", before: before, after: next }];
    if (isBoardStatus(next)) {
      if (opts.suiteId) {
        const taken = occupantInSuite(opts.suiteId, a.date, a.id);
        if (taken) { toast("That suite is occupied"); a.status = before; a.history.pop(); return; }
        const prevSuite = a.suiteId || "—";
        a.suiteId = opts.suiteId;
        a.suiteSince = nowMs();
        if (prevSuite !== opts.suiteId) changes.push({ field: "suite", before: prevSuite, after: opts.suiteId });
      }
      ensureRooming(a);
    }
    addAudit({
      who: actingName(),
      role: state.actingRole,
      action: before + " → " + next,
      recordType: "Appointment",
      recordId: a.id,
      recordPath: isBoardStatus(next) || isBoardStatus(before)
        ? { page: "rooming", date: a.date }
        : { page: "schedule", date: a.date, appointmentId: a.id, view: state.scheduleView, calMode: state.calMode },
      changes: changes
    });
    toast("Status: " + next);
    if (!opts.silent) render();
  }
  function setAppointmentSuite(appointmentId, suiteId, withStatus) {
    const a = appt(appointmentId);
    if (!a) return;
    const nextSuite = suiteId || null;
    if (nextSuite) {
      const taken = occupantInSuite(nextSuite, a.date, a.id);
      if (taken) { toast("That suite is occupied"); return; }
    }
    const beforeSuite = a.suiteId || "—";
    const beforeStatus = a.status;
    const changes = [];
    if ((a.suiteId || null) !== nextSuite) {
      a.suiteId = nextSuite;
      a.suiteSince = nextSuite ? nowMs() : null;
      changes.push({ field: "suite", before: beforeSuite, after: nextSuite || "—" });
    }
    if (withStatus && withStatus !== a.status) {
      a.status = withStatus;
      a.statusSince = nowMs();
      a.history = a.history || [];
      a.history.push(beforeStatus + " → " + withStatus + " · " + nowET());
      changes.push({ field: "status", before: beforeStatus, after: withStatus });
    }
    if (!changes.length) return;
    if (isBoardStatus(a.status)) ensureRooming(a);
    else ensureRooming(a);
    const rec = roomingRecFor(a);
    if (rec) { rec.suiteId = a.suiteId; rec.suiteSince = a.suiteSince; rec.status = a.status; rec.statusSince = a.statusSince; }
    addAudit({
      who: actingName(),
      role: state.actingRole,
      action: withStatus && withStatus !== beforeStatus ? (beforeStatus + " → " + withStatus) : "Updated room assignment",
      recordType: "Appointment",
      recordId: a.id,
      recordPath: { page: "rooming", date: a.date },
      changes: changes
    });
    toast(withStatus && withStatus !== beforeStatus ? ("Status: " + withStatus) : (nextSuite ? "Moved to suite" : "Removed from suite"));
    render();
  }
  function actingName() {
    return "Alex Morgan";
  }
  function setRoomingStatus(id, next) {
    const rec = (store.rooming || []).find((r) => r.id === id || r.appointmentId === id);
    const apptId = rec ? rec.appointmentId : id;
    setVisitStatus(apptId, next);
  }

  function isClinicalRole(role) {
    role = role || state.actingRole;
    return (BRIZZA.CLINICAL_NOTE_ROLES || []).indexOf(role) >= 0;
  }
  function createNoteButton(pid, apptId, visitId) {
    if (!isClinicalRole()) return "";
    const ap = apptId ? ' data-appt="' + esc(apptId) + '"' : "";
    const vis = visitId ? ' data-visit="' + esc(visitId) + '"' : "";
    return '<button class="btn small" type="button" data-open="note-composer" data-pid="' + esc(pid) + '"' + ap + vis + '>Create Note</button>';
  }
  function patientCount(date) {
    const ids = new Set(dayAppointments(date).map((a) => a.patientId));
    const n = ids.size;
    return n + " patient" + (n === 1 ? "" : "s");
  }
  function slotProvider() {
    return state.providerFilter !== "All providers" ? state.providerFilter : (BRIZZA.PROVIDERS[0] || "");
  }
  function isInWindow(time, windows) {
    return (windows || []).some((w) => time >= w[0] && time < w[1]);
  }
  function slotAvailability(date, time, provider) {
    if (isWeekend(date) || time < "10:00" || time >= "18:00") return "closed";
    const day = weekdayNum(date);
    const loc = state.locationId || BRIZZA.DEFAULT_LOCATION;
    let rows = BRIZZA.availability || [];
    if (provider && provider !== "All providers") rows = rows.filter((r) => r.provider === provider);
    rows = rows.filter((r) => !r.locationId || r.locationId === loc);
    rows = rows.filter((r) => !r.days || r.days.indexOf(day) >= 0);
    if (!rows.length) return "unavailable";
    const any = rows.some((r) => isInWindow(time, r.windows));
    return any ? "available" : "unavailable";
  }
  function slotClass(date, time) {
    const av = slotAvailability(date, time, state.providerFilter);
    if (av === "closed") return "";
    if (av === "available") return "clinic-open available";
    return "clinic-open unavailable";
  }
  function typeLegend() {
    return '<div class="legend" aria-label="Appointment type colors">' +
      typesList().map((tp) => '<span class="type-chip" data-type="' + esc(tp.name) + '">' + esc(tp.name) + "</span>").join("") +
      '<span class="legend-item"><span class="swatch clinic"></span>Office hours (Mon–Fri 10:00 a.m.–6:00 p.m. ET)</span>' +
      '<span class="legend-item"><span class="swatch avail"></span>Available</span>' +
      '<span class="legend-item"><span class="swatch unavail"></span>Outside office hours</span></div>';
  }
  function addSlotButton(date, time) {
    return '<button type="button" class="cal-slot-add" data-open-slot="' + esc(date) + "|" + esc(time) + '">＋ Add ' + esc(fmtTime(time)) + "</button>";
  }
  function needsConsultingFor(pid, type, reasons) {
    const p = patient(pid);
    if (p && isNewPatient(p)) return true;
    return (type === "Consultation" || type === "Consult") && (reasons || []).indexOf("New Patient") >= 0;
  }
  function actingSelectHtml() {
    return '<label class="sr-only" for="actingRole">Acting as</label><select id="actingRole" aria-label="Acting as">' +
      BRIZZA.ROLES.map((r) => "<option" + (state.actingRole === r ? " selected" : "") + ">" + esc(r) + "</option>").join("") + "</select>";
  }
  function occupantInSuite(suiteId, date, exceptAppointmentId) {
    return store.appointments.find((a) => a.date === date && a.suiteId === suiteId && a.id !== exceptAppointmentId && a.status !== "Canceled" && a.status !== "Rescheduled")
      || (store.rooming || []).find((r) => r.date === date && r.suiteId === suiteId && r.appointmentId !== exceptAppointmentId);
  }
  function setRoomingSuite(id, suiteId, roleStatus) {
    const rec = (store.rooming || []).find((r) => r.id === id || r.appointmentId === id);
    const apptId = rec ? rec.appointmentId : id;
    setAppointmentSuite(apptId, suiteId || null, roleStatus);
  }
  function bindRoomingDrag() {
    $$("[data-rooming]").forEach((el) => {
      el.setAttribute("draggable", "true");
      el.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", el.getAttribute("data-rooming"));
        e.dataTransfer.effectAllowed = "move";
      });
    });
    function zone(sel, onDrop) {
      $$(sel).forEach((el) => {
        el.addEventListener("dragover", function (e) { e.preventDefault(); el.classList.add("drop-on"); });
        el.addEventListener("dragleave", function () { el.classList.remove("drop-on"); });
        el.addEventListener("drop", function (e) {
          e.preventDefault();
          el.classList.remove("drop-on");
          const id = e.dataTransfer.getData("text/plain");
          if (id) onDrop(id, el);
        });
      });
    }
    zone("[data-drop-status]", function (id, el) { setVisitStatus(id, el.getAttribute("data-drop-status")); });
    zone("[data-drop-role]", function (id, el) {
      const suiteId = el.getAttribute("data-drop-suite");
      const role = el.getAttribute("data-drop-role");
      setAppointmentSuite(id, suiteId, role);
    });
    zone("[data-drop-suite][data-unassign]", function (id) { setAppointmentSuite(id, null); });
  }
  function fieldOptions(field) {
    if (field.optionsRef === "consultingFor") return BRIZZA.consultingFor || [];
    return field.options || [];
  }
  function missingNoteFields(template, values) {
    const missing = [];
    (template.sections || []).forEach((sec) => {
      (sec.fields || []).forEach((f) => {
        if (!f.required) return;
        const v = (values[f.id] || "").toString().trim();
        if (!v) missing.push(f.label);
      });
    });
    return missing;
  }
  function noteFieldControl(f, value) {
    const req = f.required ? ' aria-required="true"' : "";
    const label = '<label for="nf-' + esc(f.id) + '">' + esc(f.label) + (f.required ? ' <span class="req">required</span>' : "") + "</label>";
    if (f.type === "textarea") {
      return '<div class="field full">' + label + '<textarea id="nf-' + esc(f.id) + '" data-nf="' + esc(f.id) + '"' + req + ">" + esc(value || "") + "</textarea></div>";
    }
    if (f.type === "select") {
      const opts = ['<option value="">Select</option>'].concat(fieldOptions(f).map((o) => "<option" + (value === o ? " selected" : "") + ">" + esc(o) + "</option>"));
      return '<div class="field">' + label + '<select id="nf-' + esc(f.id) + '" data-nf="' + esc(f.id) + '"' + req + ">" + opts.join("") + "</select></div>";
    }
    return '<div class="field">' + label + '<input id="nf-' + esc(f.id) + '" data-nf="' + esc(f.id) + '" type="text"' + req + ' value="' + esc(value || "") + '"></div>';
  }
  function collectNoteValues() {
    const values = {};
    $$("[data-nf]").forEach((el) => { values[el.getAttribute("data-nf")] = el.value; });
    return values;
  }
  function updateNoteSignState() {
    const draft = state.noteDraft;
    const save = $("#modalSave");
    if (!draft || !draft.templateId) {
      if (save) { save.disabled = true; }
      const miss = $("#noteMissing");
      if (miss) miss.innerHTML = '<div class="notice note-missing">Select a template to begin.</div>';
      return;
    }
    const tpl = (BRIZZA.NOTE_TEMPLATES || []).find((t) => t.id === draft.templateId);
    if (!tpl) return;
    draft.values = collectNoteValues();
    const missing = missingNoteFields(tpl, draft.values);
    if (save) save.disabled = missing.length > 0;
    const miss = $("#noteMissing");
    if (miss) {
      miss.innerHTML = missing.length
        ? '<div class="notice note-missing">Sign stays disabled until required fields are filled: ' + missing.map(esc).join(", ") + ".</div>"
        : "";
    }
  }
  function openNoteComposer(pid, apptId, visitId) {
    if (!isClinicalRole()) { toast("Create Note is limited to clinical roles"); return; }
    state.noteDraft = { pid: pid, apptId: apptId || null, visitId: visitId || null, templateId: "", values: {} };
    paintNoteComposer();
  }
  function paintNoteComposer() {
    const draft = state.noteDraft;
    const p = patient(draft.pid);
    const tpls = BRIZZA.NOTE_TEMPLATES || [];
    const tpl = tpls.find((t) => t.id === draft.templateId);
    const picker = '<div class="field"><label for="noteTpl">Template</label><select id="noteTpl"><option value="">Select a template</option>' +
      tpls.map((t) => "<option value=\"" + esc(t.id) + "\"" + (draft.templateId === t.id ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") + "</select></div>";
    let sections = "";
    if (tpl) {
      const flag = tpl.draft ? openQ("Draft templates – Open question. This " + tpl.name + " template is not taken from the SOPs or V1 documents.") : '<div class="notice">' + esc(tpl.source) + "</div>";
      sections = flag + tpl.sections.map((sec) => "<h3 class=\"section-title\">" + esc(sec.title) + "</h3><div class=\"formgrid\">" +
        sec.fields.map((f) => noteFieldControl(f, (draft.values || {})[f.id])).join("") + "</div>").join("");
    }
    showModal("Create note · " + (p ? p.name : draft.pid), picker + sections + '<div id="noteMissing"></div>', function () { signNote(); }, "Sign");
    updateNoteSignState();
    const sel = $("#noteTpl");
    if (sel) sel.addEventListener("change", function () {
      state.noteDraft.templateId = sel.value;
      state.noteDraft.values = {};
      paintNoteComposer();
    });
    $$("[data-nf]").forEach((el) => {
      el.addEventListener("input", updateNoteSignState);
      el.addEventListener("change", updateNoteSignState);
    });
  }
  function signNote() {
    const draft = state.noteDraft;
    if (!draft || !isClinicalRole()) return;
    const tpl = (BRIZZA.NOTE_TEMPLATES || []).find((t) => t.id === draft.templateId);
    if (!tpl) { toast("Select a template"); return; }
    draft.values = collectNoteValues();
    const missing = missingNoteFields(tpl, draft.values);
    if (missing.length) { updateNoteSignState(); toast("Required fields are missing"); return; }
    const p = patient(draft.pid);
    const signedAt = nowET();
    const values = Object.assign({}, draft.values);
    const text = Object.keys(values).map((k) => {
      const field = tpl.sections.reduce((f, s) => f || (s.fields || []).find((x) => x.id === k), null);
      return (field ? field.label : k) + ": " + (values[k] || "—");
    }).join(" · ");
    const rec = {
      id: nextId("N-", p.notes),
      date: todayET(),
      type: tpl.name,
      templateId: tpl.id,
      procedurePerformed: values.procedurePerformed || "",
      provider: actingName(),
      role: state.actingRole,
      status: "Signed",
      locked: true,
      signedAt: signedAt,
      fields: values,
      text: text,
      visitId: undefined,
      appointmentId: draft.apptId || undefined,
      historySnapshot: historySnapshotOf(p)
    };
    if (draft.visitId) rec.visitId = draft.visitId;
    else if (draft.apptId) {
      const a = appt(draft.apptId);
      if (a && a.visitId) rec.visitId = a.visitId;
    }
    p.notes.unshift(rec);
    if (rec.visitId) {
      const v = visit(rec.visitId);
      if (v) v.noteId = rec.id;
    }
    addAudit({
      who: actingName(),
      role: state.actingRole,
      action: "Signed " + tpl.name + " note",
      recordType: "Note",
      recordId: rec.id,
      recordPath: { page: "patients", selected: p.id, tab: "clinical-notes" },
      changes: [
        { field: "status", before: "—", after: "Signed" },
        { field: "template", before: "—", after: tpl.name },
        { field: "signedAt", before: "—", after: signedAt }
      ]
    });
    state.noteDraft = null;
    closeModal();
    toast("Note signed and locked");
    const next = hashFor({ page: "patients", selected: p.id, tab: "clinical-notes" });
    if (location.hash !== next) go({ page: "patients", selected: p.id, tab: "clinical-notes" });
    else render();
  }

  function renderRooming() {
    const date = state.roomingDate || todayET();
    state.roomingDate = date;
    (store.appointments || []).filter((a) => a.date === date && isBoardStatus(a.status)).forEach(ensureRooming);
    const records = (store.appointments || []).filter((a) => a.date === date && isBoardStatus(a.status) && a.status !== "Rescheduled")
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const head = pageHead("Rooming manager", "Rooming", esc(locationName(state.locationId)) + " · " + esc(fmtLong(date)), "");
    const toolbar = `<div class="room-toolbar datebar">
      <a class="btn small" href="${hashFor({ page: "rooming", date: addDays(date, -1) })}" aria-label="Previous day">‹</a>
      <strong>${esc(fmtLong(date))}</strong>
      <a class="btn small" href="${hashFor({ page: "rooming", date: addDays(date, 1) })}" aria-label="Next day">›</a>
      <a class="btn small" id="room-today" href="${hashFor({ page: "rooming", date: todayET() })}">Today</a>
    </div>`;
    const cardHtml = (a, place) => {
      const p = patient(a.patientId);
      const nxt = nextRoomingStatus(a.status);
      const last = auditIconFor("Appointment", a.id);
      const apptLink = '<a href="' + hashFor({ page: "schedule", date: a.date, appointmentId: a.id, view: "list" }) + '">' + esc(a.id) + "</a>";
      const uid = esc(a.id) + (place ? "-" + place : "");
      const sel = '<label class="sr-only" for="room-set-' + uid + '">Set visit status</label><select id="room-set-' + uid + '" class="status-dd" data-visit-status="' + esc(a.id) + '">' +
        (BRIZZA.ROOMING_BOARD_STATUSES || []).map((s) => "<option" + (a.status === s ? " selected" : "") + ">" + esc(s) + "</option>").join("") + "</select>";
      const suiteOpts = ['<option value="">Not in a suite</option>'].concat((BRIZZA.SUITES || []).flatMap((s) => [
        "<option value=\"" + esc(s.id) + "|With clinical\"" + (a.suiteId === s.id && a.status === "With clinical" ? " selected" : "") + ">" + esc(s.name) + " · Clinical</option>",
        "<option value=\"" + esc(s.id) + "|With provider\"" + (a.suiteId === s.id && a.status === "With provider" ? " selected" : "") + ">" + esc(s.name) + " · Provider</option>"
      ]));
      const suiteSel = place === "suite" ? "" : ('<label class="sr-only" for="suite-set-' + uid + '">Move to suite</label><select id="suite-set-' + uid + '" data-suite-role="' + esc(a.id) + '">' + suiteOpts.join("") + "</select>");
      const adv = nxt && place !== "suite" ? '<button class="btn advance-sm" type="button" data-room-advance="' + esc(a.id) + '">Advance</button>' : "";
      const controls = place === "suite" ? "" : (sel + suiteSel);
      const suiteName = a.suiteId ? ((BRIZZA.SUITES.find((s) => s.id === a.suiteId) || {}).name || a.suiteId) : "Not in a suite";
      return `<div class="room-card" data-rooming="${esc(a.id)}" tabindex="0">
        <div class="row-title">${statusDot(a.status)} ${esc(p ? p.name : a.patientId)} ${last}</div>
        <div class="row-sub">${esc(fmtTime(a.time))} · ${esc(a.type)} · ${esc(reasonText(a))} · ${apptLink}</div>
        <div class="row-sub">${esc(a.provider)} · ${esc(suiteName)}</div>
        <div class="row-sub"><span class="${timerClass(a.statusSince)}" data-room-mins="${esc(String(a.statusSince || nowMs()))}">${minutesLabel(a.statusSince)}</span> in this status</div>
        <div class="actions">${adv}</div>
        ${controls}
      </div>`;
    };
    const cols = (BRIZZA.ROOMING_BOARD_STATUSES || []).map((status) => {
      const here = records.filter((a) => a.status === status);
      const cards = here.map((a) => cardHtml(a, "flow")).join("") || '<div class="empty">None</div>';
      return '<div class="room-col" data-drop-status="' + esc(status) + '"><h2>' + esc(status) + " · " + here.length + "</h2>" + cards + "</div>";
    }).join("");
    const suites = (BRIZZA.SUITES || []).map((s) => {
      const occ = occupantInSuite(s.id, date, null);
      const occupied = !!occ;
      const mins = occupied && occ.suiteSince ? '<div class="row-sub">Occupied <span class="' + timerClass(occ.suiteSince) + '" data-room-mins="' + esc(String(occ.suiteSince)) + '">' + minutesLabel(occ.suiteSince) + "</span></div>" : '<div class="row-sub">Available</div>';
      const inner = occupied ? cardHtml(occ, "suite") : '<div class="empty">Available</div>';
      return '<div class="suite-card' + (occupied ? " occupied" : "") + '"><h2 class="suite-name">' + esc(s.name) + '</h2><p class="suite-svc">' + esc(s.service) + "</p>" +
        badge(occupied ? "Occupied" : "Available") + mins + inner +
        '<div class="suite-zones"><div class="suite-zone" data-drop-suite="' + esc(s.id) + '" data-drop-role="With clinical">Clinical</div><div class="suite-zone" data-drop-suite="' + esc(s.id) + '" data-drop-role="With provider">Provider</div></div></div>';
    }).join("");
    const body = toolbar +
      openQ("This merged visit-status list supersedes the earlier independent appointment, consultation, and treatment status design (DB decisions), pending a database update (Open question 23). Payment and invoice status stay independent.") +
      '<h2 class="section-title">Patient Flow</h2><div class="room-board">' + cols + "</div>" +
      '<h2 class="section-title" style="margin-top:18px">Rooms</h2>' +
      openQ("Suite names and service labels are a prototype layout, not an approved room catalog (Open question 16). Drop into Clinical or Provider to set With clinical or With provider.") +
      '<div class="room-suites">' + suites + "</div>" +
      '<div class="suite-unassign" data-drop-suite="" data-unassign="1">Drop here to remove from a suite</div>';
    renderChrome('<a href="' + hashFor({ page: "rooming", date: date }) + '">Rooming</a>', head, body);
    startRoomingTick();
    bindRoomingDrag();
    bindStatusStops();
  }

  function openAddBlock() {
    const staff = BRIZZA.PROVIDERS.concat(BRIZZA.ROLES);
    const times = BRIZZA.CLINIC_TIMES || [];
    const starts = times.filter((t) => t !== "18:00");
    const ends = times.filter((t) => t !== "10:00");
    showModal("Add Admin block", `
      <div class="formgrid">
        <div class="field"><label for="blkStaff">Provider / staff</label>
          <select id="blkStaff">${staff.map((s) => "<option>" + esc(s) + "</option>").join("")}</select></div>
        <div class="field"><label for="blkReason">Reason</label>
          <select id="blkReason">${BRIZZA.BLOCK_REASONS.map((s) => "<option>" + esc(s) + "</option>").join("")}</select></div>
        <div class="field"><label for="blkDate">Date</label>
          <input id="blkDate" type="date" value="${esc(state.date)}" required></div>
        <div class="field"><label for="blkStart">Start</label>
          <select id="blkStart">${timeOptions("12:00", starts)}</select></div>
        <div class="field"><label for="blkEnd">End</label>
          <select id="blkEnd">${timeOptions("13:00", ends)}</select></div>
      </div>
      <div id="blkWarn"></div>
      ${openQ("Whether an Admin block prevents booking, and who may create or override blocked availability, is not defined in the V1 documents. These reasons are not an approved catalog (Open question 15).")}
    `, function () { saveBlock(); }, "Add block");
  }
  function saveBlock() {
    const date = $("#blkDate").value;
    const start = $("#blkStart").value;
    const end = $("#blkEnd").value;
    const warn = $("#blkWarn");
    if (!date) { warn.innerHTML = '<div class="notice">Date is required.</div>'; return; }
    if (isWeekend(date)) { warn.innerHTML = '<div class="notice">Blocks must fall on Monday–Friday.</div>'; return; }
    if (start >= end) { warn.innerHTML = '<div class="notice">End must be after start, within 10:00 a.m.–6:00 p.m. ET.</div>'; return; }
    if (start < "10:00" || end > "18:00") { warn.innerHTML = '<div class="notice">Start and end must stay within Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>'; return; }
    const rec = {
      id: nextId("BLK-", store.blocks),
      type: "Admin",
      reason: $("#blkReason").value,
      staff: $("#blkStaff").value,
      date: date,
      start: start,
      end: end,
      locationId: state.locationId || BRIZZA.DEFAULT_LOCATION
    };
    store.blocks.push(rec);
    addAudit({
      who: actingName(),
      role: state.actingRole,
      action: "Added Admin block",
      recordType: "Block",
      recordId: rec.id,
      recordPath: { page: "schedule", date: date, view: state.scheduleView, calMode: state.calMode },
      changes: [
        { field: "reason", before: "—", after: rec.reason },
        { field: "staff", before: "—", after: rec.staff },
        { field: "time", before: "—", after: date + " " + start + "–" + end }
      ]
    });
    closeModal();
    toast("Admin block added");
    state.date = date;
    const next = hashFor({ page: "schedule", date: date, view: state.scheduleView, calMode: state.calMode });
    if (location.hash !== next) go({ page: "schedule", date: date, view: state.scheduleView, calMode: state.calMode });
    else render();
  }

  function scheduleSearchHits(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) return "";
    const people = store.patients.filter((p) => (p.name + " " + p.id + " " + p.phone + " " + (p.dob || "")).toLowerCase().includes(q));
    const aps = store.appointments.filter((a) => {
      const p = patient(a.patientId);
      return ((p && p.name) + " " + (p && p.dob || "") + " " + a.patientId + " " + a.id + " " + a.type + " " + reasonText(a) + " " + a.provider + " " + a.date).toLowerCase().includes(q) && a.status !== "Rescheduled" && a.status !== "Canceled";
    }).slice(0, 8);
    const plist = people.map((p) => '<a class="row" href="' + hashFor({ page: "patients", selected: p.id, tab: "demographics" }) + '"><span>' + esc(p.name) + '</span><span class="row-sub">' + esc(p.id) + "</span></a>").join("") || '<div class="row-sub">No matching patients</div>';
    const alist = aps.map((a) => {
      const p = patient(a.patientId);
      return '<a class="row" href="' + hashFor({ page: "schedule", date: a.date, appointmentId: a.id, view: state.scheduleView, calMode: state.calMode }) + '"><span>' + esc(fmtTime(a.time)) + " · " + (p ? patientLink(p) : esc(a.patientId)) + '</span><span class="row-sub">' + esc(a.date) + " · " + esc(a.type) + " · " + esc(a.id) + "</span></a>";
    }).join("") || '<div class="row-sub">No matching appointments</div>';
    return '<div class="search-hits card" style="margin-bottom:12px"><div class="cardbody"><h3 class="section-title">Patient search</h3>' + plist + "<h3 class=\"section-title\">Appointments</h3>" + alist + "</div></div>";
  }

  function renderSchedule() {
    if (state.scheduleView === "calendar") {
      renderCalendar();
      return;
    }
    renderWorklist();
    return;
    /* superseded list view kept in _superseded/schedule-list-r5.js */
    const list = dayAppointments(state.date);
    const locOpts = (BRIZZA.LOCATIONS || []).map((l) => "<option value=\"" + esc(l.id) + "\"" + (state.locationId === l.id ? " selected" : "") + ">" + esc(l.name) + "</option>").join("");
    const toggle = scheduleViewToggle();
    const head = pageHead("Appointment operations", "Schedule", esc(locationName(state.locationId)) + " · " + esc(BRIZZA.CLINIC.hours),
      toggle + ' <a class="btn primary" href="#modal-book" data-open="book">＋ New appointment</a> <button class="btn" type="button" data-open="block">＋ Admin block</button>');
    const q = (state.scheduleSearch || "").trim().toLowerCase();
    const visible = q ? list.filter((a) => {
      const p = patient(a.patientId);
      return ((p && p.name) + " " + (p && p.dob || "") + " " + a.patientId + " " + a.type + " " + reasonText(a) + " " + a.id + " " + a.provider).toLowerCase().includes(q);
    }) : list;
    const apptRows = visible.map((a) => {
      const p = patient(a.patientId);
      const v = a.visitId ? '<a href="' + hashFor({ page: "visit", visitId: a.visitId }) + '">' + esc(a.visitId) + "</a>" : "";
      const open = state.expandedAppt === a.id;
      const openHref = hashFor({ page: "schedule", date: state.date, appointmentId: a.id, view: "list" });
      const dur = a.durationLabel || durationLabelFor(a.type, a.reasons);
      const posHref = a.invoiceId
        ? hashFor({ page: "pos", invoiceId: a.invoiceId, posTab: "invoice" })
        : hashFor({ page: "pos", appointmentId: a.id, posTab: "invoice" });
      return `<div class="appt-card" data-type="${esc(a.type)}" data-open-appt="${esc(a.id)}">
        <div class="appt-card-top">
          <div>
            <div class="appt-title">${statusDot(a.status)} <a href="${openHref}">${esc(fmtTime(a.time))}</a> · ${p ? patientLink(p) : esc(a.patientId)} ${auditIconFor("Appointment", a.id)}</div>
            <div class="row-sub">${esc(a.type)} · ${esc(reasonText(a))} · ${esc(dur)} · ${esc(a.provider)}</div>
            ${paperworkBadge(a)}
          </div>
          <div class="actions">
            ${statusSelect(a, "list")}
            <a class="btn small" href="${posHref}">Invoice</a>
            <button class="btn small" type="button" data-expand-reg="${esc(a.id)}" aria-expanded="${open ? "true" : "false"}" aria-controls="reg-panel-${esc(a.id)}">Registration</button>
          </div>
        </div>
        ${open ? registrationPanel(a) : ""}
      </div>`;
    });
    const items = visible.map((a, i) => ({ t: a.time, html: apptRows[i] }))
      .concat(dayBlocks(state.date).map((b) => ({ t: b.start, html: blockCard(b) })))
      .sort((a, b) => a.t.localeCompare(b.t));
    const taken = new Set(list.map((a) => a.time));
    const emptyAdds = '<div class="list-slot-add" aria-label="Add appointment at time">' + (BRIZZA.BOOKING_TIMES || []).filter((tm) => !taken.has(tm)).map((tm) => addSlotButton(state.date, tm)).join("") + "</div>";
    const hits = q ? scheduleSearchHits(q) : "";
    const rows = hits + typeLegend() + statusLegend() + emptyAdds + (items.map((x) => x.html).join("") || '<div class="empty">No appointments or Admin blocks on this date.</div>');
    const body = `<div class="schedule-wrap">
      <div class="card">
        <div class="cardhead">
          <div class="datebar">
            <a class="btn small" id="sched-prev" href="${hashFor({ page: "schedule", date: addDays(state.date, -1), view: "list" })}" aria-label="Previous day">‹</a>
            <strong>${esc(fmtLong(state.date))}</strong> <span class="count">${esc(patientCount(state.date))}</span>
            <a class="btn small" id="sched-next" href="${hashFor({ page: "schedule", date: addDays(state.date, 1), view: "list" })}" aria-label="Next day">›</a>
            <a class="btn small" id="sched-today" href="${hashFor({ page: "schedule", date: todayET(), view: "list" })}">Today</a>
            <a class="btn small" href="${hashFor({ page: "schedule", date: BRIZZA.SAMPLE_DAY, view: "list" })}">Sample day</a>
          </div>
          <div class="sched-tools">
            <label class="sr-only" for="sched-search">Search patients and appointments</label>
            <input id="sched-search" class="sched-search" type="search" placeholder="Search patients and appointments" value="${esc(state.scheduleSearch || "")}">
            <label class="sr-only" for="locationSel">Location</label>
            <select id="locationSel">${locOpts}</select>
            <label class="sr-only" for="prov">Provider filter</label>
            <select id="prov">${["All providers"].concat(BRIZZA.PROVIDERS).map((x) => "<option" + (state.providerFilter === x ? " selected" : "") + ">" + esc(x) + "</option>").join("")}</select>
          </div>
        </div>
        <div class="cardbody">${isWeekend(state.date) ? '<div class="cal-closed">Clinic closed · weekends are outside Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>' : rows}
          ${openQ("Office-hours shading is synthetic sample availability, not taken from the V1 documents (Open question 18). Double-booking over an Admin block requires an admin override and a reason (Open question 15).")}
        </div>
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "schedule", date: state.date, view: "list" }) + '">Schedule</a>', head, body);
  }

  function scheduleViewToggle() {
    const listHref = hashFor({ page: "schedule", date: state.date, view: "worklist" });
    const calHref = hashFor({ page: "schedule", date: state.date, view: "calendar", calMode: state.calMode || "week" });
    return '<div class="view-toggle" role="group" aria-label="Schedule view"><a href="' + listHref + '" class="' + (state.scheduleView !== "calendar" ? "active" : "") + '">Worklist</a><a href="' + calHref + '" class="' + (state.scheduleView === "calendar" ? "active" : "") + '">Calendar</a></div>';
  }

  function calendarModeToggle() {
    const modes = ["day", "week", "month"];
    const links = modes.map((m) => {
      const href = hashFor({ page: "schedule", date: state.date, view: "calendar", calMode: m });
      return '<a href="' + href + '" class="' + (state.calMode === m ? "active" : "") + '">' + (m.charAt(0).toUpperCase() + m.slice(1)) + "</a>";
    }).join("");
    return '<div class="mode-toggle" role="group" aria-label="Calendar mode">' + links + "</div>";
  }

  function calendarEvent(a) {
    const p = patient(a.patientId);
    const href = hashFor({ page: "schedule", date: a.date, appointmentId: a.id, view: "calendar", calMode: state.calMode });
    const dd = (state.calMode === "month") ? "" : statusSelect(a, "cal");
    return '<div class="cal-event" data-type="' + esc(a.type) + '" data-open-appt="' + esc(a.id) + '">' +
      '<span class="t">' + statusDot(a.status) + ' <a href="' + href + '">' + esc(fmtTime(a.time)) + "</a> · " + (p ? patientLink(p) : esc(a.patientId)) + "</span>" +
      '<span class="cal-event-mid"><a href="' + href + '">' + esc(a.type) + " · " + esc(reasonText(a)) + "</a></span>" + dd + "</div>";
  }

  function rangeAppointments(start, end) {
    return store.appointments
      .filter((a) => a.date >= start && a.date <= end && a.status !== "Rescheduled" && a.status !== "Canceled")
      .filter((a) => state.providerFilter === "All providers" || a.provider === state.providerFilter)
      .filter((a) => !state.locationId || a.locationId === state.locationId)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  function renderCalendar() {
    const toggle = scheduleViewToggle();
    const modes = calendarModeToggle();
    const shiftPrev = scheduleShift(state.date, -1);
    const shiftNext = scheduleShift(state.date, 1);
    let title = fmtLong(state.date) + " · " + patientCount(state.date);
    if (state.calMode === "week") title = "Week of " + fmtLong(weekMonday(state.date));
    if (state.calMode === "month") title = monthLabel(state.date);
    const head = pageHead("Appointment operations", "Schedule", esc(locationName(state.locationId)) + " · " + esc(BRIZZA.CLINIC.hours),
      toggle + " " + modes + ' <a class="btn primary" href="#modal-book" data-open="book">＋ New appointment</a> <button class="btn" type="button" data-open="block">＋ Admin block</button>');
    const nav = `<div class="datebar">
      <a class="btn small" id="sched-prev" href="${hashFor({ page: "schedule", date: shiftPrev, view: "calendar", calMode: state.calMode })}" aria-label="Previous">‹</a>
      <strong>${esc(title)}</strong>
      <a class="btn small" id="sched-next" href="${hashFor({ page: "schedule", date: shiftNext, view: "calendar", calMode: state.calMode })}" aria-label="Next">›</a>
      <a class="btn small" id="sched-today" href="${hashFor({ page: "schedule", date: todayET(), view: "calendar", calMode: state.calMode })}">Today</a>
      <a class="btn small" href="${hashFor({ page: "schedule", date: BRIZZA.SAMPLE_DAY, view: "calendar", calMode: state.calMode })}">Sample day</a>
    </div>`;
    let grid = "";
    if (state.calMode === "day") grid = calendarDayGrid(state.date);
    else if (state.calMode === "month") grid = calendarMonthGrid(state.date);
    else grid = calendarWeekGrid(state.date);
    const body = `<div class="card"><div class="cardhead">${nav}
      <label class="sr-only" for="sched-search">Search patients and appointments</label>
      <input id="sched-search" class="sched-search" type="search" placeholder="Search patients and appointments" value="${esc(state.scheduleSearch || "")}">
      <label class="sr-only" for="prov">Provider filter</label>
      <select id="prov">${["All providers"].concat(BRIZZA.PROVIDERS).map((x) => "<option" + (state.providerFilter === x ? " selected" : "") + ">" + esc(x) + "</option>").join("")}</select>
    </div><div class="cardbody">${scheduleSearchHits(state.scheduleSearch || "")}${typeLegend()}${statusLegend()}${grid}</div></div>`;
    renderChrome('<a href="' + hashFor({ page: "schedule", date: state.date, view: "calendar", calMode: state.calMode }) + '">Schedule</a> / Calendar / ' + esc(state.calMode), head, body);
  }

  function calendarDayGrid(date) {
    if (isWeekend(date)) return '<div class="cal-closed">Clinic closed · weekends are outside Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>';
    const hours = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
    const list = dayAppointments(date);
    const blocks = dayBlocks(date);
    const q = (state.scheduleSearch || "").trim().toLowerCase();
    const vis = (a) => !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().includes(q);
    return hours.map((t) => {
      const here = list.filter((a) => a.time === t && vis(a));
      const slot = here.map(calendarEvent).join("") +
        blocks.filter((b) => b.start === t).map(calendarBlock).join("") +
        (list.filter((a) => a.time === t).length ? "" : addSlotButton(date, t));
      return '<div class="cal-day-row ' + slotClass(date, t) + '"><div class="cal-time">' + esc(fmtTime(t)) + '</div><div>' + slot + "</div></div>";
    }).join("") + '<div class="row-sub" style="margin-top:10px">Closes 6:00 p.m. ET · ' + esc(patientCount(date)) + "</div>";
  }

  function calendarWeekGrid(date) {
    const mon = weekMonday(date);
    const days = [0, 1, 2, 3, 4].map((i) => addDays(mon, i));
    const hours = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
    const appts = rangeAppointments(mon, addDays(mon, 4));
    const blocks = rangeBlocks(mon, addDays(mon, 4));
    const q = (state.scheduleSearch || "").trim().toLowerCase();
    const vis = (a) => !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().includes(q);
    const heads = '<div class="cal-time"></div>' + days.map((d) => '<div class="cal-hd"><a href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" }) + '">' + esc(new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) + '</a> <span class="count">' + esc(patientCount(d)) + '</span></div>').join("");
    const rows = hours.map((h) => {
      const next = h === "17:00" ? "18:00" : String(Number(h.slice(0, 2)) + 1).padStart(2, "0") + ":00";
      const cells = days.map((d) => {
        const here = appts.filter((a) => a.date === d && a.time >= h && a.time < next);
        const slot = here.filter(vis).map(calendarEvent).join("") +
          blocks.filter((b) => b.date === d && b.start >= h && b.start < next).map(calendarBlock).join("") +
          (here.length ? "" : addSlotButton(d, h));
        return '<div class="cal-cell ' + slotClass(d, h) + '">' + slot + "</div>";
      }).join("");
      return '<div class="cal-time">' + esc(fmtTime(h)) + "</div>" + cells;
    }).join("");
    return '<div class="cal-grid-week">' + heads + rows + "</div>";
  }

  function calendarMonthGrid(date) {
    const [y, m] = date.split("-").map(Number);
    const first = y + "-" + String(m).padStart(2, "0") + "-01";
    const start = weekMonday(first);
    const lastDate = new Date(y, m, 0).getDate();
    const last = y + "-" + String(m).padStart(2, "0") + "-" + String(lastDate).padStart(2, "0");
    // show full weeks covering the month (Mon–Sun)
    let end = addDays(weekMonday(last), 6);
    const appts = rangeAppointments(start, end);
    const blocks = rangeBlocks(start, end);
    const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    let html = labels.map((l) => '<div class="cal-hd">' + l + "</div>").join("");
    let d = start;
    while (d <= end) {
      const inMonth = d.slice(0, 7) === first.slice(0, 7);
      const closed = isWeekend(d);
      const dayAppts = appts.filter((a) => a.date === d);
      const dayBlks = blocks.filter((b) => b.date === d);
      const q = (state.scheduleSearch || "").trim().toLowerCase();
      const vis = (a) => !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().includes(q);
      const chips = inMonth ? dayAppts.filter(vis).map(calendarEvent).join("") + dayBlks.map(calendarBlock).join("") : "";
      const dayLink = '<a class="d" href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" }) + '">' + Number(d.slice(8)) + '</a> <span class="count">' + esc(patientCount(d)) + "</span>";
      html += '<div class="cal-mcell' + (closed ? " closed" : "") + '">' + (inMonth ? dayLink : "") + (closed && inMonth ? '<div class="row-sub">Closed</div>' : "") + chips + "</div>";
      d = addDays(d, 1);
    }
    return '<div class="cal-grid-month">' + html + "</div>";
  }

  function renderAudit() {
    const ev = store.audit.find((e) => e.id === state.auditId);
    if (!ev) {
      const head = pageHead("Audit trail", "Audit event", "Event not found.", "");
      renderChrome("Audit", head, '<div class="card"><div class="cardbody"><div class="empty">No audit event matches this link.</div></div></div>');
      return;
    }
    const href = ev.recordPath ? hashFor(ev.recordPath) : "";
    const rows = (ev.changes || []).map((c) => "<tr><td>" + esc(c.field) + "</td><td>" + esc(c.before) + "</td><td>" + esc(c.after) + "</td></tr>").join("") || "<tr><td colspan=\"3\">No field changes recorded.</td></tr>";
    const head = pageHead("Audit trail", ev.id, esc(ev.action), href ? '<a class="btn primary" href="' + href + '">Open record</a>' : "");
    const body = `<div class="card">
      <div class="cardhead"><h2>Event detail</h2></div>
      <div class="cardbody">
        <div class="two">
          <div>
            <div class="row"><span>Who</span><strong>${esc(ev.who)}</strong></div>
            <div class="row"><span>Role</span><strong>${esc(ev.role)}</strong></div>
            <div class="row"><span>When</span><strong>${esc(ev.when)}</strong></div>
          </div>
          <div>
            <div class="row"><span>Action</span><strong>${esc(ev.action)}</strong></div>
            <div class="row"><span>Record</span><strong>${esc(ev.recordType)} · ${href ? '<a href="' + href + '">' + esc(ev.recordId) + "</a>" : esc(ev.recordId)}</strong></div>
          </div>
        </div>
        ${openQ("Which of the seven staff roles applies is not defined in the V1 documents (Open question 3). Seeded events use Clinic staff · Not recorded.")}
        <h3 class="section-title" style="margin-top:16px">Changed fields</h3>
        <table class="table audit-changes"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>`;
    renderChrome('<a href="' + href + '">Record</a> / <a href="' + hashFor({ page: "audit", auditId: ev.id }) + '">' + esc(ev.id) + "</a>", head, body);
  }


  function readinessFor(a) {
    const p = patient(a.patientId);
    const items = [];
    const consentOk = p && p.consents.clinical && !/not yet/i.test(p.consents.clinical);
    const intakeOk = p && p.documents.some((d) => !/pending/i.test(d));
    const allergyOk = p && p.allergies.length > 0;
    items.push({ label: "Clinical consent", ok: consentOk });
    items.push({ label: "Intake documents", ok: intakeOk });
    items.push({ label: "Allergies recorded", ok: allergyOk });
    const draft = p && p.notes.some((n) => (n.status || "Draft") === "Draft");
    if (draft) items.push({ label: "Unsigned / draft note", ok: false });
    return { ready: items.every((i) => i.ok), items };
  }

  function renderQueue() {
    const list = store.appointments
      .filter((a) => a.date === state.date && a.status !== "Rescheduled" && a.status !== "Canceled")
      .sort((a, b) => a.time.localeCompare(b.time));
    const followups = store.patients.flatMap((p) => p.followups.map((f) => ({ p, f })));
    const head = pageHead("Clinic operations", "Work queue", "", "");
    const body = `<div class="grid">
      <div class="card">
        <div class="cardhead"><h2>Visit readiness · ${esc(fmtDate(state.date))}</h2><span class="badge">${list.length} appointments</span></div>
        <table class="table"><thead><tr><th>Time / patient</th><th>Visit</th><th>Status</th><th>Prep</th><th>Next step</th></tr></thead>
        <tbody>${list.map((a) => {
          const p = patient(a.patientId);
          const r = readinessFor(a);
          const prep = r.items.map((i) => '<div class="row-sub">' + (i.ok ? "✓" : "○") + " " + esc(i.label) + "</div>").join("");
          return "<tr><td><strong>" + esc(fmtTime(a.time)) + '</strong><div class="row-sub">' + (p ? patientLink(p) : esc(a.patientId)) + "</div></td><td>" +
            esc(a.type) + (a.visitId ? '<div class="row-sub"><a href="' + hashFor({ page: "visit", visitId: a.visitId }) + '">' + esc(a.visitId) + "</a></div>" : "") +
            "</td><td>" + badge(a.status) + "</td><td>" + (r.ready ? badge("Ready") : badge("Needs prep")) + prep +
            '</td><td><a class="btn small" href="' + hashFor({ page: "patients", selected: a.patientId, tab: "appointments" }) + '">Open chart</a></td></tr>';
        }).join("") || '<tr><td colspan="5" class="empty">No appointments on this date.</td></tr>'}</tbody></table>
        ${openQ("A named work-queue readiness checklist is not defined in the V1 documents. These indicators are derived from chart consent, intake, and allergy fields as prototype placeholders (Records §7 / §23 supply inputs, not a queue spec).")}
      </div>
      <div class="card">
        <div class="cardhead"><h2>Follow-up tasks</h2><span class="badge warn">${followups.length} open</span></div>
        <div class="cardbody">
          ${followups.map(({ p, f }) => '<div class="row"><div><div class="row-title">' + esc(f.text) + '</div><div class="row-sub">' + esc(p.name) + " · due " + esc(fmtDate(f.due || "")) + '</div></div><a class="btn small" href="' + hashFor({ page: "patients", selected: p.id, tab: "follow-up" }) + '">Open chart</a></div>').join("") || '<div class="empty">No follow-up tasks</div>'}
        </div>
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "queue", date: state.date }) + '">Work queue</a>', head, body);
  }

  function renderVisit() {
    const v = visit(state.visitId);
    if (!v) {
      renderChrome("Visit", pageHead("", "Visit not found", "", ""), '<div class="empty">Unknown visit.</div>');
      return;
    }
    const p = patient(v.patientId);
    const aps = v.appointmentIds.map(appt).filter(Boolean);
    const inv = invoice(v.invoiceId);
    const note = p && p.notes.find((n) => n.id === v.noteId || n.visitId === v.id);
    const head = pageHead("Visit", v.label || v.id, esc(p ? p.name : "") + " · " + esc(v.date),
      inv ? '<a class="btn primary" href="' + hashFor({ page: "checkout", invoiceId: inv.id }) + '">Open invoice</a>' : "");
    const body = `
      <div class="notice">Same-day consult and treatment use two appointment records under one visit. Each appointment keeps its own provider, status, and history.</div>
      ${openQ("Journey §6 says each appointment keeps its own documentation; Sched §5 says avoid duplicate notes. This mockup uses one Consultation note with procedure performed Yes/No, linked to the visit.")}
      <div class="grid">
        <div class="card">
          <div class="cardhead"><h2>Appointments in this visit</h2></div>
          <div class="cardbody">${aps.map(appointmentRow).join("")}</div>
        </div>
        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="cardhead"><h2>Shared invoice</h2>${inv ? badge(inv.status) : ""}</div>
            <div class="cardbody">${inv ? '<div class="row"><span>' + esc(inv.id) + "</span><span>Balance: " + esc(inv.balance) + '</span></div><p class="row-sub">Both appointments display this invoice status.</p><a class="btn small" href="' + hashFor({ page: "checkout", invoiceId: inv.id }) + '">Checkout</a>' : "No invoice"}</div>
          </div>
          <div class="card">
            <div class="cardhead"><h2>Consultation note</h2></div>
            <div class="cardbody">${note ? '<div class="note"><strong>Consultation</strong> ' + badge(note.status || "Draft") + '<div class="row-sub">Procedure performed: ' + esc(note.procedurePerformed || "Not recorded") + " · " + esc(note.provider) + "</div><p>" + esc(note.text) + "</p></div>" : '<div class="empty">No visit note yet.</div>' + createNoteButton(v.patientId, null, v.id)}</div>
          </div>
        </div>
      </div>`;
    renderChrome('<a href="' + hashFor({ page: "patients", selected: v.patientId, tab: "appointments" }) + '">' + esc(p ? p.name : "Patient") + "</a> / " + esc(v.id), head, body);
  }

  function fefoLot(product) {
    return store.lots.filter((l) => l.product === product && l.released && l.onHand > 0 && l.status === "Released")
      .sort((a, b) => a.expiry.localeCompare(b.expiry))[0] || null;
  }
  function productForInvoice(inv) {
    const text = inv.lines.map((l) => l.service).join(" ");
    const m = text.match(/Botox|Jeuveau|Juvederm|Volbella/);
    if (m) return m[0];
    if (/Facial|Hydrafacial|Mini Facial/.test(text)) return "Facial";
    if (/Chemical Peel/.test(text)) return "Chemical Peel";
    if (/Microneedling/.test(text)) return "Microneedling";
    return null;
  }

  function renderCheckout() {
    const inv = invoice(state.invoiceId) || store.invoices.find((i) => i.id === "INV-1003");
    if (!inv) { renderChrome("Checkout", pageHead("", "Invoice not found", "", ""), ""); return; }
    state.invoiceId = inv.id;
    const p = patient(inv.patientId);
    const product = productForInvoice(inv);
    const suggested = product ? fefoLot(product) : null;
    const lots = product ? store.lots.filter((l) => l.product === product) : store.lots.filter((l) => l.status === "Released");
    const head = pageHead("Checkout", inv.id, esc(p ? p.name : "") + " · " + esc(p ? p.id : ""), "");
    const links = inv.appointmentIds.map((id) => {
      const a = appt(id);
      return a ? '<a href="' + hashFor({ page: "schedule", date: a.date, appointmentId: a.id }) + '">' + esc(id) + "</a>" : esc(id);
    }).join(" · ");
    const body = `
      ${concept("Inventory posts exactly once when the invoice is finalized, not when an appointment is completed or a payment is recorded. Lot costing, taxation, and checkout discounts are not approved (Decisions 435–440). No prices are shown.")}
      <div class="grid">
        <div class="card">
          <div class="cardhead"><h2>Invoice</h2>${badge(inv.status)}</div>
          <div class="cardbody">
            <div class="row"><span>Balance</span><strong>${esc(inv.balance)}</strong></div>
            <div class="row"><span>Linked appointments</span><span>${links}</span></div>
            ${inv.visitId ? '<div class="row"><span>Visit</span><a href="' + hashFor({ page: "visit", visitId: inv.visitId }) + '">' + esc(inv.visitId) + "</a></div>" : ""}
            <h3 class="section-title">Lines</h3>
            ${inv.lines.map((l) => '<div class="row"><span>' + esc(l.service) + '</span><span class="row-sub">Amount: TBD</span></div>').join("")}
            <h3 class="section-title">Payment records</h3>
            <p class="row-sub">Five labels: Unpaid, Partially Paid, Paid, Refunded, Voided. The balance stays on the invoice.</p>
            ${inv.payments.map((pay) => '<div class="row"><div><div class="row-title">' + esc(pay.id) + " · " + esc(pay.method) + '</div><div class="row-sub">' + esc(pay.recorded) + "</div></div>" + badge(pay.status) + "</div>").join("") || '<div class="empty">No payment recorded</div>'}
            ${inv.status !== "Paid" && !inv.finalized ? '<div class="field" style="margin-top:12px"><label for="pay-status">Record payment status</label><div style="display:flex;gap:8px;align-items:center"><select id="pay-status">' + BRIZZA.paymentStatuses.map((s) => "<option>" + s + "</option>").join("") + '</select><button class="btn small" data-record-pay="' + inv.id + '">Record payment</button></div></div>' : ""}
          </div>
        </div>
        <div class="card">
          <div class="cardhead"><h2>FEFO inventory · Concept</h2></div>
          <div class="cardbody">
            <p class="row-sub">Suggested lot is the earliest-expiring released lot for the treatment product${product ? " (" + esc(product) + ")" : ""}.</p>
            ${suggested ? '<div class="notice">FEFO suggestion: ' + esc(suggested.id) + " · expires " + esc(suggested.expiry) + " · on hand " + suggested.onHand + " (package count, not a dose)</div>" : '<div class="notice">No released lot found.</div>'}
            <table class="table"><thead><tr><th>Lot</th><th>Product</th><th>Expiry</th><th>On hand</th><th>Status</th></tr></thead>
            <tbody>${lots.map((l) => "<tr><td>" + esc(l.id) + "</td><td>" + esc(l.product) + "</td><td>" + esc(l.expiry) + "</td><td>" + l.onHand + "</td><td>" + esc(l.status) + "</td></tr>").join("")}</tbody></table>
            <h3 class="section-title">Posting</h3>
            ${inv.movements.map((m) => '<div class="row-sub">' + esc(m.posted) + " · " + esc(m.type) + " · " + esc(m.lotId) + "</div>").join("") || '<div class="row-sub">No movement posted.</div>'}
            ${inv.finalized ? '<div class="notice">Finalized ' + esc(inv.finalizedAt) + ". Inventory already posted.</div>" : '<button class="btn primary" data-finalize="' + inv.id + '">Finalize invoice and post inventory</button>'}
          </div>
        </div>
      </div>`;
    renderChrome('<a href="' + hashFor({ page: "checkout", invoiceId: inv.id }) + '">Checkout</a> / ' + esc(inv.id), head, body);
  }

  function renderSettings() {
    const c = state.contrast || checkContrast();
    state.contrast = c;
    const themeRows = Object.entries(c.results).map(([id, rows]) => {
      const fails = rows.filter((r) => !r.pass);
      return '<div class="row"><div><strong>' + esc(BRIZZA.THEMES[id].name) + '</strong><div class="row-sub">' + rows.length + " body/UI text pairs checked · " + (fails.length ? fails.length + " below target" : "all at or above target") + "</div></div>" + (fails.length ? badge("Review") : badge("AA checked")) + "</div>";
    }).join("");
    const head = pageHead("Approved configuration", "Patient chart and appointments", "Draft themes are labeled DRAFT and are not a finalized brand.", "");
    const sections = ["Demographics", "Clinical Profile", "Appointments", "Treatment History", "Photos", "Documents", "Ledger", "Follow-Up History"];
    const body = `<div class="grid">
      <div class="card">
        <div class="cardhead"><h2>Patient chart</h2><span class="badge good">Decision aligned</span></div>
        <div class="cardbody">
          ${sections.map((s) => '<div class="row"><span>' + s + '</span><span class="row-sub">Section history retained</span></div>').join("")}
          <div class="row"><span>Clinical Notes</span><span class="badge warn">Pending review</span></div>
          <div class="row"><span>Patient number</span><span class="row-sub">BRZ0001 sequence · immutable · never reused</span></div>
          <div class="row"><span>Photo permissions</span><span class="row-sub">Clinical consent separate from marketing authorization</span></div>
        </div>
      </div>
      <div class="card">
        <div class="cardhead"><h2>Appointment setup</h2><span class="badge good">Decision aligned</span></div>
        <div class="cardbody">
          ${typesList().map((x) => '<div class="row"><span>' + esc(x.name) + '</span><span class="row-sub">' + x.minutes + ' min (includes buffer) · <a href="' + hashFor({ page: 'types' }) + '">Edit types</a></span></div>').join("")}
          <div class="row"><span>Customized Facial</span><span class="row-sub">Approved umbrella: Mini Facial, Facial, Hydrafacial</span></div>
          <div class="row"><span>Primary provider</span><span class="row-sub">Exactly one per appointment</span></div>
          <div class="row"><span>History</span><span class="row-sub">Status changes retained; reschedule creates a linked replacement</span></div>
          <div class="row"><span>Independent statuses</span><span class="row-sub">Appointment · Consultation outcome · Treatment · Payment</span></div>
          <div class="notice">Completed does not require payment. Catalog changes require Clinic Manager oversight. This concept uses synthetic sample patients.</div>
        </div>
      </div>
    </div>
    <div class="grid" style="margin-top:16px">
      <div class="card">
        <div class="cardhead"><h2>Theme contrast (WCAG 2.1 AA)</h2></div>
        <div class="cardbody">${themeRows}
          <p class="row-sub">Antique gold, soft bronze, and aged brass are not used for small text. Muted clay is not used as a small-text background.</p>
        </div>
      </div>
      <div class="card">
        <div class="cardhead"><h2>Open questions in this mockup</h2></div>
        <div class="cardbody">
          <p class="row-sub">See OPEN_QUESTIONS.md for the full list. Items shown in the UI are labeled “Open question”, “Optional idea (undecided)”, or “Concept”.</p>
          <a class="btn small" href="${hashFor({ page: "demo" })}">Start guided demo</a>
        </div>
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "configuration" }) + '">Configuration</a>', head, body);
  }

  function startDemo() {
    state.demo.running = true;
    state.demo.index = 0;
    runDemoStep();
  }
  function stopDemo() {
    state.demo.running = false;
    clearTimeout(state.demo.timer);
    const panel = $("#demo-panel");
    if (panel) panel.classList.remove("open");
    if (state.page === "demo") go({ page: "patients", selected: "BRZ0003", tab: "demographics" });
    else render();
  }
  function runDemoStep() {
    if (!state.demo.running) return;
    const steps = BRIZZA.DEMO_STEPS;
    if (state.demo.index >= steps.length) {
      state.demo.running = false;
      const panel = $("#demo-panel");
      if (panel) {
        panel.classList.add("open");
        panel.innerHTML = '<h2>Demo complete</h2><p class="demo-caption">This is an interactive mockup with synthetic records, not a production EMR.</p><button class="btn small" data-demo="close">Close</button>';
      }
      return;
    }
    const step = steps[state.demo.index];
    const hash = step.hash + (step.hash.indexOf("?") >= 0 ? "&" : "?") + "theme=" + state.theme;
    if (location.hash !== hash) history.replaceState(null, "", hash);
    const r = parseHash();
    state.page = r.page;
    if (r.date) state.date = r.date;
    if (r.selected) { state.selected = r.selected; state.tab = r.tab || "demographics"; }
    if (r.visitId) state.visitId = r.visitId;
    if (r.invoiceId) state.invoiceId = r.invoiceId;
    state.quoteId = r.quoteId || null;
    state.posTab = r.posTab || state.posTab || "invoice";
    if (r.appointmentId && r.page === "pos") state.posAppointmentId = r.appointmentId;

    document.documentElement.setAttribute("data-theme", state.theme);
    render();
    const panel = $("#demo-panel");
    if (panel) {
      panel.classList.add("open");
      panel.innerHTML = "<h2>Demo " + (state.demo.index + 1) + " / " + steps.length + " · " + esc(step.title) + '</h2><p class="demo-caption">' + esc(step.caption) + '</p><div class="demo-meta">Decisions: ' + esc(step.decisions) + ' · Synthetic prototype</div><div class="actions" style="margin-top:10px"><button class="btn small" data-demo="back"' + (state.demo.index === 0 ? " disabled" : "") + '>Back</button> <button class="btn small primary" data-demo="next">Next</button> <button class="btn small" data-demo="close">Stop demo</button></div>';
    }
    clearTimeout(state.demo.timer);
    state.demo.timer = setTimeout(() => { state.demo.index += 1; runDemoStep(); }, step.ms);
  }

  function closeModal(opts) {
    opts = opts || {};
    const back = $("#modal");
    if (back) back.classList.remove("open", "pos-mode", "hist-mode", "hide-foot");
    if (opts.cancelPending) state.reschedulingId = null;
    if (state.appointmentId && state.page === "schedule") {
      state.appointmentId = null;
      history.replaceState(null, "", hashFor({ page: "schedule", date: state.date }));
    }
  }
  function showModal(title, body, onSave, saveLabel) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    const save = $("#modalSave");
    save.textContent = saveLabel || "Save";
    save.onclick = onSave;
    $("#modal").classList.add("open");
    const first = $("#modalBody").querySelector("input,select,textarea,button");
    if (first) first.focus();
  }

  function reasonOptionsHtml(type, selected) {
    selected = selected || [];
    const reasons = reasonsForType(type);
    if (!reasons.length) return '<p class="row-sub">No reasons are attached to this type.</p>';
    return reasons.map((r) => {
      const extra = r.minutes != null ? " · " + r.minutes + " min" : "";
      return '<label style="display:inline-flex;align-items:center;gap:6px;margin:5px 12px 5px 0"><input type="checkbox" name="reason" value="' + esc(r.name) + '"' + (selected.indexOf(r.name) >= 0 ? " checked" : "") + "> " + esc(r.name) + extra + "</label>";
    }).join("");
  }

  function openBook(pid, preset) {
    preset = preset || {};
    const sel = pid || state.selected;
    const dateVal = preset.date || state.date;
    const timeVal = preset.time || BRIZZA.BOOKING_TIMES[0];
    const provVal = preset.provider || slotProvider();
    const locVal = preset.locationId || state.locationId || BRIZZA.DEFAULT_LOCATION;
    const locOpts = (BRIZZA.LOCATIONS || []).map((l) => "<option value=\"" + esc(l.id) + "\"" + (locVal === l.id ? " selected" : "") + ">" + esc(l.name) + "</option>").join("");
    showModal("Schedule Brizza appointment", `
      <div class="formgrid">
        <div class="field"><label for="fPatient">Patient <span class="req">required</span></label>
          <select id="fPatient" required>${store.patients.map((p) => '<option value="' + p.id + '"' + (p.id === sel ? " selected" : "") + ">" + esc(p.id) + " · " + esc(p.name) + "</option>").join("")}</select></div>
        <div class="field"><label for="fType">Appointment type <span class="req">required</span></label>
          <select id="fType" required>${typesList().map((tp) => "<option" + ((preset && preset.type) === tp.name ? " selected" : "") + ">" + esc(tp.name) + "</option>").join("")}</select></div>
        <div class="field full"><label>Approved reason(s)</label><div id="reasonOptions">${reasonOptionsHtml("Consultation", [])}</div>
          </div>
        <div class="field"><label for="fLocation">Location <span class="req">required</span></label>
          <select id="fLocation" required>${locOpts}</select></div>
        <div class="field"><label for="fDate">Date <span class="req">required</span></label><input id="fDate" type="date" required value="${esc(dateVal)}"></div>
        <div class="field"><label for="fTime">Start time <span class="req">required</span></label>
          <select id="fTime" required>${timeOptions(timeVal)}</select></div>
        <div class="field"><label for="fProvider">Primary provider <span class="req">required</span></label>
          <select id="fProvider" required>${BRIZZA.PROVIDERS.map((pv) => "<option" + (pv === provVal ? " selected" : "") + ">" + esc(pv) + "</option>").join("")}</select></div>
        <div class="field"><label for="fRoom">Room</label>
          <select id="fRoom">${BRIZZA.ROOMS.map((r) => "<option>" + esc(r) + "</option>").join("")}</select></div>
        <div class="field full"><p class="row-sub" id="fDuration">Length: ${esc(durationLabelFor("Consultation", []))} (includes buffer)</p></div>
        <div class="field full" id="consultingWrap"></div>
        <div class="field full" id="overrideWrap"></div>
        <div class="field full" id="cfWarn"></div>
        <div class="field full" id="bookWarn"></div>
      </div>`, function () { saveAppt(); });
    $("#fType").addEventListener("change", function () {
      $("#reasonOptions").innerHTML = reasonOptionsHtml($("#fType").value, []);
      updateConsultWarn();
      updateConsultingFor();
      updateBookDuration();
    });
    $("#fPatient").addEventListener("change", function () { updateConsultWarn(); updateConsultingFor(); });
    document.getElementById("reasonOptions").addEventListener("change", function () { updateConsultingFor(); updateBookDuration(); });
    ["fDate","fTime","fProvider"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", updateBookDuration);
    });
    updateConsultWarn();
    updateConsultingFor();
    updateBookDuration();
  }

  function updateBookDuration() {
    const el = $("#fDuration");
    if (!el || !$("#fType")) return;
    const type = $("#fType").value;
    const reasons = $$('input[name="reason"]:checked').map((x) => x.value);
    el.textContent = "Length: " + durationLabelFor(type, reasons) + " (includes buffer)";
    const wrap = $("#overrideWrap");
    if (!wrap) return;
    const date = $("#fDate") ? $("#fDate").value : "";
    const time = $("#fTime") ? $("#fTime").value : "";
    const provider = $("#fProvider") ? $("#fProvider").value : "";
    const hits = overlappingBlocks(date, time, type, reasons, provider);
    if (!hits.length) { wrap.innerHTML = ""; return; }
    const prior = $("#fOverride") ? $("#fOverride").value : "";
    wrap.innerHTML = '<div class="notice">This time overlaps an Admin block (' +
      hits.map((b) => esc(b.reason) + " · " + esc(fmtTime(b.start)) + "–" + esc(fmtTime(b.end))).join("; ") +
      "). Booking is blocked unless you record an admin override with a reason.</div>" +
      '<label for="fOverride">Admin override reason <span class="req">required</span></label>' +
      '<input id="fOverride" type="text" required value="' + esc(prior) + '">';
  }

  function updateConsultingFor() {
    const wrap = $("#consultingWrap");
    if (!wrap) return;
    const pid = $("#fPatient") && $("#fPatient").value;
    const type = $("#fType") && $("#fType").value;
    const reasons = $$('input[name="reason"]:checked').map((x) => x.value);
    if (!needsConsultingFor(pid, type, reasons)) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = '<label for="fConsultingFor">Consulting for <span class="req">required</span></label>' +
      '<select id="fConsultingFor" required><option value="">Select</option>' +
      (BRIZZA.consultingFor || []).map((o) => "<option>" + esc(o) + "</option>").join("") + "</select>";
  }

  function updateConsultWarn() {
    const p = patient($("#fPatient").value);
    const type = $("#fType").value;
    const el = $("#cfWarn");
    if (p && isNewPatient(p) && type !== "Consultation" && type !== "Consult") {
      el.innerHTML = '<div class="notice">Consultation-first check: this patient has no completed appointment or treatment. New patients follow a consultation-first process. You can still save this booking.</div>';
    } else el.innerHTML = "";
  }

  function saveAppt() {
    const reasons = $$('input[name="reason"]:checked').map((x) => x.value);
    const pid = $("#fPatient") ? $("#fPatient").value : "";
    const p = patient(pid);
    const type = $("#fType") ? $("#fType").value : "";
    const date = $("#fDate") ? $("#fDate").value : "";
    const time = $("#fTime") ? $("#fTime").value : "";
    const provider = $("#fProvider") ? $("#fProvider").value : "";
    const room = $("#fRoom") ? $("#fRoom").value : "";
    const locationId = $("#fLocation") ? $("#fLocation").value : "";
    const consultingFor = $("#fConsultingFor") ? $("#fConsultingFor").value : "";
    const missing = [];
    if (!pid) missing.push("Patient");
    if (!type) missing.push("Appointment type");
    if (!locationId) missing.push("Location");
    if (!date) missing.push("Date");
    else if (isWeekend(date)) missing.push("Date must be Monday–Friday");
    if (!time) missing.push("Start time");
    if (!provider) missing.push("Primary provider");
    if (needsConsultingFor(pid, type, reasons) && !consultingFor) missing.push("Consulting for");
    const hits = overlappingBlocks(date, time, type, reasons, provider);
    const override = $("#fOverride") ? $("#fOverride").value.trim() : "";
    if (hits.length && !override) missing.push("Admin override reason");
    if (missing.length) {
      const w = $("#bookWarn");
      if (w) w.innerHTML = '<div class="notice">Required fields missing: ' + missing.map(esc).join(", ") + ".</div>";
      toast("Required fields missing");
      return;
    }
    const id = nextId("A-", store.appointments);
    const history = ["Scheduled"];
    const cf = p && isNewPatient(p) && type !== "Consultation" && type !== "Consult";
    if (cf) history.push("Consultation-first check noted · " + nowET());
    if (!reasons.length) history.push("Reason required before Confirmed · " + nowET());
    const mins = durationMinutes(type, reasons);
    const rec = { id: id, time: time, patientId: pid, type: type, reasons: reasons, provider: provider, durationLabel: durationLabelFor(type, reasons), durationMinutes: mins, status: "Scheduled", consultation: "", treatment: "", room: room, date: date, locationId: locationId, consultingFor: consultingFor || "", history: history, blockOverride: override || "", statusSince: nowMs() };
    if (state.reschedulingId) rec.replaces = state.reschedulingId;
    if (cf) rec.consultFirstFlag = true;
    store.appointments.push(rec);
    addAudit({ action: "Scheduled appointment", recordType: "Appointment", recordId: id,
      recordPath: { page: "schedule", date: date, appointmentId: id, view: state.scheduleView, calMode: state.calMode },
      changes: [
        { field: "status", before: "—", after: "Scheduled" },
        { field: "type", before: "—", after: type },
        { field: "location", before: "—", after: locationId },
        { field: "date", before: "—", after: date + " " + time }
      ].concat(consultingFor ? [{ field: "consultingFor", before: "—", after: consultingFor }] : [])
       .concat(override ? [{ field: "adminOverride", before: "—", after: override }, { field: "overlappedBlocks", before: "—", after: hits.map((b) => b.id || b.reason).join(", ") }] : []) });
    if (override) {
      history.push("Admin override over Admin block · " + override + " · " + nowET());
      rec.history = history;
    }
    if (state.reschedulingId) {
      const old = appt(state.reschedulingId);
      if (old) {
        old.status = "Rescheduled";
        old.rescheduledTo = id;
        old.history.push("Replacement " + id + " created · " + nowET());
        addAudit({ action: "Rescheduled appointment", recordType: "Appointment", recordId: old.id,
          recordPath: { page: "schedule", date: old.date, appointmentId: old.id, view: "list" },
          changes: [
            { field: "status", before: "Scheduled", after: "Rescheduled" },
            { field: "rescheduledTo", before: "—", after: id }
          ] });
      }
      state.reschedulingId = null;
    }
    closeModal();
    toast(reasons.length ? "Appointment scheduled" : "Appointment scheduled · select a reason before Confirmed");
    state.date = date;
    const next = hashFor({ page: "schedule", date: date, view: state.scheduleView, calMode: state.calMode });
    if (location.hash !== next) go({ page: "schedule", date: date, view: state.scheduleView, calMode: state.calMode });
    else render();
  }

  function openAppointmentModal(id) {
    const a = appt(id);
    if (!a) return;
    state.appointmentId = id;
    const p = patient(a.patientId);
    const hist = timelineHtml("Appointment", a.id);
    const inv = invoiceForAppt(a);
    showModal("Appointment " + a.id + " · " + (p ? p.name : a.patientId), `
      <div class="row"><div><strong>${esc(a.type)} · ${esc(reasonText(a))}</strong>
        <div class="row-sub">${p ? patientLink(p) : ""} · ${esc(a.date)} · ${esc(fmtTime(a.time))} · ${esc(a.provider)} · ${esc(a.durationLabel || durationLabelFor(a.type, a.reasons))}</div></div>${badge(a.status)}</div>
      <div class="field" style="margin-top:14px"><label>Approved reason(s)</label><div id="reasonOptions">${reasonOptionsHtml(a.type, a.reasons || [])}</div></div>
      <div class="field" style="margin-top:12px"><label for="actionStatus">Appointment status</label>
        <select id="actionStatus">${visitStatuses().map((s) => "<option" + (a.status === s ? " selected" : "") + ">" + s + "</option>").join("")}</select></div>
      <div class="field" style="margin-top:12px"><label for="actionConsult">Consultation outcome (independent)</label>
        <select id="actionConsult"><option value="">Not recorded</option>${BRIZZA.consultationOutcomes.map((x) => "<option" + (a.consultation === x ? " selected" : "") + ">" + esc(x) + "</option>").join("")}</select></div>
      <div class="field" style="margin-top:12px"><label for="actionTreatment">Treatment status (independent)</label>
        <select id="actionTreatment"><option value="">No treatment record</option>${BRIZZA.treatmentStatuses.map((x) => "<option" + (a.treatment === x ? " selected" : "") + ">" + esc(x) + "</option>").join("")}</select></div>
      <div class="row"><span>Invoice status</span>${inv ? invoiceBadge(a) : '<span class="row-sub">No invoice</span>'}</div>
      <div class="notice">Payment and invoice status stay independent of visit status.</div>${openQ("This merged visit-status list supersedes the earlier independent appointment, consultation, and treatment status design (DB decisions), pending a database update (Open question 23).")}
      ${optionalIdea("A non-blocking warning could appear when moving to Completed while the linked invoice is not Paid. This is undecided and is not required.")}
      <div id="statusWarn"></div>
      <div class="actions" style="margin-top:12px">
        ${p ? createNoteButton(p.id, a.id) : ""}
        <a class="btn small" href="${a.invoiceId ? hashFor({ page: "pos", invoiceId: a.invoiceId, posTab: "invoice" }) : hashFor({ page: "pos", appointmentId: a.id, posTab: "invoice" })}">Invoice</a>
        <button class="btn small" type="button" data-reschedule="${a.id}">Reschedule (retain history)</button>
      </div>
      <h3 class="section-title" style="margin-top:16px">Status history</h3>
      <div class="timeline">${hist}</div>
    `, function () { saveAppointmentActions(a); });
  }

  function saveAppointmentActions(a) {
    const reasons = $$('input[name="reason"]:checked').map((x) => x.value);
    const next = $("#actionStatus").value;
    if (NEEDS_REASON.has(next) && !reasons.length) {
      $("#statusWarn").innerHTML = '<div class="notice">Select at least one approved reason before ' + esc(next) + ".</div>";
      toast("Select a reason before " + next);
      return;
    }
    if (reasons.join() !== (a.reasons || []).join()) {
      const before = reasonText(a);
      const after = reasons.join(", ") || "(none)";
      a.history.push("Reasons: " + before + " → " + after + " · " + nowET());
      addAudit({ action: "Updated appointment reasons", recordType: "Appointment", recordId: a.id,
        recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: "list" },
        changes: [{ field: "reasons", before: before, after: after }] });
      a.reasons = reasons;
    }
    if (next !== a.status) setVisitStatus(a.id, next, { silent: true });
    const consult = $("#actionConsult").value;
    const treat = $("#actionTreatment").value;
    if (consult !== a.consultation) {
      addAudit({ action: "Updated consultation outcome", recordType: "Appointment", recordId: a.id,
        recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: "list" },
        changes: [{ field: "consultation", before: a.consultation || "Not recorded", after: consult || "Not recorded" }] });
    }
    if (treat !== a.treatment) {
      addAudit({ action: "Updated treatment status", recordType: "Appointment", recordId: a.id,
        recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: "list" },
        changes: [{ field: "treatment", before: a.treatment || "Not recorded", after: treat || "Not recorded" }] });
    }
    a.status = next;
    a.consultation = consult;
    a.treatment = treat;
    closeModal();
    toast("Appointment history recorded");
    render();
  }

  function startReschedule(id) {
    const old = appt(id);
    state.reschedulingId = id;
    closeModal();
    openBook(old.patientId);
    $("#fType").value = old.type;
    $("#reasonOptions").innerHTML = reasonOptionsHtml(old.type, old.reasons || []);
    $("#fProvider").value = old.provider;
    toast("Prior appointment will be retained as Rescheduled when you save a new time");
  }

  function openNewPatient() {
    showModal("New patient", `
      <div class="formgrid">
        <div class="field"><label for="npName">Name</label><input id="npName" required></div>
        <div class="field"><label for="npDob">Date of birth</label><input id="npDob" type="date" required></div>
        <div class="field"><label for="npPhone">Phone</label><input id="npPhone"></div>
        <div class="field"><label for="npEmail">Email</label><input id="npEmail"></div>
        <div class="field"><label for="npSex">Sex</label><select id="npSex"><option>Female</option><option>Male</option><option>Unspecified</option></select></div>
      </div>`, function () {
      const name = $("#npName").value.trim();
      if (!name || !$("#npDob").value) { toast("Name and date of birth are required"); return; }
      if (store.patients.some((p) => p.name.toLowerCase() === name.toLowerCase())) { toast("A patient with that name already exists"); return; }
      const id = "BRZ" + String(store.patients.length + 1).padStart(4, "0");
      store.patients.push({ id: id, name: name, dob: $("#npDob").value, sex: $("#npSex").value, phone: $("#npPhone").value || "—", email: $("#npEmail").value || "—", status: "Active", allergies: [], meds: [], conditions: [], notes: [], consents: { clinical: "Not yet recorded", marketing: "Not authorized" }, photos: [], documents: [], treatments: [], followups: [], demoHistory: [], registration: { idUploaded: { status: "Not uploaded", date: null }, formsCompleted: { status: "Not completed", date: null }, demographicsConfirmed: { status: "Not confirmed", date: null } } });
      addAudit({ action: "Created patient record", recordType: "Patient", recordId: id,
        recordPath: { page: "patients", selected: id, tab: "demographics" },
        changes: [{ field: "status", before: "—", after: "Active" }, { field: "name", before: "—", after: name }] });
      closeModal();
      toast("Patient " + id + " created");
      go({ page: "patients", selected: id, tab: "demographics" });
    });
  }

  function openEdit(pid) {
    const p = patient(pid);
    showModal("Edit chart", `
      <div class="formgrid">
        <div class="field"><label>Patient number</label><input value="${esc(p.id)}" disabled></div>
        <div class="field"><label>Name</label><input value="${esc(p.name)}" disabled></div>
        <div class="field"><label for="edPhone">Phone</label><input id="edPhone" value="${esc(p.phone)}"></div>
        <div class="field"><label for="edEmail">Email</label><input id="edEmail" value="${esc(p.email)}"></div>
      </div>
      <div class="notice">Demographic changes are audit-tracked. The patient number cannot be changed.</div>`, function () {
      const phone = $("#edPhone").value, email = $("#edEmail").value;
      const changes = [];
      if (phone !== p.phone) {
        p.demoHistory.push("Phone " + p.phone + " → " + phone + " · " + nowET());
        changes.push({ field: "phone", before: p.phone, after: phone });
      }
      if (email !== p.email) {
        p.demoHistory.push("Email " + p.email + " → " + email + " · " + nowET());
        changes.push({ field: "email", before: p.email, after: email });
      }
      if (changes.length) {
        addAudit({ action: "Updated demographics", recordType: "Patient", recordId: p.id,
          recordPath: { page: "patients", selected: p.id, tab: "demographics" }, changes: changes });
      }
      p.phone = phone; p.email = email;
      closeModal(); toast("Demographic edits are audit-tracked"); render();
    });
  }

  function openFollowup(pid) {
    showModal("Add follow-up", `
      <div class="formgrid">
        <div class="field full"><label for="fuText">Task</label><input id="fuText" required></div>
        <div class="field"><label for="fuDue">Due date</label><input id="fuDue" type="date" value="${esc(state.date)}"></div>
      </div>`, function () {
      const p = patient(pid);
      const text = $("#fuText").value.trim();
      if (!text) { toast("Enter a follow-up task"); return; }
      p.followups.push({ id: nextId("F-", p.followups), text: text, due: $("#fuDue").value });
      closeModal(); toast("Follow-up task recorded"); render();
    });
  }

  function openNote(pid, visitId) {
    const p = patient(pid);
    showModal("New clinical note", `
      <div class="formgrid">
        <div class="field"><label>Patient</label><input value="${esc(p.name)}" disabled></div>
        <div class="field"><label>Note type</label><input value="Consultation" disabled></div>
        <div class="field"><label for="noteProc">Procedure performed</label>
          <select id="noteProc"><option value="No">No</option><option value="Yes">Yes</option></select></div>
        <div class="field"><label for="noteStatus">Note status</label>
          <select id="noteStatus"><option>Draft</option><option>Ready for review</option></select></div>
        <div class="field full"><label for="noteText">Note</label>
          <textarea id="noteText" placeholder="Document consultation findings, treatment details, consent, or aftercare"></textarea></div>
      </div>
      ${openQ("Draft / Ready for review is carried from the prior prototype and is not an approved note-status catalog.")}`, function () {
      const status = $("#noteStatus").value;
      p.notes.unshift({ id: nextId("N-", p.notes), date: new Date().toISOString().slice(0, 10), type: "Consultation", procedurePerformed: $("#noteProc").value, provider: "Alex Morgan", status: status, text: $("#noteText").value || "Draft note started.", visitId: visitId || undefined });
      if (visitId) {
        const v = visit(visitId);
        if (v) v.noteId = p.notes[0].id;
      }
      closeModal(); toast("Note saved as " + status); render();
    });
  }

  function recordPayment(invId) {
    const inv = invoice(invId);
    if (!inv) return;
    const status = ($("#pay-status") && $("#pay-status").value) || "Paid";
    const prev = inv.status;
    const t = invoiceTotals(inv);
    let amt = null;
    const raw = $("#pay-amount") && $("#pay-amount").value;
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") amt = Number(raw);
    else if (status === "Paid" && t.balance != null && !t.tbd) amt = t.balance;
    const pay = { id: nextId("PAY-", inv.payments || []), method: "Card (processor reference only)", status: status, recorded: nowET(), amount: (amt != null && !Number.isNaN(amt) ? amt : undefined) };
    inv.payments = inv.payments || [];
    inv.payments.push(pay);
    if (status === "Refunded") inv.status = "Refunded";
    else if (status === "Voided") inv.status = "Voided";
    else if (status === "Unpaid") inv.status = "Issued";
    refreshInvoiceBalance(inv);
    if (status === "Paid" && (typeof inv.balance !== "number" || inv.balance <= 0)) { inv.status = "Paid"; if (typeof inv.balance !== "number") inv.balance = "None"; }
    addDocument(inv.patientId, { category: "Payment", title: "Receipt · " + pay.id + " · " + inv.id, date: todayET(), relatedId: pay.id, invoiceId: inv.id, kind: "receipt" });
    addAudit({ action: "Recorded payment " + status, recordType: "Invoice", recordId: inv.id,
      recordPath: { page: "pos", invoiceId: inv.id },
      changes: [{ field: "payment status", before: "—", after: status }, { field: "invoice status", before: prev, after: inv.status }, { field: "amount", before: "—", after: amt != null ? money(amt) : "TBD" }] });
    toast("Payment recorded as " + status + (amt != null ? " · " + money(amt) : "") + " · receipt saved");
    if ($("#modal") && $("#modal").classList.contains("pos-mode")) {
      const apId = (inv.appointmentIds || [])[0] || state.posAppointmentId;
      if (apId) openPosPopup(apId);
      else render();
    } else render();
  }

  function finalizeInvoice(invId) {
    const inv = invoice(invId);
    if (!inv) return;
    if (inv.finalized) { toast("Already finalized"); return; }
    const movs = postUsageToLots(inv);
    inv.movements = (inv.movements || []).concat(movs.map(function (m) { return { lotId: m.lotId, product: m.product, type: m.type, posted: m.when, qty: m.qty }; }));
    inv.finalized = true;
    inv.finalizedAt = nowET();
    if (inv.status === "Draft") inv.status = "Issued";
    refreshInvoiceBalance(inv);
    const lotIds = movs.map((m) => m.lotId).join(", ") || "—";
    addAudit({ action: "Finalized invoice and posted inventory", recordType: "Invoice", recordId: inv.id,
      recordPath: { page: "pos", invoiceId: inv.id },
      changes: [
        { field: "finalized", before: "No", after: "Yes" },
        { field: "inventory movement", before: "None", after: lotIds }
      ] });
    addAudit({ action: "Inventory posted from invoice finalization", recordType: "Inventory", recordId: inv.id,
      recordPath: { page: "inventory", invTab: "trace" },
      changes: [{ field: "lots", before: "—", after: lotIds }] });
    toast(movs.length ? "Invoice finalized · inventory posted from " + lotIds : "Invoice finalized · no lot posted");
    if ($("#modal") && $("#modal").classList.contains("pos-mode")) openPosPopup((inv.appointmentIds || [])[0] || state.posAppointmentId);
    else render();
  }

  function paintDemoPanel() {
    const steps = BRIZZA.DEMO_STEPS;
    const panel = $("#demo-panel");
    if (!panel || !state.demo.running) return;
    if (state.demo.index >= steps.length) {
      panel.classList.add("open");
      panel.innerHTML = '<h2>Demo complete</h2><p class="demo-caption">This is an interactive mockup with synthetic records, not a production EMR.</p><button class="btn small" data-demo="close">Close</button>';
      return;
    }
    const step = steps[state.demo.index];
    panel.classList.add("open");
    panel.innerHTML = "<h2>Demo " + (state.demo.index + 1) + " / " + steps.length + " · " + esc(step.title) + '</h2><p class="demo-caption">' + esc(step.caption) + '</p><div class="demo-meta">Decisions: ' + esc(step.decisions) + ' · Synthetic prototype</div><div class="actions" style="margin-top:10px"><button class="btn small" data-demo="back"' + (state.demo.index === 0 ? " disabled" : "") + '>Back</button> <button class="btn small primary" data-demo="next">Next</button> <button class="btn small" data-demo="close">Stop demo</button></div>';
  }

  function posTabs(active) {
    return '<div class="pos-tabs" role="tablist"><a href="' + hashFor({ page: "pos", posTab: "invoice", invoiceId: state.invoiceId }) + '" class="' + (active !== "quotes" ? "active" : "") + '">Invoice</a><a href="' + hashFor({ page: "pos", posTab: "quotes" }) + '" class="' + (active === "quotes" ? "active" : "") + '">Quotes</a></div>';
  }
  function lineHtml(l) {
    const conceptMark = l.kind === "membership" ? " " + concept("Memberships are deferred in the DB design.") : "";
    const amt = lineAmount(l);
    const qty = l.qty == null || l.qty === "" ? "qty blank" : ("qty " + l.qty);
    const unit = l.unitPrice == null ? "TBD" : money(l.unitPrice) + (l.unit ? "/" + l.unit : "");
    return '<div class="row"><div><span class="line-kind">' + esc(l.kind || "service") + '</span><div class="row-title">' + esc(l.name || l.service || "") + '</div><div class="row-sub">' + esc(qty) + ' · ' + esc(unit) + '</div></div><span>' + (amt == null ? "TBD" : money(amt)) + "</span>" + conceptMark + "</div>";
  }
  function renderPOS() {
    if (state.posTab === "quotes" || state.quoteId) { renderQuotes(); return; }
    const ap = state.posAppointmentId ? appt(state.posAppointmentId) : (state.appointmentId ? appt(state.appointmentId) : null);
    let inv = state.invoiceId ? invoice(state.invoiceId) : (ap ? invoiceForAppt(ap) : null);
    if (!inv && !ap) inv = invoice("INV-1003") || store.invoices[0];
    const p = inv ? patient(inv.patientId) : (ap ? patient(ap.patientId) : null);
    const head = pageHead("Point of Sale", inv ? inv.id : "New invoice", p ? patientLink(p) + " · " + esc(p.id) : "", "");
    const apptLinks = ((inv && inv.appointmentIds) || (ap ? [ap.id] : [])).map((id) => {
      const a = appt(id);
      return a ? '<a href="' + hashFor({ page: "schedule", date: a.date, appointmentId: a.id }) + '">' + esc(id) + " · " + esc(fmtTime(a.time)) + "</a>" : esc(id);
    }).join(" · ");
    const lines = ((inv && inv.lines) || []).map(lineHtml).join("") || '<div class="empty">No lines</div>';
    const payments = inv ? (inv.payments || []).map((pay) => '<div class="row"><div><div class="row-title">' + esc(pay.id) + " · " + esc(pay.method) + '</div><div class="row-sub">' + esc(pay.recorded) + "</div></div>" + badge(pay.status) + "</div>").join("") : "";
    const templates = (BRIZZA.QUOTE_TEMPLATES || []).map((tpl) => '<option value="' + esc(tpl.id) + '">' + esc(tpl.name) + "</option>").join("");
    const kinds = (BRIZZA.POS_LINE_KINDS || []).map((k) => "<option>" + esc(k) + "</option>").join("");
    const body = posTabs("invoice") +
      concept("Nicole-given prices are used when a quantity is entered. Other items stay TBD. Invoice and payment statuses stay independent of appointment status.") +
      '<div class="grid"><div class="card"><div class="cardhead"><h2>Invoice</h2>' + (inv ? badge(inv.status) : "") + '</div><div class="cardbody">' +
      (inv ? '<div class="row"><span>Linked appointments</span><span>' + apptLinks + "</span></div>" + posLineEditor(inv) + '<h3 class="section-title">Payment records</h3>' + (payments || '<div class="empty">No payment recorded</div>') : '<div class="empty">No invoice yet for this appointment.</div>') +
      "</div></div><div class=\"card\"><div class=\"cardhead\"><h2>Quote for the room</h2></div><div class=\"cardbody\">" +
      openQ("The after-consult quote-to-room workflow is a prototype of the coordinator / clinician handoff (Open question 20).") +
      '<div class="field"><label for="quoteTpl">Quote template</label><select id="quoteTpl">' + templates + '</select></div>' +
      '<button class="btn primary" type="button" data-pos="new-quote" data-pid="' + esc((p && p.id) || "") + '" data-appt="' + esc((ap && ap.id) || (inv && inv.appointmentIds && inv.appointmentIds[0]) || "") + '">Save quote from template</button>' +
      '<p class="row-sub">A saved quote can collect a prepayment, or convert to a same-day or return-visit invoice.</p>' +
      "</div></div></div>";
    renderChrome('<a href="' + hashFor({ page: "pos" }) + '">Point of Sale</a>' + (inv ? " / " + esc(inv.id) : ""), head, body);
  }
  function renderQuotes() {
    const qid = state.quoteId;
    if (qid) { renderQuoteDetail(qid); return; }
    const head = pageHead("Point of Sale", "Quotes", "Statuses: Open, Prepaid, Converted, Expired.", "");
    const rows = (store.quotes || []).map((q) => {
      const p = patient(q.patientId);
      return '<a class="row" href="' + hashFor({ page: "pos", posTab: "quotes", quoteId: q.id }) + '"><div><div class="row-title">' + esc(q.name) + " · " + (p ? p.name : q.patientId) + '</div><div class="row-sub">' + esc(q.id) + " · " + esc(q.created) + '</div></div>' + badge(q.status) + "</a>";
    }).join("") || '<div class="empty">No quotes</div>';
    renderChrome('<a href="' + hashFor({ page: "pos", posTab: "quotes" }) + '">Quotes</a>', head, posTabs("quotes") + '<div class="card"><div class="cardbody">' + rows + "</div></div>");
  }
  function renderQuoteDetail(id) {
    const q = (store.quotes || []).find((x) => x.id === id);
    if (!q) { renderChrome("Quotes", pageHead("", "Quote not found", "", ""), ""); return; }
    const p = patient(q.patientId);
    const a = q.appointmentId ? appt(q.appointmentId) : null;
    const head = pageHead("Quote", q.name, (p ? patientLink(p) : "") + " · " + esc(q.id), badge(q.status));
    const body = posTabs("quotes") +
      '<div class="card"><div class="cardbody">' +
      (q.broughtToRoom ? '<div class="notice">Brought to the room' + (q.broughtAt ? " · " + esc(q.broughtAt) : "") + ".</div>" : "") +
      q.lines.map(lineHtml).join("") +
      '<p class="row-sub">Prices are per unit or vial when known. Quantity stays blank until entered. Total: ' + esc(invoiceTotals({ lines: q.lines }).label) + '</p>' +
      (a ? '<div class="row"><span>From appointment</span><a href="' + hashFor({ page: "schedule", date: a.date, appointmentId: a.id }) + '">' + esc(a.id) + " · " + esc(fmtTime(a.time)) + "</a></div>" : "") +
      (q.invoiceId ? '<div class="row"><span>Invoice</span><a href="' + hashFor({ page: "pos", invoiceId: q.invoiceId, posTab: "invoice" }) + '">' + esc(q.invoiceId) + "</a></div>" : "") +
      '<div class="actions" style="margin-top:14px">' +
      (!q.broughtToRoom && q.status === "Open" ? '<button class="btn" type="button" data-pos="bring" data-quote="' + q.id + '">Bring quote to room</button>' : "") +
      (q.status === "Open" || q.status === "Prepaid" ? '<button class="btn" type="button" data-pos="prepay" data-quote="' + q.id + '">Collect prepayment</button>' : "") +
      (q.status === "Open" || q.status === "Prepaid" ? '<button class="btn primary" type="button" data-pos="treat-today" data-quote="' + q.id + '">Treat today</button>' : "") +
      (q.status === "Open" || q.status === "Prepaid" ? '<button class="btn" type="button" data-pos="return" data-quote="' + q.id + '">Return</button>' : "") +
      "</div>" +
      openQ("Treat today converts the quote to a same-day invoice. Return books a return visit or leaves the quote open (Open question 20).") +
      "</div></div>";
    renderChrome('<a href="' + hashFor({ page: "pos", posTab: "quotes" }) + '">Quotes</a> / ' + esc(q.id), head, body);
  }
  function saveQuoteFromTemplate(pid, apptId, templateId) {
    const tpl = (BRIZZA.QUOTE_TEMPLATES || []).find((t) => t.id === templateId) || (BRIZZA.QUOTE_TEMPLATES || [])[0];
    if (!tpl || !pid) { toast("Select a patient and a template"); return; }
    store.quotes = store.quotes || [];
    const id = nextId("Q-", store.quotes);
    const rec = { id: id, patientId: pid, appointmentId: apptId || null, templateId: tpl.id, name: tpl.name, status: "Open",
      lines: tpl.lines.map((l) => Object.assign({}, l, { amount: "TBD" })), created: todayET(), broughtToRoom: false, invoiceId: null };
    store.quotes.push(rec);
    addDocument(pid, { category: "Quotes", title: "Quote · " + rec.name + " · " + rec.id, date: rec.created, relatedId: rec.id, kind: "quote" });
    addAudit({ action: "Saved quote", recordType: "Quote", recordId: id,
      recordPath: { page: "pos", posTab: "quotes", quoteId: id },
      changes: [{ field: "status", before: "—", after: "Open" }, { field: "template", before: "—", after: tpl.name }] });
    toast("Quote saved");
    go({ page: "pos", posTab: "quotes", quoteId: id });
  }
  function quoteById(id) { return (store.quotes || []).find((q) => q.id === id); }
  function bringQuote(id) {
    const q = quoteById(id); if (!q) return;
    q.broughtToRoom = true; q.broughtAt = nowET();
    addAudit({ action: "Brought quote to room", recordType: "Quote", recordId: id,
      recordPath: { page: "pos", posTab: "quotes", quoteId: id },
      changes: [{ field: "broughtToRoom", before: "No", after: "Yes" }] });
    toast("Quote brought to the room");
    render();
  }
  function prepayQuote(id) {
    const q = quoteById(id); if (!q) return;
    const before = q.status;
    q.status = "Prepaid";
    q.lines.push({ kind: "prepayment", name: "Prepayment on quote " + q.id, amount: "TBD" });
    addAudit({ action: "Collected prepayment on quote", recordType: "Quote", recordId: id,
      recordPath: { page: "pos", posTab: "quotes", quoteId: id },
      changes: [{ field: "status", before: before, after: "Prepaid" }, { field: "amount", before: "—", after: "TBD" }] });
    toast("Prepayment recorded (amount TBD)");
    render();
  }
  function convertQuoteToInvoice(id, visitKind) {
    const q = quoteById(id); if (!q) return;
    const before = q.status;
    const invId = nextId("INV-", store.invoices);
    const a = q.appointmentId ? appt(q.appointmentId) : null;
    const inv = { id: invId, patientId: q.patientId, visitId: a ? a.visitId : null, appointmentIds: q.appointmentId ? [q.appointmentId] : [],
      status: "Issued", balance: "Outstanding (amount TBD)",
      lines: q.lines.map((l) => ({ kind: l.kind, name: l.name, amount: "TBD" })),
      payments: q.status === "Prepaid" ? [{ id: nextId("PAY-", [{id:"PAY-1000"}]), method: "Prepayment applied (amount TBD)", status: "Partially Paid", recorded: todayET() }] : [],
      finalized: false, finalizedAt: null, movements: [], fromQuoteId: q.id, visitKind: visitKind };
    store.invoices.push(inv);
    if (a) a.invoiceId = invId;
    q.status = "Converted"; q.invoiceId = invId; q.visitKind = visitKind;
    addAudit({ action: visitKind === "same-day" ? "Converted quote to same-day invoice" : "Converted quote to return-visit invoice",
      recordType: "Quote", recordId: id,
      recordPath: { page: "pos", invoiceId: invId, posTab: "invoice" },
      changes: [{ field: "status", before: before, after: "Converted" }, { field: "invoice", before: "—", after: invId }] });
    toast("Quote converted · " + invId);
    go({ page: "pos", invoiceId: invId, posTab: "invoice" });
  }
  function returnQuote(id) {
    const q = quoteById(id); if (!q) return;
    showModal("Return visit",
      '<p>Keep the quote open, or convert it to a return-visit invoice and schedule a follow-up.</p>' +
      '<div class="actions" style="margin-top:12px"><button class="btn" type="button" data-pos="keep-open" data-quote="' + q.id + '">Keep quote open</button>' +
      '<button class="btn primary" type="button" data-pos="return-invoice" data-quote="' + q.id + '">Return-visit invoice</button></div>',
      function () { closeModal(); });
  }
  function keepQuoteOpen(id) {
    const q = quoteById(id); if (!q) return;
    addAudit({ action: "Return: kept quote open", recordType: "Quote", recordId: id,
      recordPath: { page: "pos", posTab: "quotes", quoteId: id },
      changes: [{ field: "status", before: q.status, after: q.status }] });
    closeModal();
    toast("Quote kept open");
    render();
  }
  function returnInvoice(id) {
    const q = quoteById(id); if (!q) return;
    closeModal();
    convertQuoteToInvoice(id, "return");
    const p = patient(q.patientId);
    openBook(p && p.id, { date: state.date, provider: slotProvider(), type: "Follow-up" });
  }
  function addPosLine() {
    const inv = invoice(state.invoiceId);
    if (!inv || inv.finalized) return;
    const kind = ($("#posKind") && $("#posKind").value) || "service";
    const name = ($("#posLineName") && $("#posLineName").value.trim()) || kind;
    inv.lines.push({ kind: kind, name: name, amount: "TBD" });
    addAudit({ action: "Added POS line", recordType: "Invoice", recordId: inv.id,
      recordPath: { page: "pos", invoiceId: inv.id, posTab: "invoice" },
      changes: [{ field: "line", before: "—", after: kind + " · " + name + " · TBD" }] });
    toast("Line added · Amount TBD");
    render();
  }

  function buffersNote() {
    return '<div class="notice">Lengths are in minutes and include buffers.</div>';
  }
  function renderTypes() {
    const rows = typesList().map((tp, i) => {
      const attached = (tp.reasonIds || []).map((id) => { const r = reasonsList().find((x) => x.id === id); return r ? r.name : id; }).join(", ");
      const draft = tp.confirmDraft ? ' <span class="badge">Draft confirmation name – Open question</span>' : "";
      return "<tr><td><input data-type-field=\"name\" data-i=\"" + i + "\" value=\"" + esc(tp.name) + "\"></td>" +
        "<td><input data-type-field=\"minutes\" data-i=\"" + i + "\" type=\"number\" min=\"1\" value=\"" + esc(tp.minutes) + "\"></td>" +
        "<td><input data-type-field=\"confirmName\" data-i=\"" + i + "\" value=\"" + esc(tp.confirmName || tp.name) + "\">" + draft + "</td>" +
        "<td class=\"row-sub\">" + esc(attached) + "</td></tr>";
    }).join("");
    const head = pageHead("Admin", "Appointment Types", "Editable in this session only.", '<button class="btn primary" type="button" data-admin="save-types">Save types</button>');
    const body = buffersNote() + openQ("Friendly confirmation names were not provided; plain names are shown and labeled draft (Open question 21).") +
      '<table class="table admin-table"><thead><tr><th>Type</th><th>Length (min)</th><th>Friendly confirmation name</th><th>Attached reasons</th></tr></thead><tbody>' + rows + "</tbody></table>";
    renderChrome('<a href="' + hashFor({ page: "types" }) + '">Appointment Types</a>', head, body);
  }
  function renderReasons() {
    const rows = reasonsList().map((r, i) => {
      const override = r.minutes != null ? String(r.minutes) : "";
      return "<tr><td><input data-reason-field=\"name\" data-i=\"" + i + "\" value=\"" + esc(r.name) + "\"></td>" +
        "<td><input data-reason-field=\"minutes\" data-i=\"" + i + "\" type=\"number\" min=\"1\" placeholder=\"Type default\" value=\"" + esc(override) + "\"></td></tr>";
    }).join("");
    const head = pageHead("Admin", "Appointment Reasons", "A reason may optionally override the type length. Booking uses the reason length when set, otherwise the type length.", '<button class="btn primary" type="button" data-admin="save-reasons">Save reasons</button>');
    const body = buffersNote() +
      '<table class="table admin-table"><thead><tr><th>Reason</th><th>Length override (min)</th></tr></thead><tbody>' + rows + "</tbody></table>";
    renderChrome('<a href="' + hashFor({ page: "reasons" }) + '">Appointment Reasons</a>', head, body);
  }
  function saveTypes() {
    $$("[data-type-field]").forEach((el) => {
      const i = Number(el.getAttribute("data-i"));
      const f = el.getAttribute("data-type-field");
      if (!store.appointmentTypes[i]) return;
      store.appointmentTypes[i][f] = f === "minutes" ? Number(el.value) : el.value;
    });
    addAudit({ action: "Updated appointment types", recordType: "Configuration", recordId: "appointment-types",
      recordPath: { page: "types" }, changes: [{ field: "types", before: "prior in-memory values", after: "updated in this session" }] });
    toast("Types saved in memory");
    render();
  }
  function saveReasons() {
    $$("[data-reason-field]").forEach((el) => {
      const i = Number(el.getAttribute("data-i"));
      const f = el.getAttribute("data-reason-field");
      if (!store.appointmentReasons[i]) return;
      if (f === "minutes") store.appointmentReasons[i].minutes = el.value === "" ? null : Number(el.value);
      else store.appointmentReasons[i][f] = el.value;
    });
    addAudit({ action: "Updated appointment reasons", recordType: "Configuration", recordId: "appointment-reasons",
      recordPath: { page: "reasons" }, changes: [{ field: "reasons", before: "prior in-memory values", after: "updated in this session" }] });
    toast("Reasons saved in memory");
    render();
  }

  function openNoteView(pid, nid) {
    const p = patient(pid);
    const n = p && (p.notes || []).find((x) => x.id === nid);
    if (!n) return;
    const lock = n.locked ? badge("Locked") : "";
    showModal(esc(n.type || "Note") + " · " + (p ? p.name : pid),
      lock + " " + badge(n.status || "Draft") +
      '<div class="row-sub">' + esc(n.provider || "") + (n.signedAt ? " · Signed " + esc(n.signedAt) : "") + "</div>" +
      "<p>" + esc(n.text || "") + "</p>" +
      historyDiffHtml(n.historySnapshot, p) +
      openQ("Draft templates – Open question. These six note templates are not taken from the SOPs or V1 documents (Open question 17)."),
      function () { closeModal(); }, "Close");
  }


  function render() {
    if (state.page !== "rooming") stopRoomingTick();
    if (state.page === "schedule") renderSchedule();
    else if (state.page === "queue") renderQueue();
    else if (state.page === "configuration") renderSettings();
    else if (state.page === "types") renderTypes();
    else if (state.page === "reasons") renderReasons();
    else if (state.page === "visit") renderVisit();
    else if (state.page === "checkout" || state.page === "pos") renderPOS();
    else if (state.page === "audit") renderAudit();
    else if (state.page === "rooming") renderRooming();
    else if (state.page === "inventory") renderInventory();
    else renderPatients();
    if (state.demo.running) paintDemoPanel();
    bindStatusStops();
  }

  function onClick(e) {
    if (e.target.closest(".status-dd, [data-visit-status], [data-toggle-paperwork], .audit-icon")) {
      if (e.target.closest("[data-toggle-paperwork]") && e.target.closest("[data-toggle-paperwork]").contains(e.target)) {
        /* handled below */
      } else {
        e.stopPropagation();
      }
    }
    const paper = e.target.closest("[data-toggle-paperwork]");
    if (paper) {
      e.preventDefault();
      e.stopPropagation();
      const a = appt(paper.getAttribute("data-toggle-paperwork"));
      if (a && a.status === "Checked in") {
        const before = a.paperwork ? "Yes" : "No";
        a.paperwork = !a.paperwork;
        addAudit({ action: "Toggled completing paperwork", recordType: "Appointment", recordId: a.id,
          recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: state.scheduleView },
          changes: [{ field: "paperwork", before: before, after: a.paperwork ? "Yes" : "No" }] });
        render();
      }
      return;
    }
    const hist = e.target.closest("[data-history-type]");
    if (hist) {
      e.preventDefault();
      e.stopPropagation();
      openHistoryPop(hist.getAttribute("data-history-type"), hist.getAttribute("data-history-id"));
      return;
    }
    const wlF = e.target.closest("[data-wl-filter]");
    if (wlF) {
      e.preventDefault();
      const key = wlF.getAttribute("data-wl-filter");
      if (key === "all") state.worklistFilters = [];
      else {
        const cur = state.worklistFilters || [];
        state.worklistFilters = cur.indexOf(key) >= 0 ? cur.filter((k) => k !== key) : cur.concat([key]);
      }
      render();
      return;
    }
    const posOpen = e.target.closest("[data-open-pos]");
    if (posOpen) {
      e.preventDefault();
      e.stopPropagation();
      openPosPopup(posOpen.getAttribute("data-open-pos"));
      return;
    }
    const confirmD = e.target.closest("[data-confirm-demo]");
    if (confirmD) {
      e.preventDefault();
      const p = patient(confirmD.getAttribute("data-confirm-demo"));
      if (p) {
        p.registration = p.registration || {};
        const prev = (p.registration.demographicsConfirmed && p.registration.demographicsConfirmed.status) || "Not confirmed";
        p.registration.demographicsConfirmed = { status: "Confirmed", date: todayET() };
        addAudit({ action: "Demographics manually confirmed", recordType: "Patient", recordId: p.id,
          recordPath: { page: "patients", selected: p.id, tab: "demographics" },
          changes: [{ field: "demographics confirmed", before: prev, after: "Confirmed" }] });
        toast("Demographics confirmed");
        render();
      }
      return;
    }
    const pn = e.target.closest("[data-print-note]");
    if (pn) { e.preventDefault(); printNote(pn.getAttribute("data-print-note"), pn.getAttribute("data-nid")); return; }
    const pd = e.target.closest("[data-print-doc]");
    if (pd) { e.preventDefault(); printDoc(pd.getAttribute("data-print-doc"), pd.getAttribute("data-did")); return; }
    const recv = e.target.closest("[data-po-receive]");
    if (recv) { e.preventDefault(); receivePoLine(recv.getAttribute("data-po-receive"), recv.getAttribute("data-product")); return; }
    const ov = e.target.closest("[data-open-vial]");
    if (ov) { e.preventDefault(); openVial(ov.getAttribute("data-open-vial")); return; }
    if (e.target.closest("[data-inv-adjust]")) { e.preventDefault(); recordAdjustment(); return; }
    const addL = e.target.closest("[data-pos-add-line]");
    if (addL) {
      e.preventDefault();
      addCatalogLine(addL.getAttribute("data-pos-add-line"), $("#posCatalog") && $("#posCatalog").value, $("#posQty") && $("#posQty").value);
      const inv = invoice(addL.getAttribute("data-pos-add-line"));
      if ($("#modal") && $("#modal").classList.contains("pos-mode") && inv && inv.appointmentIds && inv.appointmentIds[0]) openPosPopup(inv.appointmentIds[0]);
      else render();
      return;
    }
    const cq = e.target.closest("[data-pos-convert-quote]");
    if (cq) {
      e.preventDefault();
      const qid = $("#posQuote") && $("#posQuote").value;
      const inv = invoice(cq.getAttribute("data-pos-convert-quote"));
      const q = qid && (store.quotes || []).find((x) => x.id === qid);
      if (q && inv) {
        (q.lines || []).forEach(function (l) { inv.lines.push(Object.assign({}, l)); });
        q.status = "Converted"; q.invoiceId = inv.id;
        if ((inv.appointmentIds || [])[0]) q.appointmentId = inv.appointmentIds[0];
        refreshInvoiceBalance(inv);
        addAudit({ action: "Converted quote onto invoice", recordType: "Quote", recordId: q.id,
          recordPath: { page: "pos", invoiceId: inv.id },
          changes: [{ field: "status", before: "Open", after: "Converted" }] });
        toast("Quote converted onto " + inv.id);
        if ($("#modal") && $("#modal").classList.contains("pos-mode")) openPosPopup((inv.appointmentIds || [])[0] || state.posAppointmentId);
        else render();
      }
      return;
    }
    const posEl = e.target.closest("[data-pos]");
    if (posEl) {
      e.preventDefault();
      const act = posEl.dataset.pos;
      const qid = posEl.dataset.quote;
      if (act === "add-line") addPosLine();
      else if (act === "new-quote") saveQuoteFromTemplate(posEl.dataset.pid, posEl.dataset.appt, ($("#quoteTpl") && $("#quoteTpl").value) || "");
      else if (act === "bring") bringQuote(qid);
      else if (act === "prepay") prepayQuote(qid);
      else if (act === "treat-today") convertQuoteToInvoice(qid, "same-day");
      else if (act === "return") returnQuote(qid);
      else if (act === "keep-open") keepQuoteOpen(qid);
      else if (act === "return-invoice") returnInvoice(qid);
      return;
    }
    const adm = e.target.closest("[data-admin]");
    if (adm) {
      e.preventDefault();
      if (adm.dataset.admin === "save-types") saveTypes();
      else if (adm.dataset.admin === "save-reasons") saveReasons();
      return;
    }
    const t = e.target.closest("[data-open],[data-demo],[data-reschedule],[data-record-pay],[data-finalize],[data-expand-reg],[data-room-advance],[data-open-slot]");
    if (!t) {
      const card = e.target.closest("[data-open-appt]");
      if (card && !e.target.closest("select,button,input,a,.status-dd,.audit-icon")) {
        e.preventDefault();
        openAppointmentModal(card.getAttribute("data-open-appt"));
      }
      return;
    }
    if (t.dataset.roomAdvance) {
      e.preventDefault();
      const a = appt(t.dataset.roomAdvance) || store.appointments.find((x) => x.id === t.dataset.roomAdvance);
      const rec = (store.rooming || []).find((r) => r.id === t.dataset.roomAdvance);
      const current = a ? a.status : (rec && rec.status);
      const nxt = nextRoomingStatus(current);
      if (nxt) setVisitStatus((a && a.id) || (rec && rec.appointmentId), nxt);
      return;
    }
    if (t.dataset.expandReg) {
      e.preventDefault();
      state.expandedAppt = state.expandedAppt === t.dataset.expandReg ? null : t.dataset.expandReg;
      render();
      return;
    }
    if (t.dataset.open === "book") { e.preventDefault(); openBook(t.dataset.pid); }
    else if (t.dataset.open === "block") { e.preventDefault(); openAddBlock(); }
    else if (t.dataset.open === "note-composer") { e.preventDefault(); openNoteComposer(t.dataset.pid, t.dataset.appt, t.dataset.visit); }
    else if (t.dataset.open === "note-view") { e.preventDefault(); openNoteView(t.dataset.pid, t.dataset.nid); }
    else if (t.dataset.openSlot) {
      e.preventDefault();
      const parts = t.dataset.openSlot.split("|");
      openBook(state.selected, { date: parts[0], time: parts[1], provider: slotProvider() });
    }
    else if (t.dataset.open === "new-patient") { e.preventDefault(); openNewPatient(); }
    else if (t.dataset.open === "edit") { e.preventDefault(); openEdit(t.dataset.pid); }
    else if (t.dataset.open === "followup") { e.preventDefault(); openFollowup(t.dataset.pid); }
    else if (t.dataset.open === "note") { e.preventDefault(); openNote(t.dataset.pid, t.dataset.visit); }
    else if (t.dataset.reschedule) { e.preventDefault(); startReschedule(t.dataset.reschedule); }
    else if (t.dataset.recordPay) { e.preventDefault(); recordPayment(t.dataset.recordPay); }
    else if (t.dataset.finalize) { e.preventDefault(); finalizeInvoice(t.dataset.finalize); }
    else if (t.dataset.demo === "next") { e.preventDefault(); clearTimeout(state.demo.timer); state.demo.index += 1; runDemoStep(); }
    else if (t.dataset.demo === "back") { e.preventDefault(); clearTimeout(state.demo.timer); state.demo.index = Math.max(0, state.demo.index - 1); runDemoStep(); }
    else if (t.dataset.demo === "close") { e.preventDefault(); stopDemo(); }
  }

  function onChange(e) {
    if (e.target.id === "prov") { state.providerFilter = e.target.value; render(); }
    else if (e.target.id === "locationSel") { state.locationId = e.target.value; render(); }
    else if (e.target.id === "actingRole") { state.actingRole = e.target.value; render(); }
    else if (e.target.id === "sched-search") {
      state.scheduleSearch = e.target.value;
      const hold = e.target.selectionStart;
      render();
      const el = $("#sched-search");
      if (el) { el.focus(); el.setSelectionRange(hold, hold); }
    }
    else if (e.target.id === "notes-search") {
      state.notesSearch = e.target.value;
      const hold = e.target.selectionStart;
      render();
      const el = $("#notes-search");
      if (el) { el.focus(); el.setSelectionRange(hold, hold); }
    }
    else if (e.target.id === "patient-find") {
      state.patientFind = e.target.value;
      const hold = e.target.selectionStart;
      render();
      const el = $("#patient-find");
      if (el) { el.focus(); el.setSelectionRange(hold, hold); }
    }
    else if (e.target.id === "lot-trace") {
      state.lotTrace = e.target.value;
      const hold = e.target.selectionStart;
      render();
      const el = $("#lot-trace");
      if (el) { el.focus(); el.setSelectionRange(hold, hold); }
    }
    else if (e.target.dataset.cost) {
      const item = catalogItem(e.target.dataset.cost);
      if (item) {
        const v = e.target.value.trim();
        item.cost = v === "" ? null : Number(v);
        if (item.cost != null && Number.isNaN(item.cost)) item.cost = null;
        const hold = e.target.selectionStart;
        const id = e.target.dataset.cost;
        render();
        const el = document.querySelector('[data-cost="' + id + '"]');
        if (el) { el.focus(); try { el.setSelectionRange(hold, hold); } catch (err) {} }
      }
    }
    else if (e.target.dataset.lineQty != null) {
      const inv = invoice(state.invoiceId);
      if (inv && inv.lines[Number(e.target.dataset.lineQty)]) {
        const raw = e.target.value.trim();
        inv.lines[Number(e.target.dataset.lineQty)].qty = raw === "" ? null : Number(raw);
        const amt = lineAmount(inv.lines[Number(e.target.dataset.lineQty)]);
        inv.lines[Number(e.target.dataset.lineQty)].amount = amt == null ? "TBD" : amt;
        refreshInvoiceBalance(inv);
      }
    }
    else if (e.target.dataset.roomSet) { setRoomingStatus(e.target.dataset.roomSet, e.target.value); }
    else if (e.target.dataset.suiteSet) { setRoomingSuite(e.target.dataset.suiteSet, e.target.value || null); }
    else if (e.target.dataset.visitStatus) { setVisitStatus(e.target.dataset.visitStatus, e.target.value); }
    else if (e.target.dataset.suiteRole) {
      const raw = e.target.value || "";
      if (!raw) setAppointmentSuite(e.target.dataset.suiteRole, null);
      else {
        const parts = raw.split("|");
        setAppointmentSuite(e.target.dataset.suiteRole, parts[0], parts[1] || "With clinical");
      }
    }
    else if (e.target.id === "patient-search") {
      state.search = e.target.value;
      const hold = e.target.selectionStart;
      render();
      const el = $("#patient-search");
      if (el) { el.focus(); el.setSelectionRange(hold, hold); }
    } else if (e.target.dataset.setStatus) {
      const p = patient(e.target.dataset.setStatus);
      if (p) {
        const before = p.status;
        p.status = e.target.value;
        addAudit({ action: "Updated patient status", recordType: "Patient", recordId: p.id,
          recordPath: { page: "patients", selected: p.id, tab: "demographics" },
          changes: [{ field: "status", before: before, after: p.status }] });
        toast("Patient status updated and recorded");
        render();
      }
    }
  }

  function boot() {
    state.contrast = checkContrast();
    if (state.contrast.failed) console.warn("Contrast check failures", state.contrast);
    else console.info("Theme contrast: all configured text/background pairs meet their WCAG targets.");
    if (!location.hash) history.replaceState(null, "", hashFor({ page: "patients", selected: "BRZ0001", tab: "demographics" }));
    window.addEventListener("hashchange", applyRoute);
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    document.addEventListener("input", function (e) {
      if (e.target.id === "patient-search" || e.target.id === "sched-search" || e.target.id === "notes-search" || e.target.id === "patient-find" || e.target.id === "lot-trace" || e.target.dataset.cost) onChange(e);
    });
    document.addEventListener("focusout", function (e) {
      if (e.target && e.target.dataset && e.target.dataset.prepNotes) {
        const a = appt(e.target.dataset.prepNotes);
        if (!a) return;
        const next = e.target.value;
        const before = a.prepNotes || "";
        if (next === before) return;
        a.prepNotes = next;
        addAudit({ action: "Updated appointment notes", recordType: "Appointment", recordId: a.id,
          recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: "worklist" },
          changes: [{ field: "appointment notes", before: before || "—", after: next || "—" }] });
        toast("Appointment notes saved");
      }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
    $("#modalClose").addEventListener("click", function () { closeModal({ cancelPending: true }); });
    $("#modalCancel").addEventListener("click", function () { closeModal({ cancelPending: true }); });
    applyRoute();
  }

  BRIZZA.state = state;
  BRIZZA.store = store;
  BRIZZA.go = go;
  BRIZZA.startDemo = startDemo;
  BRIZZA.stopDemo = stopDemo;
  BRIZZA.hashFor = hashFor;
  document.addEventListener("DOMContentLoaded", boot);
})();
