/* Brizza Clinic EMR mockup — synthetic data only. */
(function () {
  "use strict";

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
      who: spec.who || "Alex Morgan",
      role: spec.role || "Synthetic session user",
      action: spec.action,
      recordType: spec.recordType,
      recordId: spec.recordId,
      recordPath: spec.recordPath || {},
      changes: spec.changes || []
    };
    store.audit.push(ev);
    return ev;
  }
  function historyLinks(type, id, fallback) {
    const evs = auditsFor(type, id);
    if (!evs.length) return fallback ? esc(fallback) : "";
    return evs.map((e) => '<a class="audit-link" href="' + hashFor({ page: "audit", auditId: e.id }) + '">' + esc(e.action) + "</a>").join(" · ");
  }
  function timelineHtml(type, id) {
    const evs = auditsFor(type, id);
    if (!evs.length) return '<div class="row-sub">No history</div>';
    return evs.map((e) => '<div class="event"><div class="event-date">' + esc(e.when) + '</div><a class="audit-link" href="' + hashFor({ page: "audit", auditId: e.id }) + '">' + esc(e.action) + "</a></div>").join("");
  }
  function registrationItems(p) {
    const r = (p && p.registration) || {};
    const item = (key, label, doneWord, pendingWord) => {
      const rec = r[key] || { status: pendingWord, date: null };
      return { key: key, label: label, status: rec.status || pendingWord, date: rec.date, ok: rec.status === doneWord };
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
    expandedAppt: null, auditId: null
  };

  const patient = (id) => store.patients.find((p) => p.id === id);
  const appt = (id) => store.appointments.find((a) => a.id === id);
  const visit = (id) => store.visits.find((v) => v.id === id);
  const invoice = (id) => store.invoices.find((i) => i.id === id);
  const apptsFor = (p) => store.appointments.filter((a) => a.patientId === p.id);
  const invoiceForAppt = (a) => (a.invoiceId ? invoice(a.invoiceId) : null);

  const ACTIVE = new Set(["Scheduled", "Confirmed", "Checked In", "In Progress"]);
  const NEEDS_REASON = new Set(["Confirmed", "Checked In", "In Progress", "Completed"]);

  function nextAppt(p) {
    return apptsFor(p).filter((a) => ACTIVE.has(a.status) && a.date >= BRIZZA.SAMPLE_DAY)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0] || null;
  }
  function lastAppt(p) {
    return apptsFor(p).filter((a) => a.status === "Completed")
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0] || null;
  }
  function isNewPatient(p) {
    return !apptsFor(p).some((a) => a.status === "Completed") && !(p.treatments && p.treatments.length);
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
    "clinical-profile": "Clinical Profile",
    appointments: "Appointments",
    "treatment-history": "Treatment History",
    photos: "Photos",
    documents: "Documents",
    ledger: "Ledger",
    "follow-up": "Follow-Up History",
    "clinical-notes": "Clinical Notes"
  };

  function parseHash() {
    const raw = (location.hash || "#/patients").replace(/^#/, "");
    const [pathPart, queryPart] = raw.split("?");
    const q = new URLSearchParams(queryPart || "");
    const parts = pathPart.split("/").filter(Boolean);
    const themeQ = q.get("theme");
    if (themeQ && BRIZZA.THEMES[themeQ]) state.theme = themeQ;
    let route = { page: "patients" };
    const p0 = parts[0] || "patients";
    if (p0 === "schedule") {
      let i = 1;
      let view = "list";
      let calMode = state.calMode || "week";
      if (parts[1] === "list") { view = "list"; i = 2; }
      else if (parts[1] === "calendar") {
        view = "calendar";
        const mode = parts[2];
        if (mode === "day" || mode === "week" || mode === "month") { calMode = mode; i = 3; }
        else { calMode = "week"; i = 2; }
      }
      let date = state.date || BRIZZA.SAMPLE_DAY;
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
    } else if (p0 === "visits") {
      route = { page: "visit", visitId: parts[1] };
    } else if (p0 === "checkout") {
      route = { page: "checkout", invoiceId: parts[1] };
    } else if (p0 === "demo") {
      route = { page: "demo" };
    } else if (p0 === "audit") {
      route = { page: "audit", auditId: parts[1] };
    }
    return route;
  }

  function hashFor(route, theme) {
    const t = theme || state.theme;
    let path = "/patients";
    if (route.page === "schedule") {
      const date = route.date || state.date;
      const view = route.view || state.scheduleView || "list";
      const calMode = route.calMode || state.calMode || "week";
      if (view === "calendar") path = "/schedule/calendar/" + calMode + "/" + date;
      else path = "/schedule/" + date;
      if (route.appointmentId) path += "/appointment/" + route.appointmentId;
    } else if (route.page === "patients") {
      path = route.selected ? "/patients/" + route.selected + "/" + (route.tab || "demographics") : "/patients";
    } else if (route.page === "queue") path = "/queue/" + (route.date || state.date);
    else if (route.page === "configuration") path = "/configuration";
    else if (route.page === "visit") path = "/visits/" + route.visitId;
    else if (route.page === "checkout") path = "/checkout/" + route.invoiceId;
    else if (route.page === "demo") path = "/demo";
    else if (route.page === "audit") path = "/audit/" + route.auditId;
    return "#" + path + "?theme=" + t;
  }

  function go(route) {
    location.hash = hashFor(route).replace(/^#/, "#");
  }

  function applyRoute() {
    const r = parseHash();
    state.page = r.page;
    if (r.date) state.date = r.date;
    if (r.view) state.scheduleView = r.view;
    if (r.calMode) state.calMode = r.calMode;
    if (r.selected && patient(r.selected)) {
      state.selected = r.selected;
      state.tab = TABS[r.tab] ? r.tab : "demographics";
    }
    if (r.visitId) state.visitId = r.visitId;
    if (r.invoiceId) state.invoiceId = r.invoiceId;
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
    const alert = ["Canceled", "No-Show", "Voided", "Discharged/Closed", "Not yet recorded", "Needs prep"].indexOf(status) >= 0;
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
    return '<a class="badge" href="' + hashFor({ page: "checkout", invoiceId: inv.id }) + '">' + esc(inv.id) + " · " + esc(inv.status) + "</a>";
  }


  function renderChrome(crumb, titleArea, body) {
    const nav = (href, key, label, icon) => {
      const active = (key === "patients" && (state.page === "patients" || state.page === "visit" || state.page === "demo")) ||
        (key === "schedule" && state.page === "schedule") ||
        (key === "queue" && state.page === "queue") ||
        (key === "checkout" && state.page === "checkout") ||
        (key === "configuration" && state.page === "configuration");
      return '<a href="' + href + '" class="' + (active ? "active" : "") + '" data-nav="' + key + '"><span class="ico">' + icon + "</span>" + label + "</a>";
    };
    const themes = Object.values(BRIZZA.THEMES).map((t) => {
      return '<a href="' + hashFor(parseHash(), t.id) + '" class="' + (state.theme === t.id ? "active" : "") + '" data-theme-set="' + t.id + '" title="' + esc(t.name) + ' (DRAFT)">' + esc(t.short) + "</a>";
    }).join("");
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
            ${nav(hashFor({ page: "checkout", invoiceId: state.invoiceId || "INV-1003" }), "checkout", "Checkout", "☰")}
          </nav>
          <div class="nav-label">Clinic</div>
          <nav class="nav" aria-label="Clinic">
            ${nav(hashFor({ page: "configuration" }), "configuration", "Configuration", "⚙")}
          </nav>
          <div class="profile"><div class="avatar">AM</div><div>Alex Morgan<small>Synthetic session</small></div></div>
        </aside>
        <main class="main" id="main">
          <header class="top">
            <div class="crumb">Brizza Clinic / ${crumb}</div>
            <div class="topright">
              <span class="disclaimer">Synthetic data · prototype, not a production EMR</span>
              <span class="clinic-pill">${esc(BRIZZA.CLINIC.location)}</span>
              <div class="theme-switch" role="group" aria-label="Draft theme">${themes}</div>
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
        <div class="row-sub">${esc(a.date)} · ${esc(a.time)} · ${esc(a.provider)} · ${esc(a.id)} · ${esc(a.room || "No room")}${vlink}</div>
        <div class="row-sub">Consultation: ${esc(a.consultation || "Not recorded")} · Treatment: ${esc(a.treatment || "Not recorded")} · Duration: TBD</div>
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
        ${auditsFor("Patient", p.id).length ? '<h3 class="section-title">Audit trail</h3><div class="timeline">' + timelineHtml("Patient", p.id) + "</div>" : ""}
        </div></div>`;
    } else if (state.tab === "clinical-profile") {
      const rows = (items, empty) => items.length ? items.map((x) => '<div class="row"><span>' + esc(Array.isArray(x) ? x.join(" · ") : x) + '</span><span class="badge">Recorded</span></div>').join("") : '<div class="empty">' + empty + "</div>";
      body = `<div class="two"><div><h3 class="section-title">Medical history</h3>${rows(p.conditions, "No history items recorded")}
        <h3 class="section-title" style="margin-top:18px">Medications</h3>${rows(p.meds, "No current medications recorded")}</div>
        <div><h3 class="section-title">Allergies and alerts</h3>${rows(p.allergies, "No allergy information recorded")}</div></div>`;
    } else if (state.tab === "appointments") {
      const list = apptsFor(p).slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      body = `<div class="labelrow"><h3 class="section-title">Appointment history</h3>
        <a class="btn small primary" href="#modal-book" data-open="book" data-pid="${p.id}">＋ Schedule appointment</a></div>
        <div class="scroll-list">${list.map(appointmentRow).join("") || '<div class="empty">No appointments</div>'}</div>`;
    } else if (state.tab === "treatment-history") {
      body = `<h3 class="section-title">Delivered care</h3>${p.treatments.length ? p.treatments.map((t) => '<div class="row"><span>' + esc(t) + '</span><span class="badge">Recorded</span></div>').join("") : '<div class="empty">No treatment recorded. Appointment or consultation completion does not imply treatment.</div>'}`;
    } else if (state.tab === "photos") {
      body = `<div class="two"><div><h3 class="section-title">Clinical photography</h3>${p.photos.length ? p.photos.map((x) => '<div class="row"><span>' + esc(x) + "</span></div>").join("") : '<div class="empty">No clinical photos</div>'}</div>
        <div><h3 class="section-title">Authorization records</h3>
        <div class="row"><span>Clinical photography consent</span>${badge(p.consents.clinical)}</div>
        <div class="row"><span>Marketing photo authorization</span>${badge(p.consents.marketing)}</div>
        <div class="notice">Clinical photography consent is separate from marketing photo authorization.</div></div></div>`;
    } else if (state.tab === "documents") {
      body = `<h3 class="section-title">Patient documents</h3>${p.documents.length ? p.documents.map((d) => '<div class="row"><span>' + esc(d) + "</span></div>").join("") : '<div class="empty">No documents uploaded</div>'}`;
    } else if (state.tab === "ledger") {
      const invs = store.invoices.filter((i) => i.patientId === p.id);
      body = `<h3 class="section-title">Patient ledger</h3>
        <div class="notice">Payment status is independent of appointment status. Amounts are TBD. The balance lives on the invoice.</div>
        ${invs.map((inv) => '<a class="row" href="' + hashFor({ page: "checkout", invoiceId: inv.id }) + '"><div><div class="row-title">' + esc(inv.id) + '</div><div class="row-sub">Balance: ' + esc(inv.balance) + "</div></div>" + badge(inv.status) + "</a>").join("") || '<div class="empty">No invoices</div>'}`;
    } else if (state.tab === "follow-up") {
      body = `<div class="labelrow"><h3 class="section-title">Follow-up history</h3>
        <a class="btn small" href="#modal-followup" data-open="followup" data-pid="${p.id}">＋ Add follow-up</a></div>
        ${p.followups.length ? p.followups.map((f) => '<div class="row"><div><div class="row-title">' + esc(f.text) + '</div><div class="row-sub">Due ' + esc(fmtDate(f.due || f)) + "</div></div></div>").join("") : '<div class="empty">No follow-up tasks</div>'}`;
    } else if (state.tab === "clinical-notes") {
      body = `<div class="labelrow"><h3 class="section-title">Clinical notes</h3>
        <a class="btn small primary" href="#modal-note" data-open="note" data-pid="${p.id}">＋ Add note</a></div>
        ${openQ("Records audits Clinical Notes as a section; DB-005 lists eight chart sections and does not include this tab. Note statuses Draft / Ready for review are not an approved catalog.")}
        ${p.notes.map((n) => '<div class="note"><strong>Consultation</strong> ' + badge(n.status || "Draft") + ' <span class="row-sub" style="float:right">' + esc(fmtDate(n.date)) + '</span><div class="row-sub">' + esc(n.provider) + " · Procedure performed: " + esc(n.procedurePerformed || "Not recorded") + (n.visitId ? ' · Visit <a href="' + hashFor({ page: "visit", visitId: n.visitId }) + '">' + esc(n.visitId) + "</a>" : "") + "</div><p>" + esc(n.text) + "</p></div>").join("") || '<div class="empty">No clinical notes</div>'}`;
    }
    return body + '<div class="row-sub" style="margin-top:18px">Audit trail · ' + esc(TABS[state.tab] || state.tab) + " · Latest activity retained</div>";
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
    const head = pageHead("Patient-centered chart", "Patient chart", "", '<a class="btn small" href="#modal-edit" data-open="edit" data-pid="' + p.id + '">Edit chart</a><a class="btn small primary" href="#modal-book" data-open="book" data-pid="' + p.id + '">＋ Appointment</a>');
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
          <div class="cardbody">${upcoming.map((a) => '<div class="row"><div><div class="row-title">' + esc(a.type) + '</div><div class="row-sub">' + esc(a.date) + " · " + esc(a.time) + " · " + esc(a.provider) + "</div></div>" + badge(a.status) + "</div>").join("") || '<div class="empty">None scheduled</div>'}</div>
        </div>
        ${patientListHtml()}
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

  function renderSchedule() {
    if (state.scheduleView === "calendar") {
      renderCalendar();
      return;
    }
    const list = dayAppointments(state.date);
    const locOpts = (BRIZZA.LOCATIONS || []).map((l) => "<option value=\"" + esc(l.id) + "\"" + (state.locationId === l.id ? " selected" : "") + ">" + esc(l.name) + "</option>").join("");
    const toggle = scheduleViewToggle();
    const head = pageHead("Appointment operations", "Schedule", esc(locationName(state.locationId)) + " · " + esc(BRIZZA.CLINIC.hours),
      toggle + ' <a class="btn primary" href="#modal-book" data-open="book">＋ New appointment</a>');
    const rows = list.map((a) => {
      const p = patient(a.patientId);
      const v = a.visitId ? '<a href="' + hashFor({ page: "visit", visitId: a.visitId }) + '">' + esc(a.visitId) + "</a>" : "";
      const open = state.expandedAppt === a.id;
      return `<div class="appt-card">
        <div class="appt-card-top">
          <div>
            <strong>${esc(a.time)} · ${esc(p ? p.name : a.patientId)}</strong>
            <div class="row-sub">${esc(a.type)} · ${esc(reasonText(a))} · Duration TBD · ${esc(a.room || "No room")}${a.visitId ? " · " + v : ""} · ${esc(locationName(a.locationId))}</div>
            <div class="row-sub">Primary provider: ${esc(a.provider)} · consultation ${esc(a.consultation || "—")} · treatment ${esc(a.treatment || "—")} · ${invoiceBadge(a)}</div>
          </div>
          <div class="actions">
            <button class="btn small" type="button" data-expand-reg="${esc(a.id)}" aria-expanded="${open ? "true" : "false"}" aria-controls="reg-panel-${esc(a.id)}">Registration</button>
            <a class="btn small" href="${hashFor({ page: "schedule", date: state.date, appointmentId: a.id, view: "list" })}">${esc(a.status)} ▾</a>
          </div>
        </div>
        ${open ? registrationPanel(a) : ""}
      </div>`;
    }).join("") || '<div class="empty">No appointments on this date.</div>';
    const catalog = Object.entries(BRIZZA.reasonCatalog).map(([t, rs]) => {
      if (t === "Skin Treatment") {
        return '<div class="row"><div><strong>Skin Treatment</strong><div class="row-sub">Customized Facial (umbrella): Mini Facial · Facial · Hydrafacial · Chemical Peel · Microneedling</div></div></div>';
      }
      return '<div class="row"><div><strong>' + esc(t) + '</strong><div class="row-sub">' + rs.join(" · ") + "</div></div></div>";
    }).join("");
    const body = `<div class="schedule-wrap">
      <div class="card">
        <div class="cardhead">
          <div class="datebar">
            <a class="btn small" id="sched-prev" href="${hashFor({ page: "schedule", date: addDays(state.date, -1), view: "list" })}" aria-label="Previous day">‹</a>
            <strong>${esc(fmtLong(state.date))}</strong>
            <a class="btn small" id="sched-next" href="${hashFor({ page: "schedule", date: addDays(state.date, 1), view: "list" })}" aria-label="Next day">›</a>
            <a class="btn small" id="sched-today" href="${hashFor({ page: "schedule", date: todayET(), view: "list" })}">Today</a>
            <a class="btn small" href="${hashFor({ page: "schedule", date: BRIZZA.SAMPLE_DAY, view: "list" })}">Sample day</a>
          </div>
          <div class="sched-tools">
            <label class="sr-only" for="locationSel">Location</label>
            <select id="locationSel">${locOpts}</select>
            <label class="sr-only" for="prov">Provider filter</label>
            <select id="prov">${["All providers"].concat(BRIZZA.PROVIDERS).map((x) => "<option" + (state.providerFilter === x ? " selected" : "") + ">" + esc(x) + "</option>").join("")}</select>
          </div>
        </div>
        <div class="cardbody">${isWeekend(state.date) ? '<div class="cal-closed">Clinic closed · weekends are outside Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>' : rows}</div>
      </div>
      <div class="card">
        <div class="cardhead"><h2>Controlled configuration</h2></div>
        <div class="cardbody">
          <div class="row"><span>Appointment status</span><span class="row-sub">8 approved values</span></div>
          ${catalog}
          <div class="notice">Staff choose approved reasons only. Duration and price are TBD. At least one reason is required before Confirmed.</div>
          ${openQ("Which of the seven staff roles Dr. Elena Ruiz and Dr. Samir Shah hold is not defined in the V1 documents.")}
        </div>
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "schedule", date: state.date, view: "list" }) + '">Schedule</a>', head, body);
  }

  function scheduleViewToggle() {
    const listHref = hashFor({ page: "schedule", date: state.date, view: "list" });
    const calHref = hashFor({ page: "schedule", date: state.date, view: "calendar", calMode: state.calMode || "week" });
    return '<div class="view-toggle" role="group" aria-label="Schedule view"><a href="' + listHref + '" class="' + (state.scheduleView !== "calendar" ? "active" : "") + '">List</a><a href="' + calHref + '" class="' + (state.scheduleView === "calendar" ? "active" : "") + '">Calendar</a></div>';
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
    return '<a class="cal-event" href="' + href + '"><span class="t">' + esc(a.time) + " · " + esc(p ? p.name : a.patientId) + '</span>' + esc(a.type) + " · " + esc(reasonText(a)) + "</a>";
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
    let title = fmtLong(state.date);
    if (state.calMode === "week") title = "Week of " + fmtLong(weekMonday(state.date));
    if (state.calMode === "month") title = monthLabel(state.date);
    const head = pageHead("Appointment operations", "Schedule", esc(locationName(state.locationId)) + " · " + esc(BRIZZA.CLINIC.hours),
      toggle + " " + modes + ' <a class="btn primary" href="#modal-book" data-open="book">＋ New appointment</a>');
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
      <label class="sr-only" for="prov">Provider filter</label>
      <select id="prov">${["All providers"].concat(BRIZZA.PROVIDERS).map((x) => "<option" + (state.providerFilter === x ? " selected" : "") + ">" + esc(x) + "</option>").join("")}</select>
    </div><div class="cardbody">${grid}</div></div>`;
    renderChrome('<a href="' + hashFor({ page: "schedule", date: state.date, view: "calendar", calMode: state.calMode }) + '">Schedule</a> / Calendar / ' + esc(state.calMode), head, body);
  }

  function calendarDayGrid(date) {
    if (isWeekend(date)) return '<div class="cal-closed">Clinic closed · weekends are outside Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>';
    const hours = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
    const list = dayAppointments(date);
    return hours.map((t) => {
      const slot = list.filter((a) => a.time === t).map(calendarEvent).join("") || "";
      return '<div class="cal-day-row"><div class="cal-time">' + t + '</div><div>' + slot + "</div></div>";
    }).join("") + '<div class="row-sub" style="margin-top:10px">Closes 6:00 p.m. ET</div>';
  }

  function calendarWeekGrid(date) {
    const mon = weekMonday(date);
    const days = [0, 1, 2, 3, 4].map((i) => addDays(mon, i));
    const hours = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
    const appts = rangeAppointments(mon, addDays(mon, 4));
    const heads = '<div class="cal-time"></div>' + days.map((d) => '<div class="cal-hd"><a href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" }) + '">' + esc(new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) + "</a></div>").join("");
    const rows = hours.map((h) => {
      const next = h === "17:00" ? "18:00" : String(Number(h.slice(0, 2)) + 1).padStart(2, "0") + ":00";
      const cells = days.map((d) => {
        const slot = appts.filter((a) => a.date === d && a.time >= h && a.time < next).map(calendarEvent).join("");
        return '<div class="cal-cell">' + slot + "</div>";
      }).join("");
      return '<div class="cal-time">' + h + "</div>" + cells;
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
    const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    let html = labels.map((l) => '<div class="cal-hd">' + l + "</div>").join("");
    let d = start;
    while (d <= end) {
      const inMonth = d.slice(0, 7) === first.slice(0, 7);
      const closed = isWeekend(d);
      const dayAppts = appts.filter((a) => a.date === d);
      const chips = inMonth ? dayAppts.map(calendarEvent).join("") : "";
      const dayLink = '<a class="d" href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" }) + '">' + Number(d.slice(8)) + "</a>";
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
          return "<tr><td><strong>" + esc(a.time) + '</strong><div class="row-sub">' + esc(p ? p.name : a.patientId) + "</div></td><td>" +
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
            <div class="cardbody">${note ? '<div class="note"><strong>Consultation</strong> ' + badge(note.status || "Draft") + '<div class="row-sub">Procedure performed: ' + esc(note.procedurePerformed || "Not recorded") + " · " + esc(note.provider) + "</div><p>" + esc(note.text) + "</p></div>" : '<div class="empty">No visit note yet.</div><a class="btn small" href="#modal-note" data-open="note" data-pid="' + v.patientId + '" data-visit="' + v.id + '">＋ Add Consultation note</a>'}</div>
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
          ${Object.keys(BRIZZA.reasonCatalog).map((x) => '<div class="row"><span>' + esc(x) + '</span><span class="row-sub">Controlled reason catalog · duration TBD · price TBD</span></div>').join("")}
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
    if (back) back.classList.remove("open");
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
    if (type === "Skin Treatment") {
      const facial = BRIZZA.FACIAL_REASONS.map((r) => '<label style="display:inline-flex;align-items:center;gap:6px;margin:5px 12px 5px 0"><input type="checkbox" name="reason" value="' + esc(r) + '"' + (selected.indexOf(r) >= 0 ? " checked" : "") + "> " + esc(r) + "</label>").join("");
      const others = ["Chemical Peel", "Microneedling"].map((r) => '<label style="display:inline-flex;align-items:center;gap:6px;margin:5px 12px 5px 0"><input type="checkbox" name="reason" value="' + esc(r) + '"' + (selected.indexOf(r) >= 0 ? " checked" : "") + "> " + esc(r) + "</label>").join("");
      return '<div class="reason-group"><h3>Customized Facial <span class="row-sub">(umbrella)</span></h3><div class="reason-sub">' + facial + '</div></div><div class="reason-group"><h3>Other skin treatments</h3><div>' + others + "</div></div>";
    }
    const rs = BRIZZA.reasonCatalog[type] || [];
    return rs.map((r, i) => '<label style="display:inline-flex;align-items:center;gap:6px;margin:5px 12px 5px 0"><input type="checkbox" name="reason" value="' + esc(r) + '"' + (selected.indexOf(r) >= 0 || (!selected.length && i === 0) ? " checked" : "") + "> " + esc(r) + "</label>").join("");
  }

  function openBook(pid) {
    const sel = pid || state.selected;
    showModal("Schedule Brizza appointment", `
      <div class="formgrid">
        <div class="field"><label for="fPatient">Patient</label>
          <select id="fPatient">${store.patients.map((p) => '<option value="' + p.id + '"' + (p.id === sel ? " selected" : "") + ">" + esc(p.id) + " · " + esc(p.name) + "</option>").join("")}</select></div>
        <div class="field"><label for="fType">Appointment type</label>
          <select id="fType">${Object.keys(BRIZZA.reasonCatalog).map((t) => "<option>" + esc(t) + "</option>").join("")}</select></div>
        <div class="field full"><label>Approved reason(s)</label><div id="reasonOptions">${reasonOptionsHtml("Consult", [])}</div>
          <p class="row-sub">Duration: TBD · Price: TBD</p></div>
        <div class="field"><label for="fDate">Date</label><input id="fDate" type="date" value="${esc(state.date)}"></div>
        <div class="field"><label for="fTime">Start time</label>
          <select id="fTime">${BRIZZA.BOOKING_TIMES.map((t) => "<option>" + t + "</option>").join("")}</select></div>
        <div class="field"><label for="fProvider">Primary provider</label>
          <select id="fProvider">${BRIZZA.PROVIDERS.map((p) => "<option>" + esc(p) + "</option>").join("")}</select></div>
        <div class="field"><label for="fRoom">Room</label>
          <select id="fRoom">${BRIZZA.ROOMS.map((r) => "<option>" + esc(r) + "</option>").join("")}</select></div>
        <div class="field full" id="cfWarn"></div>
      </div>`, function () { saveAppt(); });
    $("#fType").addEventListener("change", function () {
      $("#reasonOptions").innerHTML = reasonOptionsHtml($("#fType").value, []);
      updateConsultWarn();
    });
    $("#fPatient").addEventListener("change", updateConsultWarn);
    updateConsultWarn();
  }

  function updateConsultWarn() {
    const p = patient($("#fPatient").value);
    const type = $("#fType").value;
    const el = $("#cfWarn");
    if (p && isNewPatient(p) && type !== "Consult") {
      el.innerHTML = '<div class="notice">Consultation-first check: this patient has no completed appointment or treatment. New patients follow a consultation-first process. You can still save this booking.</div>';
    } else el.innerHTML = "";
  }

  function saveAppt() {
    const reasons = $$('input[name="reason"]:checked').map((x) => x.value);
    const pid = $("#fPatient").value;
    const p = patient(pid);
    const type = $("#fType").value;
    const date = $("#fDate").value;
    const time = $("#fTime").value;
    const provider = $("#fProvider").value;
    const room = $("#fRoom").value;
    const id = nextId("A-", store.appointments);
    const history = ["Scheduled"];
    const cf = p && isNewPatient(p) && type !== "Consult";
    if (cf) history.push("Consultation-first check noted · " + nowET());
    if (!reasons.length) history.push("Reason required before Confirmed · " + nowET());
    const rec = { id: id, time: time, patientId: pid, type: type, reasons: reasons, provider: provider, durationLabel: "TBD", status: "Scheduled", consultation: "", treatment: "", room: room, date: date, locationId: state.locationId || BRIZZA.DEFAULT_LOCATION, history: history };
    if (state.reschedulingId) rec.replaces = state.reschedulingId;
    if (cf) rec.consultFirstFlag = true;
    store.appointments.push(rec);
    addAudit({ action: "Scheduled appointment", recordType: "Appointment", recordId: id,
      recordPath: { page: "schedule", date: date, appointmentId: id, view: state.scheduleView, calMode: state.calMode },
      changes: [
        { field: "status", before: "—", after: "Scheduled" },
        { field: "type", before: "—", after: type },
        { field: "date", before: "—", after: date + " " + time }
      ] });
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
    go({ page: "schedule", date: date, view: state.scheduleView, calMode: state.calMode });
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
        <div class="row-sub">${esc(a.date)} · ${esc(a.time)} · Primary provider: ${esc(a.provider)} · ${esc(a.room || "No room")} · Duration TBD</div></div>${badge(a.status)}</div>
      <div class="field" style="margin-top:14px"><label>Approved reason(s)</label><div id="reasonOptions">${reasonOptionsHtml(a.type, a.reasons || [])}</div></div>
      <div class="field" style="margin-top:12px"><label for="actionStatus">Appointment status</label>
        <select id="actionStatus">${BRIZZA.appointmentStatuses.map((s) => "<option" + (a.status === s ? " selected" : "") + ">" + s + "</option>").join("")}</select></div>
      <div class="field" style="margin-top:12px"><label for="actionConsult">Consultation outcome (independent)</label>
        <select id="actionConsult"><option value="">Not recorded</option>${BRIZZA.consultationOutcomes.map((x) => "<option" + (a.consultation === x ? " selected" : "") + ">" + esc(x) + "</option>").join("")}</select></div>
      <div class="field" style="margin-top:12px"><label for="actionTreatment">Treatment status (independent)</label>
        <select id="actionTreatment"><option value="">No treatment record</option>${BRIZZA.treatmentStatuses.map((x) => "<option" + (a.treatment === x ? " selected" : "") + ">" + esc(x) + "</option>").join("")}</select></div>
      <div class="row"><span>Invoice status</span>${inv ? invoiceBadge(a) : '<span class="row-sub">No invoice</span>'}</div>
      <div class="notice">Appointment completion does not imply consultation, treatment, or payment. Payment is tracked on the invoice.</div>
      ${optionalIdea("A non-blocking warning could appear when moving to Completed while the linked invoice is not Paid. This is undecided and is not required.")}
      <div id="statusWarn"></div>
      <div style="margin-top:12px"><button class="btn small" type="button" data-reschedule="${a.id}">Reschedule (retain history)</button></div>
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
    if (next !== a.status) {
      a.history.push(a.status + " → " + next + " · " + nowET());
      addAudit({ action: a.status + " → " + next, recordType: "Appointment", recordId: a.id,
        recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: "list" },
        changes: [{ field: "status", before: a.status, after: next }] });
    }
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
    const status = $("#pay-status").value;
    const prev = inv.status;
    inv.payments.push({ id: nextId("PAY-", inv.payments), method: "Card (processor reference only)", status: status, recorded: nowET() });
    if (status === "Paid") { inv.status = "Paid"; inv.balance = "None"; }
    else if (status === "Partially Paid") { inv.status = "Partially Paid"; inv.balance = "Outstanding (amount TBD)"; }
    else if (status === "Refunded") { inv.status = "Refunded"; }
    else if (status === "Voided") { inv.status = "Voided"; }
    else { inv.status = "Issued"; }
    addAudit({ action: "Recorded payment " + status, recordType: "Invoice", recordId: inv.id,
      recordPath: { page: "checkout", invoiceId: inv.id },
      changes: [{ field: "payment status", before: "—", after: status }, { field: "invoice status", before: prev, after: inv.status }] });
    toast("Payment recorded as " + status);
    render();
  }

  function finalizeInvoice(invId) {
    const inv = invoice(invId);
    if (inv.finalized) { toast("Already finalized"); return; }
    const product = productForInvoice(inv);
    const lot = product ? fefoLot(product) : null;
    if (lot) {
      lot.onHand = Math.max(0, lot.onHand - 1);
      if (lot.onHand === 0) lot.status = "Used";
      inv.movements.push({ lotId: lot.id, product: lot.product, type: "TREATMENT_USAGE", posted: nowET() });
    }
    inv.finalized = true;
    inv.finalizedAt = nowET();
    if (inv.status === "Draft") inv.status = "Issued";
    addAudit({ action: "Finalized invoice and posted inventory", recordType: "Invoice", recordId: inv.id,
      recordPath: { page: "checkout", invoiceId: inv.id },
      changes: [
        { field: "finalized", before: "No", after: "Yes" },
        { field: "inventory movement", before: "None", after: lot ? lot.id : "—" }
      ] });
    toast(lot ? "Invoice finalized · inventory posted from " + lot.id : "Invoice finalized · no lot posted");
    render();
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

  function render() {
    if (state.page === "schedule") renderSchedule();
    else if (state.page === "queue") renderQueue();
    else if (state.page === "configuration") renderSettings();
    else if (state.page === "visit") renderVisit();
    else if (state.page === "checkout") renderCheckout();
    else if (state.page === "audit") renderAudit();
    else renderPatients();
    if (state.demo.running) paintDemoPanel();
  }

  function onClick(e) {
    const t = e.target.closest("[data-open],[data-demo],[data-reschedule],[data-record-pay],[data-finalize],[data-expand-reg]");
    if (!t) return;
    if (t.dataset.expandReg) {
      e.preventDefault();
      state.expandedAppt = state.expandedAppt === t.dataset.expandReg ? null : t.dataset.expandReg;
      render();
      return;
    }
    if (t.dataset.open === "book") { e.preventDefault(); openBook(t.dataset.pid); }
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
    document.addEventListener("input", function (e) { if (e.target.id === "patient-search") onChange(e); });
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
