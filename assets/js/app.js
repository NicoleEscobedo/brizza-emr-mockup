/* Brizza Clinic EMR mockup — synthetic data only. */
(function () {
  "use strict";
  // Round 7 — Availability, #BZ ids, Worklist polish, simpler invoice pop-up.

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
  function fromMinutes(n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    const h = Math.floor(n / 60);
    const min = n % 60;
    return String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
  }
  function scheduleHours() {
    return ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
  }
  function bookingEndTimes() {
    const times = (BRIZZA.BOOKING_TIMES || scheduleHours()).slice();
    if (times.indexOf("18:00") < 0) times.push("18:00");
    return times;
  }
  function isConsultType(name) {
    return name === "Consultation" || name === "Consult";
  }
  function serviceDisplayName(name) {
    if (!name) return "";
    if (/^toxins$/i.test(String(name))) return "Toxin";
    if (/^fillers$/i.test(String(name))) return "Filler";
    return String(name);
  }
  function consultService(a) {
    if (!a) return "";
    if (a.consultingFor) return a.consultingFor;
    const catalog = BRIZZA.consultingFor || [];
    const hits = (a.reasons || []).filter(function (r) {
      return catalog.some(function (c) {
        return c.toLowerCase() === String(r).toLowerCase() || serviceDisplayName(c).toLowerCase() === String(r).toLowerCase();
      });
    });
    return hits[0] || "";
  }
  function visitReasonLabel(a) {
    const service = serviceDisplayName(consultService(a));
    if (service) return service;
    const rest = (a.reasons || []).filter(function (r) {
      return r !== "New Patient" && r !== "Existing Patient" && r !== "Established Patient";
    });
    return rest.join(", ") || reasonText(a);
  }
  function apptSpan(a) {
    const start = toMinutes(a.time);
    const dur = a.durationMinutes || durationMinutes(a.type, a.reasons) || 30;
    return { start: start, end: start + dur };
  }
  function overlappingBlocks(date, time, typeName, reasonNames, provider, minsOverride) {
    const start = toMinutes(time);
    const end = start + (minsOverride || durationMinutes(typeName, reasonNames) || 30);
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
      pharmacy: p.pharmacy || "",
      consents: Object.assign({}, p.consents || {})
    };
  }
  function historyDiffHtml(snapshot, p) {
    if (!snapshot) return '<p class="row-sub">No medical-history snapshot is stored on this note.</p>';
    const now = historySnapshotOf(p);
    const keys = [
      { k: "allergies", label: "Allergies" },
      { k: "meds", label: "Current medications" },
      { k: "conditions", label: "Medical history" },
      { k: "pharmacy", label: "Pharmacy" }
    ];
    const rows = keys.map(function (item) {
      const before = item.k === "pharmacy" ? (snapshot.pharmacy || "—") : ((snapshot[item.k] || []).join(", ") || "—");
      const after = item.k === "pharmacy" ? (now.pharmacy || "—") : ((now[item.k] || []).join(", ") || "—");
      const changed = before !== after;
      return '<div class="row"><div><div class="row-title">' + esc(item.label) + "</div>" +
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
  function fmtDob(iso) {
    if (!iso) return "—";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return String(iso);
    return String(m).padStart(2, "0") + "/" + String(d).padStart(2, "0") + "/" + y;
  }
  function parseDob(s) {
    const v = String(s || "").trim();
    const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) return mdy[3] + "-" + mdy[1].padStart(2, "0") + "-" + mdy[2].padStart(2, "0");
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return "";
  }

  function digitsOnly(s, max) {
    return String(s || "").replace(/\D/g, "").slice(0, max);
  }
  function formatDobMask(s) {
    const d = digitsOnly(s, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
    return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
  }
  function formatPhoneMask(s) {
    const d = digitsOnly(s, 10);
    if (!d) return "";
    if (d.length <= 3) return "(" + d;
    if (d.length <= 6) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }
  function applyInputMask(el) {
    const kind = el && el.getAttribute("data-mask");
    if (!kind) return;
    const fmt = kind === "dob" ? formatDobMask : kind === "phone" ? formatPhoneMask : null;
    if (!fmt) return;
    const max = kind === "dob" ? 8 : 10;
    const start = el.selectionStart == null ? String(el.value || "").length : el.selectionStart;
    const digitsBefore = digitsOnly(el.value.slice(0, start), max).length;
    const next = fmt(el.value);
    if (next === el.value) return;
    el.value = next;
    let seen = 0, pos = next.length;
    if (digitsBefore === 0) pos = (kind === "phone" && next.charAt(0) === "(" ? 1 : 0);
    else {
      for (let i = 0; i < next.length; i++) {
        if (/\d/.test(next[i])) {
          seen += 1;
          if (seen >= digitsBefore) { pos = i + 1; break; }
        }
      }
    }
    try { el.setSelectionRange(pos, pos); } catch (err) {}
  }
  function emptyAddress() {
    return { address1: "", address2: "", city: "", state: "", zip: "", country: "United States" };
  }
  function addressPartsOf(p) {
    const base = emptyAddress();
    if (!p) return base;
    if (p.addressParts) return Object.assign(base, p.addressParts);
    return base;
  }
  function formatAddressLines(parts) {
    parts = Object.assign(emptyAddress(), parts || {});
    const cityLine = [parts.city, [parts.state, parts.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return [parts.address1, parts.address2, cityLine, parts.country].filter(function (x) { return x && String(x).trim(); });
  }
  function formatAddressText(parts) {
    return formatAddressLines(parts).join(", ") || "";
  }
  function formatAddressHtml(parts) {
    const lines = formatAddressLines(parts);
    return lines.length ? lines.map(function (l) { return esc(l); }).join("<br>") : "—";
  }
  function addressFieldsHtml(parts, prefix) {
    parts = Object.assign(emptyAddress(), parts || {});
    prefix = prefix || "addr";
    const countries = (BRIZZA.COUNTRIES || ["United States"]).slice();
    if (parts.country && countries.indexOf(parts.country) < 0) countries.push(parts.country);
    const countryOpts = countries.map(function (c) {
      return "<option" + (parts.country === c ? " selected" : "") + ">" + esc(c) + "</option>";
    }).join("");
    return '<div class="formgrid addr-grid">' +
      '<div class="field full"><label for="' + prefix + '1">Address 1</label><input id="' + prefix + '1" data-addr="address1" value="' + esc(parts.address1 || "") + '" autocomplete="address-line1"></div>' +
      '<div class="field full"><label for="' + prefix + '2">Address 2</label><input id="' + prefix + '2" data-addr="address2" value="' + esc(parts.address2 || "") + '" placeholder="Apartment, suite, optional" autocomplete="address-line2"></div>' +
      '<div class="field"><label for="' + prefix + 'Zip">Zip</label><input id="' + prefix + 'Zip" data-addr="zip" data-zip-lookup="1" value="' + esc(parts.zip || "") + '" inputmode="numeric" maxlength="10" autocomplete="postal-code"></div>' +
      '<div class="field"><label for="' + prefix + 'City">City</label><input id="' + prefix + 'City" data-addr="city" value="' + esc(parts.city || "") + '" autocomplete="address-level2"></div>' +
      '<div class="field"><label for="' + prefix + 'State">State</label><input id="' + prefix + 'State" data-addr="state" value="' + esc(parts.state || "") + '" autocomplete="address-level1"></div>' +
      '<div class="field"><label for="' + prefix + 'Country">Country</label><select id="' + prefix + 'Country" data-addr="country">' + countryOpts + "</select></div>" +
      "</div>";
  }
  function readAddressFields(root) {
    root = root || document;
    const get = function (key) {
      const el = root.querySelector('[data-addr="' + key + '"]');
      return el ? el.value.trim() : "";
    };
    return {
      address1: get("address1"),
      address2: get("address2"),
      city: get("city"),
      state: get("state"),
      zip: get("zip"),
      country: get("country") || "United States"
    };
  }
  function zipLookupTable() {
    return BRIZZA.ZIP_LOOKUP || {
      "10013": { city: "New York", state: "NY" },
      "10012": { city: "New York", state: "NY" },
      "10014": { city: "New York", state: "NY" },
      "10011": { city: "New York", state: "NY" },
      "10003": { city: "New York", state: "NY" },
      "11201": { city: "Brooklyn", state: "NY" },
      "11937": { city: "East Hampton", state: "NY" },
      "11963": { city: "Sag Harbor", state: "NY" },
      "07030": { city: "Hoboken", state: "NJ" }
    };
  }
  function applyZipLookup(el) {
    if (!el) return;
    const zip = digitsOnly(el.value, 5);
    if (zip.length !== 5) return;
    const hit = zipLookupTable()[zip];
    if (!hit) return;
    const scope = el.closest(".addr-grid") || el.closest(".formgrid") || el.closest("form") || el.closest("#modalBody") || el.parentElement || document;
    const city = scope.querySelector('[data-addr="city"]');
    const state = scope.querySelector('[data-addr="state"]');
    if (city && city.value !== hit.city) city.value = hit.city;
    if (state && state.value !== hit.state) state.value = hit.state;
  }
  function bindZipLookups() {
    $$("[data-zip-lookup]").forEach(function (el) {
      if (el.dataset.zipBound === "1") return;
      el.dataset.zipBound = "1";
      ["input", "change", "blur", "keyup", "paste"].forEach(function (ev) {
        el.addEventListener(ev, function () {
          window.setTimeout(function () { applyZipLookup(el); }, ev === "paste" ? 0 : 0);
        });
      });
    });
  }
  function displayId(id) {
    if (!id) return "";
    const raw = String(id).replace(/^#/, "");
    return "#" + raw;
  }
  function nextPatientId() {
    let max = 0;
    (store.patients || []).forEach(function (pt) {
      const m = String(pt.id).match(/(\d+)/);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return "BZ" + String(max + 1).padStart(4, "0");
  }
  function patientCredit(pOrId) {
    const p = typeof pOrId === "object" ? pOrId : patient(pOrId);
    return Math.round(Number((p && p.credit) || 0) * 100) / 100;
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
  const AUDIT_SVG = '<svg class="audit-icon-svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="2.6" y="2.4" width="7.6" height="10.2" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M4.8 2.4h3.2v1.5H4.8z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4.6 6.6h3.2M4.6 8.6h2.3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="10.6" cy="10.4" r="2.35" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12.3 12.2 14.4 14.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
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
  store.collectTasks = store.collectTasks || [];
  const state = {
    theme: "01", page: "patients", date: BRIZZA.SAMPLE_DAY, selected: "BZ0001",
    tab: "demographics", visitId: null, invoiceId: null, appointmentId: null,
    providerFilter: "All providers", providerChips: null, compareLocations: false,
    search: "", reschedulingId: null, modal: null,
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
    "follow-up": "Follow-up history"
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
    } else if (p0 === "availability") {
      route = { page: "availability" };
    } else if (p0 === "notes") {
      route = { page: "notes", notesDash: parts[1] === "signed" ? "signed" : "pending" };
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
    else if (route.page === "availability") path = "/availability";
    else if (route.page === "notes") path = "/notes" + (route.notesDash === "signed" ? "/signed" : "");
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
      state.tab = TABS[r.tab] ? r.tab : (r.tab === "treatment-history" || r.tab === "clinical-notes" ? "demographics" : "demographics");
    }
    if (r.notesDash) state.notesDash = r.notesDash;
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
    if (inv && inv.carriedToAccount) balance = 0;
    else if (inv && typeof inv.balance === "number" && inv._balanceLocked) balance = inv.balance;
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
    (store.invoices || []).filter((i) => i.patientId === pid && !i.carriedToAccount).forEach(function (inv) {
      refreshInvoiceBalance(inv);
      if (typeof inv.balance === "number") sum += inv.balance;
      else if (inv.status !== "Paid" && inv.status !== "Voided" && inv.balance !== "None") tbd = true;
    });
    const pt = patient(pid);
    sum += Number((pt && pt.accountBalance) || 0);
    sum -= patientCredit(pt);
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
      quotes: openQuotes,
      collect: (store.collectTasks || []).some(function (task) { return task.open && task.patientId === a.patientId; })
    };
  }
  function wlFilterCounts(list) {
    const c = { confirm: 0, missing: 0, checkout: 0, unpaid: 0, quotes: 0, collect: 0 };
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

  function wlBucketFor(a) {
    const s = a.status;
    if (s === "Checked out") return "completed";
    if (s === "No-show" || s === "Canceled") return "noshow";
    if (s === "Scheduled" || s === "Confirmed") return "pending";
    return "inprogress";
  }
  function wlBucketLabels() {
    return [
      { key: "inprogress", label: "In progress" },
      { key: "pending", label: "Pending" },
      { key: "completed", label: "Completed" },
      { key: "noshow", label: "No-show/Canceled" }
    ];
  }
  function wlBucketState() {
    const st = { inprogress: false, pending: false, completed: true, noshow: true };
    try {
      const raw = localStorage.getItem("brizza-emr-wl-buckets");
      if (raw) Object.assign(st, JSON.parse(raw));
    } catch (err) {}
    return st;
  }
  function setWlBucketCollapsed(key, collapsed) {
    const st = wlBucketState();
    st[key] = !!collapsed;
    try { localStorage.setItem("brizza-emr-wl-buckets", JSON.stringify(st)); } catch (err) {}
  }
  function appointmentMs(a) {
    const [y, m, d] = String(a.date).split("-").map(Number);
    const parts = String(a.time || "00:00").split(":");
    return new Date(y, m - 1, d, Number(parts[0] || 0), Number(parts[1] || 0), 0).getTime();
  }
  function demoClockMs(date) {
    const clock = BRIZZA.DEMO_CLOCK || { time: "11:25" };
    const d = date || clock.date || todayET();
    const parts = String(clock.time || "11:25").split(":");
    const [y, m, day] = String(d).split("-").map(Number);
    return new Date(y, m - 1, day, Number(parts[0] || 11), Number(parts[1] || 25), 0).getTime();
  }
  function demoClockLabel() {
    const clock = BRIZZA.DEMO_CLOCK || { label: "11:25 a.m. ET" };
    return clock.label || (fmtTime(clock.time || "11:25") + " ET");
  }
  function demoClockDate() {
    return (BRIZZA.DEMO_CLOCK && BRIZZA.DEMO_CLOCK.date) || "2026-11-18";
  }
  function isLateAppointment(a) {
    if (a.status !== "Scheduled" && a.status !== "Confirmed") return false;
    return demoClockMs(a.date) > appointmentMs(a);
  }
  function nextPendingId(list) {
    const upcoming = list.filter(function (a) {
      return wlBucketFor(a) === "pending" && !isLateAppointment(a);
    }).slice().sort(function (a, b) { return a.time.localeCompare(b.time) || a.id.localeCompare(b.id); });
    return upcoming.length ? upcoming[0].id : null;
  }

  function openCollectTasks() {
    return (store.collectTasks || []).filter(function (task) { return task.open; });
  }
  function collectTasksHtml() {
    const tasks = openCollectTasks();
    if (!tasks.length) return "";
    const rows = tasks.map(function (task) {
      const p = patient(task.patientId);
      const amt = task.tbd ? "TBD" : money(task.amount || 0);
      const name = p ? patientLink(p) : esc(task.patientId);
      return '<div class="wl-task" data-collect-task="' + esc(task.id) + '"><span>Collect balance · ' + name + " · " + esc(amt) + "</span>" +
        (p ? '<a class="btn small" href="' + hashFor({ page: "patients", selected: p.id, tab: "ledger" }) + '">Open chart</a>' : "") + "</div>";
    }).join("");
    return '<div class="wl-tasks" aria-label="Collect balance tasks"><strong>Collect balance</strong>' + rows + "</div>";
  }
  function visitUnpaid(a) {
    if (!a) return { unpaid: false, tbd: false, amount: 0 };
    const inv = a.invoiceId ? invoice(a.invoiceId) : invoiceForAppt(a);
    if (inv) {
      refreshInvoiceBalance(inv);
      const tot = invoiceTotals(inv);
      if (tot.tbd) return { unpaid: true, tbd: true, amount: tot.balance || 0 };
      if (tot.balance != null && tot.balance > 0) return { unpaid: true, tbd: false, amount: tot.balance };
    }
    const bal = patientBalanceValue(a.patientId);
    if (bal && (bal.tbd || (bal.sum > 0))) return { unpaid: true, tbd: !!bal.tbd, amount: bal.sum || 0 };
    return { unpaid: false, tbd: false, amount: 0 };
  }
  function checkoutActionsHtml(a) {
    if (!a || a.status === "Checked out" || a.status === "Canceled" || a.status === "No-show") return "";
    const due = visitUnpaid(a);
    const warn = due.unpaid ? '<div class="notice checkout-unpaid-alert" role="alert">Unpaid or partial balance' + (due.tbd ? " (amount TBD)" : (due.amount ? " · " + money(due.amount) : "")) + ". Checkout is allowed.</div>" : "";
    return warn + '<div class="actions checkout-actions">' +
      '<button type="button" class="btn small primary" data-checkout-visit="' + esc(a.id) + '">Check out</button>' +
      '<button type="button" class="btn small" data-left-unpaid="' + esc(a.id) + '">Left without paying</button></div>';
  }
  function checkoutVisit(id) {
    const a = appt(id);
    if (!a) return;
    setVisitStatus(id, "Checked out", { silent: true });
    if ($("#modal") && $("#modal").classList.contains("pos-mode")) closeModal();
    toast(visitUnpaid(a).unpaid ? "Checked out with an unpaid or partial balance. Checkout is allowed." : "Status: Checked out");
    render();
  }
  function addUnpaidBalanceAlert(p) {
    if (!p) return;
    p.alerts = p.alerts || [];
    const exists = p.alerts.some(function (al) { return al.kind === "unpaid" || /unpaid balance/i.test(al.text || ""); });
    if (!exists) p.alerts.unshift({ id: nextId("AL-", p.alerts), text: "Unpaid balance", kind: "unpaid" });
  }
  function carryDueToPatient(inv) {
    if (!inv) return { amount: 0, tbd: false };
    refreshInvoiceBalance(inv);
    const tot = invoiceTotals(inv);
    const p = patient(inv.patientId);
    if (!p) return { amount: 0, tbd: !!tot.tbd };
    let remain = 0;
    const tbd = !!tot.tbd && !(tot.balance > 0);
    if (tot.balance != null && !tot.tbd) remain = Math.max(0, tot.balance);
    if (remain > 0 && !inv.carriedToAccount) {
      const before = Number(p.accountBalance || 0);
      p.accountBalance = Math.round((before + remain) * 100) / 100;
      inv.carriedToAccount = true;
      inv.balance = 0;
      addAudit({ action: "Added remaining to patient balance", recordType: "Patient", recordId: p.id,
        recordPath: { page: "patients", selected: p.id, tab: "ledger" },
        changes: [{ field: "patient balance", before: money(before), after: money(p.accountBalance) }, { field: "invoice remaining", before: money(remain), after: money(0) }] });
    }
    return { amount: remain, tbd: tbd };
  }
  function leftWithoutPaying(appointmentId) {
    const a = appt(appointmentId);
    if (!a) return;
    const inv = ensureInvoiceForAppt(a);
    const carried = carryDueToPatient(inv);
    const p = patient(a.patientId);
    addUnpaidBalanceAlert(p);
    store.collectTasks = store.collectTasks || [];
    store.collectTasks.push({
      id: nextId("CB-", store.collectTasks),
      patientId: a.patientId,
      appointmentId: a.id,
      amount: carried.amount,
      tbd: carried.tbd,
      open: true,
      createdAt: nowET()
    });
    setVisitStatus(a.id, "Checked out", { silent: true, quietUnpaid: true });
    if ($("#modal") && $("#modal").classList.contains("open")) closeModal();
    toast("Left without paying · amount due moved to the patient balance");
    render();
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
      return ((p && p.name) + " " + (p && p.firstName || "") + " " + (p && p.lastName || "") + " " + (p && p.dob || "") + " " + (p ? fmtDob(p.dob) : "") + " " + displayId(a.patientId) + " " + a.patientId + " " + a.type + " " + reasonText(a) + " " + a.id + " " + a.provider + " " + (a.prepNotes || "")).toLowerCase().includes(q);
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
      filtBtn("collect", "Collect balance", Math.max(counts.collect, openCollectTasks().length)) +
      "</div>";
    const hits = q ? scheduleSearchHits(q) : "";
    const timed = rows.slice().sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
    const goldId = nextPendingId(timed);
    const colHead = '<div class="wl-head" aria-hidden="true"><div>Time</div><div>Patient</div><div>Provider</div><div>Type</div><div>Reason</div><div>Suite</div><div>Reg</div><div>Status</div><div>Appointment notes</div><div>Balance</div><div>Invoice</div></div>';
    const collapsed = wlBucketState();
    let groups = "";
    if (isWeekend(date)) {
      groups = '<div class="cal-closed">Clinic closed · weekends are outside Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>';
    } else {
      wlBucketLabels().forEach(function (bk) {
        const set = timed.filter((a) => wlBucketFor(a) === bk.key);
        const shut = !!collapsed[bk.key];
        groups += '<section class="wl-bucket' + (shut ? " is-collapsed" : "") + '" data-wl-bucket="' + bk.key + '">' +
          '<button type="button" class="wl-bucket-h" data-wl-toggle="' + bk.key + '" aria-expanded="' + (shut ? "false" : "true") + '">' +
          '<span class="wl-bucket-label"><span class="wl-caret" aria-hidden="true">' + (shut ? "›" : "⌄") + "</span>" +
          '<span class="wl-bucket-name">' + esc(bk.label) + '</span></span> <span class="count">' + set.length + "</span></button>" +
          '<div class="wl-bucket-body">' + (set.length ? colHead + set.map(function (a) { return wlRow(a, { late: isLateAppointment(a), gold: a.id === goldId }); }).join("") : '<div class="empty">None</div>') + "</div></section>";
      });
      const blks = dayBlocks(date).slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
      if (blks.length) {
        groups += '<div class="wl-admin-blocks"><h3 class="section-title">Admin blocks</h3>' +
          blks.map(function (b) { return '<div class="block-card" style="margin:8px 0">' + esc(fmtTime(b.start)) + "–" + esc(fmtTime(b.end)) + " · " + esc(b.staff || "") + " · Admin · " + esc(b.reason) + "</div>"; }).join("") +
          "</div>";
      }
      if (!timed.length && !blks.length) groups = '<div class="empty">No appointments match the current filters.</div>' + groups;
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
            <a class="btn small" href="${hashFor({ page: "schedule", date: demoClockDate(), view: "worklist" })}">Demo day</a>
            <span class="demo-clock" title="Fixed demo time used for Late tags and the next pending row">${esc("Demo clock · " + demoClockLabel())}</span>
          </div>
          <div class="sched-tools">
            <label class="sr-only" for="sched-search">Search patients and appointments</label>
            <input id="sched-search" class="sched-search" type="search" placeholder="Search name, DOB, #ID, type…" value="${esc(state.scheduleSearch || "")}">
            <button class="btn small" type="button" data-open="new-patient">＋ New Patient</button>
            <label class="sr-only" for="locationSel">Location</label>
            <select id="locationSel">${locOpts}</select>
          </div>
        </div>
        <div class="cardbody">
          <div class="wl-toolbar">${filterBar}</div>
          ${hits}
          ${collectTasksHtml()}
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
  function wlRow(a, opts) {
    opts = opts || {};
    const p = patient(a.patientId);
    const open = state.expandedAppt === a.id;
    const suite = a.suiteId ? suiteName(a.suiteId) : "—";
    const note = a.prepNotes || "";
    const tip = '<textarea id="prep-' + esc(a.id) + '" class="wl-note" data-prep-notes="' + esc(a.id) + '" rows="3" placeholder="Appointment notes">' + esc(note) + "</textarea>";
    const late = opts.late ? '<span class="wl-late">Late</span>' : "";
    const cls = "wl-row" + (opts.gold ? " wl-next" : "") + (opts.late ? " is-late" : "");
    return '<div class="' + cls + '" data-type="' + esc(a.type) + '" data-status="' + esc(a.status) + '" data-wl-row="' + esc(a.id) + '"' + (opts.gold ? ' data-wl-next="1"' : "") + ' style="--status-bar:' + statusColor(a.status) + '">' +
      '<div class="wl-time"><span class="wl-time-val">' + esc(fmtTime(a.time)) + "</span>" + late + "</div>" +
      '<div class="wl-patient">' + (p ? patientLink(p) : esc(a.patientId)) + " " + historyIcon("Appointment", a.id) +
        (p ? '<span class="wl-sub">' + esc(fmtDob(p.dob)) + " - " + esc(displayId(p.id)) + "</span>" : "") + "</div>" +
      
      '<div class="wl-prov">' + esc(a.provider) + "</div>" +
      '<div class="wl-type">' + esc(a.type) + "</div>" +
      '<div class="wl-reason">' + esc(visitReasonLabel(a)) + "</div>" +
      '<div class="wl-suite">' + esc(suite) + "</div>" +
      '<div>' + (p ? regMinis(p, a.id) : "") + "</div>" +
      "<div>" + statusSelect(a, "wl") + "</div>" +
      '<div class="wl-notes"><label class="sr-only" for="prep-' + esc(a.id) + '">Appointment notes</label>' + tip + "</div>" +
      "<div>" + balanceBadge(patientBalanceValue(a.patientId)) + "</div>" +
      '<div class="wl-checkout-btns"><button type="button" class="btn small wl-invoice" data-open-pos="' + esc(a.id) + '">Invoice</button>' +
        ((a.status === "Ready for checkout") ? '<button type="button" class="btn small" data-left-unpaid="' + esc(a.id) + '">Left without paying</button>' : "") + "</div>" +
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

  function catalogSearchResults(q) {
    const list = store.catalog || BRIZZA.CATALOG || [];
    const s = String(q || "").trim().toLowerCase();
    return list.filter(function (c) {
      if (!s) return true;
      return (c.name + " " + (c.category || "") + " " + (c.kind || "") + " " + (c.id || "")).toLowerCase().indexOf(s) >= 0;
    });
  }
  function posCatalogListHtml(inv, q) {
    const items = catalogSearchResults(q);
    if (!items.length) return '<p class="empty">No matching products or services.</p>';
    return items.map(function (c) {
      const price = c.price != null ? money(c.price) : "TBD";
      const unit = c.unit ? " / " + esc(c.unit) : "";
      return '<div class="pos-cat-row"><div><strong>' + esc(c.name) + '</strong> <span class="row-sub">' + esc(price) + unit + '</span></div>' +
        (inv.finalized ? "" : '<button class="btn small" type="button" data-pos-add-item="' + esc(c.id) + '" data-pos-add-line="' + esc(inv.id) + '">Add</button>') +
        "</div>";
    }).join("");
  }
  function paymentStatusOptions(selected) {
    const sel = selected || "Paid";
    return (BRIZZA.paymentStatuses || []).map(function (s) {
      return "<option" + (s === sel ? " selected" : "") + ">" + s + "</option>";
    }).join("");
  }
  function bindPosSearch(inv) {
    const input = $("#posSearch");
    const list = $("#posCatalogResults");
    if (!input || !list) return;
    input.addEventListener("input", function () {
      state.posSearch = input.value;
      list.innerHTML = posCatalogListHtml(inv, input.value);
    });
  }
  function invoicePopupHtml(inv) {
    refreshInvoiceBalance(inv);
    const t = invoiceTotals(inv);
    const p = patient(inv.patientId);
    const credit = patientCredit(p);
    const lines = (inv.lines || []).map(function (l, i) {
      const amt = lineAmount(l);
      const price = l.unitPrice == null ? "" : l.unitPrice;
      return "<tr><td>" + esc(l.name || "") + (l.unit ? ' <span class="row-sub">/ ' + esc(l.unit) + "</span>" : "") + "</td>" +
        '<td><input class="qty" data-line-qty="' + i + '" type="number" min="0" step="1" value="' + esc(l.qty == null ? "" : l.qty) + '" placeholder="Qty" aria-label="Quantity"></td>' +
        '<td><input class="price" data-line-price="' + i + '" type="number" min="0" step="0.01" value="' + esc(price) + '" placeholder="TBD" aria-label="Price"></td>' +
        "<td>" + (amt == null ? "TBD" : money(amt)) + "</td>" +
        '<td><button type="button" class="btn small pos-remove" data-remove-line="' + i + '">Remove</button></td></tr>';
    }).join("") || '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
    const balLabel = t.balance == null ? (t.tbd ? "TBD" : "—") : money(t.balance);
    const amountVal = (t.balance != null && t.balance > 0 && !t.tbd) ? esc(String(t.balance)) : "";
    const q = state.posSearch || "";
    return '<div class="pos-simple pos-invoice" data-pos-popup="' + esc(inv.id) + '">' +
      '<div class="pos-invoice-grid">' +
        '<div class="pos-catalog-pane">' +
          "<h3>Products &amp; services</h3>" +
          (inv.finalized ? '<p class="row-sub">Invoice is finalized.</p>' :
            '<label class="sr-only" for="posSearch">Search products and services</label>' +
            '<input id="posSearch" type="search" placeholder="Search products and services" value="' + esc(q) + '" autocomplete="off">' +
            '<input id="posQty" class="qty" type="hidden" value="1" aria-hidden="true">' +
            '<div id="posCatalogResults" class="pos-catalog-list">' + posCatalogListHtml(inv, q) + "</div>") +
        "</div>" +
        '<div class="pos-cart-pane">' +
          "<h3>Cart</h3>" +
          '<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th><th></th></tr></thead><tbody>' + lines + "</tbody></table>" +
          '<div class="pos-totals"><div>Total ' + esc(t.label) + "</div>" +
            '<div>Available credit <strong>' + money(credit) + "</strong> " +
            (credit > 0 && !inv.finalized ? '<button class="btn small" type="button" data-apply-credit="' + esc(inv.id) + '">Apply</button>' : "") + "</div>" +
            '<div class="grand">Balance ' + esc(balLabel) + "</div></div>" +
          (inv.finalized ? "" :
            '<div class="pos-pay">' +
            '<label class="sr-only" for="pay-status">Payment status</label>' +
            '<select id="pay-status" aria-label="Payment status">' + paymentStatusOptions("Paid") + "</select>" +
            '<label class="sr-only" for="pay-amount">Payment amount</label>' +
            '<input id="pay-amount" class="qty" type="number" min="0" step="0.01" placeholder="Amount" aria-label="Payment amount" value="' + amountVal + '">' +
            '<button class="btn small primary" type="button" data-record-pay="' + esc(inv.id) + '">Record payment</button></div>' +
            '<div class="actions" style="margin-top:10px">' +
            '<button class="btn small" type="button" data-print-receipt="' + esc(inv.id) + '">Print receipt</button>' +
            '<button class="btn small" type="button" data-add-remaining="' + esc(inv.id) + '">Add remaining to patient balance</button></div>') +
        "</div>" +
      "</div>" +
      '<p class="row-sub"><a href="' + hashFor({ page: "pos", invoiceId: inv.id, posTab: "invoice" }) + '">Open full Point of Sale page</a></p>' +
      checkoutActionsHtml(appt(state.posAppointmentId) || (inv.appointmentIds || []).map(appt)[0]) +
      "</div>";
  }
  function printInvoiceReceipt(invId) {
    const inv = invoice(invId);
    if (!inv) return;
    refreshInvoiceBalance(inv);
    const t = invoiceTotals(inv);
    const p = patient(inv.patientId);
    const a = appt(state.posAppointmentId) || (inv.appointmentIds || []).map(appt)[0];
    const loc = a ? locationName(a.locationId) : "";
    const lineRows = (inv.lines || []).map(function (l) {
      const amt = lineAmount(l);
      return "<tr><td>" + esc(l.name || "") + "</td><td>" + esc(l.qty == null ? "—" : String(l.qty)) + "</td><td>" +
        esc(l.unitPrice == null ? "TBD" : money(l.unitPrice)) + "</td><td>" + (amt == null ? "TBD" : money(amt)) + "</td></tr>";
    }).join("") || "<tr><td colspan=\"4\">No items</td></tr>";
    const pays = (inv.payments || []).map(function (pay) {
      return "<div>" + esc(pay.method || pay.status || "Payment") + " · " + esc(pay.status || "") + " · " +
        esc(pay.amount != null ? money(pay.amount) : "") + (pay.recorded ? " · " + esc(pay.recorded) : "") + "</div>";
    }).join("");
    const html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>Receipt · " + esc(inv.id) + "</title>" +
      "<style>body{font-family:Georgia,'Times New Roman',serif;color:#352820;margin:24px;max-width:640px}" +
      "h1{font-size:22px;margin:0 0 4px;font-weight:600}h2{font-size:16px;margin:16px 0 8px;font-weight:600}" +
      "p,div{font-size:13px;line-height:1.45}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}" +
      "th,td{text-align:left;padding:6px 0;border-bottom:1px solid #d8d0c8}th{font-weight:600}" +
      ".tot{font-weight:700;margin-top:8px}@media print{body{margin:12px}}</style></head><body>" +
      "<h1>Brizza</h1><p>Receipt</p>" +
      "<p>" + esc(inv.id) + (loc ? " · " + esc(loc) : "") + "</p>" +
      (p ? "<p>Patient: " + esc(p.name) + " · " + esc(displayId(p.id)) + "</p>" : "") +
      (a ? "<p>" + esc(fmtLong(a.date)) + " · " + esc(fmtTime(a.time)) + " · " + esc(a.type) + "</p>" : "") +
      "<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>" + lineRows + "</tbody></table>" +
      '<p class="tot">Total ' + esc(t.label) + "</p>" +
      '<p class="tot">Balance ' + esc(t.balance == null ? (t.tbd ? "TBD" : "—") : money(t.balance)) + "</p>" +
      (pays ? "<h2>Payments</h2>" + pays : "") +
      "</body></html>";
    const w = window.open("", "brizza-receipt");
    if (!w) { toast("Allow pop-ups to print the receipt"); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }
  function paintInvoiceLive(inv) {
    const wrap = document.querySelector(".pos-simple");
    if (!wrap || !inv) return;
    refreshInvoiceBalance(inv);
    const t = invoiceTotals(inv);
    const rows = wrap.querySelectorAll("tbody tr");
    (inv.lines || []).forEach(function (l, i) {
      if (rows[i] && rows[i].cells[3]) rows[i].cells[3].textContent = lineAmount(l) == null ? "TBD" : money(lineAmount(l));
    });
    const box = wrap.querySelector(".pos-totals");
    if (box) {
      const els = box.querySelectorAll("div");
      if (els[0]) els[0].textContent = "Total " + t.label;
      if (els[els.length - 1]) els[els.length - 1].textContent = "Balance " + (t.balance == null ? (t.tbd ? "TBD" : "—") : money(t.balance));
    }
  }
  function refreshInvoicePopup() {
    if (!$("#modal") || !$("#modal").classList.contains("pos-mode")) return;
    const inv = invoice(state.invoiceId);
    if (!inv) return;
    const p = patient(inv.patientId);
    const a = appt(state.posAppointmentId) || (inv.appointmentIds || []).map(appt)[0];
    $("#modalTitle").textContent = "Invoice · " + inv.id + (p ? " · " + p.name : "");
    const sub = a ? ('<p class="row-sub">' + esc(fmtLong(a.date)) + " · " + esc(fmtTime(a.time)) + " · " + esc(a.type) + " · " + esc(a.provider) + "</p>") : "";
    if ($("#posSearch")) state.posSearch = $("#posSearch").value;
    $("#modalBody").innerHTML = sub + invoicePopupHtml(inv);
    bindPosSearch(inv);
  }
  function ensureInvoiceForPatient(pid) {
    const id = nextId("INV-", store.invoices);
    const inv = { id: id, patientId: pid, visitId: null, appointmentIds: [], status: "Draft", balance: 0, lines: [], payments: [], finalized: false, finalizedAt: null, movements: [] };
    store.invoices.push(inv);
    addAudit({ action: "Opened invoice from ledger", recordType: "Invoice", recordId: id,
      recordPath: { page: "pos", invoiceId: id },
      changes: [{ field: "invoice", before: "—", after: id }] });
    return inv;
  }
  function openInvoicePopup(inv, apptId) {
    if (!inv) return;
    const p = patient(inv.patientId);
    const a = apptId ? appt(apptId) : appt((inv.appointmentIds || [])[0]);
    state.invoiceId = inv.id;
    state.posAppointmentId = a ? a.id : null;
    $("#modalTitle").textContent = "Invoice · " + inv.id + " · " + (p ? p.name : inv.patientId);
    state.posSearch = "";
    const sub = a
      ? ('<p class="row-sub">' + esc(fmtLong(a.date)) + " · " + esc(fmtTime(a.time)) + " · " + esc(a.type) + " · " + esc(a.provider) + "</p>")
      : '<p class="row-sub">Patient invoice (not tied to a visit)</p>';
    $("#modalBody").innerHTML = sub + invoicePopupHtml(inv);
    bindPosSearch(inv);
    const save = $("#modalSave");
    save.textContent = "Done";
    save.onclick = function () { closeModal(); if (state.page === "schedule") renderWorklist(); else render(); };
    $("#modal").classList.add("open", "pos-mode");
    $("#modal").classList.remove("hist-mode");
  }
  function openPosPopup(apptId) {
    const a = appt(apptId);
    if (!a) return;
    openInvoicePopup(ensureInvoiceForAppt(a), a.id);
  }
  function openLedgerInvoice(pid) {
    if (!patient(pid)) return;
    openInvoicePopup(ensureInvoiceForPatient(pid), null);
  }
  function openLedgerPayment(pid) {
    const p = patient(pid);
    if (!p) return;
    showModal("Add payment · " + p.name,
      '<p class="row-sub">Record a payment that is not tied to an invoice, such as a prepayment. The amount is added to patient credit.</p>' +
      '<div class="formgrid">' +
      '<div class="field"><label for="lpAmount">Amount <span class="req">required</span></label><input id="lpAmount" type="number" min="0" step="0.01" inputmode="decimal"></div>' +
      '<div class="field"><label for="lpMethod">Method <span class="req">required</span></label>' +
      '<select id="lpMethod"><option value="">Select</option><option>Card</option><option>Cash</option><option>Other</option></select></div>' +
      '<div class="field full"><label for="lpNote">Note</label><input id="lpNote" placeholder="Prepayment or other note"></div>' +
      "</div>" +
      '<div id="lpWarn"></div>',
      function () { saveLedgerPayment(pid); }, "Add payment");
  }
  function saveLedgerPayment(pid) {
    const p = patient(pid);
    if (!p) return;
    const raw = $("#lpAmount") ? $("#lpAmount").value : "";
    const amount = Number(raw);
    const method = $("#lpMethod") ? $("#lpMethod").value : "";
    const note = ($("#lpNote") && $("#lpNote").value.trim()) || "Prepayment";
    if (raw === "" || Number.isNaN(amount) || amount <= 0 || !method) {
      const w = $("#lpWarn");
      if (w) w.innerHTML = '<div class="notice">Amount and method are required.</div>';
      toast("Amount and method are required");
      return;
    }
    const rec = { id: nextId("LPAY-", p.ledgerPayments || []), kind: "Prepayment", amount: Math.round(amount * 100) / 100, method: method, status: "Paid", recorded: nowET(), note: note };
    p.ledgerPayments = p.ledgerPayments || [];
    p.ledgerPayments.push(rec);
    const before = patientCredit(p);
    p.credit = Math.round((before + rec.amount) * 100) / 100;
    addAudit({ action: "Recorded ledger payment", recordType: "Patient", recordId: p.id,
      recordPath: { page: "patients", selected: p.id, tab: "ledger" },
      changes: [{ field: "credit", before: money(before), after: money(p.credit) }, { field: "payment", before: "—", after: money(rec.amount) + " · " + method }] });
    closeModal();
    toast("Payment added to patient credit");
    render();
  }
  function applyInvoiceCredit(invId) {
    const inv = invoice(invId); if (!inv || inv.finalized) return;
    const p = patient(inv.patientId); if (!p) return;
    refreshInvoiceBalance(inv);
    const t = invoiceTotals(inv);
    const credit = patientCredit(p);
    const due = (t.balance != null && !t.tbd) ? t.balance : 0;
    const use = Math.min(credit, Math.max(0, due));
    if (use <= 0) { toast("No credit to apply"); return; }
    const before = credit;
    p.credit = Math.round((credit - use) * 100) / 100;
    inv.payments = inv.payments || [];
    inv.payments.push({ id: nextId("PAY-", inv.payments), method: "Account credit", status: "Paid", recorded: nowET(), amount: use });
    refreshInvoiceBalance(inv);
    addAudit({ action: "Applied patient credit", recordType: "Invoice", recordId: inv.id,
      recordPath: { page: "pos", invoiceId: inv.id },
      changes: [{ field: "credit applied", before: money(before), after: money(use) }, { field: "credit remaining", before: money(before), after: money(p.credit) }] });
    toast("Applied " + money(use) + " credit");
    refreshInvoicePopup();
  }
  function addRemainingToBalance(invId) {
    const inv = invoice(invId); if (!inv || inv.finalized) return;
    const p = patient(inv.patientId); if (!p) return;
    refreshInvoiceBalance(inv);
    const t = invoiceTotals(inv);
    let remain = 0;
    if (t.balance != null && !t.tbd) remain = Math.max(0, t.balance);
    else { toast("Remaining amount is TBD"); return; }
    if (remain <= 0) { toast("Nothing remaining"); return; }
    const before = Number(p.accountBalance || 0);
    p.accountBalance = Math.round((before + remain) * 100) / 100;
    inv.carriedToAccount = true;
    inv.balance = 0;
    addAudit({ action: "Added remaining to patient balance", recordType: "Patient", recordId: p.id,
      recordPath: { page: "patients", selected: p.id, tab: "ledger" },
      changes: [{ field: "patient balance", before: money(before), after: money(p.accountBalance) }, { field: "invoice remaining", before: money(remain), after: money(0) }] });
    toast("Added " + money(remain) + " to patient balance");
    refreshInvoicePopup();
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

  function noteFieldsOf(n) { return (n && (n.fields || n.values)) || {}; }
  function isNoteSigned(n) {
    const st = (n && n.status) || "Open";
    return st === "Signed" || st === "Locked" || !!(n && n.locked);
  }
  function isNoteEditable(n) { return !isNoteSigned(n); }
  function templateIdFromNote(n) {
    if (n && n.templateId) return n.templateId;
    const tpls = BRIZZA.NOTE_TEMPLATES || [];
    const hit = tpls.find(function (t) { return t.name === (n && n.type); });
    return hit ? hit.id : "";
  }
  function isConsultNote(n) {
    const id = (n && n.templateId) || "";
    return /-consult$/.test(id) || /consult/i.test((n && n.type) || "");
  }
  function procedureTemplateId(n) {
    const id = (n && n.templateId) || "";
    if (id.indexOf("aes-") === 0 || /aesthetician/i.test((n && n.type) || "")) return "aes-procedure";
    return "inj-procedure";
  }
  function requiredMark(labelFor) {
    return ' <span class="req-star" aria-hidden="true">*</span><span class="sr-only">required</span>';
  }
  function builderQuestions(tpl) {
    if (!tpl) return null;
    return (BRIZZA.NOTE_BUILDER && BRIZZA.NOTE_BUILDER[tpl.id]) || null;
  }
  function questionVisible(q, values) {
    if (!q.showIf) return true;
    const v = values[q.showIf.field];
    if (q.showIf.equals !== undefined) return v === q.showIf.equals;
    if (q.showIf.in) return (q.showIf.in || []).indexOf(v) >= 0;
    if (q.showIf.filled) return !!(v && String(v).trim());
    return true;
  }
  function missingAnyNoteFields(tpl, values) {
    const qs = builderQuestions(tpl);
    if (!qs) return missingNoteFields(tpl, values);
    const missing = [];
    qs.forEach(function (q) {
      if (!q.required || !questionVisible(q, values)) return;
      if (!(values[q.id] || "").toString().trim()) missing.push(q.label);
    });
    return missing;
  }
  function compileNoteSentences(tpl, values, draft) {
    const qs = builderQuestions(tpl) || [];
    const sentences = [];
    qs.forEach(function (q) {
      if (!q.sentence || !questionVisible(q, values || {})) return;
      const v = ((values || {})[q.id] || "").toString().trim();
      if (!v) return;
      const line = q.sentence.replace(/\{([^}]+)\}/g, function (_, k) { return ((values || {})[k] || "").toString().trim(); });
      if (line && line.indexOf("{") < 0 && !/:\s*\.?$/.test(line)) sentences.push(line);
    });
    if (draft && draft.facePoints && draft.facePoints.length) {
      const named = draft.facePoints.map(function (pt) {
        const units = (pt.units || "").toString().trim();
        return units ? (pt.name + ", with units recorded as " + units) : pt.name;
      });
      sentences.push("Areas marked on the face map: " + named.join("; ") + ".");
    }
    return sentences.join(" ");
  }
  function faceMapEnabled(tpl) {
    return !!(tpl && (tpl.id === "inj-procedure" || (tpl.sections || []).some(function (s) {
      return (s.fields || []).some(function (f) { return f.id === "areasTreated"; });
    })));
  }
  function faceRegions() {
    return [
      { id: "forehead", name: "Forehead", shape: "path", d: "M50 50 C78 34 122 34 150 50 L146 78 C118 68 82 68 54 78 Z" },
      { id: "glabella", name: "Glabella", shape: "path", d: "M88 78 L112 78 L110 96 L90 96 Z" },
      { id: "brow-l", name: "Left brow", shape: "path", d: "M52 80 L86 78 L84 90 L54 92 Z" },
      { id: "brow-r", name: "Right brow", shape: "path", d: "M114 78 L148 80 L146 92 L116 90 Z" },
      { id: "crows-l", name: "Left crow's feet", shape: "path", d: "M40 96 L58 100 L56 116 L36 112 Z" },
      { id: "crows-r", name: "Right crow's feet", shape: "path", d: "M142 100 L160 96 L164 112 L144 116 Z" },
      { id: "bunny", name: "Bunny lines", shape: "path", d: "M92 100 L108 100 L106 118 L94 118 Z" },
      { id: "masseter-l", name: "Left masseter", shape: "path", d: "M40 118 L62 122 L60 160 L36 148 Z" },
      { id: "masseter-r", name: "Right masseter", shape: "path", d: "M138 122 L160 118 L164 148 L140 160 Z" },
      { id: "dao-l", name: "Left DAO", shape: "path", d: "M70 148 L90 150 L86 168 L66 164 Z" },
      { id: "dao-r", name: "Right DAO", shape: "path", d: "M110 150 L130 148 L134 164 L114 168 Z" },
      { id: "perioral", name: "Perioral", shape: "path", d: "M84 148 L116 148 L114 166 L86 166 Z" },
      { id: "chin", name: "Chin", shape: "path", d: "M86 168 L114 168 L110 190 L90 190 Z" }
    ];
  }
  function syncAreasFromFace(draft) {
    if (!draft) return;
    const names = (draft.facePoints || []).map(function (pt) { return pt.name; });
    draft.values = draft.values || {};
    draft.values.areasTreated = names.join(", ");
    const input = $("#nf-areasTreated");
    if (input) input.value = draft.values.areasTreated;
  }
  function faceMapHtml(tpl, draft) {
    if (!faceMapEnabled(tpl)) return "";
    const selected = {};
    (draft.facePoints || []).forEach(function (pt) { selected[pt.id] = pt; });
    const regions = faceRegions().map(function (r) {
      const on = selected[r.id] ? " is-on" : "";
      return '<path class="region' + on + '" data-region="' + esc(r.id) + '" data-name="' + esc(r.name) + '" d="' + r.d + '" tabindex="0" role="button" aria-pressed="' + (selected[r.id] ? "true" : "false") + '" aria-label="' + esc(r.name) + '"></path>';
    }).join("");
    const points = (draft.facePoints || []).map(function (pt) {
      return '<div class="face-point" data-face-point="' + esc(pt.id) + '"><span>' + esc(pt.name) + "</span>" +
        '<label class="sr-only" for="fu-' + esc(pt.id) + '">Units for ' + esc(pt.name) + "</label>" +
        '<input id="fu-' + esc(pt.id) + '" data-face-units="' + esc(pt.id) + '" type="text" inputmode="decimal" value="' + esc(pt.units || "") + '" aria-label="Units for ' + esc(pt.name) + '">' +
        '<button type="button" class="btn small x" data-face-remove="' + esc(pt.id) + '" aria-label="Remove ' + esc(pt.name) + '">×</button></div>';
    }).join("") || '<p class="row-sub">Tap a region to mark it. Units start empty; enter a number only if you are recording one.</p>';
    return '<div class="face-map" id="faceMap">' +
      '<svg viewBox="0 0 200 240" role="img" aria-label="Face map of treatment areas">' +
      '<ellipse cx="100" cy="120" rx="70" ry="92" fill="#FFFCF6" stroke="#352820" stroke-width="1.2" pointer-events="none"></ellipse>' +
      '<path d="M36 96 C48 36 152 36 164 96" fill="none" stroke="#352820" stroke-width="1" pointer-events="none"></path>' +
      '<path d="M68 110 C76 114 84 114 90 110" fill="none" stroke="#B8AA9B" stroke-width="1.1" pointer-events="none"></path>' +
      '<path d="M110 110 C116 114 124 114 132 110" fill="none" stroke="#B8AA9B" stroke-width="1.1" pointer-events="none"></path>' +
      '<path d="M100 112 L100 132" fill="none" stroke="#B8AA9B" stroke-width="1" pointer-events="none"></path>' +
      '<path d="M90 154 C100 160 110 160 110 154" fill="none" stroke="#B8AA9B" stroke-width="1.1" pointer-events="none"></path>' +
      regions + "</svg>" +
      '<div class="face-points" id="facePoints">' + points + "</div></div>";
  }
  function bindFaceMap(draft) {
    const root = $("#faceMap");
    if (!root || !draft) return;
    const toggle = function (id, name) {
      draft.facePoints = draft.facePoints || [];
      const i = draft.facePoints.findIndex(function (pt) { return pt.id === id; });
      if (i >= 0) draft.facePoints.splice(i, 1);
      else draft.facePoints.push({ id: id, name: name, units: "" });
      draft.previewEdited = false;
      syncAreasFromFace(draft);
      const wrap = root.parentNode;
      const html = faceMapHtml((BRIZZA.NOTE_TEMPLATES || []).find(function (t) { return t.id === draft.templateId; }), draft);
      root.outerHTML = html;
      bindFaceMap(draft);
      updateNoteSignState();
    };
    $$("[data-region]", root).forEach(function (el) {
      const act = function (e) { e.preventDefault(); toggle(el.getAttribute("data-region"), el.getAttribute("data-name")); };
      el.addEventListener("click", act);
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") act(e); });
    });
    $$("[data-face-remove]", root.parentNode || root).forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        const id = btn.getAttribute("data-face-remove");
        const pt = (draft.facePoints || []).find(function (x) { return x.id === id; });
        toggle(id, pt ? pt.name : id);
      });
    });
    $$("[data-face-units]", root.parentNode || document).forEach(function (inp) {
      inp.addEventListener("input", function () {
        const id = inp.getAttribute("data-face-units");
        const pt = (draft.facePoints || []).find(function (x) { return x.id === id; });
        if (pt) pt.units = inp.value;
        draft.previewEdited = false;
        updateNoteSignState();
      });
    });
  }
  function noteBuilderHtml(tpl, draft) {
    const qs = builderQuestions(tpl);
    if (!qs) return "";
    const values = draft.values || {};
    const fields = qs.map(function (q) {
      if (!questionVisible(q, values)) return "";
      return noteFieldControl({ id: q.id, label: q.label, type: q.type || "text", required: !!q.required, options: q.options || [] }, values[q.id]);
    }).join("");
    return '<div class="note-builder" id="noteBuilder">' + fields + "</div>";
  }
  function bindNoteBuilder(draft) {
    const wrap = $("#noteBuilder");
    if (!wrap || !draft) return;
    const bind = function () {
      $$("[data-nf]", wrap).forEach(function (el) {
        el.addEventListener("change", function () {
          draft.values = collectNoteValues();
          draft.previewEdited = false;
          const tpl = (BRIZZA.NOTE_TEMPLATES || []).find(function (t) { return t.id === draft.templateId; });
          const keep = el.id;
          const html = noteBuilderHtml(tpl, draft);
          const tmp = document.createElement("div");
          tmp.innerHTML = html;
          const next = tmp.querySelector("#noteBuilder") || tmp.firstElementChild;
          if (next) wrap.innerHTML = next.innerHTML;
          bind();
          const again = keep && document.getElementById(keep);
          if (again) again.focus();
          updateNoteSignState();
        });
        el.addEventListener("input", updateNoteSignState);
      });
    };
    bind();
  }
  function notesListHtml(p) {
    p = p || patient(state.selected);
    if (!p) return "";
    const q = (state.notesSearch || "").trim().toLowerCase();
    const all = (p.notes || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const rows = all.filter((n) => !q || ((n.type || "") + " " + (n.status || "") + " " + (n.text || "") + " " + (n.provider || "")).toLowerCase().includes(q));
    const list = rows.map(function (n) {
      const st = n.status || "Open";
      const canEdit = isNoteEditable(n);
      return '<div class="row"><div><div class="row-title">' + esc(fmtDate(n.date)) + " · " + esc(n.type || "Note") + '</div><div class="row-sub">' + esc(n.provider || "") + "</div></div>" +
        badge(st) +
        '<div class="actions">' +
        (canEdit ? '<button class="btn small" type="button" data-edit-note="' + n.id + '" data-pid="' + p.id + '">Edit</button>' : "") +
        '<button class="btn small" type="button" data-open="note-view" data-pid="' + p.id + '" data-nid="' + n.id + '">View</button>' +
        '<button class="btn small" type="button" data-print-note="' + p.id + '" data-nid="' + n.id + '">View/Print</button></div></div>';
    }).join("") || '<div class="empty">No clinical notes for this patient.</div>';
    return '<div class="card notes-list"><div class="cardhead"><h2>Clinical notes</h2>' +
      '<button class="btn small" type="button" data-open="note-composer" data-pid="' + p.id + '">Add new note</button></div>' +
      '<div class="cardbody" style="padding:12px">' +
      '<label class="sr-only" for="notes-search">Search clinical notes</label>' +
      '<input id="notes-search" class="searchbox" placeholder="Search notes for this patient" value="' + esc(state.notesSearch || "") + '">' +
      "<div>" + list + "</div></div></div>";
  }

  function findPatientHtml() {
    const q = (state.patientFind || "").trim().toLowerCase();
    const hits = q ? store.patients.filter((p) => (p.name + " " + p.firstName + " " + p.lastName + " " + p.id + " " + displayId(p.id) + " " + p.dob + " " + fmtDob(p.dob) + " " + p.phone).toLowerCase().includes(q)).slice(0, 8) : [];
    const list = hits.map((p) => '<a class="row" href="' + hashFor({ page: "patients", selected: p.id, tab: state.tab || "demographics" }) + '"><div><div class="row-title">' + esc(p.name) + '</div><div class="row-sub">' + esc(fmtDob(p.dob)) + " - " + esc(displayId(p.id)) + "</div></div></a>").join("");
    return '<div class="field find-patient"><div class="actions"><label class="sr-only" for="patient-find">Find patient</label><input id="patient-find" class="searchbox" placeholder="Find patient (name, DOB, #ID)" value="' + esc(state.patientFind || "") + '"> <button class="btn small" type="button" data-open="new-patient">＋ New Patient</button></div>' + (q ? '<div>' + (list || '<div class="empty">No match</div>') + "</div>" : "") + "</div>";
  }
  function alertsBanner(p, opts) {
    opts = opts || {};
    const list = (p && p.alerts) || [];
    if (!list.length && opts.readonly) return "";
    const items = list.map(function (al) {
      const rm = opts.readonly ? "" : ' <button type="button" class="pos-x" data-remove-alert="' + esc(al.id) + '" data-pid="' + esc(p.id) + '" aria-label="Remove alert">×</button>';
      return '<span class="alert-item">' + esc(al.text) + rm + "</span>";
    }).join(" ");
    const add = opts.readonly ? "" : ' <button class="btn small" type="button" data-add-alert="' + esc(p.id) + '">Add alert</button>';
    if (!list.length) return '<div class="row-sub">No patient alerts.' + add + "</div>";
    const unpaid = list.some(function (al) { return al.kind === "unpaid" || /unpaid balance/i.test(al.text || ""); });
    return '<div class="alert-banner' + (unpaid ? " unpaid" : "") + '" role="status"><strong>Patient alerts</strong>' + items + add + "</div>";
  }
  function patientNotesHtml(p) {
    const rows = (p.patientNotes || []).slice().reverse().map(function (n) {
      return '<div class="row"><div><div class="row-title">' + esc(n.text) + '</div><div class="row-sub">' + esc(n.when) + " · " + esc(n.who) + "</div></div></div>";
    }).join("") || '<div class="empty">No patient notes</div>';
    return rows + '<div class="field" style="margin-top:8px"><label class="sr-only" for="pnote">Add a patient note</label><input id="pnote" placeholder="Add a non-clinical note">' +
      '<button class="btn small" type="button" data-add-pnote="' + esc(p.id) + '">Add note</button></div>';
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
    const adds = (n.addenda || []).map(function (a) {
      return "<h2>Addendum</h2><p>" + esc(a.text || "") + "</p><p>" + esc(a.who || "") + " · " + esc(a.when || "") + "</p>";
    }).join("");
    printView("Clinical note · " + p.name, "<p><strong>" + esc(n.type || "Note") + "</strong> · " + esc(n.status || "") + " · " + esc(fmtDate(n.date)) + " · " + esc(n.provider || "") + (n.signedAt ? " · Signed " + esc(n.signedAt) : "") + "</p><p>" + esc(n.text || "") + "</p>" + adds);
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
        (key === "notes" && state.page === "notes") ||
        (key === "schedule" && state.page === "schedule") ||
        (key === "queue" && state.page === "queue") ||
        (key === "rooming" && state.page === "rooming") ||
        (key === "pos" && (state.page === "pos" || state.page === "checkout")) ||
        (key === "inventory" && state.page === "inventory") ||
        (key === "availability" && state.page === "availability") ||
        (key === "types" && (state.page === "types" || state.page === "reasons")) ||
        (key === "configuration" && state.page === "configuration");
      return '<a href="' + href + '" class="' + (active ? "active" : "") + '" data-nav="' + key + '"><span class="ico">' + icon + "</span>" + label + "</a>";
    };
    $("#app-root").innerHTML = `
      <a class="skip" href="#main">Skip to content</a>
      <div class="shell">
        <aside class="side">
          <div class="brand"><span class="brand-name"><span class="brand-b">B</span>rizza</span><small>clinic workspace</small></div>
          <div class="nav-label">Workspace</div>
          <nav class="nav" aria-label="Workspace">
            ${nav(hashFor({ page: "schedule", date: state.date, view: state.scheduleView, calMode: state.calMode }), "schedule", "Schedule", "▦")}
            ${nav(hashFor({ page: "patients", selected: state.selected, tab: state.tab }), "patients", "Patients", "♙")}
            ${nav(hashFor({ page: "notes", notesDash: state.notesDash || "pending" }), "notes", "Notes", "✎")}
            ${nav(hashFor({ page: "queue", date: state.date }), "queue", "Work queue", "☷")}
            ${nav(hashFor({ page: "rooming" }), "rooming", "Rooming", "▣")}
            ${nav(hashFor({ page: "pos" }), "pos", "Point of Sale", "☰")}
            ${nav(hashFor({ page: "inventory" }), "inventory", "Inventory", "▦")}
          </nav>
          <div class="nav-label">Clinic</div>
          <nav class="nav" aria-label="Clinic">
            ${nav(hashFor({ page: "availability" }), "availability", "Availability", "◷")}
            ${nav(hashFor({ page: "types" }), "types", "Appointment Types", "▤")}
            ${nav(hashFor({ page: "reasons" }), "types", "Appointment Reasons", "▤")}
            ${nav(hashFor({ page: "configuration" }), "configuration", "Configuration", "⚙")}
          </nav>
        </aside>
        <main class="main" id="main">
          <header class="top">
            <div class="crumb">Brizza Clinic / ${crumb}</div>
            <div class="topright">
              <span class="disclaimer">Synthetic data · prototype, not a production EMR</span>
              <span class="clinic-pill">${esc(BRIZZA.CLINIC.location)}</span>
              <div class="user-bar">
                <div class="avatar">SC</div>
                <div>
                  <div class="user-who">Serena Collins</div>
                  <div class="user-title">Clinic Coordinator</div>
                  <div class="user-perm">Permission: ${esc(state.actingRole)}</div>
                </div>
                ${actingSelectHtml()}
              </div>
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
    const vlink = a.visitId ? ' · <a href="' + hashFor({ page: "visit", visitId: a.visitId }) + '">' + esc(a.visitId) + "</a>" : "";
    const reason = visitReasonLabel(a) || reasonText(a);
    return `<div class="row appt-hist-row">
      <div>
        <div class="row-title">${esc(fmtDate(a.date))} · ${esc(fmtTime(a.time))} · ${esc(a.type)}${reason ? " · " + esc(reason) : ""}</div>
        <div class="row-sub">${esc(a.provider)} · ${esc(a.id)}${a.durationLabel || durationLabelFor(a.type, a.reasons) ? " · " + esc(a.durationLabel || durationLabelFor(a.type, a.reasons)) : ""}${vlink} · Invoice: ${invoiceBadge(a)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${badge(a.status)}
        <a class="btn small" href="${hashFor({ page: "schedule", date: a.date, appointmentId: a.id })}">Open</a>
      </div>
    </div>`;
  }

  function chartSection(p) {
    let body = "";
    if (state.tab === "demographics") {
      body = '<div class="two"><div><h3 class="section-title">Patient identity</h3>' +
        '<div class="row"><span>Patient number</span><strong class="pid">' + esc(displayId(p.id)) + "</strong></div>" +
        '<div class="row"><span>Date of birth</span><strong>' + esc(fmtDob(p.dob)) + "</strong></div>" +
        '<div class="row"><span>Phone</span><strong>' + esc(p.phone) + "</strong></div>" +
        '<div class="row"><span>Email</span><strong>' + esc(p.email) + "</strong></div>" +
        '<div class="row"><span>Address</span><strong>' + formatAddressHtml(addressPartsOf(p)) + "</strong></div></div>" +
        '<div><h3 class="section-title">Patient status</h3>' +
        '<label class="sr-only" for="pstatus">Patient status</label>' +
        '<select id="pstatus" data-set-status="' + p.id + '">' + BRIZZA.patientStatuses.map((s) => "<option" + (p.status === s ? " selected" : "") + ">" + s + "</option>").join("") + "</select>" +
        '<div class="notice">One centralized chart. Patient number is immutable and never reused.</div>' +
        '<button class="btn primary confirm-demo" type="button" data-confirm-demo="' + p.id + '">Confirm Demographics</button>' +
        '<h3 class="section-title history-block">' + historyIcon("Patient", p.id) + " History</h3>" +
        '<h3 class="section-title">Patient notes</h3><p class="row-sub">Non-clinical notes, timestamped with the author.</p>' +
        patientNotesHtml(p) +
        "</div></div>";
    } else if (state.tab === "clinical-profile") {
      const rows = (items, empty) => items.length ? items.map((x) => '<div class="row"><span>' + esc(Array.isArray(x) ? x.join(" · ") : x) + '</span><span class="badge">Recorded</span></div>').join("") : '<div class="empty">' + empty + "</div>";
      body = `<div class="profile-block"><div class="two"><div><h3 class="section-title">Medical history</h3>${rows(p.conditions, "No history items recorded")}
        <h3 class="section-title" style="margin-top:18px">Medications</h3>${rows(p.meds, "No current medications recorded")}
        <h3 class="section-title" style="margin-top:18px">Pharmacy</h3>${p.pharmacy ? '<div class="row"><span>' + esc(p.pharmacy) + "</span></div>" : '<div class="empty">No pharmacy recorded (if applicable)</div>'}</div>
        <div><h3 class="section-title">Allergies and alerts</h3>${rows(p.allergies, "No allergy information recorded")}</div></div></div>
        <div class="profile-block"><h3 class="section-title">Treatment history</h3>${p.treatments && p.treatments.length ? p.treatments.map((tr) => '<div class="row"><span>' + esc(tr) + '</span><span class="badge">Recorded</span></div>').join("") : '<div class="empty">No treatment recorded. Appointment or consultation completion does not imply treatment.</div>'}</div>`;
    } else if (state.tab === "appointments") {
      const list = apptsFor(p).slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      body = `<div class="labelrow"><h3 class="section-title">Appointment history</h3>
        <a class="btn small primary" href="#modal-book" data-open="book" data-pid="${p.id}">＋ Schedule appointment</a></div>
        <div class="scroll-list appt-history">${list.map(appointmentRow).join("") || '<div class="empty">No appointments</div>'}</div>`;
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
      const pays = (p.ledgerPayments || []).slice().reverse();
      const credit = patientCredit(p);
      const payRows = pays.map(function (pay) {
        return '<div class="row"><div><div class="row-title">' + esc(pay.kind || "Payment") + " · " + esc(money(pay.amount)) + '</div><div class="row-sub">' +
          esc(pay.method || "") + " · " + esc(pay.recorded || "") + (pay.note ? " · " + esc(pay.note) : "") + "</div></div>" + badge(pay.status || "Paid") + "</div>";
      }).join("") || '<div class="empty">No ledger payments yet</div>';
      const invRows = invs.map((inv) => '<a class="row" href="' + hashFor({ page: "checkout", invoiceId: inv.id }) + '"><div><div class="row-title">' + esc(inv.id) + '</div><div class="row-sub">Balance: ' +
        esc(typeof inv.balance === "number" ? money(inv.balance) : inv.balance) + "</div></div>" + badge(inv.status) + "</a>").join("") || '<div class="empty">No invoices</div>';
      body = '<h3 class="section-title">Patient ledger</h3>' +
        '<div class="ledger-actions">' +
        '<button class="btn small primary" type="button" data-ledger-invoice="' + esc(p.id) + '">Create invoice</button>' +
        '<button class="btn small" type="button" data-ledger-payment="' + esc(p.id) + '">Add payment</button></div>' +
        '<div class="ledger-credit">Available credit <strong>' + money(credit) + "</strong></div>" +
        '<p class="row-sub">Payment status is independent of appointment status. A blank payment, such as a prepayment, is added to patient credit.</p>' +
        "<h3 class=\"section-title\">Invoices</h3>" + invRows +
        "<h3 class=\"section-title\" style=\"margin-top:16px\">Payments</h3>" + payRows;
    } else if (state.tab === "quotes") {
      const qs = (store.quotes || []).filter((q) => q.patientId === p.id);
      body = `<h3 class="section-title">Quotes</h3>
        ${qs.map((q) => '<a class="row" href="' + hashFor({ page: "pos", posTab: "quotes", quoteId: q.id }) + '"><div><div class="row-title">' + esc(q.name) + '</div><div class="row-sub">' + esc(q.id) + " · Amount: TBD</div></div>" + badge(q.status) + "</a>").join("") || '<div class="empty">No quotes</div>'}`;
        } else if (state.tab === "follow-up") {
      body = `<div class="labelrow"><h3 class="section-title">Follow-up history</h3>
        <a class="btn small" href="#modal-followup" data-open="followup" data-pid="${p.id}">＋ Add follow-up</a></div>
        ${p.followups.length ? p.followups.map((f) => '<div class="row"><div><div class="row-title">' + esc(f.text) + '</div><div class="row-sub">Due ' + esc(fmtDate(f.due || f)) + "</div></div></div>").join("") : '<div class="empty">No follow-up tasks</div>'}`;
    }
    return body;
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
    const head = pageHead("Patient-centered chart", "Patient chart", findPatientHtml(), '<a class="btn small primary" href="#modal-book" data-open="book" data-pid="' + p.id + '">＋ Appointment</a>');
    const body = `<div class="grid">
      <div class="card">
        <div class="cardbody">
          ${alertsBanner(p)}
          <div class="patient-banner">
            <div class="patient-avatar">${esc(initials(p.name))}</div>
            <div style="flex:1">
              <div class="patient-name">${esc(p.name)} ${badge(p.status)}
                <a class="btn small" href="#modal-edit" data-open="edit" data-pid="${p.id}">Edit Chart</a>
              </div>
              <div class="patient-meta"><span class="pid">${esc(displayId(p.id))}</span><span>${esc(fmtDob(p.dob))} · ${age(p.dob)} yrs · ${esc(p.sex)}</span><span>${esc(p.phone)}</span><span>${esc(p.email)}</span></div>
            </div>
          </div>
          <div class="summary-strip">
            <div class="metric"><label>Last completed appointment</label><strong>${esc(lastLabel)}</strong><div class="sub">${esc(lastSub)}</div></div>
            <div class="metric"><label>Next appointment</label><strong>${esc(nextLabel)}</strong><div class="sub">${esc(nextSub)}</div></div>
            <div class="metric"><label>Last provider</label><strong>${esc(lastProv)}</strong></div>
            <div class="metric"><label>Patient number</label><strong class="pid">${esc(displayId(p.id))}</strong></div>
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
        ${notesListHtml(p)}
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "patients" }) + '">Patients</a> / ' + esc(p.name), head, body);
  }

  function dayAppointments(date, locationId) {
    const loc = activeLocationId(locationId);
    return store.appointments
      .filter((a) => a.date === date && a.status !== "Rescheduled" && a.status !== "Canceled")
      .filter((a) => !shouldFilterProvider() || providerMatches(a.provider))
      .filter((a) => !loc || a.locationId === loc)
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
      .filter((b) => !shouldFilterProvider() || providerMatches(b.staff))
      .filter((b) => {
        const loc = activeLocationId();
        return !loc || b.locationId === loc;
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  function rangeBlocks(start, end) {
    return (store.blocks || [])
      .filter((b) => b.date >= start && b.date <= end)
      .filter((b) => !shouldFilterProvider() || providerMatches(b.staff))
      .filter((b) => {
        const loc = activeLocationId();
        return !loc || b.locationId === loc;
      })
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
  function statusColor(status) {
    return (BRIZZA.STATUS_DOTS || {})[status] || "#6E6055";
  }
  function statusInk(bg) {
    const hex = String(bg || "#6E6055").replace("#", "");
    const full = hex.length === 3 ? hex.split("").map(function (c) { return c + c; }).join("") : hex;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return "#FFFCF6";
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.55 ? "#352820" : "#FFFCF6";
  }
  function statusDot(status) {
    const color = statusColor(status);
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
    const color = statusColor(a.status);
    const ink = statusInk(color);
    return '<label class="sr-only" for="' + id + '">Visit status</label><select id="' + id + '" class="status-dd status-dd-colored" data-visit-status="' + esc(a.id) + '" style="background:' + color + ";color:" + ink + ";border-color:" + color + '">' +
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
    if (next === "Checked out" && !opts.quietUnpaid) {
      const due = visitUnpaid(a);
      if (due.unpaid) toast("Checked out with an unpaid or partial balance. Checkout is allowed.");
      else toast("Status: " + next);
    } else {
      toast("Status: " + next);
    }
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
    return "Serena Collins";
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
    const names = selectedProviderNames();
    return names.length === 1 ? names[0] : (names[0] || (BRIZZA.PROVIDERS[0] || ""));
  }
  function isInWindow(time, windows) {
    return (windows || []).some((w) => time >= w[0] && time < w[1]);
  }
  function weeksFrom(start, date) {
    const a = new Date(start + "T12:00:00");
    const b = new Date(date + "T12:00:00");
    return Math.floor(Math.round((b - a) / 86400000) / 7);
  }
  function templateApplies(t, date) {
    if (!t || !date) return false;
    if (t.startDate && date < t.startDate) return false;
    if (t.endDate && date > t.endDate) return false;
    if ((t.days || []).indexOf(weekdayNum(date)) < 0) return false;
    const n = t.everyNWeeks || 1;
    if (n > 1 && t.startDate && (weeksFrom(t.startDate, date) % n) !== 0) return false;
    return true;
  }
  function templatesFor(provider, date) {
    return (store.availabilityTemplates || []).filter(function (t) {
      if (provider && provider !== "All providers" && t.provider !== provider) return false;
      return templateApplies(t, date);
    });
  }
  function blocksOnDate(provider, date) {
    const out = [];
    templatesFor(provider, date).forEach(function (t) {
      (t.blocks || []).forEach(function (b) {
        out.push({ start: b.start, end: b.end, locationId: b.locationId || t.locationId, color: t.color, templateId: t.id, provider: t.provider });
      });
    });
    return out.sort((x, y) => (x.start || "").localeCompare(y.start || ""));
  }
  function timeInBlock(time, b) {
    return time >= b.start && time < b.end;
  }
  function isOutsideClinicHours(date, time) {
    if (isWeekend(date)) return true;
    return time < "10:00" || time >= "18:00";
  }
  function locationShort(id) {
    const loc = (BRIZZA.LOCATIONS || []).find((l) => l.id === id);
    return loc ? (loc.short || loc.name) : (id || "Location");
  }
  function compactTime(t) {
    if (!t) return "";
    const parts = String(t).split(":");
    const h = Number(parts[0]), m = Number(parts[1] || 0);
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 || 12;
    return m ? (h12 + ":" + String(m).padStart(2, "0") + ampm) : (h12 + ampm);
  }
  function availHoverText(date, provider) {
    const providers = (provider && provider !== "All providers") ? [provider] : (BRIZZA.PROVIDERS || []);
    const parts = [];
    providers.forEach(function (pv) {
      const blocks = blocksOnDate(pv, date);
      if (!blocks.length) return;
      const txt = blocks.map(function (b) {
        return locationShort(b.locationId) + " (" + compactTime(b.start) + "-" + compactTime(b.end) + ")";
      }).join(" / ");
      parts.push(providers.length > 1 ? (pv + ": " + txt) : txt);
    });
    return parts.length ? parts.join(" · ") : "No availability template for this day.";
  }
  function availPopWrap(tag, classes, date, inner, extraAttrs) {
    return "<" + tag + ' class="' + (classes || "") + '"' + (extraAttrs || "") + ">" + inner + "</" + tag + ">";
  }
  function slotAvailability(date, time, provider) {
    if (isWeekend(date)) return "closed";
    const providers = (provider && provider !== "All providers") ? [provider] : selectedProviderNames();
    let any = false, outside = false;
    providers.forEach(function (pv) {
      const hit = blocksOnDate(pv, date).filter(function (b) { return timeInBlock(time, b); });
      if (hit.length) {
        any = true;
        if (isOutsideClinicHours(date, time)) outside = true;
      }
    });
    if (!any) return isOutsideClinicHours(date, time) ? "closed" : "unavailable";
    return outside ? "available-outside" : "available";
  }
  function slotClass(date, time, provider) {
    const av = slotAvailability(date, time, provider || "All providers");
    const outside = isOutsideClinicHours(date, time) && !isWeekend(date);
    let cls = "";
    if (av === "closed") cls = outside ? "outside-clinic cal-outside" : "";
    else if (av === "available") cls = "clinic-open available";
    else if (av === "available-outside") cls = "clinic-open available outside-clinic cal-outside";
    else cls = "clinic-open unavailable";
    if (outside && cls.indexOf("cal-outside") < 0) cls += " outside-clinic cal-outside";
    return cls.trim();
  }
  function canManageAvailability() {
    return (BRIZZA.AVAILABILITY_ROLES || []).indexOf(state.actingRole) >= 0;
  }
  function typeLegend() {
    return '<div class="legend" aria-label="Appointment type colors">' +
      typesList().map((tp) => '<span class="type-chip" data-type="' + esc(tp.name) + '">' + esc(tp.name) + "</span>").join("") +
      '<span class="legend-item"><span class="swatch clinic"></span>Office hours (Mon–Fri 10:00 a.m.–6:00 p.m. ET)</span>' +
      '<span class="legend-item"><span class="swatch avail"></span>Available</span>' +
      '<span class="legend-item"><span class="swatch unavail"></span>Outside office hours</span></div>';
  }
  function addSlotButton(date, time, provider) {
    const key = provider ? (date + "|" + time + "|" + provider) : (date + "|" + time);
    return '<button type="button" class="cal-slot-add" data-open-slot="' + esc(key) + '" aria-label="Add appointment at ' + esc(fmtTime(time)) + (provider ? " · " + provider : "") + '">＋ Add</button>';
  }
  function shouldFilterProvider() {
    return state.page === "schedule" && state.scheduleView === "calendar";
  }
  function activeLocationId(explicit) {
    if (explicit !== undefined && explicit !== null) return explicit;
    if (state.compareLocations && shouldFilterProvider()) return null;
    return state.locationId;
  }
  function providerChipList() {
    return (BRIZZA.PROVIDERS || []).map(function (name) {
      const staff = (BRIZZA.STAFF || []).find(function (s) { return s.name === name || s.calendarName === name; }) || null;
      const short = (staff && staff.short) || String(name).replace(/,/g, "").split(" ").filter(Boolean).pop();
      return { name: name, short: short, id: (staff && staff.id) || String(short).toLowerCase(), credential: staff && staff.credential };
    });
  }
  function loadProviderChips() {
    try {
      const raw = localStorage.getItem("brizza-emr-providers");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (err) {}
    return ["all"];
  }
  function saveProviderChips(ids) {
    state.providerChips = ids && ids.length ? ids : ["all"];
    try { localStorage.setItem("brizza-emr-providers", JSON.stringify(state.providerChips)); } catch (err) {}
  }
  function selectedProviderNames() {
    if (!state.providerChips) state.providerChips = loadProviderChips();
    const all = providerChipList();
    const chips = state.providerChips || ["all"];
    if (!chips.length || chips.indexOf("all") >= 0) return all.map(function (p) { return p.name; });
    const names = all.filter(function (p) {
      return chips.indexOf(p.id) >= 0 || chips.indexOf(p.name) >= 0 || chips.indexOf(p.short) >= 0;
    }).map(function (p) { return p.name; });
    return names.length ? names : all.map(function (p) { return p.name; });
  }
  function providerMatches(name) {
    if (!shouldFilterProvider()) return true;
    const chips = state.providerChips || ["all"];
    if (!chips.length || chips.indexOf("all") >= 0) return true;
    return selectedProviderNames().indexOf(name) >= 0;
  }
  function toggleProviderChip(id) {
    if (id === "all") { saveProviderChips(["all"]); render(); return; }
    let chips = (state.providerChips || loadProviderChips() || ["all"]).filter(function (c) { return c !== "all"; });
    const ix = chips.indexOf(id);
    if (ix >= 0) chips.splice(ix, 1);
    else chips.push(id);
    const allIds = providerChipList().map(function (p) { return p.id; });
    if (!chips.length || allIds.every(function (pid) { return chips.indexOf(pid) >= 0; })) chips = ["all"];
    saveProviderChips(chips);
    render();
  }
  function providerChipsHtml() {
    if (!state.providerChips) state.providerChips = loadProviderChips();
    const allOn = !state.providerChips.length || state.providerChips.indexOf("all") >= 0;
    const allBtn = '<button type="button" class="prov-chip' + (allOn ? " active" : "") + '" data-prov-chip="all" aria-pressed="' + (allOn ? "true" : "false") + '">All</button>';
    const rest = providerChipList().map(function (p) {
      const on = allOn || (state.providerChips || []).indexOf(p.id) >= 0;
      return '<button type="button" class="prov-chip' + (on ? " active" : "") + '" data-prov-chip="' + esc(p.id) + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(p.short) + "</button>";
    }).join("");
    return '<div class="prov-chips" role="group" aria-label="Providers">' + allBtn + rest + "</div>";
  }
  function locationToggleHtml() {
    const locs = BRIZZA.LOCATIONS || [];
    const compare = !!state.compareLocations;
    const buttons = locs.map(function (l) {
      const on = !compare && state.locationId === l.id;
      return '<button type="button" class="loc-chip' + (on ? " active" : "") + '" data-loc-chip="' + esc(l.id) + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(l.name) + "</button>";
    }).join("");
    const cmp = '<button type="button" class="loc-chip' + (compare ? " active" : "") + '" data-loc-compare="1" aria-pressed="' + (compare ? "true" : "false") + '">Compare</button>';
    return '<div class="loc-toggle" role="group" aria-label="Location">' + buttons + cmp + "</div>";
  }
  function providerAvailLabel(name) {
    const rec = providerChipList().find(function (p) { return p.name === name; });
    if (rec && rec.credential) return rec.short + ", " + rec.credential;
    return rec ? rec.short : name;
  }
  function compactRange(start, end) {
    const fmt = function (tm) {
      const parts = String(tm || "").split(":");
      const h = Number(parts[0] || 0);
      const m = Number(parts[1] || 0);
      const h12 = h % 12 || 12;
      return m ? (h12 + ":" + String(m).padStart(2, "0")) : String(h12);
    };
    return fmt(start) + "–" + fmt(end);
  }
  function availLinesHtml(date, locationId) {
    const providers = selectedProviderNames();
    const lines = [];
    providers.forEach(function (pv) {
      const blocks = blocksOnDate(pv, date).filter(function (b) { return !locationId || b.locationId === locationId; });
      if (!blocks.length) {
        lines.push('<div class="avail-line">' + esc(providerAvailLabel(pv)) + " · " + esc(locationShort(locationId) || locationName(locationId) || "—") + " · Off</div>");
        return;
      }
      blocks.forEach(function (b) {
        const loc = locationShort(b.locationId) || locationName(b.locationId);
        lines.push('<div class="avail-line">' + esc(providerAvailLabel(pv)) + " · " + esc(loc) + " · " + esc(compactRange(b.start, b.end)) + "</div>");
      });
    });
    return '<div class="avail-lines" aria-label="Provider availability">' + (lines.join("") || '<div class="avail-line">No provider availability for this date.</div>') + "</div>";
  }
  function isApptLocked(a) {
    return !a || a.status === "Checked out" || a.status === "Canceled" || a.status === "No-show";
  }
  function cardTypeLabel(a) {
    const service = serviceDisplayName(consultService(a));
    const reasons = a.reasons || [];
    const isNew = reasons.indexOf("New Patient") >= 0;
    const isEst = reasons.indexOf("Existing Patient") >= 0 || reasons.indexOf("Established Patient") >= 0;
    if (isNew) return service ? ("New Patient – " + service) : "New Patient";
    if (isEst) return service ? ("Established Patient – " + service) : "Established Patient";
    if (isConsultType(a.type)) return service ? ("Consult · " + service) : "Consult";
    const reason = visitReasonLabel(a);
    if (reason && reason !== a.type) return a.type + " · " + reason;
    return a.type || "";
  }

  function slotKey(date, time, provider) {
    return provider ? (date + "|" + time + "|" + provider) : (date + "|" + time);
  }
  function slotCellHtml(date, time, provider, inner) {
    const key = slotKey(date, time, provider);
    const cls = "cal-slot cal-cell " + slotClass(date, time, provider || "All providers");
    return '<div class="' + cls + '" data-drop-slot="' + esc(key) + '">' + (inner || "") + addSlotButton(date, time, provider) + "</div>";
  }
  function visibleLocations() {
    const all = BRIZZA.LOCATIONS || [];
    if (state.compareLocations) return all.slice();
    const one = all.find(function (l) { return l.id === state.locationId; });
    return one ? [one] : [{ id: state.locationId, name: locationName(state.locationId) }];
  }
  function needsConsultingFor(pid, type, reasons) {
    const p = patient(pid);
    if (p && isNewPatient(p)) return true;
    return (type === "Consultation" || type === "Consult") && (reasons || []).indexOf("New Patient") >= 0;
  }
  function selectedBookReasons() {
    const el = $("#fReason");
    return (el && el.value) ? [el.value] : [];
  }
  function reasonDropdownHtml(type, selected, consultingFor) {
    let reasons = reasonsForType(type);
    let sel = (selected && selected[0]) || "";
    if (isConsultType(type)) {
      const typ = typeByName(type);
      reasons = (BRIZZA.consultingFor || []).map(function (name) {
        return { name: name, minutes: typ ? typ.minutes : 15 };
      });
      const catalogHit = (selected || []).find(function (r) {
        return (BRIZZA.consultingFor || []).indexOf(r) >= 0;
      });
      sel = consultingFor || catalogHit || "";
    }
    if (!reasons.length) return '<p class="row-sub">No reasons are attached to this type.</p><select id="fReason" required><option value="">Select a reason</option></select>';
    return '<select id="fReason" required><option value="">Select a reason</option>' +
      reasons.map(function (r) {
        const extra = r.minutes != null ? " · " + r.minutes + " min" : "";
        return '<option value="' + esc(r.name) + '"' + (sel === r.name ? " selected" : "") + ">" + esc(r.name) + extra + "</option>";
      }).join("") + "</select>";
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
    const star = f.required ? requiredMark() : "";
    const label = '<label for="nf-' + esc(f.id) + '">' + esc(f.label) + star + "</label>";
    if (f.type === "textarea") {
      return '<div class="field full">' + label + '<textarea id="nf-' + esc(f.id) + '" data-nf="' + esc(f.id) + '"' + req + ">" + esc(value || "") + "</textarea></div>";
    }
    if (f.type === "select") {
      const opts = ['<option value="">Select</option>'].concat(fieldOptions(f).map((o) => "<option" + (value === o ? " selected" : "") + ">" + esc(o) + "</option>"));
      return '<div class="field">' + label + '<select id="nf-' + esc(f.id) + '" data-nf="' + esc(f.id) + '"' + req + ">" + opts.join("") + "</select></div>";
    }
    return '<div class="field">' + label + '<input id="nf-' + esc(f.id) + '" data-nf="' + esc(f.id) + '" type="text"' + req + ' value="' + esc(value || "") + '"></div>';
  }
  function listToLines(arr) { return (arr || []).join("\n"); }
  function linesToList(s) {
    return String(s || "").split(/\n|;/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function noteHistoryConfirmHtml(p) {
    p = p || {};
    return '<section class="note-hx" id="noteHx">' +
      '<h3 class="section-title">Medical history confirm</h3>' +
      '<p class="row-sub">These details live on the chart and carry into every future note. Check Reviewed, no changes when nothing is new.</p>' +
      '<div class="field full"><label for="hxAllergies">Allergies</label><textarea id="hxAllergies" data-hx="allergies">' + esc(listToLines(p.allergies)) + "</textarea></div>" +
      '<div class="field full"><label for="hxMeds">Current medications</label><textarea id="hxMeds" data-hx="meds">' + esc(listToLines(p.meds)) + "</textarea></div>" +
      '<div class="field full"><label for="hxHistory">Medical history</label><textarea id="hxHistory" data-hx="conditions">' + esc(listToLines(p.conditions)) + "</textarea></div>" +
      '<div class="field full"><label for="hxPharmacy">Pharmacy <span class="row-sub">(if applicable)</span></label>' +
      '<input id="hxPharmacy" data-hx="pharmacy" value="' + esc(p.pharmacy || "") + '"></div>' +
      '<label class="field" style="display:flex;gap:8px;align-items:center;margin-top:8px">' +
      '<input type="checkbox" id="hxReviewed"> <span>Reviewed, no changes</span></label>' +
      '<div id="hxWarn"></div></section>';
  }
  function readHxFromForm() {
    return {
      allergies: linesToList($("#hxAllergies") && $("#hxAllergies").value),
      meds: linesToList($("#hxMeds") && $("#hxMeds").value),
      conditions: linesToList($("#hxHistory") && $("#hxHistory").value),
      pharmacy: ($("#hxPharmacy") && $("#hxPharmacy").value.trim()) || ""
    };
  }
  function applyHxToPatient(p, hx) {
    if (!p || !hx) return;
    p.allergies = hx.allergies || [];
    p.meds = hx.meds || [];
    p.conditions = hx.conditions || [];
    p.pharmacy = hx.pharmacy || "";
  }
  function hxMatchesPatient(p, hx) {
    const cur = historySnapshotOf(p);
    return (cur.allergies || []).join("\n") === (hx.allergies || []).join("\n") &&
      (cur.meds || []).join("\n") === (hx.meds || []).join("\n") &&
      (cur.conditions || []).join("\n") === (hx.conditions || []).join("\n") &&
      (cur.pharmacy || "") === (hx.pharmacy || "");
  }
  function compileFieldText(tpl, values) {
    return Object.keys(values || {}).map(function (k) {
      const field = (tpl.sections || []).reduce(function (f, s) { return f || (s.fields || []).find(function (x) { return x.id === k; }); }, null);
      const v = values[k];
      if (v == null || String(v).trim() === "") return "";
      return (field ? field.label : k) + ": " + v;
    }).filter(Boolean).join(" · ");
  }
  function notePreviewText(tpl, values, draft) {
    if (draft && draft.previewEdited && draft.preview) return draft.preview;
    return compileFieldText(tpl, values);
  }
  function clearNoteFootButtons() {
    const b = $("#noteSaveDraft");
    if (b) b.remove();
  }
  function ensureNoteFootButtons() {
    const foot = document.querySelector("#modal .modal-foot");
    if (!foot || !$("#modalSave")) return;
    let b = $("#noteSaveDraft");
    if (!b) {
      b = document.createElement("button");
      b.id = "noteSaveDraft";
      b.className = "btn";
      b.type = "button";
      b.textContent = "Save";
      foot.insertBefore(b, $("#modalSave"));
    }
    b.onclick = function (e) { e.preventDefault(); saveNoteDraft(); };
  }
  function collectNoteValues() {
    const values = {};
    $$("[data-nf]").forEach(function (el) {
      const id = el.getAttribute("data-nf");
      if (id) values[id] = el.value;
    });
    return values;
  }
  function updateNoteSignState() {
    const draft = state.noteDraft;
    const save = $("#modalSave");
    if (!draft || !draft.templateId) {
      if (save) save.disabled = true;
      const miss = $("#noteMissing");
      if (miss) miss.innerHTML = '<div class="notice note-missing">Select a template to begin.</div>';
      return;
    }
    const tpl = (BRIZZA.NOTE_TEMPLATES || []).find((t) => t.id === draft.templateId);
    if (!tpl) return;
    draft.values = collectNoteValues();
    const missing = missingAnyNoteFields(tpl, draft.values);
    if (save) save.disabled = missing.length > 0;
    const miss = $("#noteMissing");
    if (miss) {
      miss.innerHTML = missing.length
        ? '<div class="notice note-missing">Sign stays disabled until required fields are filled: ' + missing.map(esc).join(", ") + ".</div>"
        : "";
    }
    const prev = $("#notePreview");
    if (prev && !draft.previewEdited) prev.value = compileNoteSentences(tpl, draft.values, draft) || compileFieldText(tpl, draft.values);
  }
  function openNoteComposer(pid, apptId, visitId, noteId) {
    if (!isClinicalRole()) { toast("Create Note is limited to clinical roles"); return; }
    const p = patient(pid);
    const existing = (noteId && p) ? (p.notes || []).find(function (n) { return n.id === noteId; }) : null;
    if (noteId && existing && isNoteSigned(existing)) {
      openNoteView(pid, noteId);
      return;
    }
    state.noteDraft = existing
      ? {
          pid: pid,
          noteId: existing.id,
          apptId: existing.appointmentId || apptId || null,
          visitId: existing.visitId || visitId || null,
          templateId: templateIdFromNote(existing),
          values: Object.assign({}, noteFieldsOf(existing)),
          preview: existing.text || "",
          previewEdited: !!existing.text,
          facePoints: (existing.facePoints || []).map(function (pt) { return Object.assign({}, pt); }),
          fromConsultId: existing.fromConsultId || null
        }
      : { pid: pid, apptId: apptId || null, visitId: visitId || null, templateId: "", values: {}, preview: "", previewEdited: false, facePoints: [] };
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
      const face = (typeof faceMapHtml === "function") ? faceMapHtml(tpl, draft) : "";
      const builder = (typeof noteBuilderHtml === "function") ? noteBuilderHtml(tpl, draft) : "";
      const fields = builder || tpl.sections.map((sec) => "<h3 class=\"section-title\">" + esc(sec.title) + "</h3><div class=\"formgrid\">" +
        sec.fields.map((f) => noteFieldControl(f, (draft.values || {})[f.id])).join("") + "</div>").join("");
      const previewVal = draft.previewEdited ? (draft.preview || "") : (compileNoteSentences(tpl, draft.values || {}, draft) || compileFieldText(tpl, draft.values || {}));
      const preview = '<div class="note-preview"><h3 class="section-title">Generated note</h3>' +
        '<p class="row-sub">This text is built only from what you selected or typed. You may edit it before saving.</p>' +
        '<label class="sr-only" for="notePreview">Generated note text</label>' +
        '<textarea id="notePreview">' + esc(previewVal) + "</textarea></div>";
      const proc = (isConsultNote({ templateId: tpl.id, type: tpl.name }) && isClinicalRole())
        ? '<div style="margin-top:14px"><button class="btn small" type="button" data-proc-from-draft="1">Create procedure note</button></div>'
        : "";
      sections = flag + face + fields + preview + noteHistoryConfirmHtml(p) + proc;
    }
    const title = (draft.noteId ? "Edit note · " : "Create note · ") + (p ? p.name : draft.pid);
    showModal(title, (p ? alertsBanner(p) : "") + picker + sections + '<div id="noteMissing"></div>', function () { signNote(); }, "Sign");
    ensureNoteFootButtons();
    updateNoteSignState();
    const sel = $("#noteTpl");
    if (sel) sel.addEventListener("change", function () {
      state.noteDraft.templateId = sel.value;
      state.noteDraft.values = {};
      state.noteDraft.preview = "";
      state.noteDraft.previewEdited = false;
      state.noteDraft.facePoints = [];
      paintNoteComposer();
    });
    $$("[data-nf]").forEach((el) => {
      el.addEventListener("input", updateNoteSignState);
      el.addEventListener("change", updateNoteSignState);
    });
    const prev = $("#notePreview");
    if (prev) prev.addEventListener("input", function () {
      state.noteDraft.previewEdited = true;
      state.noteDraft.preview = prev.value;
    });
    $$("[data-hx]").forEach(function (el) {
      el.addEventListener("input", function () {
        const box = $("#hxReviewed");
        if (box) box.checked = false;
      });
    });
    if (typeof bindFaceMap === "function") bindFaceMap(draft);
    if (typeof bindNoteBuilder === "function") bindNoteBuilder(draft);
  }
  function confirmHxForSign() {
    const p = patient(state.noteDraft && state.noteDraft.pid);
    if (!p || !$("#noteHx")) return true;
    const hx = readHxFromForm();
    const reviewed = $("#hxReviewed") && $("#hxReviewed").checked;
    const changed = !hxMatchesPatient(p, hx);
    if (!reviewed && !changed) {
      const w = $("#hxWarn");
      if (w) w.innerHTML = '<div class="notice">Confirm medical history: check Reviewed, no changes, or update the fields.</div>';
      toast("Confirm medical history");
      return false;
    }
    applyHxToPatient(p, hx);
    if (state.noteDraft) state.noteDraft.hxReviewed = !!(reviewed || changed);
    return true;
  }
  function upsertNoteFromDraft(opts) {
    opts = opts || {};
    const draft = state.noteDraft;
    if (!draft || !isClinicalRole()) return null;
    const tpl = (BRIZZA.NOTE_TEMPLATES || []).find((t) => t.id === draft.templateId);
    if (!tpl) { toast("Select a template"); return null; }
    draft.values = collectNoteValues();
    if (opts.requireComplete) {
      const missing = missingAnyNoteFields(tpl, draft.values);
      if (missing.length) { updateNoteSignState(); toast("Required fields are missing"); return null; }
      if (!confirmHxForSign()) return null;
    } else if ($("#noteHx")) {
      applyHxToPatient(patient(draft.pid), readHxFromForm());
    }
    const p = patient(draft.pid);
    if (!p) return null;
    p.notes = p.notes || [];
    const preview = ($("#notePreview") && $("#notePreview").value) || draft.preview || compileNoteSentences(tpl, draft.values, draft) || compileFieldText(tpl, draft.values);
    const facePoints = (draft.facePoints || []).map(function (pt) { return { id: pt.id, name: pt.name, units: pt.units || "" }; });
    let rec = draft.noteId ? p.notes.find(function (n) { return n.id === draft.noteId; }) : null;
    const beforeStatus = rec ? (rec.status || "Open") : "—";
    if (!rec) {
      rec = { id: nextId("N-", p.notes) };
      p.notes.unshift(rec);
    }
    rec.date = rec.date || todayET();
    rec.type = tpl.name;
    rec.templateId = tpl.id;
    rec.procedurePerformed = draft.values.procedurePerformed || rec.procedurePerformed || "";
    rec.provider = rec.provider || actingName();
    rec.role = rec.role || state.actingRole;
    rec.fields = Object.assign({}, draft.values);
    rec.values = rec.fields;
    rec.text = preview;
    rec.facePoints = facePoints;
    rec.visitId = rec.visitId || draft.visitId || undefined;
    rec.appointmentId = rec.appointmentId || draft.apptId || undefined;
    rec.fromConsultId = rec.fromConsultId || draft.fromConsultId || undefined;
    if (!rec.visitId && rec.appointmentId) {
      const a = appt(rec.appointmentId);
      if (a && a.visitId) rec.visitId = a.visitId;
    }
    if (opts.sign) {
      rec.status = "Signed";
      rec.locked = true;
      rec.signedAt = nowET();
      rec.historySnapshot = historySnapshotOf(p);
      rec.hxReviewed = true;
    } else {
      rec.status = "Open";
      rec.locked = false;
    }
    if (rec.visitId) {
      const v = visit(rec.visitId);
      if (v) v.noteId = rec.id;
    }
    addAudit({
      who: actingName(),
      role: state.actingRole,
      action: (opts.sign ? "Signed " : "Saved ") + tpl.name + " note",
      recordType: "Note",
      recordId: rec.id,
      recordPath: { page: "patients", selected: p.id, tab: "demographics" },
      changes: [
        { field: "status", before: beforeStatus, after: rec.status },
        { field: "template", before: "—", after: tpl.name }
      ].concat(opts.sign ? [{ field: "signedAt", before: "—", after: rec.signedAt }] : [])
    });
    return rec;
  }
  function saveNoteDraft() {
    const rec = upsertNoteFromDraft({ sign: false, requireComplete: false });
    if (!rec) return;
    state.noteDraft = null;
    closeModal();
    toast("Note saved");
    const p = patient(rec && rec.patientId);
    render();
  }
  function signNote() {
    const rec = upsertNoteFromDraft({ sign: true, requireComplete: true });
    if (!rec) return;
    const pid = state.noteDraft && state.noteDraft.pid;
    state.noteDraft = null;
    closeModal();
    toast("Note signed");
    const next = hashFor({ page: "patients", selected: pid, tab: "demographics" });
    if (location.hash !== next) go({ page: "patients", selected: pid, tab: "demographics" });
    else render();
  }
  function openProcedureFromConsult(pid, nid) {
    if (!isClinicalRole()) { toast("Create Note is limited to clinical roles"); return; }
    const p = patient(pid);
    const n = p && (p.notes || []).find(function (x) { return x.id === nid; });
    if (!n) return;
    const fields = noteFieldsOf(n);
    const values = {
      areasTreated: fields.areasDiscussed || fields.areasTreated || "",
      consentConfirmed: fields.consentConfirmed || ""
    };
    closeModal();
    state.noteDraft = {
      pid: pid,
      apptId: n.appointmentId || null,
      visitId: n.visitId || null,
      templateId: procedureTemplateId(n),
      values: values,
      preview: "",
      previewEdited: false,
      facePoints: (n.facePoints || []).map(function (pt) { return Object.assign({}, pt, { units: "" }); }),
      fromConsultId: n.id
    };
    paintNoteComposer();
  }
  function saveNoteAddendum(pid, nid) {
    if (!isClinicalRole()) { toast("Addenda are limited to clinical roles"); return; }
    const p = patient(pid);
    const n = p && (p.notes || []).find(function (x) { return x.id === nid; });
    if (!n || !isNoteSigned(n)) return;
    const text = ($("#addendumText") && $("#addendumText").value.trim()) || "";
    if (!text) { toast("Enter an addendum"); return; }
    n.addenda = n.addenda || [];
    const rec = { id: nextId("ADD-", n.addenda), text: text, who: actingName(), role: state.actingRole, when: nowET() };
    n.addenda.push(rec);
    addAudit({ action: "Added note addendum", recordType: "Note", recordId: n.id,
      recordPath: { page: "patients", selected: p.id, tab: "demographics" },
      changes: [{ field: "addendum", before: "—", after: text }] });
    toast("Addendum added");
    openNoteView(pid, nid);
    render();
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
      toggle);
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
            ${providerChipsHtml()}
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
    const listHref = hashFor({ page: "schedule", date: (state.scheduleView === "worklist" || state.scheduleView === "list") ? state.date : demoClockDate(), view: "worklist" });
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
    const color = statusColor(a.status);
    const locked = isApptLocked(a);
    const tip = [p ? p.name : a.patientId, cardTypeLabel(a), fmtTime(a.time), a.status].join(" · ");
    return '<div class="cal-event" data-type="' + esc(a.type) + '" data-status="' + esc(a.status) + '" data-open-appt="' + esc(a.id) + '" data-appt-drag="' + esc(a.id) + '" draggable="' + (locked ? "false" : "true") + '" style="--status-bar:' + color + ";border-left-color:" + color + '">' +
      '<span class="t">' + statusDot(a.status) + ' <a href="' + href + '">' + esc(fmtTime(a.time)) + "</a> · " + (p ? patientLink(p) : esc(a.patientId)) + "</span>" +
      '<span class="cal-event-mid"><a href="' + href + '">' + esc(cardTypeLabel(a)) + "</a></span>" +
      '<span class="row-sub">' + esc(a.provider) + "</span>" + dd +
      '<span class="appt-pop" role="tooltip">' + esc(tip) + "</span></div>";
  }

  function rangeAppointments(start, end, locationId) {
    const loc = activeLocationId(locationId);
    return store.appointments
      .filter((a) => a.date >= start && a.date <= end && a.status !== "Rescheduled" && a.status !== "Canceled")
      .filter((a) => !shouldFilterProvider() || providerMatches(a.provider))
      .filter((a) => !loc || a.locationId === loc)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  function renderCalendar() {
    if (!state.providerChips) state.providerChips = loadProviderChips();
    const toggle = scheduleViewToggle();
    const modes = calendarModeToggle();
    const shiftPrev = scheduleShift(state.date, -1);
    const shiftNext = scheduleShift(state.date, 1);
    let title = fmtLong(state.date);
    if (state.calMode === "week") title = "Week of " + fmtLong(weekMonday(state.date));
    if (state.calMode === "month") title = monthLabel(state.date);
    const head = pageHead("Appointment operations", "Schedule", esc(BRIZZA.CLINIC.hours),
      toggle + " " + modes);
    const nav = `<div class="datebar">
      <a class="btn small" id="sched-prev" href="${hashFor({ page: "schedule", date: shiftPrev, view: "calendar", calMode: state.calMode })}" aria-label="Previous">‹</a>
      <strong>${esc(title)}</strong>
      <a class="btn small" id="sched-next" href="${hashFor({ page: "schedule", date: shiftNext, view: "calendar", calMode: state.calMode })}" aria-label="Next">›</a>
      <a class="btn small" id="sched-today" href="${hashFor({ page: "schedule", date: todayET(), view: "calendar", calMode: state.calMode })}">Today</a>
      <a class="btn small" href="${hashFor({ page: "schedule", date: BRIZZA.SAMPLE_DAY, view: "calendar", calMode: state.calMode })}">Sample day</a>
      <a class="btn small" href="${hashFor({ page: "schedule", date: demoClockDate(), view: "calendar", calMode: state.calMode })}">Demo day</a>
    </div>`;
    const tools = '<div class="cal-tools">' + locationToggleHtml() + providerChipsHtml() +
      '<label class="sr-only" for="sched-search">Search patients and appointments</label>' +
      '<input id="sched-search" class="sched-search" type="search" placeholder="Search patients and appointments" value="' + esc(state.scheduleSearch || "") + '">' +
      "</div>";
    const grid = calendarBoard(state.date);
    const body = '<div class="card cal-card"><div class="cardhead">' + nav + tools + "</div>" +
      '<div class="cardbody">' + scheduleSearchHits(state.scheduleSearch || "") + statusLegend() + grid + "</div></div>";
    renderChrome('<a href="' + hashFor({ page: "schedule", date: state.date, view: "calendar", calMode: state.calMode }) + '">Schedule</a> / Calendar / ' + esc(state.calMode), head, body);
    bindCalendarDrag();
  }

  function calendarBoard(date) {
    const locs = visibleLocations();
    const panes = locs.map(function (loc) {
      let grid = "";
      if (state.calMode === "day") grid = calendarDayGrid(date, loc.id);
      else if (state.calMode === "month") grid = availLinesHtml(date, loc.id) + calendarMonthGrid(date, loc.id);
      else grid = availLinesHtml(date, loc.id) + calendarWeekGrid(date, loc.id);
      return '<section class="cal-loc-pane" data-cal-loc="' + esc(loc.id) + '"><h3 class="cal-loc-title">' + esc(loc.name) + "</h3>" + grid + "</section>";
    }).join("");
    return '<div class="cal-board' + (locs.length > 1 ? " cal-compare" : "") + '">' + panes + "</div>";
  }

  function calendarDayGrid(date, locationId) {
    if (isWeekend(date)) return '<div class="cal-closed">Clinic closed · weekends are outside Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>';
    const hours = scheduleHours();
    const list = dayAppointments(date, locationId);
    const blocks = dayBlocks(date).filter(function (b) { return !locationId || b.locationId === locationId; });
    const providers = selectedProviderNames();
    const q = (state.scheduleSearch || "").trim().toLowerCase();
    const vis = function (a) {
      return !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + displayId(a.patientId) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().indexOf(q) >= 0;
    };
    const head = '<div class="cal-day-head"><div class="cal-hd">' + esc(fmtLong(date)) + ' <span class="count">' + esc(String(new Set(list.map(function (a) { return a.patientId; })).size)) + '</span></div>' + availLinesHtml(date, locationId) + "</div>";
    const colHead = '<div class="cal-day-cols" style="--prov-cols:' + providers.length + '"><div class="cal-time"></div>' +
      providers.map(function (pv) { return '<div class="cal-hd cal-prov-hd">' + esc(providerAvailLabel(pv)) + "</div>"; }).join("") + "</div>";
    const rows = hours.map(function (tm) {
      const timeEl = '<div class="cal-time">' + esc(fmtTime(tm)) + "</div>";
      const cells = providers.map(function (pv) {
        const here = list.filter(function (a) { return a.time === tm && a.provider === pv && vis(a); });
        const blks = blocks.filter(function (b) { return b.start === tm && b.staff === pv; });
        const inner = here.map(calendarEvent).join("") + blks.map(calendarBlock).join("");
        return slotCellHtml(date, tm, pv, inner);
      }).join("");
      return '<div class="cal-day-row cal-day-row-provs" style="--prov-cols:' + providers.length + '">' + timeEl + cells + "</div>";
    }).join("");
    return head + colHead + rows;
  }

  function calendarWeekGrid(date, locationId) {
    const mon = weekMonday(date);
    const days = [0, 1, 2, 3, 4].map(function (i) { return addDays(mon, i); });
    const hours = scheduleHours();
    const appts = rangeAppointments(mon, addDays(mon, 4), locationId);
    const blocks = rangeBlocks(mon, addDays(mon, 4)).filter(function (b) { return !locationId || b.locationId === locationId; });
    const q = (state.scheduleSearch || "").trim().toLowerCase();
    const vis = function (a) {
      return !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + displayId(a.patientId) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().indexOf(q) >= 0;
    };
    const heads = '<div class="cal-time"></div>' + days.map(function (d) {
      return '<div class="cal-hd"><a href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" }) + '">' +
        esc(new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) +
        '</a> <span class="count">' + esc(patientCount(d)) + "</span></div>";
    }).join("");
    const rows = hours.map(function (h) {
      const next = fromMinutes(toMinutes(h) + 30);
      const cells = days.map(function (d) {
        const here = appts.filter(function (a) { return a.date === d && a.time === h; });
        const inner = here.filter(vis).map(calendarEvent).join("") +
          blocks.filter(function (b) { return b.date === d && b.start === h; }).map(calendarBlock).join("");
        return slotCellHtml(d, h, null, inner);
      }).join("");
      return '<div class="cal-time">' + esc(fmtTime(h)) + "</div>" + cells;
    }).join("");
    return '<div class="cal-grid-week">' + heads + rows + "</div>";
  }

  function calendarMonthGrid(date, locationId) {
    const parts = date.split("-").map(Number);
    const y = parts[0], m = parts[1];
    const first = y + "-" + String(m).padStart(2, "0") + "-01";
    const start = weekMonday(first);
    const lastDate = new Date(y, m, 0).getDate();
    const last = y + "-" + String(m).padStart(2, "0") + "-" + String(lastDate).padStart(2, "0");
    let end = addDays(weekMonday(last), 6);
    const appts = rangeAppointments(start, end, locationId);
    const blocks = rangeBlocks(start, end).filter(function (b) { return !locationId || b.locationId === locationId; });
    const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    let html = labels.map(function (l) { return '<div class="cal-hd">' + l + "</div>"; }).join("");
    let d = start;
    while (d <= end) {
      const inMonth = d.slice(0, 7) === first.slice(0, 7);
      const closed = isWeekend(d);
      const dayAppts = appts.filter(function (a) { return a.date === d; });
      const dayBlks = blocks.filter(function (b) { return b.date === d; });
      const q = (state.scheduleSearch || "").trim().toLowerCase();
      const vis = function (a) {
        return !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().indexOf(q) >= 0;
      };
      const chips = inMonth ? dayAppts.filter(vis).map(calendarEvent).join("") + dayBlks.map(calendarBlock).join("") : "";
      const dayLink = '<a class="d" href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" }) + '">' + Number(d.slice(8)) + '</a> <span class="count">' + esc(patientCount(d)) + "</span>";
      html += '<div class="cal-mcell' + (closed ? " closed" : "") + (isOutsideClinicHours(d, "09:00") && !closed ? "" : "") + '">' + (inMonth ? dayLink : "") + (closed && inMonth ? '<div class="row-sub">Closed</div>' : "") + chips + "</div>";
      d = addDays(d, 1);
    }
    return '<div class="cal-grid-month">' + html + "</div>";
  }

  let draggingApptId = null;
  function moveAppointmentToSlot(id, slot) {
    const a = appt(id);
    if (!a) return;
    if (isApptLocked(a)) { toast("Time is locked after the visit is completed"); return; }
    const bits = String(slot || "").split("|");
    const date = bits[0], time = bits[1], provider = bits[2] || a.provider;
    if (!date || !time) return;
    const before = { date: a.date, time: a.time, provider: a.provider };
    if (before.date === date && before.time === time && before.provider === provider) return;
    if (isOutsideClinicHours(date, time)) {
      const reason = window.prompt("This time is outside office hours. Enter a reason to keep the new time.");
      if (!reason || !String(reason).trim()) {
        toast("A reason is required to place an appointment outside office hours");
        return;
      }
      a.outsideHoursReason = String(reason).trim();
      a.history = a.history || [];
      a.history.push("Outside hours reason: " + a.outsideHoursReason + " · " + nowET());
    }
    a.date = date;
    a.time = time;
    if (provider) a.provider = provider;
    a.history = a.history || [];
    a.history.push("Moved " + before.date + " " + before.time + " · " + before.provider + " → " + date + " " + time + " · " + a.provider + " · " + nowET());
    addAudit({
      action: "Moved appointment",
      recordType: "Appointment",
      recordId: a.id,
      recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: "calendar", calMode: state.calMode },
      changes: [
        { field: "date", before: before.date, after: date },
        { field: "time", before: before.time, after: time },
        { field: "provider", before: before.provider, after: a.provider }
      ]
    });
    toast("Moved to " + fmtTime(time) + (provider ? " · " + provider : ""));
    render();
  }

  function bindCalendarDrag() {
    $$("[data-appt-drag]").forEach(function (el) {
      if (el.getAttribute("draggable") === "false") return;
      el.addEventListener("dragstart", function (e) {
        e.stopPropagation();
        const id = el.getAttribute("data-appt-drag");
        draggingApptId = id;
        try { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
        el.classList.add("is-dragging");
      });
      el.addEventListener("dragend", function () { draggingApptId = null; el.classList.remove("is-dragging"); });
    });
    $$("[data-drop-slot]").forEach(function (slot) {
      slot.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        slot.classList.add("drop-ready");
      });
      slot.addEventListener("dragleave", function () { slot.classList.remove("drop-ready"); });
      slot.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        slot.classList.remove("drop-ready");
        const id = (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggingApptId;
        moveAppointmentToSlot(id, slot.getAttribute("data-drop-slot"));
      });
    });
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
          <div class="row"><span>Patient number</span><span class="row-sub">BZ0001 sequence · immutable · never reused</span></div>
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
    if (state.page === "demo") go({ page: "patients", selected: "BZ0003", tab: "demographics" });
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
    clearNoteFootButtons();
    const back = $("#modal");
    if (back) back.classList.remove("open", "pos-mode", "hist-mode", "book-mode", "hide-foot");
    if (opts.cancelPending) state.reschedulingId = null;
    if (state.appointmentId && state.page === "schedule") {
      state.appointmentId = null;
      history.replaceState(null, "", hashFor({ page: "schedule", date: state.date }));
    }
  }
  function showModal(title, body, onSave, saveLabel) {
    clearNoteFootButtons();
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    const save = $("#modalSave");
    save.textContent = saveLabel || "Save";
    save.classList.toggle("btn-lg", saveLabel === "Save appointment" || saveLabel === "Save patient");
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

  function durationOptionsHtml(selectedMins) {
    const opts = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180];
    const sel = Number(selectedMins) || 30;
    if (opts.indexOf(sel) < 0) opts.push(sel);
    opts.sort(function (a, b) { return a - b; });
    return opts.map(function (n) {
      return '<option value="' + n + '"' + (n === sel ? " selected" : "") + ">" + n + " min</option>";
    }).join("");
  }
  function bookSelectedMinutes() {
    const el = $("#fDuration");
    const n = el ? Number(el.value) : 0;
    return n > 0 ? n : 30;
  }
  function ensureDurationOption(mins) {
    const el = $("#fDuration");
    if (!el) return;
    const v = String(mins);
    if (![].some.call(el.options, function (o) { return o.value === v; })) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = mins + " min";
      el.appendChild(opt);
    }
    el.value = v;
  }
  function syncBookTimes(source) {
    const startEl = $("#fTime");
    const endEl = $("#fEnd");
    const durEl = $("#fDuration");
    if (!startEl || !endEl || !durEl) { updateBookDuration(); return; }
    if (source === "type") {
      const mins = durationMinutes($("#fType") ? $("#fType").value : "", selectedBookReasons()) || 30;
      ensureDurationOption(mins);
      endEl.value = fromMinutes(toMinutes(startEl.value) + mins);
    } else if (source === "start" || source === "dur") {
      const mins = bookSelectedMinutes();
      const endVal = fromMinutes(toMinutes(startEl.value) + mins);
      if (![].some.call(endEl.options, function (o) { return o.value === endVal; })) {
        const opt = document.createElement("option");
        opt.value = endVal;
        opt.textContent = fmtTime(endVal);
        endEl.appendChild(opt);
      }
      endEl.value = endVal;
    } else if (source === "end") {
      let mins = toMinutes(endEl.value) - toMinutes(startEl.value);
      if (mins <= 0) {
        mins = bookSelectedMinutes();
        endEl.value = fromMinutes(toMinutes(startEl.value) + mins);
      } else {
        ensureDurationOption(mins);
      }
    }
    updateBookDuration();
  }
  function openBook(pid, preset) {
    preset = preset || {};
    const sel = pid || state.selected;
    const dateVal = preset.date || state.date;
    const timeVal = preset.time || "10:00";
    const provVal = preset.provider || slotProvider();
    const locVal = preset.locationId || state.locationId || BRIZZA.DEFAULT_LOCATION;
    const typeVal = (preset && preset.type) || "Consultation";
    const durMins = durationMinutes(typeVal, preset.reasons || []) || 30;
    const endVal = fromMinutes(toMinutes(timeVal) + durMins);
    const locOpts = (BRIZZA.LOCATIONS || []).map((l) => "<option value=\"" + esc(l.id) + "\"" + (locVal === l.id ? " selected" : "") + ">" + esc(l.name) + (l.synthetic ? " (synthetic)" : "") + "</option>").join("");
    showModal("New appointment", `
      <div class="book-flow">
        <div class="field" id="bookPatientField">
          <label for="fPatientSearch">Patient <span class="req">required</span></label>
          <input type="hidden" id="fPatient" required value="${esc(sel || "")}">
          <button type="button" class="patient-picked" id="fPatientPicked" aria-expanded="false">${sel ? esc((patient(sel) && patient(sel).name) || sel) + " · " + esc(patient(sel) ? fmtDob(patient(sel).dob) : "") + " · " + esc(displayId(sel)) : "Select a patient"}</button>
          <div id="fPatientSearchWrap" hidden>
            <input id="fPatientSearch" placeholder="Search name, #ID, or DOB (mm/dd/yyyy)" autocomplete="off">
            <div id="fPatientResults" class="patient-results" role="listbox"></div>
          </div>
        </div>
        <button class="btn small" type="button" id="bookNewToggle">+ Add new patient</button>
        <div id="bookNewFields" hidden class="formgrid" style="margin-top:10px">
          <div class="field"><label for="npFirst">First name <span class="req">required</span></label><input id="npFirst"></div>
          <div class="field"><label for="npLast">Last name <span class="req">required</span></label><input id="npLast"></div>
          <div class="field"><label for="npDob">Date of birth <span class="req">required</span></label><input id="npDob" placeholder="mm/dd/yyyy" inputmode="numeric" data-mask="dob"></div>
          <div class="field"><label for="npPhone">Phone <span class="req">required</span></label><input id="npPhone" placeholder="(XXX) XXX-XXXX" inputmode="tel" data-mask="phone"></div>
          <div class="field full"><label>Address</label>${addressFieldsHtml(emptyAddress(), "bkAddr")}</div>
        </div>
        <div class="formgrid" style="margin-top:14px">
          <div class="field"><label for="fDate">Date <span class="req">required</span></label><input id="fDate" type="date" required value="${esc(dateVal)}"></div>
          <div class="field"><label for="fTime">Start <span class="req">required</span></label>
            <select id="fTime" required>${timeOptions(timeVal)}</select></div>
          <div class="field"><label for="fEnd">End <span class="req">required</span></label>
            <select id="fEnd" required>${timeOptions(endVal, bookingEndTimes())}</select></div>
          <div class="field"><label for="fDuration">Duration <span class="req">required</span></label>
            <select id="fDuration" required>${durationOptionsHtml(durMins)}</select></div>
          <div class="field"><label for="fLocation">Location <span class="req">required</span></label>
            <select id="fLocation" required>${locOpts}</select></div>
          <div class="field"><label for="fType">Type <span class="req">required</span></label>
            <select id="fType" required>${typesList().map((tp) => "<option" + (typeVal === tp.name ? " selected" : "") + ">" + esc(tp.name) + "</option>").join("")}</select></div>
          <div class="field"><label for="fReason">Reason <span class="req">required</span></label>
            <div id="reasonOptions">${reasonDropdownHtml(typeVal, preset.reasons || [], preset.consultingFor || "")}</div></div>
          <div class="field full"><label for="fPrepNotes">Notes</label><textarea id="fPrepNotes" rows="2" placeholder="Prep, packages, or other appointment notes"></textarea></div>
        </div>
        <input type="hidden" id="fProvider" value="${esc(provVal || "")}">
        <div class="field full" id="overrideWrap"></div>
        <div class="field full" id="hoursWrap"></div>
        <div class="field full" id="bookWarn"></div>
      </div>`, function () { saveAppt(); }, "Save appointment");
    $("#modal").classList.add("book-mode");
    bindPatientPicker();
    if ($("#bookNewToggle")) $("#bookNewToggle").addEventListener("click", function () {
      const box = $("#bookNewFields");
      if (!box) return;
      box.hidden = !box.hidden;
      if (!box.hidden && $("#fPatient")) {
        $("#fPatient").value = "";
        const picked = $("#fPatientPicked");
        if (picked) picked.textContent = "New patient in this form";
        const wrap = $("#fPatientSearchWrap");
        if (wrap) wrap.hidden = true;
      }
    });
    $("#fType").addEventListener("change", function () {
      $("#reasonOptions").innerHTML = reasonDropdownHtml($("#fType").value, []);
      const r = $("#fReason");
      if (r) r.addEventListener("change", function () { syncBookTimes("type"); });
      syncBookTimes("type");
    });
    const r0 = $("#fReason");
    if (r0) r0.addEventListener("change", function () { syncBookTimes("type"); });
    if ($("#fTime")) $("#fTime").addEventListener("change", function () { syncBookTimes("start"); });
    if ($("#fEnd")) $("#fEnd").addEventListener("change", function () { syncBookTimes("end"); });
    if ($("#fDuration")) $("#fDuration").addEventListener("change", function () { syncBookTimes("dur"); });
    if ($("#fDate")) $("#fDate").addEventListener("change", updateBookDuration);
    updateBookDuration();
  }

  function updateBookDuration() {
    if (!$("#fType")) return;
    const type = $("#fType").value;
    const reasons = selectedBookReasons();
    const wrap = $("#overrideWrap");
    if (!wrap) return;
    const date = $("#fDate") ? $("#fDate").value : "";
    const time = $("#fTime") ? $("#fTime").value : "";
    const provider = $("#fProvider") ? $("#fProvider").value : "";
    const hits = overlappingBlocks(date, time, type, reasons, provider, bookSelectedMinutes());
    if (!hits.length) wrap.innerHTML = "";
    else {
      const prior = $("#fOverride") ? $("#fOverride").value : "";
      wrap.innerHTML = '<div class="notice">This time overlaps an Admin block (' +
        hits.map((b) => esc(b.reason) + " · " + esc(fmtTime(b.start)) + "–" + esc(fmtTime(b.end))).join("; ") +
        "). Booking is blocked unless you record an admin override with a reason.</div>" +
        '<label for="fOverride">Admin override reason <span class="req">required</span></label>' +
        '<input id="fOverride" type="text" required value="' + esc(prior) + '">';
    }
    updateHoursWarn();
  }
  function updateHoursWarn() {
    const wrap = $("#hoursWrap");
    if (!wrap) return;
    const date = $("#fDate") ? $("#fDate").value : "";
    const time = $("#fTime") ? $("#fTime").value : "";
    if (date && time && isOutsideClinicHours(date, time)) {
      const prior = $("#fOutsideReason") ? $("#fOutsideReason").value : "";
      wrap.innerHTML = '<div class="notice" role="alert">This time is outside office hours (Monday–Friday, 10:00 a.m.–6:00 p.m. ET). Booking is allowed if you record a reason, which is logged.</div>' +
        '<label for="fOutsideReason">Reason for booking outside office hours <span class="req">required</span></label>' +
        '<input id="fOutsideReason" type="text" required value="' + esc(prior) + '">';
    } else wrap.innerHTML = "";
  }
  function bindPatientPicker() {
    const picked = $("#fPatientPicked");
    const wrap = $("#fPatientSearchWrap");
    const input = $("#fPatientSearch");
    const results = $("#fPatientResults");
    if (!picked || !wrap || !input || !results) return;
    const setPatient = function (id) {
      const pt = patient(id);
      if ($("#fPatient")) $("#fPatient").value = id || "";
      picked.textContent = pt ? (pt.name + " · " + fmtDob(pt.dob) + " · " + displayId(pt.id)) : "Select a patient";
      wrap.hidden = true;
      picked.setAttribute("aria-expanded", "false");
      if ($("#bookNewFields")) $("#bookNewFields").hidden = true;
      updateConsultWarn();
      updateConsultingFor();
    };
    const renderHits = function () {
      const q = (input.value || "").trim().toLowerCase();
      const hits = store.patients.filter(function (pt) {
        if (!q) return true;
        const hay = (pt.name + " " + (pt.firstName || "") + " " + (pt.lastName || "") + " " + displayId(pt.id) + " " + pt.id + " " + (pt.dob || "") + " " + fmtDob(pt.dob) + " " + (pt.phone || "")).toLowerCase();
        return hay.indexOf(q) >= 0;
      }).slice(0, 12);
      results.innerHTML = hits.map(function (pt) {
        return '<button type="button" class="patient-hit" role="option" data-pick-patient="' + esc(pt.id) + '">' + esc(pt.name) + " · " + esc(fmtDob(pt.dob)) + " · " + esc(displayId(pt.id)) + "</button>";
      }).join("") || '<div class="row-sub">No matching patients</div>';
    };
    picked.addEventListener("click", function () {
      wrap.hidden = !wrap.hidden;
      picked.setAttribute("aria-expanded", wrap.hidden ? "false" : "true");
      if (!wrap.hidden) { input.value = ""; renderHits(); input.focus(); }
    });
    input.addEventListener("input", renderHits);
    results.addEventListener("click", function (e) {
      const hit = e.target.closest("[data-pick-patient]");
      if (hit) setPatient(hit.getAttribute("data-pick-patient"));
    });
  }

  function updateConsultingFor() {
    const wrap = $("#consultingWrap");
    if (!wrap) return;
    const pid = $("#fPatient") && $("#fPatient").value;
    const type = $("#fType") && $("#fType").value;
    const reasons = selectedBookReasons();
    if (!needsConsultingFor(pid, type, reasons)) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = '<label for="fConsultingFor">Consulting for <span class="req">required</span></label>' +
      '<select id="fConsultingFor" required><option value="">Select</option>' +
      (BRIZZA.consultingFor || []).map((o) => "<option>" + esc(o) + "</option>").join("") + "</select>";
  }

  function updateConsultWarn() {
    const el = $("#cfWarn");
    if (!el || !$("#fPatient") || !$("#fType")) return;
    const p = patient($("#fPatient").value);
    const type = $("#fType").value;
    if (p && isNewPatient(p) && type !== "Consultation" && type !== "Consult") {
      el.innerHTML = '<div class="notice">Consultation-first check: this patient has no completed appointment or treatment. New patients follow a consultation-first process. You can still save this booking.</div>';
    } else el.innerHTML = "";
  }

  function saveAppt() {
    let pid = $("#fPatient") ? $("#fPatient").value : "";
    const newBox = $("#bookNewFields");
    if (newBox && !newBox.hidden) {
      const first = ($("#npFirst") && $("#npFirst").value.trim()) || "";
      const last = ($("#npLast") && $("#npLast").value.trim()) || "";
      const dob = parseDob($("#npDob") ? $("#npDob").value : "");
      const phone = ($("#npPhone") && $("#npPhone").value.trim()) || "";
      if (!first || !last || !dob || !phone) {
        const w = $("#bookWarn");
        if (w) w.innerHTML = '<div class="notice">New patient requires first name, last name, date of birth (mm/dd/yyyy), and phone.</div>';
        toast("Complete the new patient fields");
        return;
      }
      pid = nextPatientId();
      const parts = readAddressFields(document);
      store.patients.push({ id: pid, firstName: first, lastName: last, name: first + " " + last, dob: dob, sex: "Unspecified", phone: formatPhoneMask(phone), email: "—", addressParts: parts, address: formatAddressText(parts), status: "Active", credit: 0, accountBalance: 0, alerts: [], patientNotes: [], allergies: [], meds: [], conditions: [], notes: [], consents: { clinical: "Not yet recorded", marketing: "Not authorized" }, photos: [], documents: [], treatments: [], followups: [], demoHistory: [], registration: { idUploaded: { status: "Not uploaded", date: null }, formsCompleted: { status: "Not completed", date: null }, demographicsConfirmed: { status: "Not confirmed", date: null } } });
      addAudit({ action: "Created patient record", recordType: "Patient", recordId: pid,
        recordPath: { page: "patients", selected: pid, tab: "demographics" },
        changes: [{ field: "status", before: "—", after: "Active" }, { field: "name", before: "—", after: first + " " + last }, { field: "id", before: "—", after: displayId(pid) }] });
    }
    let reasons = selectedBookReasons();
    const p = patient(pid);
    const type = $("#fType") ? $("#fType").value : "";
    const date = $("#fDate") ? $("#fDate").value : "";
    const time = $("#fTime") ? $("#fTime").value : "";
    const provider = ($("#fProvider") && $("#fProvider").value) || slotProvider() || "";
    const room = $("#fRoom") ? $("#fRoom").value : "";
    const locationId = $("#fLocation") ? $("#fLocation").value : "";
    let consultingFor = $("#fConsultingFor") ? $("#fConsultingFor").value : "";
    if (isConsultType(type)) {
      consultingFor = consultingFor || (reasons[0] || "");
      reasons = [(p && isNewPatient(p)) ? "New Patient" : "Existing Patient"];
    }
    const missing = [];
    if (!pid) missing.push("Patient");
    if (isConsultType(type) ? !consultingFor : !reasons.length) missing.push("Appointment reason");
    if (!type) missing.push("Appointment type");
    if (!locationId) missing.push("Location");
    if (!date) missing.push("Date");
    else if (isWeekend(date)) missing.push("Date must be Monday–Friday");
    if (!time) missing.push("Start time");
    if (!provider) missing.push("Primary provider");
    const hits = overlappingBlocks(date, time, type, reasons, provider, bookSelectedMinutes());
    const override = $("#fOverride") ? $("#fOverride").value.trim() : "";
    if (hits.length && !override) missing.push("Admin override reason");
    const outside = date && time && isOutsideClinicHours(date, time);
    const outsideReason = ($("#fOutsideReason") && $("#fOutsideReason").value.trim()) || "";
    if (outside && !outsideReason) missing.push("Reason for booking outside office hours");
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
    const mins = bookSelectedMinutes() || durationMinutes(type, reasons);
    const rec = { id: id, time: time, patientId: pid, type: type, reasons: reasons, provider: provider, durationLabel: (mins ? mins + " min" : durationLabelFor(type, reasons)), durationMinutes: mins, status: "Scheduled", consultation: "", treatment: "", room: room, date: date, locationId: locationId, consultingFor: consultingFor || "", prepNotes: ($("#fPrepNotes") && $("#fPrepNotes").value.trim()) || "", history: history, blockOverride: override || "", outsideHoursReason: outsideReason || "", statusSince: nowMs() };
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
       .concat(override ? [{ field: "adminOverride", before: "—", after: override }, { field: "overlappedBlocks", before: "—", after: hits.map((b) => b.id || b.reason).join(", ") }] : [])
       .concat(outside && outsideReason ? [{ field: "outsideHoursReason", before: "—", after: outsideReason }] : []) });
    if (override) {
      history.push("Admin override over Admin block · " + override + " · " + nowET());
      rec.history = history;
    }
    if (outside && outsideReason) {
      history.push("Outside hours reason: " + outsideReason + " · " + nowET());
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

  function lastPaymentsFor(pid, n) {
    const list = [];
    (store.invoices || []).filter(function (inv) { return inv.patientId === pid; }).forEach(function (inv) {
      (inv.payments || []).forEach(function (pay) { list.push({ invoiceId: inv.id, method: pay.method, status: pay.status, recorded: pay.recorded, amount: pay.amount }); });
    });
    list.sort(function (a, b) { return String(b.recorded || "").localeCompare(String(a.recorded || "")); });
    return list.slice(0, n || 3);
  }
  function openQuotesFor(pid) {
    return (store.quotes || []).filter(function (q) { return q.patientId === pid && (q.status === "Open" || q.status === "Prepaid"); });
  }
  function openAppointmentModal(id) {
    const a = appt(id);
    if (!a) return;
    state.appointmentId = id;
    const p = patient(a.patientId);
    const locked = isApptLocked(a);
    const inv = invoiceForAppt(a);
    const bal = p ? patientBalanceValue(p.id) : { sum: 0, tbd: false };
    const credit = patientCredit(p);
    const quotes = p ? openQuotesFor(p.id) : [];
    const pays = p ? lastPaymentsFor(p.id, 3) : [];
    const addr = p ? formatAddressLines(addressPartsOf(p)).join(", ") : "—";
    const statusColorStyle = "background:" + statusColor(a.status) + ";color:" + statusInk(statusColor(a.status)) + ";border-color:" + statusColor(a.status);
    const dis = locked ? " disabled" : "";
    const timeOpts = timeOptions(a.time);
    const provOpts = (BRIZZA.PROVIDERS || []).map(function (pv) { return "<option" + (pv === a.provider ? " selected" : "") + ">" + esc(pv) + "</option>"; }).join("");
    const suiteOpts = '<option value="">—</option>' + (BRIZZA.SUITES || []).map(function (s) { return '<option value="' + esc(s.id) + '"' + (a.suiteId === s.id ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("");
    const typeOpts = typesList().map(function (tp) { return "<option" + (a.type === tp.name ? " selected" : "") + ">" + esc(tp.name) + "</option>"; }).join("");
    const chartHref = p ? hashFor({ page: "patients", selected: p.id, tab: "demographics" }) : "";
    const payRows = pays.map(function (pay) {
      return '<div class="row-sub">' + esc(pay.recorded || "") + " · " + esc(pay.status || "") + (pay.amount != null ? " · " + money(pay.amount) : "") + "</div>";
    }).join("") || '<div class="row-sub">No payments recorded</div>';
    const quoteRows = quotes.map(function (q) { return '<div class="row-sub">' + esc(q.id) + " · " + esc(q.status) + "</div>"; }).join("") || '<div class="row-sub">No open quotes</div>';
    const lockNote = locked ? '<p class="row-sub">Time and details lock after the visit is completed.</p>' : "";
    showModal("Appointment",
      '<div class="appt-card-ui" data-appt-card="' + esc(a.id) + '">' +
        '<header class="appt-card-head">' +
          '<div class="appt-card-id">' +
            (p ? '<a class="appt-card-name" href="' + chartHref + '">' + esc(p.name) + "</a>" : esc(a.patientId)) +
            '<span class="row-sub">' + (p ? esc(displayId(p.id)) + " · " + esc(fmtDob(p.dob)) : "") + "</span>" +
          "</div>" +
          '<div class="appt-card-head-status">' +
            (p ? alertsBanner(p, { readonly: true }) : "") +
            '<label class="sr-only" for="actionStatus">Visit status</label>' +
            '<select id="actionStatus" class="status-dd status-dd-colored" style="' + statusColorStyle + '">' +
              visitStatuses().map(function (s) { return "<option" + (a.status === s ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") +
            "</select></div></header>" +
        '<div class="appt-card-grid">' +
          '<section class="appt-pane">' +
            "<h3>Patient</h3>" +
            '<div class="row-sub">' + esc(p ? (p.phone || "—") : "—") + "</div>" +
            '<div class="row-sub">' + esc(p ? (p.email || "—") : "—") + "</div>" +
            '<div class="row-sub">' + esc(addr || "—") + "</div>" +
            (p ? paperworkBadge(a) : "") +
            (p ? '<div style="margin-top:10px"><a class="btn small" href="' + chartHref + '">Edit demographics</a></div>' : "") +
          "</section>" +
          '<section class="appt-pane">' +
            "<h3>Appointment</h3>" + lockNote +
            '<div class="formgrid">' +
              '<div class="field"><label for="apptDate">Date</label><input id="apptDate" type="date" value="' + esc(a.date) + '"' + dis + "></div>" +
              '<div class="field"><label for="apptTime">Time</label><select id="apptTime"' + dis + ">" + timeOpts + "</select></div>" +
              '<div class="field"><label for="apptProvider">Provider</label><select id="apptProvider"' + dis + ">" + provOpts + "</select></div>" +
              '<div class="field"><label for="apptSuite">Suite</label><select id="apptSuite"' + dis + ">" + suiteOpts + "</select></div>" +
              '<div class="field"><label for="apptType">Type</label><select id="apptType"' + dis + ">" + typeOpts + "</select></div>" +
              '<div class="field"><label for="fReason">Reason</label><div id="reasonOptions">' + reasonDropdownHtml(a.type, a.reasons || [], a.consultingFor || "") + "</div></div>" +
              '<div class="field full"><label for="apptNotes">Notes</label><textarea id="apptNotes" rows="4"' + dis + ">" + esc(a.prepNotes || "") + "</textarea></div>" +
            "</div>" +
            (locked ? "" :
              '<div class="actions" style="margin-top:12px">' +
                '<button class="btn small" type="button" data-reschedule="' + esc(a.id) + '">Reschedule</button>' +
                '<button class="btn small" type="button" data-appt-end="Canceled">Cancel</button>' +
                '<button class="btn small" type="button" data-appt-end="No-show">No-show</button>' +
              "</div>" +
              '<div id="endReasonWrap" hidden class="field" style="margin-top:8px"><label for="endReason">Reason <span class="req">required</span></label>' +
                '<input id="endReason" placeholder="Required to cancel or mark a no-show">' +
                '<input type="hidden" id="endStatus">' +
                '<button class="btn small primary" type="button" data-confirm-end="' + esc(a.id) + '">Confirm</button></div>') +
          "</section>" +
          '<section class="appt-pane appt-pane-money">' +
            "<h3>Money</h3>" +
            "<div>Balance <strong>" + (bal.tbd ? "TBD" : money(bal.sum || 0)) + "</strong></div>" +
            "<div>Credit <strong>" + money(credit) + "</strong></div>" +
            '<div style="margin-top:8px"><span class="row-sub">Open quotes</span>' + quoteRows + "</div>" +
            '<div style="margin-top:8px"><span class="row-sub">Last payments</span>' + payRows + "</div>" +
            '<button type="button" class="btn primary btn-invoice-lg" data-open-pos="' + esc(a.id) + '">Create invoice</button>' +
            checkoutActionsHtml(a) +
          "</section>" +
        "</div>" +
        '<div id="statusWarn"></div>' +
      "</div>",
      function () { saveAppointmentActions(a); },
      locked ? "Close" : "Save appointment"
    );
    $("#modal").classList.add("appt-mode");
    if (!locked && $("#apptType")) {
      $("#apptType").addEventListener("change", function () {
        $("#reasonOptions").innerHTML = reasonDropdownHtml($("#apptType").value, [], "");
      });
    }
    if (locked && $("#fReason")) $("#fReason").disabled = true;
    if (locked) {
      const save = $("#modalSave");
      if (save) save.onclick = function () { closeModal(); };
    }
  }

  function saveAppointmentActions(a) {
    if (!a) return;
    if (isApptLocked(a)) { closeModal(); return; }
    const reasons = selectedBookReasons();
    const next = $("#actionStatus") ? $("#actionStatus").value : a.status;
    if (NEEDS_REASON.has(next) && !reasons.length && next !== "Canceled" && next !== "No-show") {
      const w = $("#statusWarn");
      if (w) w.innerHTML = '<div class="notice">Select at least one approved reason before ' + esc(next) + ".</div>";
      toast("Select a reason before " + next);
      return;
    }
    const before = { date: a.date, time: a.time, provider: a.provider, suiteId: a.suiteId || "", type: a.type, notes: a.prepNotes || "", reasons: reasonText(a) };
    if ($("#apptDate")) a.date = $("#apptDate").value || a.date;
    if ($("#apptTime")) a.time = $("#apptTime").value || a.time;
    if ($("#apptProvider")) a.provider = $("#apptProvider").value || a.provider;
    if ($("#apptSuite")) a.suiteId = $("#apptSuite").value || null;
    if ($("#apptType")) a.type = $("#apptType").value || a.type;
    if ($("#apptNotes")) a.prepNotes = $("#apptNotes").value;
    if (reasons.length) {
      if (isConsultType($("#apptType") ? $("#apptType").value : a.type) && (BRIZZA.consultingFor || []).indexOf(reasons[0]) >= 0) {
        a.consultingFor = reasons[0];
      } else {
        a.reasons = reasons;
      }
    }
    if (a.date !== before.date || a.time !== before.time) {
      if (isOutsideClinicHours(a.date, a.time) && !a.outsideHoursReason) {
        const why = window.prompt("This time is outside office hours. Enter a reason to keep the new time.");
        if (!why || !String(why).trim()) {
          a.date = before.date; a.time = before.time;
          toast("A reason is required to book outside office hours");
          return;
        }
        a.outsideHoursReason = String(why).trim();
        a.history = a.history || [];
        a.history.push("Outside hours reason: " + a.outsideHoursReason + " · " + nowET());
      }
    }
    const changes = [];
    if (a.date !== before.date) changes.push({ field: "date", before: before.date, after: a.date });
    if (a.time !== before.time) changes.push({ field: "time", before: before.time, after: a.time });
    if (a.provider !== before.provider) changes.push({ field: "provider", before: before.provider, after: a.provider });
    if ((a.suiteId || "") !== before.suiteId) changes.push({ field: "suite", before: before.suiteId || "—", after: a.suiteId || "—" });
    if (a.type !== before.type) changes.push({ field: "type", before: before.type, after: a.type });
    if ((a.prepNotes || "") !== before.notes) changes.push({ field: "notes", before: before.notes || "—", after: a.prepNotes || "—" });
    if (reasonText(a) !== before.reasons) changes.push({ field: "reasons", before: before.reasons, after: reasonText(a) });
    if (changes.length) {
      a.history = a.history || [];
      a.history.push("Updated appointment details · " + nowET());
      addAudit({ action: "Updated appointment", recordType: "Appointment", recordId: a.id,
        recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: state.scheduleView },
        changes: changes });
    }
    if (next !== a.status) setVisitStatus(a.id, next, { silent: true });
    closeModal();
    toast("Appointment saved");
    render();
  }

  function confirmAppointmentEnd(id, status, reason) {
    const a = appt(id);
    if (!a) return;
    const why = String(reason || "").trim();
    if (!why) { toast("A reason is required"); return; }
    a.endReason = why;
    a.history = a.history || [];
    a.history.push(status + " · " + why + " · " + nowET());
    addAudit({ action: status, recordType: "Appointment", recordId: a.id,
      recordPath: { page: "schedule", date: a.date, appointmentId: a.id, view: state.scheduleView },
      changes: [{ field: "status", before: a.status, after: status }, { field: "reason", before: "—", after: why }] });
    setVisitStatus(a.id, status, { silent: true, quietUnpaid: true });
    closeModal();
    toast(status + " recorded");
    render();
  }

  function startReschedule(id) {
    const old = appt(id);
    state.reschedulingId = id;
    closeModal();
    openBook(old.patientId, {
      date: old.date,
      time: old.time,
      provider: old.provider,
      type: old.type,
      reasons: old.reasons || [],
      consultingFor: old.consultingFor || "",
      locationId: old.locationId
    });
    toast("Prior appointment will be retained as Rescheduled when you save a new time");
  }

  function openNewPatient(opts) {
    opts = opts || {};
    showModal("New Patient", `
      <div class="formgrid">
        <div class="field"><label for="npFirst">First name <span class="req">required</span></label><input id="npFirst" required autocomplete="given-name"></div>
        <div class="field"><label for="npLast">Last name <span class="req">required</span></label><input id="npLast" required autocomplete="family-name"></div>
        <div class="field"><label for="npDob">Date of birth <span class="req">required</span></label><input id="npDob" required placeholder="mm/dd/yyyy" inputmode="numeric" data-mask="dob" autocomplete="bday"></div>
        <div class="field"><label for="npPhone">Phone <span class="req">required</span></label><input id="npPhone" required placeholder="(XXX) XXX-XXXX" inputmode="tel" data-mask="phone" autocomplete="tel"></div>
        <div class="field full"><label>Address</label>${addressFieldsHtml(emptyAddress(), "npAddr")}</div>
        <div class="field"><label for="npEmail">Email</label><input id="npEmail" placeholder="Optional"></div>
        <div class="field"><label for="npSex">Sex</label><select id="npSex"><option>Female</option><option>Male</option><option>Unspecified</option></select></div>
      </div>
      <div id="npWarn"></div>`, function () {
      const first = $("#npFirst").value.trim();
      const last = $("#npLast").value.trim();
      const dob = parseDob($("#npDob").value);
      const phone = $("#npPhone").value.trim();
      const missing = [];
      if (!first) missing.push("First name");
      if (!last) missing.push("Last name");
      if (!dob) missing.push("Date of birth (mm/dd/yyyy)");
      if (!phone) missing.push("Phone");
      if (missing.length) {
        $("#npWarn").innerHTML = '<div class="notice">Required: ' + esc(missing.join(", ")) + "</div>";
        toast("Complete the required fields");
        return;
      }
      const name = first + " " + last;
      const id = nextPatientId();
      const parts = readAddressFields(document);
      const phoneFmt = formatPhoneMask(phone);
      store.patients.push({ id: id, firstName: first, lastName: last, name: name, dob: dob, sex: $("#npSex").value, phone: phoneFmt, email: $("#npEmail").value || "—", addressParts: parts, address: formatAddressText(parts), status: "Active", credit: 0, accountBalance: 0, alerts: [], patientNotes: [], allergies: [], meds: [], conditions: [], notes: [], consents: { clinical: "Not yet recorded", marketing: "Not authorized" }, photos: [], documents: [], treatments: [], followups: [], demoHistory: [], registration: { idUploaded: { status: "Not uploaded", date: null }, formsCompleted: { status: "Not completed", date: null }, demographicsConfirmed: { status: "Not confirmed", date: null } } });
      addAudit({ action: "Created patient record", recordType: "Patient", recordId: id,
        recordPath: { page: "patients", selected: id, tab: "demographics" },
        changes: [{ field: "status", before: "—", after: "Active" }, { field: "name", before: "—", after: name }, { field: "id", before: "—", after: displayId(id) }] });
      closeModal();
      toast("Patient " + displayId(id) + " created");
      if (opts.onCreated) opts.onCreated(id);
      else go({ page: "patients", selected: id, tab: "demographics" });
    }, "Save patient");
    $("#modal").classList.add("book-mode");
  }

  function openEdit(pid) {
    const p = patient(pid);
    showModal("Edit Chart", `
      <div class="formgrid">
        <div class="field"><label>Patient number</label><input value="${esc(displayId(p.id))}" disabled></div>
        <div class="field"><label>Name</label><input value="${esc(p.name)}" disabled></div>
        <div class="field"><label for="edPhone">Phone</label><input id="edPhone" value="${esc(formatPhoneMask(p.phone))}" data-mask="phone" inputmode="tel" autocomplete="tel"></div>
        <div class="field"><label for="edEmail">Email</label><input id="edEmail" value="${esc(p.email)}"></div>
        <div class="field"><label for="edDob">Date of birth</label><input id="edDob" value="${esc(fmtDob(p.dob))}" placeholder="mm/dd/yyyy" data-mask="dob" inputmode="numeric"></div>
        <div class="field full"><label>Address</label>${addressFieldsHtml(addressPartsOf(p), "edAddr")}</div>
      </div>
      <div class="notice">Demographic changes are audit-tracked. The patient number cannot be changed.</div>`, function () {
      const phone = formatPhoneMask($("#edPhone").value), email = $("#edEmail").value;
      const dob = parseDob($("#edDob").value) || p.dob;
      const parts = readAddressFields(document);
      const address = formatAddressText(parts);
      const changes = [];
      if (phone !== p.phone) { p.demoHistory.push("Phone " + p.phone + " → " + phone + " · " + nowET()); changes.push({ field: "phone", before: p.phone, after: phone }); }
      if (email !== p.email) { p.demoHistory.push("Email " + p.email + " → " + email + " · " + nowET()); changes.push({ field: "email", before: p.email, after: email }); }
      if (address !== formatAddressText(addressPartsOf(p))) { changes.push({ field: "address", before: formatAddressText(addressPartsOf(p)) || "—", after: address || "—" }); }
      if (dob !== p.dob) { changes.push({ field: "date of birth", before: fmtDob(p.dob), after: fmtDob(dob) }); }
      if (changes.length) {
        addAudit({ action: "Updated demographics", recordType: "Patient", recordId: p.id,
          recordPath: { page: "patients", selected: p.id, tab: "demographics" }, changes: changes });
      }
      p.phone = phone; p.email = email; p.addressParts = parts; p.address = address; p.dob = dob;
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
      p.notes.unshift({ id: nextId("N-", p.notes), date: new Date().toISOString().slice(0, 10), type: "Consultation", procedurePerformed: $("#noteProc").value, provider: "Serena Collins", status: status, text: $("#noteText").value || "Draft note started.", visitId: visitId || undefined });
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
    if ($("#modal") && $("#modal").classList.contains("pos-mode")) refreshInvoicePopup();
    else render();
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
    const adds = (n.addenda || []).map(function (a) {
      return '<div class="addendum"><div class="row-title">Addendum</div><p>' + esc(a.text || "") + '</p><div class="row-sub">' + esc(a.who || "") + (a.role ? " · " + esc(a.role) : "") + " · " + esc(a.when || "") + "</div></div>";
    }).join("");
    const addForm = (isNoteSigned(n) && isClinicalRole())
      ? '<div class="field" style="margin-top:12px"><label for="addendumText">Addendum</label><textarea id="addendumText" rows="3" placeholder="Signed notes change only by addendum"></textarea>' +
        '<button class="btn small primary" type="button" data-save-addendum="' + esc(n.id) + '" data-pid="' + esc(pid) + '" style="margin-top:8px">Add addendum</button></div>'
      : (isNoteSigned(n) ? '<p class="row-sub">Signed notes change only by addendum.</p>' : "");
    const proc = (isConsultNote(n) && isClinicalRole())
      ? '<div style="margin-top:16px"><button class="btn primary" type="button" data-proc-from-consult="' + esc(n.id) + '" data-pid="' + esc(pid) + '">Create procedure note</button></div>'
      : "";
    const edit = (isNoteEditable(n) && isClinicalRole())
      ? '<div style="margin-top:8px"><button class="btn small" type="button" data-edit-note="' + esc(n.id) + '" data-pid="' + esc(pid) + '">Edit</button></div>'
      : "";
    showModal(esc(n.type || "Note") + " · " + (p ? p.name : pid),
      (p ? alertsBanner(p) : "") +
      lock + " " + badge(n.status || "Open") +
      '<div class="row-sub">' + esc(n.provider || "") + (n.signedAt ? " · Signed " + esc(n.signedAt) : "") + "</div>" +
      "<p>" + esc(n.text || "") + "</p>" +
      (adds ? '<div class="addenda"><h3 class="section-title">Addenda</h3>' + adds + "</div>" : "") +
      addForm + edit + proc +
      historyDiffHtml(n.historySnapshot, p) +
      openQ("Draft templates – Open question. These six note templates are not taken from the SOPs or V1 documents (Open question 17)."),
      function () { closeModal(); }, "Close");
  }


  function dayNames(days) {
    const map = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
    return (days || []).map((d) => map[d] || d).join(", ");
  }
  function blocksOutsideClinic(blocks) {
    return (blocks || []).some((b) => (b.start && b.start < "10:00") || (b.end && b.end > "18:00"));
  }
  function renderAvailability() {
    const head = pageHead("Availability", "Availability", "Provider schedule templates drive calendar shading and the location/hours hover.",
      canManageAvailability() ? '<button class="btn primary" type="button" data-av-new="1">＋ Template</button>' : "");
    if (!canManageAvailability()) {
      const body = '<div class="card"><div class="cardbody"><div class="notice">Availability is available when acting as Clinic Manager or MD / Clinic Owner. Change Acting as in the top bar to open this module.</div></div></div>';
      renderChrome("Availability", head, body);
      return;
    }
    const rows = (store.availabilityTemplates || []).map(function (t) {
      const locBlocks = (t.blocks || []).map(function (b) {
        return locationShort(b.locationId) + " (" + compactTime(b.start) + "-" + compactTime(b.end) + ")";
      }).join(" / ") || "No time blocks";
      const flag = blocksOutsideClinic(t.blocks) ? '<span class="outside-flag">Outside clinic hours</span>' : "";
      const end = t.endDate ? fmtDob(t.endDate) : "No end date";
      return '<div class="card" style="margin-bottom:12px"><div class="cardhead"><h2>' + esc(t.provider) + " · " + esc(t.id) + "</h2>" +
        historyIcon("Availability", t.id) +
        ' <button class="btn small" type="button" data-av-edit="' + esc(t.id) + '">Edit</button>' +
        ' <button class="btn small" type="button" data-av-delete="' + esc(t.id) + '">Delete</button></div>' +
        '<div class="cardbody"><div class="row-sub">Starts ' + esc(fmtDob(t.startDate)) + " · Ends " + esc(end) +
        " · Every " + esc(String(t.everyNWeeks || 1)) + " week(s) · " + esc(dayNames(t.days)) + "</div>" +
        '<div style="margin-top:6px">' + esc(locBlocks) + " " + flag + "</div></div></div>";
    }).join("") || '<div class="empty">No availability templates</div>';
    const body = '<div class="card"><div class="cardbody">' +
      '<p class="row-sub">Clinic baseline is Monday–Friday, 10:00 a.m.–6:00 p.m. ET. Templates can include earlier or later hours; those blocks are shown and flagged.</p>' +
      openQ("Can a provider template start before or end after clinic hours? Nicole's example uses 9–11 a.m., which begins before the 10 a.m. clinic open (Open question 27).") +
      openQ("Long Island is a synthetic second location added as an example. Real clinic locations are not confirmed (Open question 26).") +
      "</div></div>" + rows;
    renderChrome("Availability", head, body);
  }
  function availabilityBlockRow(b, i) {
    b = b || { locationId: BRIZZA.DEFAULT_LOCATION, start: "10:00", end: "18:00" };
    const locOpts = (BRIZZA.LOCATIONS || []).map((l) => "<option value=\"" + esc(l.id) + "\"" + (b.locationId === l.id ? " selected" : "") + ">" + esc(l.name) + (l.synthetic ? " (synthetic)" : "") + "</option>").join("");
    return '<div class="av-block" data-av-block="' + i + '"><label class="sr-only" for="avLoc' + i + '">Location</label>' +
      '<select id="avLoc' + i + '" data-av-loc>' + locOpts + "</select>" +
      '<label class="sr-only" for="avStart' + i + '">Start</label><input id="avStart' + i + '" data-av-start type="time" value="' + esc(b.start || "10:00") + '">' +
      '<label class="sr-only" for="avEnd' + i + '">End</label><input id="avEnd' + i + '" data-av-end type="time" value="' + esc(b.end || "18:00") + '">' +
      '<button type="button" class="pos-x" data-av-remove-block aria-label="Remove time block">×</button></div>';
  }
  function collectAvailabilityBlocks() {
    return $$(".av-block").map(function (row) {
      const loc = row.querySelector("[data-av-loc]");
      const start = row.querySelector("[data-av-start]");
      const end = row.querySelector("[data-av-end]");
      return { locationId: loc ? loc.value : BRIZZA.DEFAULT_LOCATION, start: start ? start.value : "10:00", end: end ? end.value : "18:00" };
    });
  }
  function openAvailabilityForm(id) {
    const existing = id && (store.availabilityTemplates || []).find((t) => t.id === id);
    const t = existing || { provider: BRIZZA.PROVIDERS[0], color: "#FFFCF6", startDate: todayET(), endDate: null, everyNWeeks: 1, days: [1, 2, 3, 4, 5], blocks: [{ locationId: BRIZZA.DEFAULT_LOCATION, start: "10:00", end: "18:00" }] };
    const dayChecks = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"]].map(function (x) {
      return '<label><input type="checkbox" name="avDay" value="' + x[0] + '"' + ((t.days || []).indexOf(x[0]) >= 0 ? " checked" : "") + "> " + x[1] + "</label>";
    }).join(" ");
    const prov = BRIZZA.PROVIDERS.map((pv) => "<option" + (t.provider === pv ? " selected" : "") + ">" + esc(pv) + "</option>").join("");
    showModal(existing ? "Edit availability template" : "New availability template", `
      <div class="formgrid">
        <div class="field"><label for="avProvider">Provider</label><select id="avProvider">${prov}</select></div>
        <div class="field"><label for="avColor">Color</label><input id="avColor" type="color" value="${esc(t.color || "#FFFCF6")}"></div>
        <div class="field"><label for="avStartDate">Start date</label><input id="avStartDate" type="date" value="${esc(t.startDate || "")}"></div>
        <div class="field"><label for="avEndDate">End date</label><input id="avEndDate" type="date" value="${esc(t.endDate || "")}" ${t.endDate ? "" : "disabled"}>
          <label><input type="checkbox" id="avNoEnd"${t.endDate ? "" : " checked"}> No end date</label></div>
        <div class="field"><label for="avEvery">Every N weeks</label><input id="avEvery" type="number" min="1" value="${esc(String(t.everyNWeeks || 1))}"></div>
        <div class="field full"><label>Weekly days</label><div>${dayChecks}</div></div>
        <div class="field full"><label>Location and hours</label><div id="avBlocks">${(t.blocks || []).map(availabilityBlockRow).join("")}</div>
          <button class="btn small" type="button" id="avAddBlock">＋ Add block</button></div>
      </div>
      <div id="avWarn"></div>
      ${openQ("Can a provider template start before or end after clinic hours? Nicole's example uses 9–11 a.m., which begins before the 10 a.m. clinic open (Open question 27).")}`,
      function () { saveAvailabilityTemplate(id); }, "Save");
    const noEnd = $("#avNoEnd");
    if (noEnd) noEnd.addEventListener("change", function () {
      if ($("#avEndDate")) $("#avEndDate").disabled = noEnd.checked;
    });
    if ($("#avAddBlock")) $("#avAddBlock").addEventListener("click", function () {
      const box = $("#avBlocks");
      if (!box) return;
      box.insertAdjacentHTML("beforeend", availabilityBlockRow({ locationId: BRIZZA.DEFAULT_LOCATION, start: "14:00", end: "18:00" }, box.children.length));
    });
  }
  function saveAvailabilityTemplate(id) {
    const days = $$('input[name="avDay"]:checked').map((x) => Number(x.value));
    const blocks = collectAvailabilityBlocks().filter((b) => b.start && b.end);
    const missing = [];
    const provider = $("#avProvider") ? $("#avProvider").value : "";
    const startDate = $("#avStartDate") ? $("#avStartDate").value : "";
    const noEnd = $("#avNoEnd") && $("#avNoEnd").checked;
    const endDate = noEnd ? null : ($("#avEndDate") && $("#avEndDate").value) || "";
    if (!provider) missing.push("Provider");
    if (!startDate) missing.push("Start date");
    if (!noEnd && !endDate) missing.push("End date (or choose no end date)");
    if (!days.length) missing.push("Weekly days");
    if (!blocks.length) missing.push("At least one time block");
    if (missing.length) {
      const w = $("#avWarn");
      if (w) w.innerHTML = '<div class="notice">Required: ' + missing.map(esc).join(", ") + "</div>";
      toast("Complete the required fields");
      return;
    }
    const rec = {
      id: id || nextId("AVT-", store.availabilityTemplates),
      provider: provider,
      color: ($("#avColor") && $("#avColor").value) || "#FFFCF6",
      startDate: startDate,
      endDate: endDate || null,
      everyNWeeks: Math.max(1, Number(($("#avEvery") && $("#avEvery").value) || 1)),
      days: days,
      blocks: blocks
    };
    const existing = (store.availabilityTemplates || []).find((t) => t.id === rec.id);
    const before = existing ? JSON.stringify({ provider: existing.provider, blocks: existing.blocks, days: existing.days, startDate: existing.startDate, endDate: existing.endDate }) : "—";
    if (existing) Object.assign(existing, rec);
    else {
      store.availabilityTemplates = store.availabilityTemplates || [];
      store.availabilityTemplates.push(rec);
    }
    addAudit({ action: existing && id ? "Updated availability template" : "Created availability template", recordType: "Availability", recordId: rec.id,
      recordPath: { page: "availability" },
      changes: [{ field: "template", before: before, after: rec.provider + " · " + (rec.blocks || []).map((b) => locationShort(b.locationId) + " " + b.start + "-" + b.end).join(" / ") }] });
    closeModal();
    toast("Availability template saved");
    render();
  }
  function deleteAvailabilityTemplate(id) {
    const existing = (store.availabilityTemplates || []).find((t) => t.id === id);
    if (!existing) return;
    store.availabilityTemplates = store.availabilityTemplates.filter((t) => t.id !== id);
    addAudit({ action: "Deleted availability template", recordType: "Availability", recordId: id,
      recordPath: { page: "availability" },
      changes: [{ field: "template", before: existing.provider, after: "Deleted" }] });
    toast("Template deleted");
    render();
  }

  function renderNotesDash() {
    const mode = state.notesDash === "signed" ? "signed" : "pending";
    state.notesDash = mode;
    const items = [];
    (store.patients || []).forEach(function (p) {
      (p.notes || []).forEach(function (n) {
        const signed = isNoteSigned(n);
        if (mode === "signed" ? signed : !signed) items.push({ p: p, n: n });
      });
    });
    items.sort(function (a, b) { return String(b.n.date || "").localeCompare(String(a.n.date || "")); });
    const head = pageHead("Provider", "Notes",
      mode === "pending" ? "Unsigned clinical notes waiting for completion or signature." : "Signed clinical notes.",
      "");
    const toggle = '<div class="notes-dash-toggle" role="tablist" aria-label="Note lists">' +
      '<button type="button" class="btn small' + (mode === "pending" ? " primary" : "") + '" data-notes-dash="pending" aria-pressed="' + (mode === "pending" ? "true" : "false") + '">Pending clinical notes</button>' +
      '<button type="button" class="btn small' + (mode === "signed" ? " primary" : "") + '" data-notes-dash="signed" aria-pressed="' + (mode === "signed" ? "true" : "false") + '">Signed notes</button></div>';
    const list = items.map(function (item) {
      const n = item.n, p = item.p;
      const open = isNoteEditable(n)
        ? ' data-edit-note="' + esc(n.id) + '" data-pid="' + esc(p.id) + '"'
        : ' data-open="note-view" data-nid="' + esc(n.id) + '" data-pid="' + esc(p.id) + '"';
      return '<button type="button" class="row" style="width:100%;text-align:left"' + open + ">" +
        '<div><div class="row-title">' + esc(p.name) + " · " + esc(n.type || "Note") + '</div>' +
        '<div class="row-sub">' + esc(fmtDate(n.date)) + " · " + esc(n.provider || "") + " · " + esc(displayId(p.id)) + "</div></div>" +
        badge(n.status || "Open") + "</button>";
    }).join("") || '<div class="empty">' + (mode === "pending" ? "No unsigned clinical notes." : "No signed clinical notes.") + "</div>";
    renderChrome('<a href="' + hashFor({ page: "notes" }) + '">Notes</a>', head, '<div class="card"><div class="cardbody notes-dash">' + toggle + list + "</div></div>");
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
    else if (state.page === "availability") renderAvailability();
    else if (state.page === "notes") renderNotesDash();
    else renderPatients();
    if (state.demo.running) paintDemoPanel();
    bindStatusStops();
    bindZipLookups();
    if (state.page === "schedule" && state.scheduleView === "calendar") bindCalendarDrag();
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
    const wlT = e.target.closest("[data-wl-toggle]");
    if (wlT) {
      e.preventDefault();
      const key = wlT.getAttribute("data-wl-toggle");
      const section = wlT.closest(".wl-bucket");
      const willCollapse = !(section && section.classList.contains("is-collapsed"));
      setWlBucketCollapsed(key, willCollapse);
      if (section) {
        section.classList.toggle("is-collapsed", willCollapse);
        wlT.setAttribute("aria-expanded", willCollapse ? "false" : "true");
      }
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
    const endBtn = e.target.closest("[data-appt-end]");
    if (endBtn) {
      e.preventDefault();
      const wrap = $("#endReasonWrap");
      if (wrap) wrap.hidden = false;
      if ($("#endStatus")) $("#endStatus").value = endBtn.getAttribute("data-appt-end");
      if ($("#endReason")) $("#endReason").focus();
      return;
    }
    const confirmEnd = e.target.closest("[data-confirm-end]");
    if (confirmEnd) {
      e.preventDefault();
      confirmAppointmentEnd(confirmEnd.getAttribute("data-confirm-end"), ($("#endStatus") && $("#endStatus").value) || "Canceled", $("#endReason") && $("#endReason").value);
      return;
    }
    const posOpen = e.target.closest("[data-open-pos]");
    if (posOpen) {
      e.preventDefault();
      e.stopPropagation();
      openPosPopup(posOpen.getAttribute("data-open-pos"));
      return;
    }
    const ledInv = e.target.closest("[data-ledger-invoice]");
    if (ledInv) { e.preventDefault(); openLedgerInvoice(ledInv.getAttribute("data-ledger-invoice")); return; }
    const ledPay = e.target.closest("[data-ledger-payment]");
    if (ledPay) { e.preventDefault(); openLedgerPayment(ledPay.getAttribute("data-ledger-payment")); return; }
    const nd = e.target.closest("[data-notes-dash]");
    if (nd) { e.preventDefault(); go({ page: "notes", notesDash: nd.getAttribute("data-notes-dash") }); return; }
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
    const addL = e.target.closest("[data-pos-add-line], [data-pos-add-item]");
    if (addL) {
      e.preventDefault();
      const invId = addL.getAttribute("data-pos-add-line") || state.invoiceId;
      const catId = addL.getAttribute("data-pos-add-item") || ($("#posCatalog") && $("#posCatalog").value);
      const qty = ($("#posQty") && $("#posQty").value) || "1";
      addCatalogLine(invId, catId, qty);
      if ($("#modal") && $("#modal").classList.contains("pos-mode")) refreshInvoicePopup();
      else render();
      return;
    }
    const prn = e.target.closest("[data-print-receipt]");
    if (prn) {
      e.preventDefault();
      printInvoiceReceipt(prn.getAttribute("data-print-receipt"));
      return;
    }
    const rmLine = e.target.closest("[data-remove-line]");
    if (rmLine) {
      e.preventDefault();
      const inv = invoice(state.invoiceId);
      const i = Number(rmLine.getAttribute("data-remove-line"));
      if (inv && inv.lines && inv.lines[i] && !inv.finalized) {
        const name = inv.lines[i].name || "line";
        inv.lines.splice(i, 1);
        refreshInvoiceBalance(inv);
        addAudit({ action: "Removed POS line", recordType: "Invoice", recordId: inv.id,
          recordPath: { page: "pos", invoiceId: inv.id },
          changes: [{ field: "line", before: name, after: "Removed" }] });
        toast("Line removed");
        refreshInvoicePopup();
      }
      return;
    }
    const cred = e.target.closest("[data-apply-credit]");
    if (cred) { e.preventDefault(); applyInvoiceCredit(cred.getAttribute("data-apply-credit")); return; }
    const rem = e.target.closest("[data-add-remaining]");
    if (rem) { e.preventDefault(); addRemainingToBalance(rem.getAttribute("data-add-remaining")); return; }
    const leftUnpaid = e.target.closest("[data-left-unpaid]");
    if (leftUnpaid) { e.preventDefault(); leftWithoutPaying(leftUnpaid.getAttribute("data-left-unpaid")); return; }
    const checkoutBtn = e.target.closest("[data-checkout-visit]");
    if (checkoutBtn) { e.preventDefault(); checkoutVisit(checkoutBtn.getAttribute("data-checkout-visit")); return; }
    const addAlert = e.target.closest("[data-add-alert]");
    if (addAlert) {
      e.preventDefault();
      const pid = addAlert.getAttribute("data-add-alert");
      const host = addAlert.parentElement;
      const existing = host && host.querySelector("#newAlert");
      if (existing) {
        const text = existing.value.trim();
        if (!text) { toast("Enter an alert"); return; }
        const pt = patient(pid);
        if (!pt) return;
        pt.alerts = pt.alerts || [];
        const rec = { id: nextId("AL-", pt.alerts), text: text, when: nowET(), who: actingName() };
        pt.alerts.push(rec);
        addAudit({ action: "Added patient alert", recordType: "Patient", recordId: pid,
          recordPath: { page: "patients", selected: pid, tab: "demographics" },
          changes: [{ field: "alert", before: "—", after: text }] });
        toast("Alert added");
        if (state.page === "patients") render();
        const bannerHost = document.querySelector("#modal.open #modalBody") || $("#app-root");
        if (bannerHost) {
          const oldB = bannerHost.querySelector(".alert-banner, .row-sub");
        }
        if ($("#modal") && $("#modal").classList.contains("open") && !$("#modal").classList.contains("pos-mode")) {
          const first = $("#modalBody") && $("#modalBody").firstElementChild;
          const html = alertsBanner(pt);
          const prev = $("#modalBody") && $("#modalBody").querySelector(".alert-banner");
          if (prev) prev.outerHTML = html;
          else if ($("#modalBody")) $("#modalBody").insertAdjacentHTML("afterbegin", html);
        }
        return;
      }
      addAlert.insertAdjacentHTML("beforebegin", ' <input id="newAlert" placeholder="Allergy, preference, or other alert" aria-label="New patient alert">');
      const inp = $("#newAlert");
      if (inp) inp.focus();
      addAlert.textContent = "Save alert";
      return;
    }
    const rmAlert = e.target.closest("[data-remove-alert]");
    if (rmAlert) {
      e.preventDefault();
      const pid = rmAlert.getAttribute("data-pid");
      const aid = rmAlert.getAttribute("data-remove-alert");
      const pt = patient(pid);
      if (pt) {
        const al = (pt.alerts || []).find((x) => x.id === aid);
        pt.alerts = (pt.alerts || []).filter((x) => x.id !== aid);
        addAudit({ action: "Removed patient alert", recordType: "Patient", recordId: pid,
          recordPath: { page: "patients", selected: pid, tab: "demographics" },
          changes: [{ field: "alert", before: al ? al.text : aid, after: "Removed" }] });
        toast("Alert removed");
        if (state.page === "patients") render();
        if ($("#modal") && $("#modal").classList.contains("open") && !$("#modal").classList.contains("pos-mode") && pt) {
          const prev = $("#modalBody") && $("#modalBody").querySelector(".alert-banner");
          const html = alertsBanner(pt);
          if (prev) prev.outerHTML = html;
        }
      }
      return;
    }
    const addNote = e.target.closest("[data-add-pnote]");
    if (addNote) {
      e.preventDefault();
      const pid = addNote.getAttribute("data-add-pnote");
      const pt = patient(pid);
      const text = ($("#pnote") && $("#pnote").value.trim()) || "";
      if (!pt || !text) { toast("Enter a patient note"); return; }
      pt.patientNotes = pt.patientNotes || [];
      pt.patientNotes.push({ id: nextId("PN-", pt.patientNotes), text: text, when: nowET(), who: actingName() });
      addAudit({ action: "Added patient note", recordType: "Patient", recordId: pid,
        recordPath: { page: "patients", selected: pid, tab: "demographics" },
        changes: [{ field: "patient note", before: "—", after: text }] });
      toast("Patient note added");
      render();
      return;
    }
    if (e.target.closest("[data-av-new]")) { e.preventDefault(); openAvailabilityForm(); return; }
    const avEdit = e.target.closest("[data-av-edit]");
    if (avEdit) { e.preventDefault(); openAvailabilityForm(avEdit.getAttribute("data-av-edit")); return; }
    const avDel = e.target.closest("[data-av-delete]");
    if (avDel) { e.preventDefault(); deleteAvailabilityTemplate(avDel.getAttribute("data-av-delete")); return; }
    const avRm = e.target.closest("[data-av-remove-block]");
    if (avRm) { e.preventDefault(); const row = avRm.closest(".av-block"); if (row) row.remove(); return; }
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
    const chip = e.target.closest("[data-prov-chip]");
    if (chip) { e.preventDefault(); toggleProviderChip(chip.getAttribute("data-prov-chip")); return; }
    const locChip = e.target.closest("[data-loc-chip]");
    if (locChip) { e.preventDefault(); state.locationId = locChip.getAttribute("data-loc-chip"); state.compareLocations = false; render(); return; }
    const locCmp = e.target.closest("[data-loc-compare]");
    if (locCmp) { e.preventDefault(); state.compareLocations = true; render(); return; }
    const emptySlot = e.target.closest("[data-drop-slot]");
    if (emptySlot && !e.target.closest(".cal-event, .block-card, select, button, a, input, .status-dd, .audit-icon, [data-open-appt]")) {
      e.preventDefault();
      const parts = emptySlot.getAttribute("data-drop-slot").split("|");
      openBook(state.selected, { date: parts[0], time: parts[1], provider: parts[2] || slotProvider() });
      return;
    }
    const editNote = e.target.closest("[data-edit-note]");
    if (editNote) { e.preventDefault(); openNoteComposer(editNote.getAttribute("data-pid"), null, null, editNote.getAttribute("data-edit-note")); return; }
    const addendumBtn = e.target.closest("[data-save-addendum]");
    if (addendumBtn) { e.preventDefault(); saveNoteAddendum(addendumBtn.getAttribute("data-pid"), addendumBtn.getAttribute("data-save-addendum")); return; }
    const procC = e.target.closest("[data-proc-from-consult]");
    if (procC) { e.preventDefault(); openProcedureFromConsult(procC.getAttribute("data-pid"), procC.getAttribute("data-proc-from-consult")); return; }
    const procD = e.target.closest("[data-proc-from-draft]");
    if (procD) {
      e.preventDefault();
      const draft = state.noteDraft;
      if (!draft) return;
      const saved = upsertNoteFromDraft({ sign: false, requireComplete: false });
      if (saved) openProcedureFromConsult(draft.pid, saved.id);
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
    else if (t.dataset.open === "note-composer") { e.preventDefault(); openNoteComposer(t.dataset.pid, t.dataset.appt, t.dataset.visit); return; }
    else if (t.dataset.open === "note-view") { e.preventDefault(); openNoteView(t.dataset.pid, t.dataset.nid); return; }
    else if (t.dataset.openSlot) {
      e.preventDefault();
      const parts = t.dataset.openSlot.split("|");
      openBook(state.selected, { date: parts[0], time: parts[1], provider: parts[2] || slotProvider() });
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
        if ($("#modal") && $("#modal").classList.contains("pos-mode")) paintInvoiceLive(inv);
      }
    }
    else if (e.target.dataset.linePrice != null) {
      const inv = invoice(state.invoiceId);
      const i = Number(e.target.dataset.linePrice);
      if (inv && inv.lines[i] && !inv.finalized) {
        const raw = e.target.value.trim();
        const prevRaw = e.target.dataset.prevPrice;
        const before = (prevRaw == null) ? inv.lines[i].unitPrice : (prevRaw === "" ? null : Number(prevRaw));
        const next = raw === "" ? null : Number(raw);
        const after = (next == null || Number.isNaN(next)) ? null : next;
        inv.lines[i].unitPrice = after;
        const amt = lineAmount(inv.lines[i]);
        inv.lines[i].amount = amt == null ? "TBD" : amt;
        refreshInvoiceBalance(inv);
        if (String(before) !== String(after)) {
          addAudit({ action: "Edited line price", recordType: "Invoice", recordId: inv.id,
            recordPath: { page: "pos", invoiceId: inv.id },
            changes: [{ field: "unit price", before: before == null ? "TBD" : money(before), after: after == null ? "TBD" : money(after) }] });
        }
        e.target.dataset.prevPrice = after == null ? "" : String(after);
        if ($("#modal") && $("#modal").classList.contains("pos-mode")) refreshInvoicePopup();
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
    if (!location.hash) history.replaceState(null, "", hashFor({ page: "patients", selected: "BZ0001", tab: "demographics" }));
    window.addEventListener("hashchange", applyRoute);
    document.addEventListener("click", onClick);
    document.addEventListener("change", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-zip-lookup")) applyZipLookup(e.target);
      onChange(e);
    });
    document.addEventListener("paste", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-zip-lookup")) {
        window.setTimeout(function () { applyZipLookup(e.target); }, 0);
      }
    });
    document.addEventListener("input", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-mask")) applyInputMask(e.target);
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-zip-lookup")) applyZipLookup(e.target);
      if (e.target.id === "patient-search" || e.target.id === "sched-search" || e.target.id === "notes-search" || e.target.id === "patient-find" || e.target.id === "lot-trace" || e.target.dataset.cost) onChange(e);
      if (e.target.dataset && (e.target.dataset.lineQty != null || e.target.dataset.linePrice != null)) {
        const inv = invoice(state.invoiceId);
        if (!inv || inv.finalized) return;
        const i = Number(e.target.dataset.lineQty != null ? e.target.dataset.lineQty : e.target.dataset.linePrice);
        const raw = e.target.value.trim();
        if (e.target.dataset.lineQty != null) inv.lines[i].qty = raw === "" ? null : Number(raw);
        if (e.target.dataset.linePrice != null) {
          const n = raw === "" ? null : Number(raw);
          inv.lines[i].unitPrice = (n == null || Number.isNaN(n)) ? null : n;
        }
        const amt = lineAmount(inv.lines[i]);
        inv.lines[i].amount = amt == null ? "TBD" : amt;
        refreshInvoiceBalance(inv);
        paintInvoiceLive(inv);
      }
    });
    document.addEventListener("focusout", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-zip-lookup")) applyZipLookup(e.target);
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
    document.addEventListener("focusin", function (e) {
      if (e.target && e.target.dataset && e.target.dataset.linePrice != null) {
        const inv = invoice(state.invoiceId);
        const i = Number(e.target.dataset.linePrice);
        const cur = inv && inv.lines[i] ? inv.lines[i].unitPrice : null;
        if (e.target.dataset.prevPrice == null) e.target.dataset.prevPrice = cur == null ? "" : String(cur);
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
