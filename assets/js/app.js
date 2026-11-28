/* Brizza Aesthetics EMR mockup — synthetic data only. */
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
    return (BRIZZA.BOOKING_TIMES || []).filter(function (t) { return t >= "10:00" && t < "18:00"; });
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
      '<div class="field"><label for="' + prefix + 'Zip">Zip</label><input id="' + prefix + 'Zip" data-addr="zip" data-zip-lookup="1" value="' + esc(parts.zip || "") + '" inputmode="numeric" maxlength="10" autocomplete="postal-code">' +
        '<p class="row-sub zip-hint" hidden></p></div>' +
      '<div class="field"><label for="' + prefix + 'City">City</label><input id="' + prefix + 'City" data-addr="city" value="' + esc(parts.city || "") + '" autocomplete="address-level2"></div>' +
      '<div class="field"><label for="' + prefix + 'State">State</label>' + stateSelectHtml(prefix, parts.state) + "</div>" +
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
  function stateSelectHtml(prefix, selected) {
    const cur = String(selected || "").trim();
    const states = BRIZZA.US_STATES || [];
    const opts = ['<option value="">Select</option>'].concat(states.map(function (pair) {
      const ab = pair[0], name = pair[1];
      const hit = cur === ab || cur.toLowerCase() === name.toLowerCase();
      return '<option value="' + esc(ab) + '"' + (hit ? " selected" : "") + ">" + esc(name) + " (" + esc(ab) + ")</option>";
    }));
    if (cur && !states.some(function (p) { return p[0] === cur || p[1].toLowerCase() === cur.toLowerCase(); })) {
      opts.push('<option value="' + esc(cur) + '" selected>' + esc(cur) + "</option>");
    }
    return '<select id="' + prefix + 'State" data-addr="state" autocomplete="address-level1">' + opts.join("") + "</select>";
  }
  function zipLookupTable() {
    return BRIZZA.ZIP_LOOKUP || {};
  }
  function applyZipLookup(el) {
    if (!el) return;
    const zip = digitsOnly(el.value, 5);
    const scope = el.closest(".addr-grid") || el.closest(".formgrid") || el.closest("form") || el.closest("#modalBody") || el.parentElement || document;
    const hint = scope.querySelector(".zip-hint");
    const city = scope.querySelector('[data-addr="city"]');
    const st = scope.querySelector('[data-addr="state"]');
    if (zip.length !== 5) {
      if (hint) { hint.hidden = true; hint.textContent = ""; }
      if (el.removeAttribute) el.removeAttribute("aria-invalid");
      return;
    }
    const hit = zipLookupTable()[zip];
    if (!hit) {
      if (hint) {
        hint.hidden = false;
        hint.textContent = "This ZIP isn’t in the directory. Enter the city and state. A city is never filled in automatically for an unknown ZIP.";
      }
      if (el.removeAttribute) el.removeAttribute("aria-invalid");
      return;
    }
    if (city && city.value !== hit.city) city.value = hit.city;
    if (st && st.value !== hit.state) st.value = hit.state;
    if (hint) { hint.hidden = true; hint.textContent = ""; }
    if (el.removeAttribute) el.removeAttribute("aria-invalid");
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
  const AUDIT_SVG = '<svg class="audit-icon-svg" width="22" height="22" viewBox="0 0 24 24" data-audit-icon="clipboard-magnifier" aria-hidden="true" focusable="false"><rect class="audit-clipboard" x="3" y="4.5" width="12" height="16.2" rx="2" fill="#FBF8F3" stroke="currentColor" stroke-width="1.8"/><rect class="audit-clip" x="6.1" y="2.1" width="5.8" height="4.2" rx="1.2" fill="#FBF8F3" stroke="currentColor" stroke-width="1.7"/><path class="audit-lines" d="M6.4 10.4h5.8M6.4 13.4h5.8M6.4 16.4h3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle class="audit-lens" cx="16.2" cy="15.6" r="4.4" fill="#FBF8F3" stroke="currentColor" stroke-width="1.9"/><path class="audit-handle" d="M19.4 18.9 22.4 22" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>';
  function auditIcon(href) {
    if (!href) return "";
    return '<a class="audit-icon" href="' + href + '" data-audit-icon="clipboard-magnifier" title="Audit log" aria-label="Audit log">' + AUDIT_SVG + "</a>";
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
    const rows = items.map(function (it) {
      const st = (it.key === "demographicsConfirmed")
        ? '<button type="button" class="' + (it.ok ? "reg-confirmed" : "reg-not-confirmed") + '" data-open-demo="' + esc(p.id) + '">' + esc(it.status) + "</button>"
        : badge(it.status);
      return '<div class="reg-item"><div><div class="row-title">' + esc(it.label) + '</div><div class="row-sub">' + (it.date ? esc(fmtDate(it.date)) : "No date recorded") + "</div></div>" + st + "</div>";
    }).join("");
    const demo = items.find(function (it) { return it.key === "demographicsConfirmed"; });
    const demoLabel = (demo && demo.ok) ? "Confirmed" : "Not confirmed";
    const demoActions = p ? ('<div class="reg-demo-actions">' +
      '<span class="' + ((demo && demo.ok) ? "reg-confirmed" : "reg-not-confirmed") + '">' + esc(demoLabel) + "</span>" +
      '<button type="button" class="btn small" data-open-demo="' + esc(p.id) + '">Edit</button>' +
      '<button type="button" class="btn small primary" data-confirm-demo="' + esc(p.id) + '">Confirm demographics</button></div>') : "";
    return '<div class="reg-panel" id="reg-panel-' + esc(a.id) + '"><h3 class="section-title">Registration status</h3>' + rows + demoActions +
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

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function daysBetween(a, b) {
    const [ay, am, ad] = String(a).split("-").map(Number);
    const [by, bm, bd] = String(b).split("-").map(Number);
    const da = new Date(ay, am - 1, ad);
    const db = new Date(by, bm - 1, bd);
    return Math.round((db - da) / 86400000);
  }
  function shiftDisplayDates(str, n) {
    if (!str || typeof str !== "string") return str;
    return str.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.? (\d{1,2}), (\d{4})\b/g, function (_, mon, day, year) {
      const mi = MONTH_NAMES.indexOf(mon) >= 0 ? MONTH_NAMES.indexOf(mon) : MONTH_SHORT.indexOf(mon);
      if (mi < 0) return _;
      const dt = new Date(Number(year), mi, Number(day));
      dt.setDate(dt.getDate() + n);
      const names = mon.length > 3 ? MONTH_NAMES : MONTH_SHORT;
      return names[dt.getMonth()] + " " + dt.getDate() + ", " + dt.getFullYear();
    });
  }
  function shiftValueDates(value, key, n) {
    if (value == null) return value;
    if (key === "dob" || key === "phone" || key === "email" || key === "zip") return value;
    if (typeof value === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return addDays(value, n);
      return shiftDisplayDates(value, n);
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) value[i] = shiftValueDates(value[i], key, n);
      return value;
    }
    if (typeof value === "object") {
      Object.keys(value).forEach(function (k) { value[k] = shiftValueDates(value[k], k, n); });
      return value;
    }
    return value;
  }
  function shiftSampleDataToToday() {
    const origin = (BRIZZA.DEMO_CLOCK && BRIZZA.DEMO_CLOCK.date) || "2026-11-18";
    const today = todayET();
    const n = daysBetween(origin, today);
    BRIZZA.sampleShiftDays = n;
    if (!n) return;
    shiftValueDates(store, "", n);
    if (BRIZZA.availabilityTemplates) shiftValueDates(BRIZZA.availabilityTemplates, "", n);
    if (BRIZZA.DEMO_CLOCK) BRIZZA.DEMO_CLOCK.date = today;
    if (BRIZZA.SAMPLE_DAY) BRIZZA.SAMPLE_DAY = addDays(BRIZZA.SAMPLE_DAY, n);
  }

  const store = BRIZZA.seed();
  store.collectTasks = store.collectTasks || [];
  store.tasks = seedClinicTasks();
  store.noteTemplates = loadNoteTemplates();
  shiftSampleDataToToday();
  const state = {
    theme: "01", page: "patients", date: todayET(), selected: "BZ0001",
    tab: "demographics", visitId: null, invoiceId: null, appointmentId: null,
    providerFilter: "All providers", providerChips: null, weekProviderId: "rossi", compareLocations: false,
    search: "", reschedulingId: null, modal: null,
    demo: { running: false, index: 0, timer: null }, contrast: null,
    scheduleView: "calendar", calMode: loadCalMode(), locationId: BRIZZA.DEFAULT_LOCATION,
    expandedAppt: null, expandedPrep: null, auditId: null,
    actingRole: "Clinical Coordinator", adminTab: "home", showInactiveUsers: false, roomingDate: null, scheduleSearch: "", noteDraft: null, alertsOpen: null,
    worklistFilters: loadWorklistFilters(),
    taskScope: "mine", taskDueToday: false, showCompletedTasks: false, tplEditId: null, tplDraft: null,
    notesFrom: "", notesTo: ""
  };
  reconcileSampleSchedule();
  seedBusyClinicTraffic();
  expireQuotes();
  state.date = defaultClinicDate();
  if (isClinicClosedDay(todayET()) && !state.myDayDate) state.myDayDate = defaultClinicDate();
  if (isClinicClosedDay(todayET()) && !state.roomingDate) state.roomingDate = defaultClinicDate();

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

  function normalizePatientTab(tab) {
    if (HIDDEN_CHART_TABS[tab]) return HIDDEN_CHART_TABS[tab];
    if (tab === "documents" || tab === "forms") return "records";
    if (tab === "treatment-history" || tab === "clinical-notes") return "snapshot";
    if (tab === "contact") return "demographics";
    if (tab === "clinical") return "clinical-profile";
    if (tab === "visits") return "appointments";
    if (tab === "money") return "ledger";
    return TABS[tab] ? tab : "snapshot";
  }
  const TABS = {
    snapshot: "Snapshot",
    demographics: "Contact",
    "clinical-profile": "Clinical",
    appointments: "Visits",
    records: "Documents",
    ledger: "Ledger"
  };
  const HIDDEN_CHART_TABS = { photos: "clinical-profile", quotes: "ledger", "follow-up": "appointments", forms: "records", documents: "records" };

  function parseHash() {
    const raw = (location.hash || "#/patients").replace(/^#/, "");
    const [pathPart, queryPart] = raw.split("?");
    const q = new URLSearchParams(queryPart || "");
    const parts = pathPart.split("/").filter(Boolean);
    state.theme = "01";
    let route = { page: "patients" };
    const p0 = parts[0] || "patients";
    if (p0 === "worklist" || (p0 === "schedule" && (parts[1] === "list" || parts[1] === "worklist"))) {
      let i = (p0 === "worklist") ? 1 : 2;
      let date = state.date || todayET();
      let appointmentId = null;
      if (parts[i] && /^\d{4}-\d{2}-\d{2}$/.test(parts[i])) { date = parts[i]; i += 1; }
      if (parts[i] === "appointment") appointmentId = parts[i + 1] || null;
      route = { page: "worklist", view: "worklist", date: date, appointmentId: appointmentId };
    } else if (p0 === "schedule") {
      let i = 1;
      let calMode = state.calMode || "week";
      if (parts[1] === "calendar") {
        const mode = parts[2];
        if (mode === "day" || mode === "week" || mode === "month") { calMode = mode; i = 3; }
        else { calMode = "week"; i = 2; }
      }
      let date = state.date || todayET();
      let appointmentId = null;
      if (parts[i] && /^\d{4}-\d{2}-\d{2}$/.test(parts[i])) { date = parts[i]; i += 1; }
      if (parts[i] === "appointment") appointmentId = parts[i + 1] || null;
      route = { page: "schedule", view: "calendar", calMode: calMode, date: date, appointmentId: appointmentId };
    } else if (p0 === "patients") {
      route = { page: "patients", selected: parts[1] || state.selected, tab: normalizePatientTab(parts[2] || "snapshot") };
    } else if (p0 === "queue" || p0 === "tasks") {
      route = { page: "queue", date: parts[1] || state.date || BRIZZA.SAMPLE_DAY };
    } else if (p0 === "admin") {
      if (parts[1] === "inventory") {
        route = { page: "admin", adminTab: "inventory", invTab: normalizeInvTab(parts[2] || "summary") };
      } else if (parts[1] === "team") {
        route = { page: "admin", adminTab: "users", redirect: true };
      } else {
        const tab = ({ home: "home", users: "users", team: "users", availability: "availability", types: "types", reasons: "types", settings: "settings", locations: "locations", templates: "templates" })[parts[1]] || "home";
        route = { page: "admin", adminTab: tab, redirect: parts[1] === "reasons" || parts[1] === "team" };
      }
    } else if (p0 === "emr" || p0 === "board" || p0 === "my-board" || p0 === "today" || p0 === "my-day") {
      let tab = "patients";
      let date = null;
      let legacy = null;
      (parts.slice(1) || []).forEach(function (seg) {
        if (seg === "tomorrow" || seg === "week") legacy = seg;
        else if (seg === "today" || seg === "patients") tab = "patients";
        else if (seg === "pending" || seg === "mine" || seg === "notes") tab = seg;
        else if (/^\d{4}-\d{2}-\d{2}$/.test(seg)) date = seg;
      });
      route = { page: "emr", myDayTab: tab, myDayDate: date, todayTab: "today", todayLegacy: legacy, redirect: p0 !== "my-day" };
    } else if (p0 === "configuration") {
      route = { page: "admin", adminTab: "settings", redirect: true };
    } else if (p0 === "appointment-types") {
      route = { page: "admin", adminTab: "types", redirect: true };
    } else if (p0 === "appointment-reasons") {
      route = { page: "admin", adminTab: "reasons", redirect: true };
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
    } else if (p0 === "rooming" || p0 === "patient-flow" || p0 === "flow") {
      const date = (parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) ? parts[1] : (state.roomingDate || defaultClinicDate());
      route = { page: "rooming", date: date };
    } else if (p0 === "inventory") {
      route = { page: "admin", adminTab: "inventory", invTab: normalizeInvTab(parts[1] || state.invTab || "summary"), redirect: true };
    } else if (p0 === "availability") {
      route = { page: "admin", adminTab: "availability", redirect: true };
    } else if (p0 === "notes") {
      const segs = parts.slice(1);
      const mine = segs.indexOf("mine") >= 0;
      route = {
        page: "emr",
        myDayTab: mine ? "mine" : "notes",
        notesDash: segs.indexOf("signed") >= 0 ? "signed" : "pending",
        notesScope: mine ? "mine" : "all",
        redirect: true
      };
    } else if (p0 === "quotes") {
      route = { page: "quotes", quoteId: parts[1] && parts[1] !== "new" ? parts[1] : null };
    }
    return route;
  }

  function hashFor(route, theme) {
    const t = theme || state.theme;
    let path = "/patients";
    if (route.page === "worklist" || (route.page === "schedule" && (route.view === "worklist" || route.view === "list"))) {
      path = "/worklist/" + (route.date || state.date);
      if (route.appointmentId) path += "/appointment/" + route.appointmentId;
    } else if (route.page === "schedule") {
      const date = route.date || state.date;
      const calMode = route.calMode || state.calMode || "week";
      path = "/schedule/calendar/" + calMode + "/" + date;
      if (route.appointmentId) path += "/appointment/" + route.appointmentId;
    } else if (route.page === "patients") {
      path = route.selected ? "/patients/" + route.selected + "/" + (route.tab || "snapshot") : "/patients";
    } else if (route.page === "queue" || route.page === "tasks") path = "/tasks/" + (route.date || state.date);
    else if (route.page === "admin" || route.page === "configuration" || route.page === "types" || route.page === "reasons" || route.page === "availability") {
      let tab = route.adminTab || (route.page === "configuration" ? "settings" : route.page === "admin" ? (state.adminTab || "home") : route.page);
      if (tab === "team") tab = "users";
      if (tab === "inventory") path = "/admin/inventory/" + (route.invTab || state.invTab || "summary");
      else path = "/admin/" + (tab || "home");
    }
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
    else if (route.page === "rooming") path = "/patient-flow/" + (route.date || state.roomingDate || defaultClinicDate());
    else if (route.page === "inventory") path = "/admin/inventory/" + (route.invTab || state.invTab || "summary");
    else if (route.page === "emr") {
      const tab = route.myDayTab || state.myDayTab || "patients";
      const date = route.myDayDate || state.myDayDate || "";
      path = "/my-day";
      if (tab && tab !== "patients") path += "/" + tab;
      if (date && tab === "patients") path += "/" + date;
    } else if (route.page === "notes") {
      path = "/my-day/" + (route.notesScope === "mine" ? "mine" : "notes") + (route.notesDash === "signed" ? "/signed" : "");
    } else if (route.page === "quotes") {
      path = "/quotes" + (route.quoteId ? "/" + route.quoteId : "");
    }
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
    if (r.page === "worklist") state.scheduleView = "worklist";
    else if (r.page === "schedule") state.scheduleView = "calendar";
    else if (r.view) state.scheduleView = r.view;
    if (r.calMode) persistCalMode(r.calMode);
    if (r.selected && patient(r.selected)) {
      state.selected = r.selected;
      state.tab = normalizePatientTab(r.tab || "snapshot");
    }
    if (r.quoteId !== undefined) state.quoteId = r.quoteId;
    if (r.todayTab) state.todayTab = r.todayTab;
    if (r.myDayTab) state.myDayTab = r.myDayTab;
    if (r.myDayDate) state.myDayDate = r.myDayDate;
    else if (r.page === "emr" && r.todayLegacy === "tomorrow") state.myDayDate = nextBusinessDay(todayET());
    else if (r.page === "emr" && !r.myDayDate && !state.myDayDate) state.myDayDate = defaultClinicDate();
    if (r.todayLegacy) state.todayTab = "today";
    if (r.notesDash) state.notesDash = r.notesDash;
    if (r.notesScope) state.notesScope = r.notesScope;
    else if (r.page === "notes") state.notesScope = r.notesScope || "all";
    if (r.invTab) state.invTab = r.invTab;
    if (r.page === "admin" && r.adminTab) state.adminTab = r.adminTab;
    if (r.visitId) state.visitId = r.visitId;
    if (r.invoiceId) state.invoiceId = r.invoiceId;
    state.quoteId = r.quoteId || null;
    state.posTab = r.posTab || state.posTab || "invoice";
    if (r.appointmentId && r.page === "pos") state.posAppointmentId = r.appointmentId;

    if (r.appointmentId) state.appointmentId = r.appointmentId;
    if (r.auditId) state.auditId = r.auditId;
    document.documentElement.setAttribute("data-theme", state.theme);
    if (r.redirect) {
      const canon = r.page === "emr"
        ? hashFor({ page: "emr" })
        : hashFor({ page: "admin", adminTab: r.adminTab || state.adminTab || "home", invTab: r.invTab || state.invTab });
      if (location.hash !== canon) history.replaceState(null, "", canon);
    }
    if (r.page === "demo" && !state.demo.running) {
      startDemo();
      return;
    }
    if (enforceRoleRoute()) return;
    clearReturnStack();
    render();
    if ((r.page === "schedule" || r.page === "worklist") && r.appointmentId && appt(r.appointmentId)) {
      openAppointmentModal(r.appointmentId);
    } else if ($("#modal") && $("#modal").classList.contains("open")) {
      closeModal({ cancelPending: true, skipRestore: true });
    }
  }

  function badge(status) {
    const warn = ["Scheduled", "Inactive", "Issued", "Draft", "Partially Paid", "Overdue"].indexOf(status) >= 0;
    const alert = ["Canceled", "No-show", "No-Show", "Voided", "Discharged/Closed", "Not yet recorded", "Needs prep"].indexOf(status) >= 0;
    const cls = alert ? "alert" : warn ? "warn" : "good";
    return '<span class="badge ' + cls + '">' + esc(status) + "</span>";
  }
  let undoFn = null;
  function toast(msg, opts) {
    opts = opts || {};
    const el = $("#toast");
    if (!el) return;
    clearTimeout(toast._t);
    undoFn = null;
    if (opts.undo) {
      undoFn = opts.undo;
      el.innerHTML = '<span class="toast-msg">' + esc(msg) + '</span> <button type="button" class="btn small toast-undo" data-undo="1">Undo</button>';
      toast._t = setTimeout(function () { undoFn = null; el.classList.remove("show"); el.innerHTML = ""; }, 5000);
    } else {
      el.textContent = msg;
      toast._t = setTimeout(function () { el.classList.remove("show"); }, 2800);
    }
    el.classList.add("show");
  }
  function applyUndo() {
    if (typeof undoFn !== "function") return;
    const fn = undoFn;
    undoFn = null;
    clearTimeout(toast._t);
    const el = $("#toast");
    if (el) { el.classList.remove("show"); el.innerHTML = ""; }
    fn();
  }
  function openQ(text) { return ""; }
  function optionalIdea(text) { return ""; }
  function concept(text) { return ""; }
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
    if (l.waived) return 0;
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
  function lineKind(l) {
    if (l && l.kind) return l.kind;
    if (l && l.catalogId) {
      const c = (store.catalog || BRIZZA.CATALOG || []).find(function (x) { return x.id === l.catalogId; });
      if (c && c.kind) return c.kind;
    }
    return "";
  }
  function retailLineSum(inv) {
    let sum = 0, tbd = false, any = false;
    (inv && inv.lines || []).forEach(function (l) {
      if (lineKind(l) !== "retail") return;
      any = true;
      const a = lineAmount(l);
      if (a == null) tbd = true;
      else sum += a;
    });
    return { sum: Math.round(sum * 100) / 100, tbd: tbd, any: any };
  }
  function invoiceTotals(inv) {
    const ls = lineSum(inv);
    const paid = invoicePaid(inv);
    const rate = (typeof BRIZZA.TAX_RATE === "number") ? BRIZZA.TAX_RATE : 0.08875;
    const retail = retailLineSum(inv);
    const tax = retail.sum ? Math.round(retail.sum * rate * 100) / 100 : 0;
    const total = Math.round((ls.sum + tax) * 100) / 100;
    let balance;
    if (inv && inv.carriedToAccount) balance = 0;
    else if (inv && typeof inv.balance === "number" && inv._balanceLocked) balance = inv.balance;
    else if (!ls.tbd) balance = Math.round((total - paid) * 100) / 100;
    else balance = null;
    const label = ls.tbd && !ls.sum ? "TBD" : (money(total) + (ls.tbd ? " + TBD" : ""));
    return { sum: ls.sum, tax: tax, taxRate: rate, retail: retail.sum, total: total, tbd: ls.tbd, paid: paid, balance: balance, label: label };
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
    return '<button type="button" class="audit-icon hist-icon" data-audit-icon="clipboard-magnifier" data-history-type="' + esc(type) + '" data-history-id="' + esc(id || "") + '" title="Quick view" aria-label="Quick view">' + AUDIT_SVG + "</button>";
  }
  function openHistoryPop(type, id) {
    if (!modalIsOpen()) pushReturnContext({ kind: "history" });
    else pushReturnContext({ kind: "history", reopen: currentModalReopen() });
    const evs = auditsFor(type, id).slice().reverse();
    const title = "History · " + (type || "Record") + (id ? " " + id : "");
    const rows = evs.length ? evs.map(function (e) {
      const ch = (e.changes || []).map(function (c) {
        return '<div class="hist-change"><strong>' + esc(c.field) + "</strong> · " + esc(c.before || "—") + " → " + esc(c.after || "—") + "</div>";
      }).join("");
      return '<div class="hist-item"><div class="when">' + esc(e.when) + " · " + esc(e.who) + " · " + esc(e.role) + '</div><div class="row-title">' + esc(e.action) + "</div>" + (ch || '<div class="row-sub">No field changes recorded</div>') + "</div>";
    }).join("") : '<div class="empty">No history recorded for this item yet.</div>';
    const back = $("#modal");
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = '<div class="hist-list">' + rows + "</div>";
    syncModalFooter(null, "Close");
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
      '<p class="row-sub">Synthetic record · Brizza Aesthetics prototype</p></body></html>';
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
    const openQuotes = (store.quotes || []).some((q) => q.patientId === a.patientId && quoteIsActive(q));
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
    const full = { idUploaded: "ID", formsCompleted: "Forms", demographicsConfirmed: "Demographics" };
    const pills = items.map(function (it) {
      return '<span class="reg-mini ' + (it.ok ? "ok" : "miss") + '" title="' + esc(full[it.key] + " · " + it.status) + '">' + esc(full[it.key]) + (it.ok ? " ✓" : "") + "</span>";
    }).join(" ");
    const open = state.expandedAppt === apptId;
    return '<div class="reg-minis"><button type="button" class="reg-widget" data-expand-reg="' + esc(apptId) + '" aria-expanded="' + (open ? "true" : "false") + '" aria-controls="reg-panel-' + esc(apptId) + '" title="Registration status">' + pills + "</button></div>";
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
  function providerInitials(name) {
    const parts = String(name || "").replace(/,.*$/, "").split(/\s+/).filter(function (w) {
      return w && !/^(Dr\.?|MD|NP|LE|RN|PA)$/i.test(w);
    });
    return parts.map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "—";
  }
  function openClinicalNotesGroupHtml(date) {
    return "";
    const items = [];
    (store.patients || []).forEach(function (p) {
      (p.notes || []).forEach(function (n) {
        if (isNoteSigned(n)) return;
        const a = n.appointmentId ? appt(n.appointmentId) : null;
        if (n.date !== date && !(a && a.date === date)) return;
        items.push({ p: p, n: n });
      });
    });
    items.sort(function (a, b) { return String(b.n.date).localeCompare(String(a.n.date)); });
    const rows = items.map(function (it) {
      const initials = providerInitials(it.n.provider || "");
      const canOpen = isClinicalRole() && canUseTemplate(templateIdFromNote(it.n));
      const attr = canOpen && isNoteEditable(it.n)
        ? 'data-edit-note="' + esc(it.n.id) + '" data-pid="' + esc(it.p.id) + '"'
        : 'data-open="note-view" data-pid="' + esc(it.p.id) + '" data-nid="' + esc(it.n.id) + '"';
      return '<div class="wl-task" data-open-clinote="' + esc(it.n.id) + '"><span>' +
        (it.p ? patientLink(it.p) : esc(it.p && it.p.id)) + " · " + esc(it.n.type || "Note") +
        ' <span class="wl-initials" title="' + esc(it.n.provider || "") + '">' + esc(initials) + "</span></span>" +
        '<button type="button" class="btn small" ' + attr + ">Open note</button></div>";
    }).join("") || '<div class="empty">No open clinical notes for this date.</div>';
    return '<div class="wl-tasks wl-open-notes" aria-label="Open clinical notes"><strong>Open clinical notes</strong>' + rows + "</div>";
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
    if (!a || a.status !== "Ready for checkout") return "";
    const due = visitUnpaid(a);
    const warn = due.unpaid ? '<div class="notice checkout-unpaid-alert" role="alert">Unpaid or partial balance' + (due.tbd ? " (amount TBD)" : (due.amount ? " · " + money(due.amount) : "")) + ".</div>" : "";
    return warn + '<div class="actions checkout-actions">' +
      '<button type="button" class="btn small primary" data-checkout-visit="' + esc(a.id) + '">Check out</button></div>';
  }
  function ensureBalanceTask(a) {
    if (!a || !visitUnpaid(a).unpaid) return;
    store.tasks = store.tasks || [];
    const exists = store.tasks.some(function (t) { return t.appointmentId === a.id && t.kind === "balance" && !t.done; });
    if (exists) return;
    store.tasks.push({
      id: nextId("T-BAL-", store.tasks),
      kind: "balance",
      text: "Collect unpaid balance",
      patientId: a.patientId,
      appointmentId: a.id,
      owner: "Serena Collins",
      due: todayET(),
      done: false,
      createdAt: todayET()
    });
  }
  function finishCheckoutVisit(id) {
    const a = appt(id);
    if (!a) return;
    setVisitStatus(id, "Checked out", { silent: true, quietUnpaid: true });
    if (visitUnpaid(a).unpaid) ensureBalanceTask(a);
    if ($("#modal") && $("#modal").classList.contains("open")) closeModal();
    const due = visitUnpaid(a);
    const p = patient(a.patientId);
    toast(due.unpaid ? ("Left " + (due.tbd && !(due.amount > 0) ? "a TBD balance" : money(due.amount || due.balance || 0)) + " on " + ((p && p.firstName) || (p && p.name) || "the patient") + "'s balance") : "Status: Checked out");
    render();
  }
  function checkoutVisit(id, opts) {
    opts = opts || {};
    const a = appt(id);
    if (!a) return;
    if ((isFrontDeskRole() || isOwnerRole()) && !visitHasCharges(a)) {
      toast("Check out once charges exist");
      return;
    }
    const due = visitUnpaid(a);
    if (due.unpaid && !opts.confirmed) {
      const p = patient(a.patientId);
      const who = (p && p.firstName) || (p && p.name) || "the patient";
      const amt = due.tbd && !(due.amount > 0 || due.balance > 0) ? "a TBD balance" : money(due.amount || due.balance || 0);
      showModal("Check out with a balance",
        "<p>Leave " + esc(amt) + " on " + esc(who) + "'s balance?</p>",
        function () { closeModal(); finishCheckoutVisit(id); },
        "Leave on balance");
      const cancel = $("#modalCancel");
      if (cancel) cancel.textContent = "Go back";
      return;
    }
    finishCheckoutVisit(id);
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
    const head = pageHead("Clinical Coordinator", "Worklist", esc(locationName(state.locationId)) + " · " + esc(BRIZZA.CLINIC.hours) + " · Do today’s work without leaving this page.",
      '<button type="button" class="btn" data-open="checkin-forms">Check-in forms</button>');
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
    const colHead = '<div class="wl-head" aria-hidden="true"><div>Time</div><div>Patient</div><div>Provider / Suite</div><div>Type / Reason</div><div>Registration</div><div>Prep</div><div>Status</div><div>Clinical notes</div><div>Appointment notes</div><div>Balance</div><div>Invoice</div></div>';
    const collapsed = wlBucketState();
    let groups = "";
    if (isClinicClosedDay(date)) {
      groups = clinicClosedBanner(date);
    } else {
      wlBucketLabels().forEach(function (bk) {
        const set = timed.filter((a) => wlBucketFor(a) === bk.key);
        const shut = !!collapsed[bk.key];
        groups += '<section class="wl-bucket' + (shut ? " is-collapsed" : "") + '" data-wl-bucket="' + bk.key + '">' +
          '<button type="button" class="wl-bucket-h" data-wl-toggle="' + bk.key + '" aria-expanded="' + (shut ? "false" : "true") + '">' +
          '<span class="wl-bucket-label"><span class="wl-caret" aria-hidden="true">' + (shut ? "›" : "⌄") + "</span>" +
          '<span class="wl-bucket-name">' + esc(bk.label) + '</span></span> <span class="count">' + set.length + "</span></button>" +
          '<div class="wl-bucket-body">' + (set.length ? colHead + set.map(function (a) { return wlRow(a, { late: isLateAppointment(a) }); }).join("") : '<div class="empty">None</div>') + "</div></section>";
      });
      const blks = dayBlocks(date).slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
      if (blks.length) {
        groups += '<div class="wl-admin-blocks"><h3 class="section-title">Admin blocks</h3>' +
          blks.map(function (b) { return '<div class="block-card" style="margin:8px 0" data-open-block="' + esc(b.id) + '">' + esc(fmtTime(b.start)) + "–" + esc(fmtTime(b.end)) + " · " + esc(b.staff || "") + " · Admin · " + esc(b.reason) + (b.notes ? " · " + esc(b.notes) : "") + "</div>"; }).join("") +
          "</div>";
      }
      if (!timed.length && !blks.length) groups = '<div class="empty">No appointments match the current filters.</div>' + groups;
    }

    const body = `<div class="wl" data-worklist="1">
      <div class="card">
        <div class="cardhead">
          <div class="datebar">
            <a class="btn small" id="sched-prev" href="${hashFor({ page: "worklist", date: addDays(date, -1) })}" aria-label="Previous day">‹</a>
            <strong>${esc(fmtLong(date))}</strong> <span class="count">${esc(dayCountLabel(date))}</span> ${isClinicClosedDay(date) ? "" : dayPlusButton(date, true)}
            <a class="btn small" id="sched-next" href="${hashFor({ page: "worklist", date: addDays(date, 1) })}" aria-label="Next day">›</a>
            <a class="btn small" id="sched-today" href="${hashFor({ page: "worklist", date: todayET() })}">Today</a>
            <span class="demo-clock" title="Fixed demo time used for Late tags and the next pending row">${esc("Demo clock · " + demoClockLabel())}</span>
          </div>
          <div class="sched-tools">
            <label class="sr-only" for="sched-search">Search patients and appointments</label>
            <input id="sched-search" class="sched-search" type="search" placeholder="Search name, DOB, #ID, type…" value="${esc(state.scheduleSearch || "")}">
            <button class="btn small" type="button" data-open="new-patient">＋ New patient</button>
            <label class="sr-only" for="locationSel">Location</label>
            <select id="locationSel">${locOpts}</select>
          </div>
        </div>
        <div class="cardbody">
          <div class="wl-toolbar">${filterBar}</div>
          ${hits}
          ${groups}
          ${collectTasksHtml()}
          ${openClinicalNotesGroupHtml(date)}
          ${openQ("Worklist task filters are a prototype of Clinical Coordinator prep work. Official readiness criteria remain an open question (Open question 4).")}
        </div>
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "worklist", date: date }) + '">Worklist</a>', head, body);
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
    const editing = state.editingPrep === a.id;
    const tip = editing
      ? ('<textarea id="prep-' + esc(a.id) + '" class="wl-note" data-prep-notes="' + esc(a.id) + '" rows="2" placeholder="Appointment notes">' + esc(note) + "</textarea>" +
        '<div class="myday-note-actions"><button type="button" class="btn tiny primary" data-save-prep="' + esc(a.id) + '">Save note</button> ' +
        '<button type="button" class="btn tiny" data-cancel-prep="' + esc(a.id) + '">Cancel</button></div>')
      : '<div class="wl-note-one"><span class="wl-note-text">' + (note ? esc(note) : '<span class="muted">No note</span>') + '</span> <button type="button" class="btn-icon" data-edit-prep="' + esc(a.id) + '" title="Edit appointment note" aria-label="Edit appointment note">✎</button></div>';
    const late = opts.late ? '<span class="wl-late">Late</span>' : "";
    const due = visitUnpaid(a);
    const unpaidMark = due.unpaid ? '<span class="wl-unpaid-mark">' + (due.tbd ? "Unpaid TBD" : "Unpaid") + "</span>" : "";
    const cls = "wl-row" + (opts.late ? " is-late" : "") + (due.unpaid ? " is-unpaid" : "");
    const suiteLine = '<span class="wl-suite">' + esc(suite) + "</span>";
    const roomLine = a.suiteId ? '<span class="wl-room">' + esc(suite) + "</span>" : '<span class="wl-room muted">No suite</span>';
    const prepOpen = state.expandedPrep === a.id;
    const prepCell = prepCellHtml(a, prepOpen);
    return '<div class="' + cls + '" data-type="' + esc(a.type) + '" data-status="' + esc(a.status) + '" data-wl-row="' + esc(a.id) + '" style="' + cardTypeStyle(a) + '">' +
      '<div class="wl-time"><span class="wl-time-val">' + esc(fmtTime(a.time)) + "</span>" + late + suiteLine + "</div>" +
      '<div class="wl-patient">' + (p ? patientLink(p) : esc(a.patientId)) + " " + historyIcon("Appointment", a.id) +
        (p ? '<span class="wl-sub">' + esc(fmtDob(p.dob)) + " - " + esc(displayId(p.id)) + "</span>" : "") + "</div>" +
      '<div class="wl-prov">' + esc(providerShortName(a.provider)) + roomLine + "</div>" +
      '<div class="wl-type-reason"><span class="wl-type">' + esc(a.type) + '</span><span class="wl-reason">' + esc(visitReasonLabel(a)) + "</span></div>" +
      '<div class="wl-reg">' + (p ? regMinis(p, a.id) : "") + "</div>" +
      '<div class="wl-prep">' + prepCell + "</div>" +
      "<div>" + statusSelect(a, "wl") + "</div>" +
      clinicalNoteCell(a) +
      '<div class="wl-notes"><label class="sr-only" for="prep-' + esc(a.id) + '">Appointment notes</label>' + tip + "</div>" +
      '<div class="wl-money">' + balanceBadge(patientBalanceValue(a.patientId)) + "</div>" +
      (canCreateInvoice() ? '<div class="wl-checkout-btns"><button type="button" class="btn small wl-invoice" data-open-pos="' + esc(a.id) + '">Invoice</button></div>' : '<div class="wl-checkout-btns"></div>') +
      (open ? '<div class="reg-expand">' + registrationPanel(a) + "</div>" : "") +
      "</div>";
  }

  function prepCellHtml(a, open) {
    const r = readinessFor(a);
    const label = r.ready ? "Ready" : "Needs prep";
    const tip = r.items.map(function (i) { return (i.ok ? "✓ " : "○ ") + i.label; }).join(" · ");
    const details = r.items.map(function (i) {
      return '<div class="row-sub">' + (i.ok ? "✓" : "○") + " " + esc(i.label) + "</div>";
    }).join("");
    return '<span class="prep-cell">' +
      '<button type="button" class="prep-pill ' + (r.ready ? "ready" : "needs") + '" data-expand-prep="' + esc(a.id) + '" aria-expanded="' + (open ? "true" : "false") + '" title="' + esc(tip) + '">' + esc(label) + "</button>" +
      (open ? '<div class="prep-detail" role="tooltip">' + details + "</div>" : "") + "</span>";
  }

  function ensureInvoiceForAppt(a, opts) {
    opts = opts || {};
    if (!a) return null;
    let inv = a.invoiceId ? invoice(a.invoiceId) : null;
    if (!inv) inv = (store.invoices || []).find((i) => (i.appointmentIds || []).indexOf(a.id) >= 0) || null;
    if (inv) { a.invoiceId = inv.id; return inv; }
    const id = nextId("INV-", store.invoices);
    inv = { id: id, patientId: a.patientId, visitId: a.visitId || null, appointmentIds: [a.id], status: "Draft", balance: 0, lines: [], payments: [], finalized: false, finalizedAt: null, movements: [] };
    store.invoices.push(inv);
    a.invoiceId = id;
    if (!opts.quiet) {
      addAudit({ action: "Opened invoice from Worklist", recordType: "Invoice", recordId: id,
        recordPath: { page: "pos", invoiceId: id },
        changes: [{ field: "invoice", before: "—", after: id }] });
    }
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
    const quotes = (store.quotes || []).filter((q) => q.patientId === inv.patientId && quoteIsActive(q));
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
      if (/deposit/i.test(c.name || "") || c.kind === "deposit") return false;
      if (!s) return true;
      return (c.name + " " + (c.category || "") + " " + (c.kind || "") + " " + (c.id || "")).toLowerCase().indexOf(s) >= 0;
    });
  }
  function posCatalogListHtml(inv, q) {
    const tab = state.posCatalogTab || "services";
    const items = catalogSearchResults(q).filter(function (c) {
      const product = c.kind === "product" || c.kind === "retail";
      return tab === "products" ? product : !product;
    });
    if (!items.length) return '<p class="empty">No matching ' + (tab === "products" ? "products" : "services") + ".</p>";
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
  function invoicePopupHtml(inv, opts) {
    opts = opts || {};
    refreshInvoiceBalance(inv);
    const t = invoiceTotals(inv);
    const p = patient(inv.patientId);
    const credit = patientCredit(p);
    const lines = (inv.lines || []).map(function (l, i) {
      const amt = lineAmount(l);
      const price = l.unitPrice == null ? "" : l.unitPrice;
      const waived = !!l.waived;
      const feeBtns = isCancelFeeLine(l)
        ? (waived ? '<span class="badge">Waived</span>' : (canWaiveFees() ? '<button type="button" class="btn small" data-waive-fee="' + esc(inv.id) + '" data-waive-line="' + i + '">Waive fee</button>' : '<span class="row-sub">Manager or Owner can waive</span>'))
        : '<button type="button" class="btn small pos-remove" data-remove-line="' + i + '">Remove</button>';
      return "<tr><td>" + esc(l.name || "") + (l.unit ? ' <span class="row-sub">/ ' + esc(l.unit) + "</span>" : "") + (waived ? ' <span class="badge">Waived</span>' : "") + "</td>" +
        '<td><input class="qty" data-line-qty="' + i + '" type="number" min="0" step="1" value="' + esc(l.qty == null ? "" : l.qty) + '" placeholder="Qty" aria-label="Quantity"' + (waived ? " disabled" : "") + "></td>" +
        '<td><input class="price" data-line-price="' + i + '" type="number" min="0" step="0.01" value="' + esc(price) + '" placeholder="TBD" aria-label="Price"' + (waived ? " disabled" : "") + "></td>" +
        "<td>" + (waived ? "Waived" : (amt == null ? "TBD" : money(amt))) + "</td>" +
        "<td>" + feeBtns + "</td></tr>";
    }).join("") || '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
    const balLabel = t.balance == null ? (t.tbd ? "TBD" : "—") : money(t.balance);
    const amountVal = (t.balance != null && t.balance > 0 && !t.tbd) ? esc(String(t.balance)) : "";
    const q = state.posSearch || "";
    return '<div class="pos-simple pos-invoice" data-pos-popup="' + esc(inv.id) + '">' +
      '<div class="pos-invoice-grid">' +
        '<div class="pos-catalog-pane">' +
          '<div class="pos-cat-tabs" role="tablist">' +
            '<button type="button" class="btn tiny' + ((state.posCatalogTab || "services") === "services" ? " primary" : "") + '" data-pos-cat-tab="services">Services</button>' +
            '<button type="button" class="btn tiny' + (state.posCatalogTab === "products" ? " primary" : "") + '" data-pos-cat-tab="products">Products</button></div>' +
          (inv.finalized ? '<p class="row-sub">This receipt is locked.</p>' :
            '<label class="sr-only" for="posSearch">Search ' + ((state.posCatalogTab || "services") === "products" ? "products" : "services") + "</label>" +
            '<input id="posSearch" type="search" placeholder="Search ' + ((state.posCatalogTab || "services") === "products" ? "products" : "services") + '" value="' + esc(q) + '" autocomplete="off">' +
            '<input id="posQty" class="qty" type="hidden" value="1" aria-hidden="true">' +
            pendingNoteChargesHtml(inv) +
            ((isCoordinatorRole() || state.actingRole === "Clinic Manager" || isOwnerRole()) && !pendingNoteChargesForPatient(inv.patientId, inv).length ? '<button type="button" class="btn tiny" data-add-note-charges="' + esc(inv.id) + '">Add charges from note</button>' : "") +
            posPatientQuotesHtml(inv) +
            '<div id="posCatalogResults" class="pos-catalog-list">' + posCatalogListHtml(inv, q) + "</div>") +
        "</div>" +
        '<div class="pos-cart-pane">' +
          "<h3>Cart</h3>" +
          '<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th><th></th></tr></thead><tbody>' + lines + "</tbody></table>" +
          '<div class="pos-summary">' +
            '<div>Subtotal ' + (t.tbd && !t.sum ? "TBD" : money(t.sum || 0)) + "</div>" +
            "<div>Tax 8.875% on retail · " + (t.tbd && !t.sum ? "TBD" : money(t.tax || 0)) + "</div>" +
            "<div>Total " + esc(t.label) + "</div>" +
            (inv.status === "Paid" ? badge("Paid") : badge(inv.status || "Draft")) +
          "</div>" +
          '<div class="pos-totals"><div>Total ' + esc(t.label) + "</div>" +
            '<div>Available credit <strong>' + money(credit) + "</strong> " +
            (credit > 0 && !inv.finalized ? '<button class="btn small" type="button" data-apply-credit="' + esc(inv.id) + '">Apply</button>' : "") + "</div>" +
            '<div class="grand">Balance ' + esc(balLabel) + "</div></div>" +
          (inv.finalized
            ? ('<div class="bill-complete">Bill complete · receipt locked</div>' +
               '<div class="actions" style="margin-top:10px">' +
               '<button class="btn small" type="button" data-print-receipt="' + esc(inv.id) + '">Print receipt</button>' +
               '<button class="btn small" type="button" data-email-receipt="' + esc(inv.id) + '">Email receipt</button></div>')
            : ('<div class="pos-pay">' +
            '<label class="sr-only" for="pay-status">Payment status</label>' +
            '<select id="pay-status" aria-label="Payment status">' + paymentStatusOptions("Paid") + "</select>" +
            '<label class="sr-only" for="pay-amount">Payment amount</label>' +
            '<input id="pay-amount" class="qty" type="number" min="0" step="0.01" placeholder="Amount" aria-label="Payment amount" value="' + amountVal + '">' +
            '<button class="btn small primary" type="button" data-record-pay="' + esc(inv.id) + '">Record payment</button></div>' +
            '<div class="actions" style="margin-top:10px">' +
            '<button class="btn small primary" type="button" data-complete-sale="' + esc(inv.id) + '">Complete sale</button>' +
            '<button class="btn small" type="button" data-finalize-receipt="' + esc(inv.id) + '">Finalize receipt</button>' +
            '<button class="btn small" type="button" data-print-receipt="' + esc(inv.id) + '">Print receipt</button>' +
            '<button class="btn small" type="button" data-add-remaining="' + esc(inv.id) + '">Add remaining to patient balance</button></div>')) +
        "</div>" +
        posReceiptHtml(inv, p, t) +
      "</div>" +
      (opts.embedded ? "" : '<p class="row-sub"><a href="' + hashFor({ page: "pos", invoiceId: inv.id, posTab: "invoice" }) + '">Open full Point of Sale page</a></p>') +
      checkoutActionsHtml(appt(state.posAppointmentId) || (inv.appointmentIds || []).map(appt)[0]) +
      "</div>";
  }
  function posReceiptHtml(inv, p, t) {
    const contact = clinicContactLines();
    const a = appt(state.posAppointmentId) || (inv.appointmentIds || []).map(appt)[0];
    const locked = !!inv.finalized;
    const rows = (inv.lines || []).map(function (l) {
      const amt = lineAmount(l);
      return '<div class="receipt-line">' + esc(l.name || "") +
        (l.qty != null ? " × " + esc(String(l.qty)) : "") + " · " +
        (l.waived ? "Waived" : (amt == null ? "TBD" : money(amt))) + "</div>";
    }).join("") || '<div class="receipt-line muted">No items</div>';
    return '<aside class="pos-receipt' + (locked ? " is-final" : "") + '">' +
      clinicLogoMark("print-logo") +
      '<div class="receipt-meta">' + esc(contact.address) + "</div>" +
      '<div class="receipt-meta">' + esc(contact.phone) + "</div>" +
      (a && a.provider ? '<div class="receipt-meta">Provider · ' + esc(a.provider) + "</div>" : "") +
      (p ? '<div class="receipt-meta">Patient · ' + esc(p.name) + " · " + esc(displayId(p.id)) + "</div>" : "") +
      "<h3>Receipt</h3>" + rows +
      '<div class="receipt-total">Total ' + esc(t.label) + "</div>" +
      '<div class="receipt-meta">Balance ' + esc(t.balance == null ? (t.tbd ? "TBD" : "—") : money(t.balance)) + "</div>" +
      (locked ? '<div class="bill-complete">Bill complete · ' + esc(inv.status === "Paid" ? "Paid" : (inv.status || "Completed")) + " · receipt locked</div>" : badge(inv.status || "Draft")) +
    "</aside>";
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
    const contact = clinicContactLines();
    const html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>Receipt · " + esc(inv.id) + "</title>" +
      "<style>body{font-family:Georgia,'Times New Roman',serif;color:#352820;margin:24px;max-width:640px}" +
      "h1,.clinic-logo-mark{font-size:22px;margin:0 0 4px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}" +
      "h2{font-size:16px;margin:16px 0 8px;font-weight:600}" +
      "p,div{font-size:13px;line-height:1.45}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}" +
      "th,td{text-align:left;padding:6px 0;border-bottom:1px solid #d8d0c8}th{font-weight:600}" +
      ".tot{font-weight:700;margin-top:8px}@media print{body{margin:12px}}</style></head><body>" +
      clinicLogoMark("print-logo") + "<p>Receipt</p>" +
      "<p>" + esc(contact.address) + "<br>" + esc(contact.phone) + "</p>" +
      (a && a.provider ? "<p>Provider: " + esc(a.provider) + "</p>" : "") +
      "<p>" + esc(inv.id) + (loc ? " · " + esc(loc) : "") + "</p>" +
      (p ? "<p>Patient: " + esc(p.name) + " · " + esc(displayId(p.id)) + "</p>" : "") +
      (a ? "<p>" + esc(fmtLong(a.date)) + " · " + esc(fmtTime(a.time)) + " · " + esc(a.type) + "</p>" : "") +
      "<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>" + lineRows + "</tbody></table>" +
      "<p>Subtotal " + (t.tbd && !t.sum ? "TBD" : money(t.sum || 0)) + "</p>" +
      '<p>Tax ' + ((t.taxRate || 0) * 100).toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + "% on retail · " + (t.tbd && !t.sum ? "TBD" : money(t.tax || 0)) + "</p>" +
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
  function syncPayAmount(inv) {
    const el = document.getElementById("pay-amount");
    if (!el || !inv) return;
    const t = invoiceTotals(inv);
    if (t.balance != null && !t.tbd && t.balance > 0) el.value = String(t.balance);
    else if (t.balance != null && !t.tbd && t.balance <= 0) el.value = "0";
  }
  function refreshPosView() {
    if ($("#modal") && $("#modal").classList.contains("pos-mode")) refreshInvoicePopup();
    else render();
    const inv = invoice(state.invoiceId);
    if (inv) syncPayAmount(inv);
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
    const sum = wrap.querySelector(".pos-summary");
    if (sum) {
      const els = sum.querySelectorAll("div");
      if (els[0]) els[0].textContent = "Subtotal " + (t.tbd && !t.sum ? "TBD" : money(t.sum || 0));
      if (els[1]) els[1].textContent = "Tax 8.875% on retail · " + (t.tbd && !t.sum ? "TBD" : money(t.tax || 0));
      if (els[2]) els[2].textContent = "Total " + t.label;
    }
    syncPayAmount(inv);
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
  function openInvoicePopup(inv, apptId, opts) {
    if (!inv) return;
    opts = opts || {};
    if (!opts.skipPush) {
      const alreadyPos = modalIsOpen() && $("#modal").classList.contains("pos-mode");
      if (!alreadyPos) pushReturnContext({ kind: "invoice", reopen: currentModalReopen() });
    }
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
    save.disabled = false;
    save.onclick = function () { closeModal(); };
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
    if (credit <= 0) { toast("No credit to apply"); return; }
    let use;
    if (t.balance != null && !t.tbd) {
      if (t.balance <= 0) { toast("Nothing is due on this invoice"); return; }
      use = Math.min(credit, t.balance);
    } else {
      use = credit;
    }
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
    const addQty = (qtyRaw === "" || qtyRaw == null || Number.isNaN(Number(qtyRaw))) ? 1 : Number(qtyRaw);
    const existing = (inv.lines || []).find(function (l) {
      return l.catalogId === item.id || (l.name === item.name && l.unit === item.unit && l.unitPrice === item.price);
    });
    if (existing) {
      existing.qty = (existing.qty == null ? 0 : Number(existing.qty)) + addQty;
      const amt0 = lineAmount(existing);
      if (amt0 != null) existing.amount = amt0;
      refreshInvoiceBalance(inv);
      addAudit({ action: "Updated POS line quantity", recordType: "Invoice", recordId: inv.id,
        recordPath: { page: "pos", invoiceId: inv.id },
        changes: [{ field: "line", before: item.name, after: item.name + " · qty " + existing.qty }] });
      toast("Quantity updated · " + item.name + " × " + existing.qty);
      return;
    }
    const line = { kind: item.kind, catalogId: item.id, name: item.name, unit: item.unit, qty: addQty, unitPrice: item.price, amount: "TBD" };
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

  function normalizeInvTab(tab) {
    if (tab === "alerts" || tab === "audit" || tab === "trace" || tab === "home") return "summary";
    if (tab === "adjustments") return "adjust";
    const ok = { summary: 1, catalog: 1, orders: 1, lots: 1, adjust: 1 };
    return ok[tab] ? tab : "summary";
  }
  function lotExpiryCue(l) {
    if (!l || !l.expiry) return "";
    const day = todayET();
    if (l.expiry < day) return ' <span class="badge alert">Expired</span>';
    const limit = addDays(day, 30);
    if (l.expiry <= limit) return ' <span class="badge warn">Expiring</span>';
    return "";
  }
  function invSummaryHtml() {
    const low = lowStockItems();
    const exp = (store.lots || []).filter(function (l) { return lotExpiryCue(l); });
    const lowRows = low.map(function (c) {
      return '<div class="inv-alert"><strong>' + esc(c.name) + "</strong> · on hand " + catalogOnHand(c) + " · reorder point " + c.reorderPoint + ' <span class="badge alert">Low</span></div>';
    }).join("") || '<div class="empty">No low-stock alerts.</div>';
    const expRows = exp.map(function (l) {
      return '<div class="row"><span>' + esc(l.id) + " · " + esc(l.product) + " · expires " + esc(fmtDate(l.expiry)) + "</span>" + lotExpiryCue(l) +
        (l.expiry < todayET() && l.status !== "Disposed" && l.status !== "Quarantined" ? ' <button type="button" class="btn small" data-quarantine-lot="' + esc(l.id) + '">Remove / quarantine</button>' : "") + "</div>";
    }).join("") || '<div class="empty">No expiry cues.</div>';
    const audit = canManageInventory() ? invAuditHtml() : "";
    return '<div class="grid">' +
      '<div class="card"><div class="cardhead"><h2>Low-stock alerts</h2></div><div class="cardbody">' + lowRows + "</div></div>" +
      '<div class="card"><div class="cardhead"><h2>Expiry</h2></div><div class="cardbody">' + expRows + "</div></div>" +
      "</div>" + audit;
  }
  function renderInventory() {
    const head = pageHead("Admin", "Inventory", "Lots follow FEFO. Usage posts when an invoice is finalized.", "");
    if (!canManageInventory()) {
      const body = '<div class="card"><div class="cardbody"><div class="notice">Inventory is available when acting as Clinic Manager or MD / Clinic Owner. Change Acting as in the top bar to open this module.</div></div></div>';
      renderAdminChrome(head, body);
      return;
    }
    const tab = normalizeInvTab(state.invTab || "summary");
    state.invTab = tab;
    const tabs = [["catalog","Catalog"],["orders","Orders"],["lots","Lots"],["adjust","Adjustments"]].map(function (x) {
      return '<a class="tab ' + (tab === x[0] ? "active" : "") + '" href="' + hashFor({ page: "admin", adminTab: "inventory", invTab: x[0] }) + '">' + x[1] + "</a>";
    }).join("");
    const land = (tab === "summary") ? '<div class="notice">Inventory summary. Open a tab for catalog, orders, lots, or adjustments.</div>' : "";
    let body = land + '<div class="inv-tabs" role="tablist">' + tabs + "</div>";
    if (tab === "summary") body += invSummaryHtml();
    else if (tab === "catalog") body += invCatalogHtml();
    else if (tab === "orders") body += invOrdersHtml();
    else if (tab === "lots") body += invLotsHtml();
    else body += invAdjustHtml();
    renderAdminChrome(head, body);
  }
  function invCatalogHtml() {
    const rows = (store.catalog || []).map(function (c) {
      const on = catalogOnHand(c);
      const low = c.reorderPoint != null && on != null && on <= c.reorderPoint;
      const costVal = c.cost == null ? "" : c.cost;
      return "<tr" + (low ? ' class="inv-low"' : "") + "><td>" + esc(c.name) + "</td><td>" +
        (c.price == null ? "TBD" : money(c.price)) + "</td><td>" + (on == null ? "—" : on) + "</td><td>" + (c.reorderPoint == null ? "—" : c.reorderPoint) + (low ? ' <span class="badge alert">Low</span>' : "") + "</td></tr>";
    }).join("");
    return '<div class="card"><div class="cardhead"><h2>Product catalog</h2></div><div class="cardbody"><table class="table"><thead><tr><th>Product</th><th>Price</th><th>On hand</th><th>Reorder point</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
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
      return "<tr><td>" + esc(l.id) + "</td><td>" + esc(l.product) + "</td><td>" + esc(l.lotNumber || l.id) + "</td><td>" + esc(l.expiry) + lotExpiryCue(l) + "</td><td>" + l.onHand + "</td><td>" + esc(l.status) + "</td><td>" + ov + " " + openBtn + "</td><td>" + historyIcon("Lot", l.id) + "</td></tr>";
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
  function normalizeNoteStatus(s) {
    const x = String(s || "").toLowerCase();
    if (!s || x === "open" || x === "draft") return "Draft";
    if (x === "ready for review" || x === "ready") return "Ready for review";
    if (x === "finalized" || x === "signed" || x === "locked") return "Finalized";
    if (x === "amended") return "Amended";
    return s;
  }
  function normalizeSeedNotes() {
    (store.patients || []).forEach(function (p) {
      (p.notes || []).forEach(function (n) { n.status = normalizeNoteStatus(n.status); });
    });
  }
  function isNoteSigned(n) {
    const st = normalizeNoteStatus((n && n.status) || "Draft");
    if (n) n.status = st;
    return st === "Finalized" || st === "Amended" || !!(n && n.locked);
  }
  function isNoteEditable(n) { return !isNoteSigned(n); }
  function isNoteAuthor(n) {
    if (!n || !n.provider) return true;
    return n.provider === actingName();
  }
  function canFinalizeNote(n) {
    if (!isClinicalRole()) return false;
    if (isOwnerRole()) return true;
    return isNoteAuthor(n);
  }
  function canMarkReady(n) {
    return isClinicalRole() && (!n || !isNoteSigned(n));
  }
  function latestPatientNote(pid, exceptId) {
    const p = patient(pid);
    const list = ((p && p.notes) || []).filter(function (n) { return n && n.id !== exceptId; })
      .slice()
      .sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")) || String(b.id || "").localeCompare(String(a.id || "")); });
    return list[0] || null;
  }
  function lastNoteLineHtml(pid, exceptId) {
    const last = latestPatientNote(pid, exceptId);
    if (!last) return '<p class="row-sub last-note-line" id="lastNoteLink">No earlier note</p>';
    const label = (last.type || "Note") + " · " + fmtDate(last.date) + (last.time ? " · " + fmtTime(last.time) : "") + " · " + (last.status || "Draft");
    return '<p class="row-sub last-note-line" id="lastNoteLink">Last note: <button type="button" class="text-link" data-view-note="' + esc(last.id) + '" data-pid="' + esc(pid) + '">' + esc(label) + "</button></p>";
  }
  function noteOutlineHtml(tpl) {
    const items = [{ id: "noteHx", title: "Medical history" }].concat((tpl && tpl.sections || []).map(function (s, i) {
      return { id: "sec-" + (s.id || i), title: s.title || ("Section " + (i + 1)) };
    })).concat([{ id: "notePreviewWrap", title: "Generated note" }]);
    return '<nav class="note-outline" aria-label="Note sections">' + items.map(function (it) {
      return '<button type="button" class="text-link" data-note-jump="' + esc(it.id) + '">' + esc(it.title) + "</button>";
    }).join(" ") + "</nav>";
  }
  function captureNoteReturn() {
    if (!state.noteReturn) state.noteReturn = location.hash;
  }
  function returnAfterNote() {
    const ret = state.noteReturn;
    state.noteReturn = null;
    if (ret && location.hash !== ret) location.hash = ret;
    else render();
  }
  function templateIdFromNote(n) {
    if (n && n.templateId) return n.templateId;
    const tpls = notesTemplatesForRole();
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
    const fromTpl = missingNoteFields(tpl, values);
    if (fromTpl.length || (tpl && tpl.sections && tpl.sections.length)) return fromTpl;
    const qs = builderQuestions(tpl);
    if (!qs) return fromTpl;
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
    if (!sentences.length) return "";
    return "This visit note records only the details that were selected or entered. " + sentences.join(" ");
  }
  function faceMapEnabled(tpl) {
    if (templateHasType(tpl, "facemap")) return true;
    const id = tpl && (tpl.familyId || tpl.id);
    return id === "inj-procedure";
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
  function sumDocumentedUnits(draft) {
    if (!draft) return "";
    let sum = 0, any = false;
    (draft.facePoints || []).forEach(function (pt) {
      const raw = (pt.units || "").toString().trim();
      if (!raw) return;
      const n = parseFloat(raw);
      if (!Number.isNaN(n)) { sum += n; any = true; }
    });
    const other = (draft.otherUnits || "").toString().trim();
    if (other) {
      const n = parseFloat(other);
      if (!Number.isNaN(n)) { sum += n; any = true; }
    }
    return any ? String(sum) : "";
  }
  function syncUnitsDocumented(draft) {
    if (!draft) return;
    draft.values = draft.values || {};
    const sum = sumDocumentedUnits(draft);
    draft.values.unitsDocumented = sum;
    const input = $("#nf-unitsDocumented");
    if (input) input.value = sum;
  }
  function syncAreasFromFace(draft) {
    if (!draft) return;
    const names = (draft.facePoints || []).map(function (pt) { return pt.name; });
    const otherLabel = (draft.otherAreaLabel || "").toString().trim();
    if (otherLabel) names.push(otherLabel);
    draft.values = draft.values || {};
    draft.values.areasTreated = names.join(", ");
    const input = $("#nf-areasTreated");
    if (input) input.value = draft.values.areasTreated;
    syncUnitsDocumented(draft);
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
      '<div class="face-points" id="facePoints">' + points + "</div>" +
      '<div class="face-other">' +
      '<label for="faceOtherLabel">Other</label>' +
      '<input id="faceOtherLabel" data-face-other-label type="text" value="' + esc(draft.otherAreaLabel || "") + '" placeholder="Label" aria-label="Other treatment area">' +
      '<label for="faceOtherUnits">Units</label>' +
      '<input id="faceOtherUnits" data-face-other-units type="text" inputmode="decimal" value="' + esc(draft.otherUnits || "") + '" placeholder="" aria-label="Units for other treatment area">' +
      "</div></div>";
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
        syncUnitsDocumented(draft);
        updateNoteSignState();
      });
    });
    const otherLabel = root.querySelector("[data-face-other-label]");
    if (otherLabel) otherLabel.addEventListener("input", function () {
      draft.otherAreaLabel = otherLabel.value;
      draft.previewEdited = false;
      syncAreasFromFace(draft);
      updateNoteSignState();
    });
    const otherUnits = root.querySelector("[data-face-other-units]");
    if (otherUnits) otherUnits.addEventListener("input", function () {
      draft.otherUnits = otherUnits.value;
      draft.previewEdited = false;
      syncUnitsDocumented(draft);
      updateNoteSignState();
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
      const canEdit = isNoteEditable(n) && isClinicalRole() && canUseTemplate(templateIdFromNote(n));
      return '<div class="note-card"><div><div class="row-title">' + esc(fmtDate(n.date)) + " · " + esc(n.type || "Note") + '</div><div class="row-sub">' + esc(n.provider || "") + "</div></div>" +
        badge(st) +
        '<div class="actions">' +
        '<button class="btn small" type="button" data-emn-info="' + n.id + '" data-pid="' + p.id + '">Details</button>' +
        (canEdit ? '<button class="btn small" type="button" data-edit-note="' + n.id + '" data-pid="' + p.id + '">Edit</button>' : "") +
        '<button class="btn small" type="button" data-open="note-view" data-pid="' + p.id + '" data-nid="' + n.id + '">View</button></div></div>';
    }).join("") || '<div class="empty">No clinical notes for this patient.</div>';
    return '<div class="card notes-list"><div class="cardhead"><h2>Clinical notes</h2>' +
      (isClinicalRole() ? '<button class="btn small" type="button" data-open="note-composer" data-pid="' + p.id + '">＋ New note</button>' : "") + "</div>" +
      '<div class="cardbody" style="padding:12px">' +
      '<label class="sr-only" for="notes-search">Search clinical notes</label>' +
      '<input id="notes-search" class="searchbox" placeholder="Search notes for this patient" value="' + esc(state.notesSearch || "") + '">' +
      "<div>" + list + "</div></div></div>";
  }

  function findPatientHtml() {
    const q = (state.patientFind || "").trim().toLowerCase();
    const hits = q ? store.patients.filter((p) => (p.name + " " + p.firstName + " " + p.lastName + " " + p.id + " " + displayId(p.id) + " " + p.dob + " " + fmtDob(p.dob) + " " + p.phone).toLowerCase().includes(q)).slice(0, 8) : [];
    const list = hits.map((p) => '<a class="row" href="' + hashFor({ page: "patients", selected: p.id, tab: state.tab || "demographics" }) + '"><div><div class="row-title">' + esc(p.name) + '</div><div class="row-sub">' + esc(fmtDob(p.dob)) + " - " + esc(displayId(p.id)) + "</div></div></a>").join("");
    return '<div class="top-patient-find find-patient"><label class="sr-only" for="patient-find">Patient search</label><input id="patient-find" class="searchbox" placeholder="Patient search (name, DOB, #ID)" value="' + esc(state.patientFind || "") + '"> <button class="btn pill small" type="button" data-open="new-patient">＋ New patient</button>' + (q ? '<div class="top-patient-hits">' + (list || '<div class="empty">No match</div>') + "</div>" : "") + "</div>";
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
  function isClinicalAlert(al) {
    const kind = ((al && al.kind) || "").toLowerCase();
    const text = ((al && al.text) || "");
    if (kind === "preference" || /prefer/i.test(text)) return false;
    return kind === "allergy" || kind === "clinical" || kind === "safety" || /allerg|safety/i.test(text);
  }
  function preferenceAlerts(p) {
    return ((p && p.alerts) || []).filter(function (al) { return !isClinicalAlert(al) && (((al.kind || "").toLowerCase() === "preference") || /prefer/i.test(al.text || "")); });
  }
  function alertKindFromText(text) {
    if (/allerg/i.test(text || "")) return "allergy";
    if (/unpaid|balance due/i.test(text || "")) return "unpaid";
    return "other";
  }
  function alertPillsHtml(p, opts) {
    opts = opts || {};
    if (!p) return "";
    const list = p.alerts || [];
    const n = list.length;
    const open = state.alertsOpen === p.id && !opts.readonly;
    const countLabel = n ? (n + " alert" + (n === 1 ? "" : "s")) : "Alerts";
    const clinical = list.filter(isClinicalAlert).map(function (al) {
      return '<span class="alert-pill clinical" title="' + esc(al.text) + '">' + esc(al.text) + "</span>";
    }).join("");
    const countBtn = opts.readonly
      ? (n ? '<span class="alert-pill">' + esc(countLabel) + "</span>" : "")
      : '<button type="button" class="alert-pill' + (n ? "" : " quiet") + (open ? " open" : "") + '" data-alerts-toggle="' + esc(p.id) + '" aria-expanded="' + (open ? "true" : "false") + '" aria-haspopup="dialog">' + esc(countLabel) + "</button>";
    const items = list.map(function (al) {
      const rm = opts.readonly ? "" : ' <button type="button" class="pos-x" data-remove-alert="' + esc(al.id) + '" data-pid="' + esc(p.id) + '" aria-label="Remove alert">×</button>';
      return '<div class="alert-pop-item' + (isClinicalAlert(al) ? " clinical" : "") + '"><span>' + esc(al.text) + "</span>" + rm + "</div>";
    }).join("") || '<div class="empty">No alerts</div>';
    const add = opts.readonly ? "" : (
      '<div class="alert-pop-add">' +
        '<label class="sr-only" for="newAlert">New alert</label>' +
        '<input id="newAlert" placeholder="New alert" aria-label="New alert">' +
        '<button class="btn small" type="button" data-add-alert="' + esc(p.id) + '">Add</button>' +
      "</div>"
    );
    const pop = (!opts.readonly && open) ? ('<div class="alert-pop" role="dialog" aria-label="Patient alerts">' + items + add + "</div>") : "";
    return '<div class="alert-pills">' + countBtn + clinical + pop + "</div>";
  }
  function lastVisitForRebook(p) {
    return lastAppt(p) || (apptsFor(p) || []).filter(function (a) {
      return a.status !== "Canceled" && a.status !== "Rescheduled";
    }).sort(function (a, b) { return (b.date + " " + (b.time || "")).localeCompare(a.date + " " + (a.time || "")); })[0] || null;
  }
  function outstandingInvoice(pid) {
    const list = (store.invoices || []).filter(function (inv) {
      if (inv.patientId !== pid || inv.carriedToAccount) return false;
      if (inv.status === "Paid" || inv.status === "Voided" || inv.status === "Refunded") return false;
      refreshInvoiceBalance(inv);
      return inv.status !== "Paid";
    });
    list.sort(function (a, b) {
      const av = typeof a.balance === "number" ? a.balance : 0;
      const bv = typeof b.balance === "number" ? b.balance : 0;
      return bv - av;
    });
    return list[0] || null;
  }
  function collectPatientBalance(pid) {
    const inv = outstandingInvoice(pid) || ensureInvoiceForPatient(pid);
    openInvoicePopup(inv, (inv.appointmentIds || [])[0] || null);
  }
  function sendPatientForms(pid) {
    const p = patient(pid);
    if (!p) return;
    const when = nowET();
    p.formsSent = { when: when, who: actingName(), intake: true, consent: true };
    p.forms = p.forms || [];
    ["intake", "hipaa", "procedure", "aftercare"].forEach(function (id) {
      let rec = p.forms.find(function (f) { return f.id === id; });
      if (!rec) { rec = { id: id }; p.forms.push(rec); }
      if (!rec.status || rec.status === "Pending") rec.status = "Sent";
    });
    (p.documents || []).forEach(function (d) {
      if (d && typeof d === "object" && (d.category === "Patient Intake" || d.category === "Consent" || /intake|consent/i.test(d.title || ""))) {
        d.sent = true;
        d.sentAt = when;
      }
    });
    addAudit({ action: "Marked intake and consent forms sent", recordType: "Patient", recordId: pid,
      recordPath: { page: "patients", selected: pid, tab: "forms" },
      changes: [{ field: "forms", before: "—", after: "Sent" }] });
    toast("Forms sent");
    render();
  }
  function slotOverlapsAppt(date, time, provider, minutes, exceptId) {
    const start = toMinutes(time);
    const end = start + (minutes || 15);
    return (store.appointments || []).some(function (a) {
      if (a.date !== date || a.provider !== provider || a.id === exceptId) return false;
      if (a.status === "Canceled" || a.status === "Rescheduled" || a.status === "No-show") return false;
      const s = toMinutes(a.time || "10:00");
      const e = s + (a.durationMinutes || durationMinutes(a.type, a.reasons || []) || 15);
      return start < e && end > s;
    });
  }
  function nextOpenSlot(opts) {
    opts = opts || {};
    const provider = opts.provider || (BRIZZA.PROVIDERS || [])[0] || "";
    const mins = opts.minutes || 30;
    const fromDate = opts.fromDate || todayET();
    const fromTime = opts.fromTime || "10:00";
    for (let i = 0; i < 60; i += 1) {
      const day = addDays(fromDate, i);
      if (isWeekend(day)) continue;
      const times = bookTimeSteps("10:00", "18:00");
      for (let t = 0; t < times.length; t += 1) {
        const time = times[t];
        const end = fromMinutes(toMinutes(time) + mins);
        if (toMinutes(end) > 18 * 60) continue;
        if (appointmentTouchesLunch(day, time, end, provider)) continue;
        if (i === 0 && time < fromTime) continue;
        if (!slotOverlapsAppt(day, time, provider, mins)) return { date: day, time: time, provider: provider, minutes: mins };
      }
    }
    return { date: fromDate, time: "10:00", provider: provider, minutes: mins };
  }
  function openRebook(pid) {
    const last = lastVisitForRebook(patient(pid));
    const mins = (last && (last.durationMinutes || durationMinutes(last.type, last.reasons || []))) || 30;
    const slot = nextOpenSlot({ provider: last && last.provider, minutes: mins, fromDate: todayET() });
    openBook(pid, {
      lockPatient: true,
      type: last && last.type,
      provider: (last && last.provider) || slot.provider,
      reasons: last && last.reasons,
      locationId: last && last.locationId,
      date: slot.date,
      time: slot.time
    });
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
          (d.sent ? badge("Sent") : "") +
          '<button class="btn small" type="button" data-print-doc="' + p.id + '" data-did="' + esc(d.id) + '">View/Print</button></div>';
      }).join("") || '<div class="empty">No ' + esc(cat).toLowerCase() + " documents</div>";
      return '<div class="doc-group"><h3 class="section-title">' + esc(cat) + "</h3>" + rows + "</div>";
    }).join("");
  }


  function notePrintSheetCss() {
    return "@page{size:letter;margin:16mm 16mm 18mm;@bottom-left{content:\"BRIZZA AESTHETICS  ·  Synthetic record\";font:9pt Georgia,\"Times New Roman\",serif;color:#5a4e46}@bottom-right{content:\"Page \" counter(page);font:9pt Georgia,\"Times New Roman\",serif;color:#5a4e46}}" +
      ".note-print-sheet{font-family:Georgia,\"Times New Roman\",serif;color:#352820;background:#fff;max-width:760px;margin:0 auto;padding:8px 4px 24px}" +
      ".note-print-head{border-bottom:1.5px solid #352820;padding-bottom:10px;margin-bottom:14px}" +
      "h1,.clinic-logo-mark,.print-logo{font-size:20px;margin:0 0 4px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}" +
      ".note-print-contact{font-size:11px;line-height:1.45;color:#5a4e46;margin:0}" +
      ".note-print-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;border-bottom:1px solid #d8d0c8;padding:10px 0 12px;margin-bottom:16px;font-size:12.5px;line-height:1.45}" +
      ".note-print-meta .k{display:block;color:#5a4e46;font-size:10px;letter-spacing:.07em;text-transform:uppercase;margin-bottom:1px}" +
      ".note-print-section{margin:0 0 14px}" +
      ".note-print-section h2{font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px;padding-bottom:3px;border-bottom:1px solid #e6e0da;font-weight:700}" +
      ".note-print-section p,.note-print-kv{font-size:13px;line-height:1.5;margin:0 0 6px;white-space:pre-wrap}" +
      ".note-print-empty{color:#8a7f76;font-style:italic}" +
      ".note-print-sig{margin-top:28px;border-top:1px solid #352820;padding-top:12px;font-size:13px}" +
      ".note-print-sig .sig-line{margin-top:4px;border-bottom:1px solid #352820;max-width:280px;height:22px}" +
      ".note-print-foot{margin-top:28px;font-size:10px;color:#5a4e46;display:flex;justify-content:space-between;gap:12px;border-top:1px solid #d8d0c8;padding-top:8px}" +
      ".quote-print-lines{width:100%;border-collapse:collapse;margin:12px 0 16px;font-size:12.5px}" +
      ".quote-print-lines th,.quote-print-lines td{border-bottom:1px solid #d8d0c8;text-align:left;padding:6px 8px 6px 0;vertical-align:top}" +
      ".quote-print-lines th{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#5a4e46}" +
      "@media print{.note-print-sheet{max-width:none;padding:0}.no-print{display:none!important}}";
  }
  function labelizeField(key) {
    return String(key || "").replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").replace(/^\s+/, "").replace(/\b\w/g, function (c) { return c.toUpperCase(); }).trim();
  }
  function bucketNoteFields(n) {
    const vals = (n && n.values) || {};
    const buckets = { concern: [], history: [], assessment: [], plan: [], procedure: [], next: [], other: [] };
    const rules = [
      [/chief|concern|visit.?reason|reason.?for|presenting/i, "concern"],
      [/histor|hpi|response.?since|areas.?discussed|allerg|medication|condition|background/i, "history"],
      [/assess|impression|diagnos|finding/i, "assessment"],
      [/plan|recommend|counsel|education|aftercare/i, "plan"],
      [/procedur|treatment|product|lot|unit|inject|technique|device|performed/i, "procedure"],
      [/next.?appt|next.?appointment|return.?date|follow.?up/i, "next"]
    ];
    Object.keys(vals).forEach(function (k) {
      const v = vals[k];
      if (v == null || String(v).trim() === "") return;
      let bucket = "other";
      const label = labelizeField(k);
      for (let i = 0; i < rules.length; i++) {
        if (rules[i][0].test(k) || rules[i][0].test(label)) { bucket = rules[i][1]; break; }
      }
      buckets[bucket].push({ key: k, label: label, value: String(v) });
    });
    return buckets;
  }
  function notePrintKv(items, sectionTitle) {
    const title = String(sectionTitle || "").toLowerCase().replace(/[^a-z]+/g, "");
    return (items || []).map(function (it) {
      const lab = String(it.label || "").toLowerCase().replace(/[^a-z]+/g, "");
      const hide = title && (lab === title || title.indexOf(lab) === 0);
      return hide
        ? ('<div class="note-print-kv">' + esc(it.value) + "</div>")
        : ('<div class="note-print-kv"><strong>' + esc(it.label) + ".</strong> " + esc(it.value) + "</div>");
    }).join("");
  }
  function notePrintSection(title, inner, emptyLabel) {
    if (inner && String(inner).trim()) {
      return '<section class="note-print-section"><h2>' + esc(title) + "</h2>" + inner + "</section>";
    }
    return '<section class="note-print-section"><h2>' + esc(title) + '</h2><p class="note-print-empty">' + esc(emptyLabel || "Not recorded") + "</p></section>";
  }
  function notePrintHtml(p, n) {
    const contact = clinicContactLines();
    const a = n.appointmentId ? appt(n.appointmentId) : null;
    const loc = (a && locationName(a.locationId)) || n.location || locationName(BRIZZA.DEFAULT_LOCATION) || "";
    const buckets = bucketNoteFields(n);
    const snap = n.historySnapshot || {};
    if ((snap.allergies || []).length) buckets.history.push({ label: "Allergies", value: snap.allergies.join("; ") });
    if ((snap.meds || []).length) buckets.history.push({ label: "Medications", value: snap.meds.join("; ") });
    if ((snap.conditions || []).length) buckets.history.push({ label: "History", value: snap.conditions.join("; ") });
    if (n.nextAppointmentDate) buckets.next.push({ label: "Next appointment", value: fmtDob(n.nextAppointmentDate) });
    const charges = (n.charges || []).map(function (c) {
      const lot = c.lot || c.lotNumber || "";
      const bits = [c.name || c.item, c.qty != null ? ("qty " + c.qty) : "", lot ? ("lot " + lot) : ""].filter(Boolean);
      return bits.join(" · ");
    }).filter(Boolean);
    if (charges.length) buckets.procedure.push({ label: "Products / charges", value: charges.join("\n") });
    const usedKeys = {};
    ["concern", "history", "assessment", "plan", "procedure", "next"].forEach(function (b) {
      (buckets[b] || []).forEach(function (it) { if (it.key) usedKeys[it.key] = true; });
    });
    let narrative = "";
    if (n.text && String(n.text).trim() && !Object.keys(n.values || {}).length) {
      narrative = "<p>" + esc(n.text) + "</p>";
    }
    const concernInner = notePrintKv(buckets.concern, "Chief concern") || narrative;
    const otherInner = notePrintKv(buckets.other) + (narrative && concernInner !== narrative ? narrative : "");
    const metaItem = function (k, v) {
      return '<div><span class="k">' + esc(k) + "</span>" + esc(v || "—") + "</div>";
    };
    const sig = n.signedAt
      ? ('<div class="note-print-sig"><div><strong>' + esc(n.provider || "") + "</strong></div><div>Signed " + esc(n.signedAt) + "</div></div>")
      : ('<div class="note-print-sig"><div class="sig-line"></div><div><strong>' + esc(n.provider || "") + "</strong></div><p class=\"note-print-empty\">Draft — not signed</p></div>");
    const omitEmpty = function (title, inner) {
      return inner && String(inner).trim() ? notePrintSection(title, inner) : "";
    };
    const sections =
      notePrintSection("Chief concern", concernInner) +
      notePrintSection("History", notePrintKv(buckets.history, "History")) +
      omitEmpty("Assessment", notePrintKv(buckets.assessment, "Assessment")) +
      notePrintSection("Plan", notePrintKv(buckets.plan, "Plan")) +
      omitEmpty("Procedure details and products", notePrintKv(buckets.procedure, "Procedure details and products")) +
      omitEmpty("Next appointment", notePrintKv(buckets.next, "Next appointment")) +
      omitEmpty("Visit details", otherInner && (buckets.concern.length || buckets.history.length) ? otherInner : (otherInner || "")) +
      ((n.addenda || []).length
        ? notePrintSection("Addenda", (n.addenda || []).map(function (ad) {
            return "<p>" + esc(ad.text || "") + '</p><p class="note-print-contact">' + esc(ad.who || "") + (ad.role ? " · " + esc(ad.role) : "") + " · " + esc(ad.when || "") + "</p>";
          }).join(""))
        : "");
    return '<article class="note-print-sheet">' +
      '<header class="note-print-head">' + clinicLogoMark("print-logo") +
      '<p class="note-print-contact">' + esc(contact.address) + "<br>" + esc(contact.phone) + "</p></header>" +
      '<div class="note-print-meta">' +
        metaItem("Patient", p ? p.name : "") +
        metaItem("Date of birth", p && p.dob ? fmtDob(p.dob) : "—") +
        metaItem("Chart ID", p ? displayId(p.id) : "—") +
        metaItem("Date of service", n.date ? fmtDob(n.date) : "—") +
        metaItem("Provider", n.provider || (a && a.provider) || "—") +
        metaItem("Assistant", n.assistant || "—") +
        (n.secondaryProvider ? metaItem("Secondary provider", n.secondaryProvider) : "") +
        metaItem("Location", loc || "—") +
        metaItem("Note", (n.type || "Note") + " · " + (n.status || "")) +
      "</div>" +
      sections + sig +
      '<footer class="note-print-foot"><span>BRIZZA AESTHETICS · Synthetic record</span><span>Page numbers appear when printed</span></footer></article>';
  }
  function openPrintSheet(title, bodyHtml) {
    const w = window.open("", "_blank", "width=860,height=1000");
    if (!w) { toast("Allow pop-ups to view or print"); return; }
    const html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + String(title).replace(/[<>]/g, "") + "</title>" +
      "<style>" + notePrintSheetCss() + "</style></head>" +
      '<body class="print-root">' + bodyHtml + "</body></html>";
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 50);
  }

  function printNote(pid, nid) {
    const p = patient(pid); if (!p) return;
    const n = (p.notes || []).find((x) => x.id === nid); if (!n) return;
    openPrintSheet("Clinical note · " + p.name, notePrintHtml(p, n));
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




  function pendingNotesCount() {
    const staff = actingProviderStaff();
    const list = pendingNotesForProvider(staff && isClinicalRole() && !isOwnerRole() ? staff.name : null) || [];
    if (isOwnerRole() || state.actingRole === "Clinic Manager") {
      return list.filter(function (item) { return isNoteLate(item.n); }).length || list.length;
    }
    return list.length;
  }
  function notesNavLabel() {
    const n = pendingNotesCount();
    const name = (isClinicalRole() && !isOwnerRole()) ? "My notes" : "Notes";
    return n ? (name + ' <span class="nav-badge">' + n + "</span>") : name;
  }
  function isMarketingRole(role) {
    return (role || state.actingRole) === "Marketing Specialist";
  }
  function marketingChartTabs() {
    return { demographics: "Contact", marketing: "Marketing consent" };
  }
  function marketingConsentLabel(p) {
    const raw = (p && p.consents && p.consents.marketing) || "";
    const s = String(raw).toLowerCase();
    if (!raw || /not (yet )?recorded|unknown|pending/.test(s)) return "Not recorded";
    if (/not authorized|no\b|declined|opted.?out/.test(s)) return "Not authorized";
    if (/authorized|yes|current|opted.?in|granted/.test(s)) return "Authorized";
    return raw;
  }
  function marketingAllowedPage(page) {
    return page === "schedule" || page === "patients";
  }
  function enforceRoleRoute() {
    if (!isMarketingRole()) return false;
    let dest = null;
    if (!marketingAllowedPage(state.page)) {
      dest = hashFor({ page: "schedule", date: state.date, view: "calendar", calMode: state.calMode || "week" });
      state.page = "schedule";
    } else if (state.page === "patients") {
      const tabs = marketingChartTabs();
      if (!tabs[state.tab]) {
        state.tab = "demographics";
        dest = hashFor({ page: "patients", selected: state.selected, tab: "demographics" });
      }
    }
    if (dest && location.hash !== dest) {
      history.replaceState(null, "", dest);
      render();
      return true;
    }
    return false;
  }
  function actingStaffRecord() {
    const role = state.actingRole;
    return (BRIZZA.STAFF || []).find(function (s) { return s.role === role; }) || null;
  }
  function actingInitials() {
    const s = actingStaffRecord();
    const name = s ? s.name : (state.actingRole || "");
    const parts = String(name).replace(/,.*$/, "").split(/\s+/).filter(Boolean);
    const letters = parts.filter(function (w) { return !/^(Dr\.?|MD|NP|LE)$/i.test(w); }).slice(0, 2);
    return letters.map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "—";
  }
  function canSeeNav(key) {
    const role = state.actingRole;
    if (isMarketingRole(role)) return key === "schedule" || key === "patients";
    if (role === "Medical Assistant") {
      return ["emr", "rooming", "schedule", "patients", "queue"].indexOf(key) >= 0;
    }
    if (role === "Clinical Coordinator") {
      return ["emr", "schedule", "rooming", "patients", "queue", "pos", "quotes"].indexOf(key) >= 0;
    }
    if (role === "RN / NP Injector" || role === "Aesthetician") {
      return ["emr", "notes", "schedule", "rooming", "patients", "queue", "quotes", "inventory", "availability"].indexOf(key) >= 0;
    }
    if (role === "MD / Clinic Owner") {
      return ["emr", "notes", "notes-mine", "schedule", "rooming", "patients", "queue", "pos", "quotes", "admin", "inventory", "availability"].indexOf(key) >= 0;
    }
    if (role === "Clinic Manager") {
      return ["emr", "notes", "schedule", "rooming", "patients", "queue", "pos", "quotes", "admin", "inventory", "availability"].indexOf(key) >= 0;
    }
    return key !== "worklist";
  }
  function roleNavHtml(nav) {
    const role = state.actingRole;
    const today = nav(hashFor({ page: "emr", myDayTab: "patients", myDayDate: defaultClinicDate() }), "emr", "My Day", "✚");
    const sched = nav(hashFor({ page: "schedule", date: state.date, view: "calendar", calMode: state.calMode }), "schedule", "Schedule", "▦");
    const flow = nav(hashFor({ page: "rooming" }), "rooming", "Patient flow", "▣");
    const pats = nav(hashFor({ page: "patients", selected: state.selected, tab: isMarketingRole() ? "demographics" : (state.tab || "snapshot") }), "patients", "Patients", "♙");
    const notes = nav(hashFor({ page: "notes", notesDash: state.notesDash || "pending" }), "notes", notesNavLabel(), "✎");
    const tasks = nav(hashFor({ page: "queue", date: state.date }), "queue", "Tasks", "☷");
    const pos = nav(hashFor({ page: "pos" }), "pos", "Point of Sale", "☰");
    const quotes = nav(hashFor({ page: "quotes" }), "quotes", "Quotes", "💼");
    const admin = nav(hashFor({ page: "admin", adminTab: state.adminTab || "home" }), "admin", "Admin", "⚙");
    const inv = nav(hashFor({ page: "admin", adminTab: "inventory" }), "inventory", "Inventory" + (canManageInventory() ? "" : " 🔒"), "▣");
    const avail = nav(hashFor({ page: "admin", adminTab: "availability" }), "availability", "Availability" + (canManageAvailability() ? "" : " 🔒"), "▦");
    let main = "";
    if (isMarketingRole()) main = sched + pats;
    else if (role === "Medical Assistant") main = today + flow + sched + pats + tasks;
    else if (role === "Clinical Coordinator") main = today + sched + flow + pats + tasks + pos + quotes;
    else if (role === "RN / NP Injector" || role === "Aesthetician") main = today + sched + flow + pats + quotes + tasks;
    else if (role === "MD / Clinic Owner") {
      main = today + sched + flow + pats + tasks + pos + quotes;
    }
    else if (role === "Clinic Manager") main = today + sched + flow + pats + tasks + pos + quotes;
    else main = today + sched + pats;
    const clinic = (canSeeNav("admin") ? admin : "") +
      ((canSeeNav("inventory") && !canSeeNav("admin")) ? inv : "") +
      ((canSeeNav("availability") && !canSeeNav("admin")) ? avail : "");
    return '<div class="nav-label">Workspace</div><nav class="nav" aria-label="Workspace">' + main + "</nav>" +
      (clinic ? '<div class="nav-label">Clinic</div><nav class="nav" aria-label="Clinic">' + clinic + "</nav>" : "");
  }
  function renderChrome(crumb, titleArea, body) {
    const nav = (href, key, label, icon) => {
      if (!canSeeNav(key)) return "";
      const active = (key === "patients" && (state.page === "patients" || state.page === "visit" || state.page === "demo")) ||
        (key === "notes" && state.page === "notes" && state.notesScope !== "mine") ||
        (key === "notes-mine" && state.page === "notes" && state.notesScope === "mine") ||
        (key === "schedule" && state.page === "schedule") ||
        (key === "worklist" && state.page === "worklist") ||
        (key === "queue" && state.page === "queue") ||
        (key === "rooming" && state.page === "rooming") ||
        (key === "pos" && (state.page === "pos" || state.page === "checkout")) ||
        (key === "quotes" && state.page === "quotes") ||
        (key === "inventory" && state.page === "admin" && state.adminTab === "inventory") ||
        (key === "emr" && state.page === "emr") ||
        (key === "admin" && state.page === "admin");
      return '<a href="' + href + '" class="' + (active ? "active" : "") + '" data-nav="' + key + '" title="' + String(label).replace(/<[^>]+>/g, "") + '"><span class="ico">' + icon + '</span><span class="nav-text">' + label + "</span></a>";
    };
    $("#app-root").innerHTML = `
      <a class="skip" href="#main">Skip to content</a>
      <div class="shell">
        <aside class="side">
          <div class="brand">${clinicLogoMark("brand-logo")}<small class="brand-tagline">Aesthetic medicine</small></div>
          ${roleNavHtml(nav)}
        </aside>
        <main class="main" id="main">
          <header class="top">
            <div class="crumb">Brizza Aesthetics / ${crumb}</div>
            <div class="topright">
              ${findPatientHtml()}
              <span class="clinic-pill">${esc(BRIZZA.CLINIC.location)}</span>
              <div class="user-bar">
                <div class="avatar">${esc(actingInitials())}</div>
                <div>
                  <div class="user-who">${esc((actingStaffRecord() && actingStaffRecord().name) || state.actingRole)}</div>
                  <div class="user-title">${esc((actingStaffRecord() && actingStaffRecord().title) || state.actingRole)}</div>
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
    return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? '<div class="sub">' + sub + "</div>" : ""}</div><div class="actions">${actions || ""}</div></div>`;
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
        ${statusChipHtml(a, { variant: "tint" })}
        <a class="btn small" href="${hashFor({ page: "schedule", date: a.date, appointmentId: a.id })}">Open</a>
      </div>
    </div>`;
  }

  function formStatusOf(p, key) {
    const rec = (p.forms || []).find(function (f) { return f.id === key; });
    if (rec && rec.status) return rec.status;
    if (key === "procedure" && p.consents && p.consents.clinical && !/not yet/i.test(p.consents.clinical)) return "Signed";
    if (key === "marketing" && p.consents && p.consents.marketing && /author/i.test(p.consents.marketing) && !/not /i.test(p.consents.marketing)) return "Signed";
    if (key === "hipaa" && p.registration && p.registration.formsCompleted && p.registration.formsCompleted.status === "Completed") return "Signed";
    if (key === "intake" && p.registration && p.registration.formsCompleted && p.registration.formsCompleted.status === "Completed") return "Received";
    return "Pending";
  }
  function patientFormsList(p) {
    return [
      { id: "intake", title: "Patient intake", category: "Intake" },
      { id: "hipaa", title: "HIPAA consent", category: "Consent" },
      { id: "procedure", title: "Procedure consent", category: "Consent" },
      { id: "aftercare", title: "Aftercare instructions", category: "Aftercare" },
      { id: "marketing", title: "Marketing consent", category: "Marketing" }
    ].map(function (f) {
      return { id: f.id, title: f.title, category: f.category, status: formStatusOf(p, f.id), optional: f.id === "marketing", given: f.id === "aftercare", body: "" };
    });
  }
  function formCategories() { return ["Intake", "Consent", "Aftercare", "Marketing"]; }
  function neededFormsToday() {
    const day = demoClockDate();
    const rows = [];
    (store.appointments || []).filter(function (a) {
      return a.date === day && a.status !== "Canceled" && a.status !== "Rescheduled" && a.status !== "No-show";
    }).forEach(function (a) {
      const p = patient(a.patientId);
      if (!p) return;
      patientFormsList(p).forEach(function (f) {
        if (f.status === "Pending" && !f.optional) rows.push({ p: p, a: a, f: f });
      });
    });
    return rows;
  }
  function formsCategoryPanel(list, cat) {
    const items = list.filter(function (f) { return f.category === cat; });
    if (!items.length) return '<div class="empty">No ' + esc(cat.toLowerCase()) + " forms</div>";
    return items.map(function (f) {
      return f.html;
    }).join("");
  }

  function formRowHtml(p, f, a) {
    const apptLink = a ? ' <a href="' + hashFor({ page: "schedule", date: a.date, appointmentId: a.id, view: "calendar", calMode: state.calMode }) + '">' + esc(fmtTime(a.time) + " · " + a.type) + "</a>" : "";
    const chartLink = '<a class="btn small" href="' + hashFor({ page: "patients", selected: p.id, tab: "records" }) + '">Open chart</a>';
    const actionLabel = f.given ? "Mark given" : (f.optional ? "Mark recorded" : "Mark received");
    const mark = f.status === "Pending" ? '<button class="btn small" type="button" data-mark-form="' + esc(f.id) + '" data-pid="' + esc(p.id) + '">' + actionLabel + "</button>" : "";
    const sub = (f.given ? "Given at the visit, not received back." : (f.optional ? "Optional, one-time preference." : "")) + apptLink;
    return '<div class="row"><div><div class="row-title">' + esc(f.title) + (f.optional ? ' <span class="row-sub">optional</span>' : "") + '</div>' +
      (sub ? '<div class="row-sub">' + sub + "</div>" : "") + "</div>" +
      badge(f.status) +
      ' <button class="btn small" type="button" data-open-form="' + esc(f.id) + '" data-pid="' + esc(p.id) + '">View/Print</button>' +
      mark + " " + chartLink + "</div>";
  }
  function patientFormsHtml(p, activeCat) {
    const list = patientFormsList(p);
    const cats = formCategories();
    const cat = activeCat || state.formCat || cats[0];
    const tabs = cats.map(function (c) {
      const n = list.filter(function (f) { return f.category === c; }).length;
      return '<button type="button" class="tab' + (c === cat ? " active" : "") + '" data-form-cat="' + esc(c) + '">' + esc(c) + (n ? " · " + n : "") + "</button>";
    }).join("");
    const rows = list.filter(function (f) { return f.category === cat; }).map(function (f) { return formRowHtml(p, f, null); }).join("") ||
      '<div class="empty">No ' + esc(cat.toLowerCase()) + " forms</div>";
    return '<div class="form-cats" role="tablist">' + tabs + "</div>" + rows;
  }
  function checkinFormsHtml(activeCat) {
    const needed = neededFormsToday();
    const cats = formCategories();
    const cat = activeCat || state.formCat || cats[0];
    const neededRows = needed.map(function (row) {
      return formRowHtml(row.p, row.f, row.a);
    }).join("") || '<div class="empty">No forms needed today</div>';
    const tabs = cats.map(function (c) {
      return '<button type="button" class="tab' + (c === cat ? " active" : "") + '" data-form-cat="' + esc(c) + '">' + esc(c) + "</button>";
    }).join("");
    const inCat = needed.filter(function (row) { return row.f.category === cat; });
    const catRows = inCat.map(function (row) { return formRowHtml(row.p, row.f, row.a); }).join("") ||
      '<div class="empty">No ' + esc(cat.toLowerCase()) + " forms needed today</div>";
    return '<div class="checkin-forms">' +
      '<h3 class="section-title">Needed today</h3>' + neededRows +
      '<h3 class="section-title" style="margin-top:16px">By category</h3>' +
      '<div class="form-cats" role="tablist">' + tabs + "</div>" + catRows +
      "</div>";
  }
  function openCheckinForms() {
    showModal("Check-in forms", checkinFormsHtml(state.formCat), function () { closeModal(); }, "Done");
  }
  function markFormReceived(pid, fid) {
    const p = patient(pid);
    if (!p) return;
    p.forms = p.forms || [];
    let rec = p.forms.find(function (f) { return f.id === fid; });
    if (!rec) { rec = { id: fid, status: "Received" }; p.forms.push(rec); }
    rec.status = "Received";
    rec.receivedAt = nowET();
    toast("Marked received");
    if ($("#modal") && $("#modalTitle") && /Check-in forms/.test($("#modalTitle").textContent || "")) {
      $("#modalBody").innerHTML = checkinFormsHtml(state.formCat);
    } else render();
  }

  function openFormPlaceholder(pid, fid) {
    const p = patient(pid);
    const f = patientFormsList(p || {}).find(function (x) { return x.id === fid; });
    if (!f) return;
    showModal(f.title + (p ? " · " + p.name : ""),
      '<p class="row-sub">' + esc(f.status) + "</p>" +
      '<div class="notice">Form text will be added when the official wording is ready.</div>',
      function () { closeModal(); }, "Close");
  }

  function chartSnapshotHtml(p) {
    const last = lastAppt(p);
    const next = nextAppt(p);
    const note = lastNoteOf(p);
    const hx = (p.conditions || []).join(", ") || "No history items recorded";
    return '<div class="chart-snapshot">' +
      '<div class="two">' +
        '<div><h3 class="section-title">Visit snapshot</h3>' +
          '<div class="row"><span>Last visit</span><strong>' + esc(last ? (fmtDate(last.date) + " · " + (last.type || "")) : "None") + "</strong></div>" +
          '<div class="row"><span>Next visit</span><strong>' + esc(next ? (fmtDate(next.date) + " · " + fmtTime(next.time) + " · " + (next.type || "")) : "None scheduled") + "</strong></div>" +
          '<div class="row"><span>Last note</span><strong>' + esc(note ? ((note.status || "Draft") + " · " + fmtDate(note.date)) : "No note") + "</strong></div>" +
        "</div>" +
        '<div><h3 class="section-title">Clinical summary</h3>' +
          '<div class="row"><span>Allergies</span><strong>' + esc(allergyLabel(p)) + "</strong></div>" +
          '<div class="row"><span>Medical history</span><strong>' + esc(hx) + "</strong></div>" +
        "</div></div></div>";
  }
  function marketingConsentHtml(p) {
    const cur = marketingConsentLabel(p);
    const opts = ["Authorized", "Not authorized", "Not recorded"];
    return '<div class="field"><label for="mktConsent">Marketing consent</label>' +
      '<select id="mktConsent" data-set-marketing-consent="' + esc(p.id) + '">' +
      opts.map(function (o) { return "<option" + (cur === o ? " selected" : "") + ">" + o + "</option>"; }).join("") +
      "</select>" +
      '<p class="row-sub">Optional, one-time preference. No legal form text is stored in this mockup.</p></div>';
  }
  function chartSection(p) {
    let body = "";
    if (isMarketingRole()) {
      if (state.tab === "marketing") {
        body = '<h3 class="section-title">Marketing consent</h3>' + marketingConsentHtml(p);
      } else {
        body = '<div><h3 class="section-title">Contact</h3>' +
          '<div class="row"><span>Patient number</span><strong class="pid">' + esc(displayId(p.id)) + "</strong></div>" +
          '<div class="row"><span>Phone</span><strong>' + esc(p.phone) + "</strong></div>" +
          '<div class="row"><span>Email</span><strong>' + esc(p.email) + "</strong></div>" +
          '<div class="row"><span>Address</span><strong>' + formatAddressHtml(addressPartsOf(p)) + "</strong></div>" +
          marketingConsentHtml(p) +
          "</div>";
      }
      return body;
    }
    if (state.tab === "snapshot") {
      body = chartSnapshotHtml(p);
    } else if (state.tab === "demographics") {
      body = '<div class="two"><div><h3 class="section-title">Patient identity</h3>' +
        '<div class="row"><span>Patient number</span><strong class="pid">' + esc(displayId(p.id)) + "</strong></div>" +
        '<div class="row"><span>Date of birth</span><strong>' + esc(fmtDob(p.dob)) + "</strong></div>" +
        '<div class="row"><span>Phone</span><strong>' + esc(p.phone) + "</strong></div>" +
        '<div class="row"><span>Email</span><strong>' + esc(p.email) + "</strong></div>" +
        '<div class="row"><span>Address</span><strong>' + formatAddressHtml(addressPartsOf(p)) + "</strong></div>" +
        (preferenceAlerts(p).length ? '<h3 class="section-title">Preferences</h3>' + preferenceAlerts(p).map(function (al) { return '<div class="row"><span>' + esc(al.text) + "</span></div>"; }).join("") : "") +
        "</div>" +
        '<div><h3 class="section-title">Patient status</h3>' +
        '<label class="sr-only" for="pstatus">Patient status</label>' +
        '<select id="pstatus" data-set-status="' + p.id + '">' + BRIZZA.patientStatuses.map((s) => "<option" + (p.status === s ? " selected" : "") + ">" + s + "</option>").join("") + "</select>" +
        '<div class="notice">One centralized chart. Patient number is immutable and never reused.</div>' +
        '<button class="btn primary confirm-demo" type="button" data-confirm-demo="' + p.id + '">Confirm Demographics</button>' +
        lastReviewedHtml(p) +
        '<h3 class="section-title history-block">' + historyIcon("Patient", p.id) + " History</h3>" +
        '<h3 class="section-title">Patient notes</h3><p class="row-sub">Non-clinical notes, timestamped with the author.</p>' +
        patientNotesHtml(p) +
        "</div></div>";
    } else if (state.tab === "clinical-profile") {
      const rows = (items, empty) => items.length ? items.map((x) => '<div class="row"><span>' + esc(Array.isArray(x) ? x.join(" · ") : x) + "</span></div>").join("") : '<div class="empty">' + empty + "</div>";
      const reviewed = p.hxChartReviewedAt ? ("Reviewed on the chart · " + esc(p.hxChartReviewedAt) + (p.hxChartReviewedBy ? " · " + esc(p.hxChartReviewedBy) : "")) : "Not yet marked reviewed on the chart.";
      if (canEditChartHistory()) {
        body = '<div class="profile-block"><p class="row-sub">Medical assistants update history on the chart. The provider confirms it in the visit note.</p>' +
          lastNoteLineHtml(p.id) +
          '<div class="formgrid">' +
          '<div class="field full"><label for="chartHxConditions">Medical history</label><textarea id="chartHxConditions">' + esc((p.conditions || []).join("\n")) + "</textarea></div>" +
          '<div class="field full"><label for="chartHxMeds">Current medications</label><textarea id="chartHxMeds">' + esc((p.meds || []).join("\n")) + "</textarea></div>" +
          '<div class="field full"><label for="chartHxAllergies">Allergies</label><textarea id="chartHxAllergies">' + esc((p.allergies || []).join("\n")) + "</textarea></div>" +
          "</div>" +
          '<p class="row-sub">' + reviewed + "</p>" +
          '<div class="actions"><button class="btn primary" type="button" data-save-chart-hx="' + esc(p.id) + '">Save history</button>' +
          '<button class="btn" type="button" data-review-chart-hx="' + esc(p.id) + '">Mark reviewed</button></div></div>' +
          '<div class="profile-block"><h3 class="section-title">Treatment history</h3>' + (p.treatments && p.treatments.length ? p.treatments.map((tr) => '<div class="row"><span>' + esc(tr) + '</span><span class="badge">Recorded</span></div>').join("") : '<div class="empty">No treatment recorded. Appointment or consultation completion does not imply treatment.</div>') + "</div>" +
          photosSectionHtml(p);
      } else {
        body = `<div class="profile-block"><div class="two"><div><h3 class="section-title">Medical history</h3><p class="row-sub">Providers confirm history in the visit note. Medical assistants update it on this chart.</p>${lastNoteLineHtml(p.id)}${rows(p.conditions, "No history items recorded")}
        <h3 class="section-title" style="margin-top:18px">Medications</h3>${rows(p.meds, "No current medications recorded")}
        <h3 class="section-title" style="margin-top:18px">Pharmacy</h3>${p.pharmacy ? '<div class="row"><span>' + esc(p.pharmacy) + "</span></div>" : '<div class="empty">No pharmacy recorded (if applicable)</div>'}</div>
        <div><h3 class="section-title">Allergies and alerts</h3>${rows(p.allergies, "No allergy information recorded")}<p class="row-sub">${reviewed}</p></div></div></div>
        <div class="profile-block"><h3 class="section-title">Treatment history</h3>${p.treatments && p.treatments.length ? p.treatments.map((tr) => '<div class="row"><span>' + esc(tr) + '</span><span class="badge">Recorded</span></div>').join("") : '<div class="empty">No treatment recorded. Appointment or consultation completion does not imply treatment.</div>'}</div>` + photosSectionHtml(p);
      }
    } else if (state.tab === "appointments") {
      const list = apptsFor(p).slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      body = `<div class="labelrow"><h3 class="section-title">Appointment history</h3>
        <a class="btn small primary" href="#modal-book" data-open="book" data-pid="${p.id}">＋ Schedule appointment</a></div>
        <div class="scroll-list appt-history">${list.map(appointmentRow).join("") || '<div class="empty">No appointments</div>'}</div>` + followupSectionHtml(p);
    } else if (state.tab === "photos") {
      body = `<div class="two"><div><h3 class="section-title">Clinical photography</h3>${p.photos.length ? p.photos.map((x) => '<div class="row"><span>' + esc(x) + "</span></div>").join("") : '<div class="empty">No clinical photos</div>'}</div>
        <div><h3 class="section-title">Authorization records</h3>
        <div class="row"><span>Clinical photography consent</span>${badge(p.consents.clinical)}</div>
        <div class="row"><span>Marketing photo authorization</span>${badge(p.consents.marketing)}</div>
        <div class="notice">Clinical photography consent is separate from marketing photo authorization.</div></div></div>`;
    } else if (state.tab === "records" || state.tab === "documents" || state.tab === "forms") {
      body = '<h3 class="section-title">Documents & forms</h3>' +
        '<p class="row-sub">Receipts are saved when a payment is recorded.</p>' +
        documentsHtml(p) +
        photosSectionHtml(p) +
        '<h3 class="section-title" style="margin-top:18px">Forms and consents</h3>' +
        (patientFormsHtml(p) || '<div class="empty">No forms</div>') +
        '<p class="row-sub">Start consents from an appointment, My Day, or this chart. Marketing photography authorization is voluntary and is never required to book or treat.</p>';
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
        (canCreateInvoice() ? '<button class="btn small primary" type="button" data-ledger-invoice="' + esc(p.id) + '">Create invoice</button>' : "") +
        '<button class="btn small" type="button" data-ledger-payment="' + esc(p.id) + '">Add payment</button></div>' +
        '<div class="ledger-credit">Available credit <strong>' + money(credit) + "</strong></div>" +
        '<p class="row-sub">Payment status is independent of appointment status. A blank payment, such as a prepayment, is added to patient credit.</p>' +
        "<h3 class=\"section-title\">Invoices</h3>" + invRows +
        "<h3 class=\"section-title\" style=\"margin-top:16px\">Payments</h3>" + payRows +
        quotesTeaserHtml(p);
    } else if (state.tab === "quotes") {
      const qs = (store.quotes || []).filter((q) => q.patientId === p.id);
      body = `<h3 class="section-title">Quotes</h3>
        ${qs.map((q) => '<a class="row" href="' + hashFor({ page: "pos", posTab: "quotes", quoteId: q.id }) + '"><div><div class="row-title">' + esc(q.name) + '</div><div class="row-sub">' + esc(q.id) + " · Amount: TBD</div></div>" + badge(q.status) + "</a>").join("") || '<div class="empty">No quotes</div>'}`;
        } else if (state.tab === "follow-up") {
      body = `<div class="labelrow"><h3 class="section-title">Follow-up history</h3>
        <a class="btn small" href="#modal-followup" data-open="followup" data-pid="${p.id}">＋ Add follow-up</a>
        <button type="button" class="btn small" data-open="add-task" data-pid="${p.id}">＋ Add task</button></div>
        ${p.followups.length ? p.followups.map((f) => '<div class="row"><div><div class="row-title">' + esc(f.text) + '</div><div class="row-sub">Due ' + esc(fmtDate(f.due || f)) + "</div></div></div>").join("") : '<div class="empty">No follow-up tasks</div>'}`;
    }
    return body;
  }

  function photosSectionHtml(p) {
    const thumbs = (p.photos || []).length
      ? '<div class="photo-grid">' + (p.photos || []).map(function (x) {
          const label = typeof x === "string" ? x : (x.title || x.id || "Photo");
          return '<div class="photo-thumb" title="' + esc(label) + '">' + esc(label) + "</div>";
        }).join("") + "</div>"
      : '<div class="empty">No clinical photos</div>';
    return '<div class="profile-block"><h3 class="section-title">Photos</h3>' + thumbs +
      '<div class="row"><span>Clinical photography consent</span>' + badge((p.consents && p.consents.photo) || "Not on file") + "</div>" +
      '<div class="row"><span>Marketing photo authorization</span>' + badge((p.consents && p.consents.marketing) || "Not authorized") + "</div>" +
      '<p class="row-sub">Clinical photography consent is separate from marketing photo authorization. Marketing authorization is voluntary and is never required to book or treat.</p></div>';
  }
  function followupSectionHtml(p) {
    return '<div class="profile-block"><div class="labelrow"><h3 class="section-title">Follow-up history</h3>' +
      '<a class="btn tiny" href="#modal-followup" data-open="followup" data-pid="' + p.id + '">＋ Add follow-up</a>' +
      '<button type="button" class="btn tiny" data-open="add-task" data-pid="' + p.id + '">＋ Add task</button></div>' +
      ((p.followups || []).length ? p.followups.map(function (f) {
        return '<div class="row"><div><div class="row-title">' + esc(f.text) + '</div><div class="row-sub">Due ' + esc(fmtDate(f.due || f)) + "</div></div></div>";
      }).join("") : '<div class="empty">No follow-up tasks</div>') + "</div>";
  }
  function quotesTeaserHtml(p) {
    const qs = (store.quotes || []).filter(function (q) { return q.patientId === p.id; });
    const open = qs.filter(quoteIsActive);
    return '<h3 class="section-title" style="margin-top:16px">Quotes</h3>' +
      '<p class="row-sub">The full quotes dashboard lives under Workspace · Quotes, so this chart stays uncluttered.</p>' +
      (open.length ? open.map(function (q) {
        return '<a class="row" href="' + hashFor({ page: "quotes", quoteId: q.id }) + '"><div><div class="row-title">' + esc(q.name) + '</div><div class="row-sub">' + esc(q.id) + "</div></div>" + badge(q.status) + "</a>";
      }).join("") : '<div class="empty">No open quotes</div>') +
      '<div class="actions"><a class="btn tiny" href="' + hashFor({ page: "quotes" }) + '">Open quotes dashboard</a></div>';
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
    const nextTime = next ? (fmtTime(next.time) + " · " + next.type) : "";
    const tabSource = isMarketingRole() ? marketingChartTabs() : TABS;
    if (isMarketingRole() && !tabSource[state.tab]) state.tab = "demographics";
    const tabs = Object.entries(tabSource).map(([k, label]) =>
      '<a class="tab ' + (state.tab === k ? "active" : "") + '" href="' + hashFor({ page: "patients", selected: p.id, tab: k }) + '">' + esc(label) + "</a>"
    ).join("");
    const upcoming = apptsFor(p).filter((a) => ACTIVE.has(a.status) && a.date >= todayET()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);
    const formsSent = !!(p.formsSent && (p.formsSent.intake || p.formsSent.consent));
    const balVal = patientBalanceValue(p.id);
    const balLabel = !balVal ? money(0) : (balVal.tbd && !(balVal.sum > 0) ? "TBD" : ((balVal.sum || 0) > 0 ? money(balVal.sum) + (balVal.tbd ? " + TBD" : "") : money(0)));
    const nextActions = isMarketingRole() ? "" : ('<div class="actions chart-quick">' +
      '<span class="chart-balance">Balance ' + balLabel + "</span>" +
      '<button type="button" class="btn small" data-collect-balance="' + p.id + '">Collect balance</button>' +
      '<button type="button" class="btn small" data-send-forms="' + p.id + '">' + (formsSent ? "Send forms again" : "Send forms") + "</button>" +
      (p.formsSent && p.formsSent.when ? '<span class="row-sub forms-last-sent">Last sent ' + esc(p.formsSent.when) + "</span>" : "") +
      "</div>");
    const head = pageHead("", isMarketingRole() ? "Patients" : "Patient chart", "", isMarketingRole() ? "" : '<a class="btn small primary" href="#modal-book" data-open="book" data-pid="' + p.id + '">＋ Appointment</a>');
    const body = `<div class="grid">
      <div class="card">
        <div class="cardbody patient-header">
          <div class="patient-banner">
            <div class="patient-avatar">${esc(initials(p.name))}</div>
            <div style="flex:1">
              <div class="patient-name"><span class="patient-name-text">${esc(p.name)}</span> ${isMarketingRole() ? "" : badge(p.status).replace('class="badge"', 'class="badge chart-status-badge"')}
                ${isMarketingRole() ? "" : alertPillsHtml(p)}
                ${isMarketingRole() ? "" : '<a class="btn small" href="#modal-edit" data-open="edit" data-pid="' + p.id + '">Edit chart</a>'}
              </div>
              <div class="patient-meta">
                <span class="pid">${esc(displayId(p.id))}</span>
                ${isMarketingRole() ? "" : "<span>" + esc(fmtDob(p.dob)) + " · " + age(p.dob) + " yrs · " + esc(p.sex) + "</span>"}
                <span>${esc(p.phone)}</span>
                <span>${esc(p.email)}</span>
              </div>
              ${((!isMarketingRole() && (p.alerts||[]).filter(isClinicalAlert).length) ? '<div class="alert-headline" role="status">' + esc((p.alerts||[]).filter(isClinicalAlert).map(function(al){ return al.text; }).join(" · ")) + "</div>" : "")}
            </div>
          </div>
          <div class="summary-strip">
            <div class="metric"><label>Patient number</label><strong class="pid">${esc(displayId(p.id))}</strong></div>
            ${isMarketingRole() ? '<div class="metric"><label>Marketing consent</label><strong>' + esc(marketingConsentLabel(p)) + "</strong></div>" : ('<div class="metric"><label>Last provider</label><strong>' + esc(lastProv) + "</strong></div>" +
            '<div class="metric"><label>Last appointment</label><strong>' + esc(lastLabel) + '</strong><div class="sub">' + esc(lastSub) + "</div></div>" +
            '<div class="metric"><label>Balance</label><strong>' + (function(){ const b = patientBalanceValue(p.id); if (!b) return money(0); if (b.tbd && !(b.sum>0)) return "TBD"; if ((b.sum||0)>0) return money(b.sum)+(b.tbd?" + TBD":""); return money(0); })() + "</strong></div>")}
          </div>
        </div>
        <div class="tabs" role="tablist">${tabs}</div>
        <div class="cardbody">${chartSection(p)}</div>
      </div>
      <div>
        ${isMarketingRole() ? "" : notesListHtml(p)}
        ${isMarketingRole() ? "" : '<div class="card" style="margin-top:16px"><div class="cardhead"><h2>Quick actions</h2>' + nextActions + "</div></div>" +
        '<div class="card" style="margin-top:16px"><div class="cardhead"><h2>Upcoming</h2></div><div class="cardbody">' + (upcoming.map((a) => '<div class="row"><div><div class="row-title">' + esc(a.type) + '</div><div class="row-sub">' + esc(fmtDate(a.date)) + " · " + esc(fmtTime(a.time)) + " · " + esc(a.provider) + "</div></div>" + badge(a.status) + "</div>").join("") || '<div class="empty">None upcoming</div>') + "</div></div>"}
      </div>
    </div>`;
    renderChrome('<a href="' + hashFor({ page: "patients" }) + '">Patients</a> / ' + esc(p.name), head, body);
  }

  function dayAppointments(date, locationId) {
    const loc = activeLocationId(locationId);
    return store.appointments
      .filter((a) => a.date === date && a.status !== "Rescheduled" && appointmentVisibleOnCalendar(a))
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
    return minutesInStatus(since) + "m";
  }
  function timerClass(since) {
    return "room-timer" + (minutesInStatus(since) >= 15 ? " wait-gold" : "");
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
    return '<div class="cal-block block-card" data-open-block="' + esc(b.id) + '"><span class="t">' + esc(fmtTime(b.start)) + "–" + esc(fmtTime(b.end)) + "</span>Admin · " + esc(b.reason) + " · " + esc(b.staff) + "</div>";
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
  function frontDeskStatuses() { return ["Scheduled", "Confirmed", "Checked in", "Checked out", "No-show", "Canceled"]; }
  function allowedStatusesFor(role) {
    role = role || state.actingRole;
    const map = BRIZZA.STATUS_PERMISSIONS || {};
    const list = map[role];
    if (!list) return visitStatuses();
    if (list.indexOf("*") >= 0) return visitStatuses();
    return list.slice();
  }
  function canSetVisitStatus(status, role) {
    const allow = allowedStatusesFor(role);
    return allow.indexOf(status) >= 0;
  }
  function isCoordinatorRole(role) {
    role = role || state.actingRole;
    return role === "Clinical Coordinator";
  }
  function isClinicalVisitStatus(s) {
    return ["Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout"].indexOf(s) >= 0;
  }
  function hideCanceledOn() {
    if (state.hideCanceled == null) {
      try { state.hideCanceled = localStorage.getItem("brizza-emr-hide-canceled") === "1"; } catch (e) { state.hideCanceled = false; }
    }
    return !!state.hideCanceled;
  }
  function setHideCanceled(on) {
    state.hideCanceled = !!on;
    try { localStorage.setItem("brizza-emr-hide-canceled", on ? "1" : "0"); } catch (e) {}
  }
  function appointmentVisibleOnCalendar(a) {
    if (!a) return false;
    if (a.status === "Canceled" && hideCanceledOn()) return false;
    return true;
  }
  function hideCanceledToggleHtml() {
    const on = hideCanceledOn();
    return '<label class="hide-canceled"><input type="checkbox" id="hideCanceled" data-hide-canceled="1"' + (on ? " checked" : "") + "> Hide canceled</label>";
  }
  function noteForAppointment(a) {
    if (!a) return null;
    const p = patient(a.patientId);
    if (!p) return null;
    const notes = p.notes || [];
    const byAppt = notes.find(function (n) { return n.appointmentId === a.id; });
    if (byAppt) return byAppt;
    if (a.visitId) {
      const byVisit = notes.find(function (n) { return n.visitId === a.visitId; });
      if (byVisit) return byVisit;
    }
    const sameDay = notes.filter(function (n) { return n.date === a.date; });
    return sameDay.length === 1 ? sameDay[0] : null;
  }
  function clinicalNoteCell(a) {
    const n = noteForAppointment(a);
    if (!n) return '<div class="wl-clinote"><span class="dash" title="No clinical note for this visit">—</span></div>';
    const st = n.status || "Open";
    const signed = isNoteSigned(n);
    const canEdit = isNoteEditable(n) && isClinicalRole();
    const attr = canEdit
      ? ' data-edit-note="' + esc(n.id) + '" data-pid="' + esc(a.patientId) + '"'
      : ' data-open="note-view" data-pid="' + esc(a.patientId) + '" data-nid="' + esc(n.id) + '"';
    return '<div class="wl-clinote"><button type="button" class="btn small" ' + attr + '>' + esc(st) + "</button></div>";
  }
  function statusMeta(status) {
    const m = (BRIZZA.STATUS_META || {})[status];
    if (m) return m;
    const color = (BRIZZA.STATUS_DOTS || {})[status] || "#6F6F6F";
    return { color: color, fg: "#FFFCF6", tint: "#E8E8E8", tintFg: "#352820", icon: "clock" };
  }
  function statusColor(status) {
    return statusMeta(status).color;
  }
  function statusInk(bgOrStatus) {
    const meta = (BRIZZA.STATUS_META || {})[bgOrStatus];
    if (meta) return meta.fg;
    const hex = String(bgOrStatus || "#6F6F6F").replace("#", "");
    const full = hex.length === 3 ? hex.split("").map(function (c) { return c + c; }).join("") : hex;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return "#FFFCF6";
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const rs = r / 255, gs = g / 255, bs = b / 255;
    const lin = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = 0.2126 * lin(rs) + 0.7152 * lin(gs) + 0.0722 * lin(bs);
    return lum > 0.4 ? "#352820" : "#FFFCF6";
  }
  function statusIconSvg(kind) {
    const common = 'class="status-ico" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"';
    const stroke = 'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"';
    const map = {
      clock: '<circle cx="6" cy="6" r="4.4" ' + stroke + '/><path d="M6 3.8v2.4l1.8 1.1" ' + stroke + '/>',
      check: '<path d="M2.4 6.2l2.3 2.3 4.9-5" ' + stroke + '/>',
      arrive: '<path d="M2 6h6.2M6.2 3.6L8.8 6 6.2 8.4" ' + stroke + '/><path d="M10 2.4v7.2" ' + stroke + '/>',
      wait: '<circle cx="6" cy="6" r="4.4" ' + stroke + '/><path d="M6 3.6v2.6h2.2" ' + stroke + '/>',
      clinical: '<path d="M6 2.2v7.6M2.2 6h7.6" ' + stroke + '/>',
      provider: '<circle cx="6" cy="4" r="1.8" ' + stroke + '/><path d="M2.6 10c.4-2 1.8-3 3.4-3s3 1 3.4 3" ' + stroke + '/>',
      checkout: '<rect x="2.2" y="3.2" width="7.6" height="6.2" rx="1" ' + stroke + '/><path d="M4 5.2h4M4 7.4h2.6" ' + stroke + '/>',
      done: '<circle cx="6" cy="6" r="4.4" ' + stroke + '/><path d="M3.8 6.2l1.6 1.6 3-3.2" ' + stroke + '/>',
      cancel: '<path d="M3 3l6 6M9 3l-6 6" ' + stroke + '/>',
      noshow: '<circle cx="6" cy="6" r="4.4" ' + stroke + '/><path d="M6 3.6v3.1" ' + stroke + '/><circle cx="6" cy="8.5" r=".55" fill="currentColor"/>'
    };
    return "<svg " + common + ">" + (map[kind] || map.clock) + "</svg>";
  }
  function statusStyleVars(status) {
    const m = statusMeta(status);
    return "--status:" + m.color + ";--status-fg:" + m.fg + ";--status-tint:" + m.tint + ";--status-tint-fg:" + m.tintFg;
  }
  function statusPill(status, variant) {
    const m = statusMeta(status);
    const kind = variant === "solid" ? "is-solid" : "is-tint";
    const canceled = status === "Canceled" ? " is-canceled" : "";
    return '<span class="status-pill ' + kind + canceled + '" style="' + statusStyleVars(status) + '">' + statusIconSvg(m.icon) + "<span>" + esc(status) + "</span></span>";
  }
  function statusDot(status) {
    const color = statusColor(status);
    return '<span class="status-dot" style="background:' + color + '" title="' + esc(status) + '" aria-label="' + esc(status) + '"></span>';
  }
  function statusLegend(variant) {
    const list = (BRIZZA.VISIT_STATUSES || []).slice();
    ["Scheduled", "Confirmed", "No-show", "Canceled"].forEach(function (s) {
      if (list.indexOf(s) < 0) list.push(s);
    });
    const cur = state.scheduleStatusFilter || "";
    const items = list.map(function (s) {
      const on = cur === s;
      return '<button type="button" class="legend-item status-filter-chip' + (on ? " is-active" : "") + '" data-status-filter="' + esc(s) + '" aria-pressed="' + (on ? "true" : "false") + '" title="Filter schedule to ' + esc(s) + '">' +
        statusPill(s, variant || "tint") + "</button>";
    }).join("");
    const clear = cur ? '<button type="button" class="btn tiny type-filter-clear" data-status-filter="">Clear</button>' : "";
    return '<div class="legend status-legend" aria-label="Visit status filters">' + items + clear + "</div>";
  }
  function appointmentMatchesStatusFilter(a) {
    const cur = state.scheduleStatusFilter;
    if (!cur) return true;
    return !!(a && a.status === cur);
  }
  function locationHoursLabel(loc) {
    const l = typeof loc === "string" ? (BRIZZA.LOCATIONS || []).find(function (x) { return x.id === loc; }) : loc;
    if (!l) return (BRIZZA.CLINIC && BRIZZA.CLINIC.hours) || "";
    if (l.hoursOpenQuestion) return "Open question — Long Island hours differ from Manhattan; Nicole will supply them.";
    return l.hours || (BRIZZA.CLINIC && BRIZZA.CLINIC.hours) || "";
  }
  function locationHoursHtml(loc) {
    const l = typeof loc === "string" ? (BRIZZA.LOCATIONS || []).find(function (x) { return x.id === loc; }) : loc;
    const label = locationHoursLabel(l);
    if (l && l.hoursOpenQuestion) return '<span class="open-q-hours">Open question · ' + esc(label) + "</span>";
    return esc(label);
  }
  function clinicClosedBanner(date) {
    const hol = holidayName(date);
    const next = isClinicClosedDay(date) ? nextOpenClinicDay(addDays(date, 1)) : "";
    const jump = next && next !== date ? ' <a class="btn tiny" href="' + hashFor({ page: "schedule", date: next, view: "calendar", calMode: "week" }) + '">Open ' + esc(fmtDate(next)) + "</a>" : "";
    if (hol) return '<div class="cal-closed">Clinic closed · ' + esc(hol) + " (major US holiday)." + jump + "</div>";
    if (isWeekend(date)) return '<div class="cal-closed">Clinic closed · weekends are outside Monday–Friday, 10:00 a.m.–6:00 p.m. ET.' + jump + "</div>";
    return "";
  }
  function clinicLogoMark(extraClass) {
    const logo = BRIZZA.LOGO || { text: "BRIZZA AESTHETICS", cssClass: "clinic-logo-mark" };
    const cls = [logo.cssClass || "clinic-logo-mark", extraClass || ""].filter(Boolean).join(" ");
    return '<div class="' + esc(cls) + '">' + esc(logo.text || "BRIZZA AESTHETICS") + "</div>";
  }
  function clinicContactLines() {
    const c = BRIZZA.CLINIC || {};
    return {
      name: (BRIZZA.LOGO && BRIZZA.LOGO.text) || c.name || "BRIZZA AESTHETICS",
      address: c.address || c.location || "Address placeholder",
      phone: c.phone || "Phone placeholder"
    };
  }
  function jewelWrap(a, innerHtml, extraClass, attrs, opts) {
    opts = opts || {};
    const fam = typeFamilyFor(a && a.type);
    const canceled = a && a.status === "Canceled";
    const noBand = opts.noBand || /(flow-card|room-card)/.test(extraClass || "");
    const cls = ["jewel-card", canceled ? "is-canceled" : "", noBand ? "no-band" : "", extraClass || ""].filter(Boolean).join(" ");
    const band = esc((fam && (fam.short || fam.name)) || "Visit");
    return '<div class="' + cls + '" data-type="' + esc((a && a.type) || "") + '" data-status="' + esc((a && a.status) || "") + '" data-family="' + esc((fam && fam.id) || "") + '" style="' + cardTypeStyle(a) + '"' + (attrs ? " " + attrs : "") + ">" +
      (noBand ? "" : '<div class="jewel-band">' + band + "</div>") +
      '<div class="jewel-body">' + (innerHtml || "") + "</div></div>";
  }
  function statusMenuItemsHtml(a) {
    return visitStatuses().map(function (s) {
      const allow = canSetVisitStatus(s);
      const cur = a.status === s;
      return '<button type="button" class="status-menu-item' + (cur ? " is-current" : "") + (allow ? "" : " is-disabled") + '" role="option" aria-selected="' + (cur ? "true" : "false") + '"' +
        (allow ? ' data-status-pick="' + esc(a.id) + '" data-status-value="' + esc(s) + '"' : " disabled") +
        (allow ? "" : ' title="Not available for this role"') + ">" +
        statusIconSvg(statusMeta(s).icon) + "<span>" + esc(s) + "</span></button>";
    }).join("");
  }
  function closeStatusMenu() {
    const menu = document.getElementById("statusChipMenu");
    if (menu) { menu.hidden = true; menu.innerHTML = ""; }
    document.querySelectorAll("[data-status-menu][aria-expanded='true']").forEach(function (b) {
      b.setAttribute("aria-expanded", "false");
    });
  }
  function positionStatusMenu(btn, menu) {
    const r = btn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 240)) + "px";
    menu.style.top = (r.bottom + 4) + "px";
    menu.hidden = false;
    const box = menu.getBoundingClientRect();
    if (box.bottom > window.innerHeight - 8) {
      menu.style.top = Math.max(8, r.top - box.height - 4) + "px";
    }
    if (box.right > window.innerWidth - 8) {
      menu.style.left = Math.max(8, window.innerWidth - box.width - 8) + "px";
    }
  }
  function openStatusMenu(btn) {
    const id = btn.getAttribute("data-status-menu");
    const a = appt(id);
    if (!a || isMarketingRole()) return;
    closeStatusMenu();
    let menu = document.getElementById("statusChipMenu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "statusChipMenu";
      menu.className = "status-chip-menu";
      menu.setAttribute("role", "listbox");
      menu.setAttribute("aria-label", "Visit status");
      document.body.appendChild(menu);
    }
    menu.innerHTML = statusMenuItemsHtml(a);
    btn.setAttribute("aria-expanded", "true");
    positionStatusMenu(btn, menu);
    menu.onmousedown = function (e) { e.stopPropagation(); };
    menu.onclick = function (e) {
      const pick = e.target.closest("[data-status-pick]");
      if (!pick) return;
      e.preventDefault();
      e.stopPropagation();
      setVisitStatus(pick.getAttribute("data-status-pick"), pick.getAttribute("data-status-value"));
    };
  }
  function syncOpenAppointmentStatusChip(appointmentId) {
    const a = appt(appointmentId);
    const modal = document.getElementById("modal");
    if (!a || !modal || !modal.classList.contains("open")) return;
    const host = modal.querySelector(".appt-card-head-status, [data-status-chip='" + appointmentId + "']");
    if (!host) return;
    const wrap = host.closest(".appt-card-head-status") || host.parentElement;
    if (!wrap) return;
    const chip = wrap.querySelector("[data-status-chip], .status-chip-wrap");
    const html = statusChipHtml(a, { variant: "solid" });
    if (chip && chip.parentElement) chip.outerHTML = html;
    else if (wrap.classList && wrap.classList.contains("appt-card-head-status")) {
      const label = wrap.querySelector("label");
      wrap.innerHTML = (label ? label.outerHTML : "") + html;
    }
  }
  function statusChipHtml(a, opts) {
    opts = opts || {};
    const variant = opts.variant || "tint";
    const pillKind = variant === "solid" ? "is-solid" : "is-tint";
    const m = statusMeta(a.status);
    if (isMarketingRole() || opts.readonly) return statusPill(a.status, variant);
    return '<span class="status-chip-wrap" data-status-chip="' + esc(a.id) + '">' +
      '<button type="button" class="status-pill ' + pillKind + (a.status === "Canceled" ? " is-canceled" : "") + ' status-chip-btn" style="' + statusStyleVars(a.status) + '" data-status-menu="' + esc(a.id) + '" aria-haspopup="listbox" aria-expanded="false" aria-label="Change visit status, currently ' + esc(a.status) + '">' +
      statusIconSvg(m.icon) + "<span>" + esc(a.status) + "</span></button></span>";
  }
  function statusSelect(a, idSuffix) {
    const variant = (idSuffix && (idSuffix === "flow" || String(idSuffix).indexOf("room") === 0)) ? "solid" : "tint";
    return statusChipHtml(a, { variant: variant });
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
    $$("[data-status-menu]").forEach(function (el) {
      if (el.getAttribute("data-bound-status") === "1") return;
      el.setAttribute("data-bound-status", "1");
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (el.getAttribute("aria-expanded") === "true") closeStatusMenu();
        else openStatusMenu(el);
      });
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
    if (isMarketingRole()) { toast("Schedule is read-only for Marketing"); return; }
    const a = appt(appointmentId);
    if (!a || !next || a.status === next) {
      if (a && opts.suiteId !== undefined && a.status === next) return setAppointmentSuite(appointmentId, opts.suiteId, next);
      return;
    }
    if (visitStatuses().indexOf(next) < 0 && next !== "Rescheduled") return;
    if (next !== "Rescheduled" && !canSetVisitStatus(next)) { toast("That status is not available for this role"); return; }
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
    if (next === "Checked in" || next === "With clinical" || next === "With provider" || next === "Checked out") {
      applyConsultDepositOnOutcome(a, "attended");
    } else if (next === "No-show" || next === "Canceled") {
      applyConsultDepositOnOutcome(a, "fee");
      autoApplyCancelFee(a);
    }
    if (next === "Confirmed") {
      a.confirmedAt = a.confirmedAt || nowET();
      a.confirmedBy = a.confirmedBy || actingName();
      markVisitTasksDone(a.id, "confirm");
    }
    if (next === "Checked out" && !opts.quietUnpaid) {
      const due = visitUnpaid(a);
      if (due.unpaid) toast("Checked out with an unpaid or partial balance. Checkout is allowed.");
      else toast("Status: " + next);
    } else {
      toast("Status: " + next);
    }
    closeStatusMenu();
    if (!opts.silent) render();
    syncOpenAppointmentStatusChip(appointmentId);
    bindStatusStops();
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
    const staff = (BRIZZA.STAFF || []).find(function (s) { return s.role === state.actingRole; });
    return (staff && staff.name) || "Serena Collins";
  }
  function setRoomingStatus(id, next) {
    const rec = (store.rooming || []).find((r) => r.id === id || r.appointmentId === id);
    const apptId = rec ? rec.appointmentId : id;
    setVisitStatus(apptId, next);
  }

  function isOwnerRole(role) {
    role = role || state.actingRole;
    return role === "MD / Clinic Owner";
  }
  function canWaiveFees(role) {
    role = role || state.actingRole;
    return isOwnerRole(role) || role === "Clinic Manager";
  }
  function isClinicalRole(role) {
    role = role || state.actingRole;
    return isOwnerRole(role) || (BRIZZA.CLINICAL_NOTE_ROLES || []).indexOf(role) >= 0;
  }
  function canStartNote(role) {
    return isClinicalRole(role) || isMaRole(role);
  }
  function canEditNote(n, role) {
    if (!n) return canStartNote(role);
    if (!isNoteEditable(n)) return false;
    if (isClinicalRole(role)) return true;
    if (isMaRole(role)) return isNoteAuthor(n);
    return false;
  }
  function canUseTemplate(tplOrId, role) {
    role = role || state.actingRole;
    const tpl = typeof tplOrId === "object" && tplOrId ? tplOrId : getNoteTemplate(tplOrId);
    const id = (tpl && (tpl.familyId || tpl.id)) || (typeof tplOrId === "string" ? tplOrId : "");
    if (!id) return isClinicalRole(role);
    if (isOwnerRole(role)) return true;
    if (isMaRole(role)) return true;
    if (tpl && tpl.roles && tpl.roles.length) return tpl.roles.indexOf(role) >= 0;
    if (role === "Aesthetician") return id.indexOf("aes-") === 0;
    if (role === "RN / NP Injector") return id.indexOf("inj-") === 0;
    return false;
  }
  function notesTemplatesForRole(role) {
    return currentNoteTemplates().filter(function (tpl) { return canUseTemplate(tpl, role); });
  }
  function createNoteButton(pid, apptId, visitId) {
    if (!canStartNote()) return "";
    const ap = apptId ? ' data-appt="' + esc(apptId) + '"' : "";
    const vis = visitId ? ' data-visit="' + esc(visitId) + '"' : "";
    return '<button class="btn small" type="button" data-open="note-composer" data-pid="' + esc(pid) + '"' + ap + vis + '>Create Note</button>';
  }
  function patientCount(date) {
    const ids = new Set(dayAppointments(date).map((a) => a.patientId));
    const n = ids.size;
    return n + " patient" + (n === 1 ? "" : "s");
  }
  function dayCountLabel(date) {
    const list = dayAppointments(date) || [];
    if (!list.length) return "";
    const pats = new Set(list.map(function (x) { return x.patientId; })).size;
    return list.length + " appointment" + (list.length === 1 ? "" : "s") + " · " + pats + " patient" + (pats === 1 ? "" : "s");
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
  function loadCalMode() {
    try {
      const m = localStorage.getItem("brizza-emr-cal-mode");
      if (m === "day" || m === "week" || m === "month") return m;
    } catch (err) {}
    return "week";
  }
  function persistCalMode(mode) {
    if (mode === "day" || mode === "week" || mode === "month") {
      state.calMode = mode;
      try { localStorage.setItem("brizza-emr-cal-mode", mode); } catch (err) {}
    }
  }
  function loadWorklistFilters() {
    try {
      const raw = localStorage.getItem("brizza-emr-wl-filters");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (err) { return []; }
  }
  function persistWorklistFilters() {
    try { localStorage.setItem("brizza-emr-wl-filters", JSON.stringify(state.worklistFilters || [])); } catch (err) {}
  }
  function isOutsideClinicHours(date, time) {
    if (isClinicClosedDay(date)) return true;
    return time < "10:00" || time >= "18:00";
  }
  function staffRecord(nameOrRole) {
    const list = BRIZZA.STAFF || [];
    return list.find(function (s) { return s.name === nameOrRole || s.id === nameOrRole || s.role === nameOrRole; }) || null;
  }
  function providerShortName(name) {
    const s = staffRecord(name);
    if (s && s.short) return s.short + (s.credential ? ", " + s.credential : "");
    return name || "—";
  }
  function defaultLunchWindow() { return { start: "13:00", end: "14:00" }; }
  function lunchWindow(date, provider) {
    const staff = staffRecord(provider);
    const roleLunch = staff && BRIZZA.STAFF_LUNCH && BRIZZA.STAFF_LUNCH[staff.role];
    if (roleLunch && roleLunch.start && roleLunch.end) return { start: roleLunch.start, end: roleLunch.end };
    if (date && provider) {
      const lunchBlk = (typeof dayBlocks === "function" ? dayBlocks(date) : []).filter(function (b) {
        return b.staff === provider && (b.reason === "Lunch" || b.type === "Lunch");
      })[0];
      if (lunchBlk && lunchBlk.start && lunchBlk.end) return { start: lunchBlk.start, end: lunchBlk.end };
      if (typeof blocksOnDate === "function") {
        const byLoc = {};
        (blocksOnDate(provider, date) || []).forEach(function (b) {
          const key = b.locationId || "_";
          (byLoc[key] = byLoc[key] || []).push(b);
        });
        const locIds = Object.keys(byLoc);
        for (let i = 0; i < locIds.length; i += 1) {
          const list = byLoc[locIds[i]].slice().sort(function (x, y) { return String(x.start).localeCompare(String(y.start)); });
          for (let j = 0; j < list.length - 1; j += 1) {
            if (list[j].end && list[j + 1].start && list[j].end < list[j + 1].start) {
              return { start: list[j].end, end: list[j + 1].start };
            }
          }
        }
      }
    }
    return defaultLunchWindow();
  }
  function lunchWindowLabel(win) {
    const w = win || defaultLunchWindow();
    return fmtTime(w.start) + "–" + fmtTime(w.end);
  }
  function appointmentTouchesLunch(date, time, end, provider) {
    if (!date || !time || isClinicClosedDay(date)) return false;
    const w = lunchWindow(date, provider);
    const start = toMinutes(time);
    const fin = end ? toMinutes(end) : start + 15;
    const ls = toMinutes(w.start);
    const le = toMinutes(w.end);
    if (fin <= start) return start >= ls && start < le;
    return start < le && fin > ls;
  }
  function isLunchSlot(date, time, provider) {
    if (!date || !time || isClinicClosedDay(date)) return false;
    const w = lunchWindow(date, provider);
    return time >= w.start && time < w.end;
  }
  function appointmentDuration(a) {
    return Number(a && a.durationMinutes) || durationMinutes(a && a.type, a && a.reasons) || 15;
  }
  function appointmentEndTime(a, time) {
    return fromMinutes(toMinutes(time || (a && a.time) || "10:00") + appointmentDuration(a));
  }
  function isOutsideProviderAvailability(date, time, end, provider, locationId) {
    if (!date || !time || !provider) return false;
    const blocks = (blocksOnDate(provider, date) || []).filter(function (b) {
      return !locationId || b.locationId === locationId;
    });
    if (!blocks.length) return true;
    const start = toMinutes(time);
    const fin = end ? toMinutes(end) : start + 15;
    if (fin <= start) return !blocks.some(function (b) { return timeInBlock(time, b); });
    return !blocks.some(function (b) {
      return start >= toMinutes(b.start) && fin <= toMinutes(b.end);
    });
  }
  function providerAvailSummary(provider, date, locationId) {
    const blocks = (blocksOnDate(provider, date) || []).filter(function (b) {
      return !locationId || b.locationId === locationId;
    }).slice().sort(function (x, y) { return String(x.start).localeCompare(String(y.start)); });
    if (!blocks.length) return "";
    return blocks.map(function (b) { return compactRange(b.start, b.end); }).join(" and ");
  }
  function slotsOverlap(date, time, mins, provider, exceptId) {
    const start = toMinutes(time);
    const end = start + (mins || 15);
    return (store.appointments || []).some(function (a) {
      if (!a || a.id === exceptId || a.date !== date) return false;
      if (a.status === "Canceled" || a.status === "Rescheduled") return false;
      if (provider && a.provider && a.provider !== provider) return false;
      const s = toMinutes(a.time);
      const e = s + appointmentDuration(a);
      return start < e && end > s;
    });
  }
  function slotIsBookable(date, time, mins, provider, exceptId, opts) {
    opts = opts || {};
    if (!date || !time || isClinicClosedDay(date)) return false;
    const end = fromMinutes(toMinutes(time) + (mins || 15));
    if (time < "10:00" || end > "18:00") return false;
    if (appointmentTouchesLunch(date, time, end, provider)) return false;
    if (slotsOverlap(date, time, mins, provider, exceptId)) return false;
    if (opts.requireAvail && provider && isOutsideProviderAvailability(date, time, end, provider, opts.locationId)) return false;
    return true;
  }
  function nextOpenClinicDay(date) {
    let d = date, guard = 0;
    while (d && isClinicClosedDay(d) && guard < 21) { d = addDays(d, 1); guard += 1; }
    return d;
  }
  function findOpenSampleSlot(a, startDate) {
    const mins = appointmentDuration(a);
    const prefer = a.time || "10:00";
    let date = startDate || a.date;
    if (isClinicClosedDay(date)) date = nextOpenClinicDay(date);
    for (let d = 0; d < 21; d += 1) {
      const day = addDays(date, d);
      if (isClinicClosedDay(day)) continue;
      const times = [];
      if (d === 0) {
        times.push(prefer);
        const lunch = lunchWindow(day, a.provider);
        if (lunch && lunch.end) times.push(lunch.end);
      }
      let t = "10:00";
      while (t < "18:00") { times.push(t); t = fromMinutes(toMinutes(t) + 15); }
      const seen = {};
      const tryList = function (requireAvail) {
        for (let i = 0; i < times.length; i += 1) {
          const tm = times[i];
          if (seen[tm + ":" + requireAvail]) continue;
          seen[tm + ":" + requireAvail] = 1;
          if (slotIsBookable(day, tm, mins, a.provider, a.id, { requireAvail: requireAvail, locationId: a.locationId })) {
            return { date: day, time: tm };
          }
        }
        return null;
      };
      const hit = tryList(true) || tryList(false);
      if (hit) return hit;
    }
    return null;
  }
  function retargetLinkedDates(a, beforeDate, afterDate) {
    if (!a || beforeDate === afterDate) return;
    (store.visits || []).forEach(function (v) {
      if ((a.visitId && v.id === a.visitId) || v.appointmentId === a.id) {
        if (v.date === beforeDate) v.date = afterDate;
      }
    });
    (store.patients || []).forEach(function (p) {
      if (p.id !== a.patientId) return;
      (p.notes || []).forEach(function (n) {
        if (n.appointmentId === a.id && n.date === beforeDate) {
          n.date = afterDate;
          if (n.dos === beforeDate) n.dos = afterDate;
        }
      });
    });
    (store.tasks || []).forEach(function (t) {
      if ((t.appointmentId === a.id || t.recordId === a.id) && (t.due === beforeDate || t.date === beforeDate)) {
        if (t.due === beforeDate) t.due = afterDate;
        if (t.date === beforeDate) t.date = afterDate;
      }
    });
  }
  function appointmentNeedsRehome(a) {
    if (!a || !a.date || !a.time) return false;
    if (isClinicClosedDay(a.date)) return true;
    return appointmentTouchesLunch(a.date, a.time, appointmentEndTime(a), a.provider);
  }
  function toMinutesOf(t) {
    const p = String(t || "00:00").split(":");
    return Number(p[0]) * 60 + Number(p[1] || 0);
  }
  function fromMinutesOf(n) {
    const h = Math.floor(n / 60), m = n % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }
  function sampleSlotBlocked(date, start, mins, provider, exceptId) {
    const s0 = toMinutesOf(start);
    const s1 = s0 + (mins || 30);
    if (s0 < toMinutesOf("10:00") || s1 > toMinutesOf("18:00")) return true;
    if (s0 < toMinutesOf("14:00") && s1 > toMinutesOf("13:00")) return true; // provider lunch
    if (isClinicClosedDay(date)) return true;
    return (store.appointments || []).some(function (a) {
      if (!a || a.id === exceptId || a.date !== date) return false;
      if (a.status === "Canceled" || a.status === "Rescheduled") return false;
      if (a.provider !== provider) return false;
      const b0 = toMinutesOf(a.time);
      const b1 = b0 + (a.durationMinutes || 30);
      return s0 < b1 && s1 > b0;
    });
  }
  function seedBusyClinicTraffic() {
    if ((store.patients || []).some(function (p) { return p.id === "BZ0101"; })) return;
    store.patients = store.patients || [];
    store.appointments = store.appointments || [];
    const rossi = "Dr. Valentina A. Rossi, MD";
    const costa = "Alessia Costa, NP";
    const hayes = "Stella Hayes, LE";
    const loc = BRIZZA.DEFAULT_LOCATION || "LOC-MANHATTAN";
    const guests = [
      { id: "BZ0101", name: "Luna Park", dob: "1991-06-14", sex: "Female", phone: "(212) 555-0201" },
      { id: "BZ0102", name: "Theo Maple", dob: "1984-02-03", sex: "Male", phone: "(212) 555-0202" },
      { id: "BZ0103", name: "Iris Bellamy", dob: "1996-11-22", sex: "Female", phone: "(917) 555-0203" },
      { id: "BZ0104", name: "Jasper Quinn", dob: "1979-08-19", sex: "Male", phone: "(646) 555-0204" },
      { id: "BZ0105", name: "Wren Hollow", dob: "1993-01-27", sex: "Female", phone: "(212) 555-0205" },
      { id: "BZ0106", name: "Milo Barrett", dob: "1988-05-09", sex: "Male", phone: "(917) 555-0206" },
      { id: "BZ0107", name: "Poppy Ellison", dob: "1999-03-30", sex: "Female", phone: "(646) 555-0207" },
      { id: "BZ0108", name: "Felix Grant", dob: "1972-12-08", sex: "Male", phone: "(212) 555-0208" },
      { id: "BZ0109", name: "Nina Shore", dob: "1986-07-16", sex: "Female", phone: "(917) 555-0209" },
      { id: "BZ0110", name: "Oscar Pine", dob: "1990-04-02", sex: "Male", phone: "(212) 555-0210" },
      { id: "BZ0111", name: "Ruby Lang", dob: "1983-09-25", sex: "Female", phone: "(646) 555-0211" },
      { id: "BZ0112", name: "Hugo Wells", dob: "1977-10-11", sex: "Male", phone: "(212) 555-0212" },
      { id: "BZ0113", name: "Ivy Carlyle", dob: "1995-08-06", sex: "Female", phone: "(917) 555-0213" },
      { id: "BZ0114", name: "Bennett Frost", dob: "1981-01-18", sex: "Male", phone: "(212) 555-0214" },
      { id: "BZ0115", name: "Cora Blake", dob: "1992-06-29", sex: "Female", phone: "(646) 555-0215" },
      { id: "BZ0116", name: "Simon Vale", dob: "1974-03-21", sex: "Male", phone: "(917) 555-0216" },
      { id: "BZ0117", name: "Adele Finch", dob: "1987-11-04", sex: "Female", phone: "(212) 555-0217" },
      { id: "BZ0118", name: "Julian Moss", dob: "1998-02-14", sex: "Male", phone: "(646) 555-0218" },
      { id: "BZ0119", name: "Pearl Addison", dob: "1980-05-23", sex: "Female", phone: "(212) 555-0219" },
      { id: "BZ0120", name: "Gideon Shaw", dob: "1969-09-07", sex: "Male", phone: "(917) 555-0220" },
      { id: "BZ0121", name: "Marlowe Pitt", dob: "1994-12-19", sex: "Female", phone: "(212) 555-0221" },
      { id: "BZ0122", name: "Quinn Avery", dob: "1985-07-01", sex: "Male", phone: "(646) 555-0222" },
      { id: "BZ0123", name: "Tessa Wren", dob: "1997-04-28", sex: "Female", phone: "(212) 555-0223" },
      { id: "BZ0124", name: "Arlo Kamp", dob: "1991-10-15", sex: "Male", phone: "(917) 555-0224" },
      { id: "BZ0125", name: "Bridget Sol", dob: "1978-08-13", sex: "Female", phone: "(212) 555-0225" },
      { id: "BZ0126", name: "Ellis Hart", dob: "1989-02-26", sex: "Male", phone: "(646) 555-0226" },
      { id: "BZ0127", name: "Sable Oriole", dob: "1993-06-05", sex: "Female", phone: "(212) 555-0227" }
    ];
    guests.forEach(function (g, i) {
      const slug = g.name.toLowerCase().replace(/\s+/g, ".") + "@example.com";
      store.patients.push({
        id: g.id, name: g.name, dob: g.dob, sex: g.sex, phone: g.phone, email: slug, status: "Active",
        allergies: ["No known allergies"], meds: [], conditions: [], notes: [],
        consents: { clinical: "Current · signed Nov 12, 2026", marketing: "Not authorized", photo: "Authorized · signed Nov 12, 2026" },
        photos: [], documents: ["Intake and medical history · Nov 12, 2026"], treatments: [], followups: [], demoHistory: [],
        registration: { idUploaded: { status: "Uploaded", date: "2026-11-12" }, formsCompleted: { status: "Completed", date: "2026-11-12" }, demographicsConfirmed: { status: "Confirmed", date: "2026-11-12" } }
      });
    });
    const today = todayET();
    const flowDay = defaultClinicDate();
    const prevOpen = (function () {
      let d = addDays(today, -1);
      for (let i = 0; i < 14; i += 1) {
        if (!isClinicClosedDay(d)) return d;
        d = addDays(d, -1);
      }
      return addDays(flowDay, -5);
    })();
    const later = [];
    let d = nextOpenClinicDay(addDays(flowDay, 1));
    for (let i = 0; i < 3; i += 1) { later.push(d); d = nextOpenClinicDay(addDays(d, 1)); }
    let seq = 6301;
    function addAppt(spec) {
      if (isClinicClosedDay(spec.date)) return null;
      const mins = spec.mins || 30;
      if (sampleSlotBlocked(spec.date, spec.time, mins, spec.provider)) return null;
      const id = "A-" + String(seq++);
      const rec = {
        id: id, time: spec.time, patientId: spec.patientId, type: spec.type,
        reasons: spec.reasons || [], provider: spec.provider, durationLabel: mins + " min", durationMinutes: mins,
        status: spec.status, consultation: "", treatment: "", date: spec.date, locationId: loc,
        suiteId: spec.suiteId || null, history: spec.history || [spec.status],
        statusSince: nowMs() - ((spec.waitMin || 5) * 60000), prepNotes: spec.note || ""
      };
      store.appointments.push(rec);
      if (["Checked in", "Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout", "Checked out"].indexOf(spec.status) >= 0 && spec.date === flowDay) {
        store.rooming = store.rooming || [];
        store.rooming.push({
          id: "RM-" + rec.id, appointmentId: rec.id, patientId: rec.patientId, date: rec.date,
          status: rec.status, statusSince: rec.statusSince, suiteId: rec.suiteId, suiteSince: rec.suiteId ? rec.statusSince : null
        });
      }
      return rec;
    }
    // Monday clinic day (or next open day): mid-morning traffic around the 11:25 demo clock.
    addAppt({ patientId: "BZ0101", date: flowDay, time: "10:00", type: "Consultation", reasons: ["Existing Patient"], mins: 15, provider: rossi, status: "Checked out", waitMin: 8, history: ["Scheduled → Confirmed", "Confirmed → Checked in", "Checked in → Checked out"] });
    addAppt({ patientId: "BZ0102", date: flowDay, time: "10:00", type: "Follow-up", reasons: ["Follow-up"], mins: 15, provider: costa, status: "Checked out", waitMin: 6, history: ["Scheduled → Confirmed", "Confirmed → Checked out"] });
    addAppt({ patientId: "BZ0103", date: flowDay, time: "10:00", type: "Facial", reasons: ["Facial"], mins: 60, provider: hayes, status: "Ready for checkout", waitMin: 6, history: ["Scheduled → Confirmed", "Confirmed → With provider", "With provider → Ready for checkout"] });
    addAppt({ patientId: "BZ0104", date: flowDay, time: "10:30", type: "Neurotoxin", reasons: ["Botox"], mins: 30, provider: rossi, status: "Ready for checkout", waitMin: 4, history: ["Scheduled → Confirmed", "Confirmed → With provider", "With provider → Ready for checkout"] });
    addAppt({ patientId: "BZ0105", date: flowDay, time: "10:15", type: "Filler", reasons: ["Juvederm"], mins: 30, provider: costa, status: "Ready for provider", waitMin: 8, history: ["Scheduled → Confirmed", "Confirmed → Checked in", "Checked in → Ready for provider"] });
    addAppt({ patientId: "BZ0106", date: flowDay, time: "10:45", type: "Follow-up", reasons: ["Follow-up"], mins: 15, provider: costa, status: "With clinical", waitMin: 11, history: ["Scheduled → Confirmed", "Confirmed → Checked in", "Checked in → With clinical"] });
    addAppt({ patientId: "BZ0107", date: flowDay, time: "11:00", type: "Filler", reasons: ["Volbella"], mins: 30, provider: rossi, status: "With provider", suiteId: "SUITE-3", waitMin: 12, history: ["Scheduled → Confirmed", "Confirmed → With provider"] });
    addAppt({ patientId: "BZ0108", date: flowDay, time: "11:00", type: "Neurotoxin", reasons: ["Botox"], mins: 30, provider: costa, status: "With provider", suiteId: "SUITE-2", waitMin: 14, history: ["Scheduled → Confirmed", "Confirmed → With provider"] });
    addAppt({ patientId: "BZ0109", date: flowDay, time: "11:00", type: "Wax", reasons: ["Eyebrows"], mins: 30, provider: hayes, status: "With provider", suiteId: "SUITE-1", waitMin: 10, history: ["Scheduled → Confirmed", "Confirmed → With provider"] });
    addAppt({ patientId: "BZ0110", date: flowDay, time: "11:30", type: "Follow-up", reasons: ["Follow-up"], mins: 15, provider: rossi, status: "Ready for clinical", waitMin: 9, history: ["Scheduled → Confirmed", "Confirmed → Checked in", "Checked in → Ready for clinical"] });
    addAppt({ patientId: "BZ0111", date: flowDay, time: "11:30", type: "Consultation", reasons: ["Existing Patient"], mins: 15, provider: costa, status: "Checked in", waitMin: 5, history: ["Scheduled → Confirmed", "Confirmed → Checked in"] });
    addAppt({ patientId: "BZ0112", date: flowDay, time: "11:30", type: "Facial", reasons: ["Mini Facial"], mins: 30, provider: hayes, status: "Ready for clinical", waitMin: 7, history: ["Scheduled → Confirmed", "Confirmed → Checked in", "Checked in → Ready for clinical"] });
    addAppt({ patientId: "BZ0113", date: flowDay, time: "12:00", type: "Consultation", reasons: ["New Patient"], mins: 15, provider: rossi, status: "Checked in", waitMin: 3, history: ["Scheduled → Confirmed", "Confirmed → Checked in"], note: "Arrived a little early." });
    addAppt({ patientId: "BZ0114", date: flowDay, time: "12:00", type: "Follow-up", reasons: ["Toxin touch-up"], mins: 15, provider: costa, status: "Confirmed", waitMin: 0, history: ["Scheduled → Confirmed"] });
    addAppt({ patientId: "BZ0115", date: flowDay, time: "12:00", type: "Wax", reasons: ["Lips"], mins: 30, provider: hayes, status: "Confirmed", waitMin: 0, history: ["Scheduled → Confirmed"] });
    addAppt({ patientId: "BZ0116", date: flowDay, time: "14:00", type: "Neurotoxin", reasons: ["Jeuveau"], mins: 30, provider: rossi, status: "Confirmed", history: ["Scheduled → Confirmed"] });
    addAppt({ patientId: "BZ0117", date: flowDay, time: "14:00", type: "Filler", reasons: ["Juvederm"], mins: 30, provider: costa, status: "Confirmed", history: ["Scheduled → Confirmed"] });
    addAppt({ patientId: "BZ0118", date: flowDay, time: "14:00", type: "Facial", reasons: ["Hydrafacial"], mins: 75, provider: hayes, status: "Confirmed", history: ["Scheduled → Confirmed"] });
    addAppt({ patientId: "BZ0119", date: flowDay, time: "15:00", type: "Follow-up", reasons: ["Follow-up"], mins: 15, provider: rossi, status: "Scheduled", history: ["Scheduled"] });
    addAppt({ patientId: "BZ0120", date: flowDay, time: "15:30", type: "Consultation", reasons: ["Existing Patient"], mins: 15, provider: costa, status: "Scheduled", history: ["Scheduled"] });
    addAppt({ patientId: "BZ0121", date: flowDay, time: "15:30", type: "Microneedling", reasons: ["Microneedling"], mins: 75, provider: hayes, status: "Confirmed", history: ["Scheduled → Confirmed"] });
    addAppt({ patientId: "BZ0122", date: flowDay, time: "16:00", type: "Consultation", reasons: ["New Patient"], mins: 15, provider: rossi, status: "Scheduled", history: ["Scheduled"] });
    addAppt({ patientId: "BZ0123", date: flowDay, time: "16:30", type: "Follow-up", reasons: ["Follow-up"], mins: 15, provider: costa, status: "Scheduled", history: ["Scheduled"] });
    addAppt({ patientId: "BZ0124", date: flowDay, time: "16:30", type: "Wax", reasons: ["Face"], mins: 30, provider: hayes, status: "Scheduled", history: ["Scheduled"] });
    // One gold wait badge (>= 15m) still in a plausible range.
    addAppt({ patientId: "BZ0125", date: flowDay, time: "10:15", type: "Follow-up", reasons: ["Follow-up"], mins: 15, provider: rossi, status: "With clinical", waitMin: 18, history: ["Scheduled → Confirmed", "Confirmed → With clinical"] });

    // Previous open day: completed visits.
    addAppt({ patientId: "BZ0126", date: prevOpen, time: "10:00", type: "Neurotoxin", reasons: ["Botox"], mins: 30, provider: rossi, status: "Checked out", history: ["Scheduled → Confirmed", "Confirmed → Checked out"] });
    addAppt({ patientId: "BZ0127", date: prevOpen, time: "11:00", type: "Facial", reasons: ["Facial"], mins: 60, provider: hayes, status: "Checked out", history: ["Scheduled → Confirmed", "Confirmed → Checked out"] });
    addAppt({ patientId: "BZ0101", date: prevOpen, time: "14:00", type: "Follow-up", reasons: ["Follow-up"], mins: 15, provider: costa, status: "Checked out", history: ["Scheduled → Confirmed", "Confirmed → Checked out"] });

    // Following open days: booked, not yet in flow.
    const laterPlans = [
      { day: 0, time: "10:00", type: "Consultation", reasons: ["New Patient"], mins: 15, provider: rossi, patientId: "BZ0102", status: "Confirmed" },
      { day: 0, time: "10:30", type: "Filler", reasons: ["Juvederm"], mins: 30, provider: costa, patientId: "BZ0103", status: "Confirmed" },
      { day: 0, time: "11:00", type: "Wax", reasons: ["Eyebrows"], mins: 30, provider: hayes, patientId: "BZ0104", status: "Scheduled" },
      { day: 0, time: "14:00", type: "Neurotoxin", reasons: ["Botox"], mins: 30, provider: rossi, patientId: "BZ0105", status: "Confirmed" },
      { day: 0, time: "15:00", type: "Facial", reasons: ["Facial"], mins: 60, provider: hayes, patientId: "BZ0106", status: "Scheduled" },
      { day: 1, time: "10:00", type: "Follow-up", reasons: ["Follow-up"], mins: 15, provider: costa, patientId: "BZ0107", status: "Confirmed" },
      { day: 1, time: "11:00", type: "Chemical Peel", reasons: ["Chemical Peel"], mins: 60, provider: hayes, patientId: "BZ0108", status: "Confirmed" },
      { day: 1, time: "14:30", type: "Filler", reasons: ["Volbella"], mins: 30, provider: rossi, patientId: "BZ0109", status: "Scheduled" },
      { day: 1, time: "16:00", type: "Consultation", reasons: ["Existing Patient"], mins: 15, provider: costa, patientId: "BZ0110", status: "Scheduled" },
      { day: 2, time: "10:30", type: "Neurotoxin", reasons: ["Jeuveau"], mins: 30, provider: costa, patientId: "BZ0111", status: "Confirmed" },
      { day: 2, time: "11:00", type: "Microneedling", reasons: ["Microneedling"], mins: 75, provider: hayes, patientId: "BZ0112", status: "Confirmed" },
      { day: 2, time: "14:00", type: "Consultation", reasons: ["New Patient"], mins: 15, provider: rossi, patientId: "BZ0113", status: "Scheduled" },
      { day: 2, time: "15:30", type: "Wax", reasons: ["Lips"], mins: 30, provider: hayes, patientId: "BZ0114", status: "Scheduled" }
    ];
    laterPlans.forEach(function (pl) {
      const date = later[pl.day];
      if (!date) return;
      addAppt({ patientId: pl.patientId, date: date, time: pl.time, type: pl.type, reasons: pl.reasons, mins: pl.mins, provider: pl.provider, status: pl.status, history: pl.status === "Confirmed" ? ["Scheduled → Confirmed"] : ["Scheduled"] });
    });
    (function ensureFlowCoverage() {
      const clock = (BRIZZA.DEMO_CLOCK && BRIZZA.DEMO_CLOCK.time) || "11:25";
      function hm(t) {
        const p = String(t || "00:00").split(":");
        return Number(p[0]) * 60 + Number(p[1] || 0);
      }
      const nowMin = hm(clock);
      const morning = ["10:00","10:15","10:30","10:45","11:00","11:15","11:30","11:45","12:00","12:15","12:30"];
      const providers = [rossi, costa, hayes];
      let pi = 0;
      function demoteFutureInroom() {
        (store.appointments || []).forEach(function (a) {
          if (!a || a.date !== flowDay) return;
          const start = hm(a.time);
          if (a.status === "No-show" && start > nowMin + 5) {
            a.status = "Confirmed";
            a.suiteId = null;
            a.suiteSince = null;
            return;
          }
          if (a.status === "Checked in" && start > nowMin + 45) {
            a.status = "Confirmed";
            a.suiteId = null;
            return;
          }
          const board = ["Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout"];
          if (board.indexOf(a.status) >= 0 && start > nowMin + 20) {
            a.status = "Confirmed";
            a.suiteId = null;
            a.suiteSince = null;
          }
        });
      }
      function fillNeed() {
        const need = [
          { status: "Checked in", waitMin: 5, latest: nowMin + 45 },
          { status: "Ready for clinical", waitMin: 7, latest: nowMin + 20 },
          { status: "With clinical", waitMin: 11, latest: nowMin + 5 },
          { status: "Ready for provider", waitMin: 8, latest: nowMin },
          { status: "With provider", waitMin: 12, latest: nowMin + 5 },
          { status: "Ready for checkout", waitMin: 6, latest: nowMin },
          { status: "Checked out", waitMin: 8, latest: nowMin }
        ];
        need.forEach(function (n) {
          const has = (store.appointments || []).some(function (a) {
            return a.date === flowDay && a.status === n.status && hm(a.time) <= n.latest;
          });
          if (has) return;
          const cand = (store.appointments || []).find(function (a) {
            return a.date === flowDay && hm(a.time) <= n.latest && hm(a.time) >= 10 * 60
              && (a.status === "Scheduled" || a.status === "Confirmed");
          });
          if (cand) {
            cand.status = n.status;
            cand.statusSince = Date.now() - n.waitMin * 60000;
            cand.history = (cand.history || []).concat(["Scheduled → " + n.status]);
            return;
          }
          for (let i = 0; i < morning.length; i += 1) {
            if (hm(morning[i]) > n.latest) continue;
            for (let p = 0; p < providers.length; p += 1) {
              const guest = guests[pi % guests.length];
              const rec = addAppt({
                patientId: guest.id, date: flowDay, time: morning[i], type: "Follow-up",
                reasons: ["Follow-up"], mins: 15, provider: providers[p], status: n.status,
                waitMin: n.waitMin, history: ["Scheduled → " + n.status]
              });
              if (rec) { pi += 1; return; }
            }
          }
        });
      }
      function uniqueSuites() {
        const inSuite = ["With clinical", "With provider", "Ready for provider"];
        const claimed = {};
        function applySuite(a, sid) {
          a.suiteId = sid;
          a.suiteSince = sid ? (a.statusSince || Date.now()) : null;
          const rec = (store.rooming || []).find(function (r) { return r.appointmentId === a.id && r.date === a.date; });
          if (rec) { rec.suiteId = sid; rec.suiteSince = a.suiteSince; rec.status = a.status; rec.statusSince = a.statusSince; }
        }
        function providerLabel(a) { return [a.provider, a.providerName, a.providerId].filter(Boolean).join(" "); }
        function preferredSuite(a) {
          const name = providerLabel(a);
          if (/Hayes/.test(name)) return "SUITE-1";
          if (/Costa/.test(name)) return "SUITE-2";
          if (/Rossi/.test(name)) return "SUITE-3";
          return null;
        }
        (store.appointments || []).forEach(function (a) {
          if (a.date === flowDay && a.suiteId && inSuite.indexOf(a.status) < 0) applySuite(a, null);
        });
        (store.appointments || []).filter(function (a) {
          return a.date === flowDay && inSuite.indexOf(a.status) >= 0;
        }).forEach(function (a) {
          const pref = preferredSuite(a);
          if (pref && !claimed[pref]) { applySuite(a, pref); claimed[pref] = a; }
          else applySuite(a, null);
        });
        ["SUITE-1", "SUITE-2", "SUITE-3"].forEach(function (sid) {
          if (claimed[sid]) return;
          const cand = (store.appointments || []).find(function (a) {
            return a.date === flowDay && !a.suiteId && inSuite.indexOf(a.status) >= 0 && hm(a.time) <= nowMin + 5;
          });
          if (cand) {
            applySuite(cand, sid);
            claimed[sid] = cand;
            return;
          }
          const typ = sid === "SUITE-1" ? "Facial" : "Follow-up";
          const prov = sid === "SUITE-1" ? hayes : (sid === "SUITE-2" ? costa : rossi);
          for (let i = 0; i < morning.length; i += 1) {
            if (hm(morning[i]) > nowMin + 5) continue;
            const guest = guests[pi % guests.length];
            const rec = addAppt({
              patientId: guest.id, date: flowDay, time: morning[i], type: typ, reasons: [typ],
              mins: 30, provider: prov, status: "With provider", suiteId: sid, waitMin: 12,
              history: ["Scheduled → With provider"]
            });
            if (rec) { pi += 1; claimed[sid] = rec; return; }
          }
        });
      }
      demoteFutureInroom();
      fillNeed();
      uniqueSuites();
      fillNeed();
    })();
  }
  function reconcileSampleSchedule() {
    (store.appointments || []).forEach(function (a) {
      if (!appointmentNeedsRehome(a)) return;
      const start = isClinicClosedDay(a.date) ? nextOpenClinicDay(a.date) : a.date;
      const slot = findOpenSampleSlot(a, start);
      if (!slot) return;
      const before = a.date;
      a.date = slot.date;
      a.time = slot.time;
      retargetLinkedDates(a, before, slot.date);
    });
    const today = todayET();
    const flowDay = isClinicClosedDay(today) ? nextOpenClinicDay(today) : today;
    const inflight = ["Scheduled", "Confirmed", "Checked in", "Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout"];
    const room = ["Checked in", "Ready for clinical", "With clinical", "Ready for provider", "With provider", "Ready for checkout"];
    (store.appointments || []).forEach(function (a) {
      if (!a || a.status === "Canceled" || a.status === "No-show" || a.status === "Rescheduled") return;
      if (a.date < today && inflight.indexOf(a.status) >= 0) a.status = "Checked out";
      if (a.date > flowDay && room.indexOf(a.status) >= 0) a.status = "Confirmed";
    });
  }
  function staffRecord(name) {
    return (BRIZZA.STAFF || []).find(function (s) { return s.name === name || s.calendarName === name; }) || null;
  }
  function typeRequiredRole(type) {
    const tp = typesList().find(function (t) { return t.name === type; });
    return (tp && tp.requiredRole) || "";
  }
  function providerRoleMismatch(type, provider) {
    const need = typeRequiredRole(type);
    if (!need || !provider) return "";
    const st = staffRecord(provider);
    if (st && st.role === need) return "";
    return need;
  }
  function consultDepositAmount(type) {
    if (!isConsultType(type)) return 0;
    const tp = typesList().find(function (t) { return t.name === type; });
    const n = tp && tp.deposit != null && tp.deposit !== "" ? Number(tp.deposit) : 0;
    return n > 0 ? n : 0;
  }
  function applyConsultDepositOnOutcome(a, outcome) {
    if (!a || !a.deposit || !(Number(a.deposit.amount) > 0) || a.deposit.appliedTo) return;
    const amt = Number(a.deposit.amount);
    a.deposit.neverTreatment = true;
    if (outcome === "fee") {
      a.deposit.appliedTo = "no-show-or-late-cancel-fee";
      (a.history = a.history || []).push("Consultation deposit " + money(amt) + " applied to no-show / late-cancel fee · " + nowET());
    } else {
      a.deposit.appliedTo = "consultation";
      (a.history = a.history || []).push("Consultation deposit " + money(amt) + " applied to the consultation · " + nowET());
    }
  }
  function isCancelFeeLine(l) {
    return l && (l.kind === "fee" || l.feeAutoApplied) && /cancel|no-show/i.test(l.name || "");
  }
  function hoursUntilAppointment(a) {
    if (!a || !a.date) return 0;
    const start = new Date(a.date + "T" + ((a.time || "10:00") + ":00"));
    const clock = BRIZZA.DEMO_CLOCK || {};
    const now = new Date((clock.date || todayET()) + "T" + ((clock.time || "12:00") + ":00"));
    return (start.getTime() - now.getTime()) / 3600000;
  }
  function autoApplyCancelFee(a) {
    if (!a) return;
    const inv = ensureInvoiceForAppt(a, { quiet: true });
    if (!inv) return;
    inv.lines = inv.lines || [];
    const existing = inv.lines.find(isCancelFeeLine);
    if (existing) return;
    const fee = Number(BRIZZA.CANCEL_FEE || 50);
    const noshow = a.status === "No-show";
    const late = !noshow && hoursUntilAppointment(a) < 24;
    if (!noshow && !late) {
      (a.history = a.history || []).push("Canceled outside the 24-hour cutoff · no late-cancel fee · " + nowET());
      return;
    }
    const feeName = noshow ? "No-show fee" : "Late cancellation fee";
    inv.lines.push({
      kind: "fee",
      name: feeName,
      qty: 1,
      unitPrice: fee,
      feeAutoApplied: true,
      waived: false
    });
    inv.status = inv.status === "Paid" ? "Partially Paid" : (inv.status || "Draft");
    (a.history = a.history || []).push(feeName + " auto-applied (" + money(fee) + ", 24-hour cutoff) · " + nowET());
    addAudit({
      action: "Auto-applied cancellation / no-show fee",
      recordType: "Invoice",
      recordId: inv.id,
      recordPath: { page: "pos", invoiceId: inv.id },
      changes: [{ field: "lines", before: "—", after: "Cancellation / no-show fee (" + money(fee) + ")" }]
    });
    refreshInvoiceBalance(inv);
    if (a.deposit && a.deposit.appliedTo === "no-show-or-late-cancel-fee" && Number(a.deposit.amount) > 0) {
      const apply = Math.min(Number(a.deposit.amount), fee);
      const already = (inv.payments || []).some(function (p) { return p && p.method === "Consult deposit" && p.towardFee; });
      if (!already && apply > 0) {
        inv.payments = inv.payments || [];
        inv.payments.push({ id: nextId("PAY-", inv.payments), method: "Consult deposit", status: "Paid", recorded: nowET(), amount: apply, towardFee: true });
        refreshInvoiceBalance(inv);
      }
    }
  }
  function waiveCancelFee(inv, line) {
    if (!canWaiveFees()) { toast("Only a Manager or Owner can waive a fee"); return; }
    if (!inv || !line || line.waived) return;
    line.waived = true;
    line.waivedBy = actingName();
    line.waivedAt = nowET();
    addAudit({
      action: "Waived cancellation / no-show fee",
      recordType: "Invoice",
      recordId: inv.id,
      recordPath: { page: "pos", invoiceId: inv.id },
      changes: [{ field: "fee", before: "Due (amount TBD)", after: "Waived by " + actingName() }]
    });
    refreshInvoiceBalance(inv);
    toast("Fee waived");
    render();
  }
  function cancelFeeNoticeHtml(a) {
    const inv = a && (invoiceForAppt(a) || ((store.invoices || []).find(function (i) { return (i.appointmentIds || []).indexOf(a.id) >= 0; }) || null));
    if (!inv) return "";
    const line = (inv.lines || []).find(isCancelFeeLine);
    if (!line) return "";
    if (line.waived) {
      return '<div class="notice">Cancellation / no-show fee waived' + (line.waivedBy ? " by " + esc(line.waivedBy) : "") + ".</div>";
    }
    const waive = canWaiveFees()
      ? '<button type="button" class="btn small" data-waive-fee="' + esc(inv.id) + '">Waive fee</button>'
      : '<p class="row-sub">Only a Manager or Owner can waive this fee.</p>';
    return '<div class="notice">Cancellation / no-show fee auto-applied · ' + money(line.unitPrice != null ? line.unitPrice : (BRIZZA.CANCEL_FEE || 50)) + '.' + waive + "</div>";
  }
  function holidayName(date) {
    return (BRIZZA.HOLIDAYS && BRIZZA.HOLIDAYS[date]) || "";
  }
  function isClinicClosedDay(date) {
    return isWeekend(date) || !!holidayName(date);
  }
  function defaultClinicDate() {
    const t = todayET();
    return isClinicClosedDay(t) ? nextOpenClinicDay(t) : t;
  }
  function prevOpenDay(date) {
    let d = date;
    let guard = 0;
    while (isClinicClosedDay(d) && guard < 10) { d = addDays(d, -1); guard += 1; }
    return d;
  }
  function confirmDueDate(apptDate) { return prevOpenDay(addDays(apptDate, -2)); }
  function reminderDueDate(apptDate) { return prevOpenDay(addDays(apptDate, -1)); }
  function frontDeskOwnerName() {
    const s = (BRIZZA.STAFF || []).find(function (x) { return x.role === "Clinical Coordinator"; });
    return s ? s.name : "Serena Collins";
  }
  function markVisitTasksDone(appointmentId, kind) {
    (store.tasks || []).forEach(function (t) {
      if (t.appointmentId === appointmentId && (!kind || t.kind === kind)) t.done = true;
    });
  }
  function confirmVisit(appointmentId) {
    const a = appt(appointmentId);
    if (!a || isMarketingRole()) return;
    if (a.status === "Scheduled") setVisitStatus(appointmentId, "Confirmed", { silent: true });
    a.confirmedAt = nowET();
    a.confirmedBy = actingName();
    markVisitTasksDone(appointmentId, "confirm");
    (a.history = a.history || []).push("Visit confirmed · " + nowET());
    toast("Visit confirmed");
    render();
  }
  function sendVisitReminder(appointmentId) {
    const a = appt(appointmentId);
    if (!a || isMarketingRole()) return;
    a.reminderSent = true;
    a.reminderAt = nowET();
    a.reminderBy = actingName();
    markVisitTasksDone(appointmentId, "reminder");
    (a.history = a.history || []).push("24-hour reminder sent · " + nowET());
    toast("24-hour reminder sent");
    render();
  }
  function reminderActionsHtml(a) {
    if (!a || isMarketingRole()) return "";
    const inactive = a.status === "Canceled" || a.status === "No-show" || a.status === "Rescheduled" || a.status === "Checked out";
    if (inactive) return "";
    const needConfirm = a.status === "Scheduled" && !a.confirmedAt;
    const needReminder = !a.reminderAt && !a.reminderSent && !isBoardStatus(a.status);
    let html = "";
    if (needConfirm) html += '<button type="button" class="btn small" data-confirm-visit="' + esc(a.id) + '">Confirm visit</button>';
    if (needReminder) html += '<button type="button" class="btn small" data-send-reminder="' + esc(a.id) + '">Send reminder</button>';
    return html;
  }
  function ensureConfirmReminderTasks() {
    const today = todayET();
    store.tasks = store.tasks || [];
    (store.appointments || []).forEach(function (a) {
      if (!a || !a.date) return;
      const inactive = a.status === "Canceled" || a.status === "No-show" || a.status === "Rescheduled";
      if (inactive && a.date < today) return;
      const inClinic = isBoardStatus(a.status) || a.status === "Checked out";
      const upcoming = a.status === "Scheduled" || a.status === "Confirmed" || inClinic;
      if (!upcoming) return;
      if (a.date < today && !inClinic && a.status !== "Scheduled" && a.status !== "Confirmed") return;
      const p = patient(a.patientId);
      const label = ((p && p.name) || a.patientId) + " · " + fmtDate(a.date) + " · " + fmtTime(a.time) + " · " + (a.type || "Visit");
      function upsert(kind, text, due) {
        let t = store.tasks.find(function (x) { return x.appointmentId === a.id && x.kind === kind; });
        if (!t) {
          t = { id: nextId("T-", store.tasks), kind: kind, text: text, patientId: a.patientId, appointmentId: a.id, owner: frontDeskOwnerName(), due: due, done: false, createdAt: today };
          store.tasks.push(t);
        }
        if (inactive || inClinic) t.done = true;
        else if (kind === "confirm" && (a.status === "Confirmed" || a.confirmedAt)) t.done = true;
        else if (kind === "reminder" && (a.reminderSent || a.reminderAt)) t.done = true;
      }
      upsert("confirm", "Confirm visit · " + label, confirmDueDate(a.date));
      upsert("reminder", "Send 24-hour reminder · " + label, reminderDueDate(a.date));
    });
  }
  function linkedVisitMate(a) {
    if (!a) return null;
    if (a.relatedAppointmentId) return appt(a.relatedAppointmentId) || null;
    if (!a.visitId) return null;
    return store.appointments.find(function (x) { return x.visitId === a.visitId && x.id !== a.id && x.status !== "Rescheduled"; }) || null;
  }
  function linkSameDayConsultVisit(rec) {
    if (!rec || isConsultType(rec.type)) return;
    const consult = store.appointments.find(function (a) {
      return a.id !== rec.id && a.patientId === rec.patientId && a.date === rec.date && isConsultType(a.type) &&
        a.status !== "Canceled" && a.status !== "Rescheduled" && a.status !== "No-show";
    });
    if (!consult) return;
    rec.relatedAppointmentId = consult.id;
    let v = consult.visitId ? visit(consult.visitId) : null;
    if (!v) {
      const vid = nextId("V-", store.visits);
      v = { id: vid, patientId: rec.patientId, date: rec.date, appointmentIds: [consult.id, rec.id], invoiceId: consult.invoiceId || null, noteId: null, label: "Same-day consult and " + rec.type };
      store.visits = store.visits || [];
      store.visits.push(v);
      consult.visitId = vid;
    } else if ((v.appointmentIds || []).indexOf(rec.id) < 0) {
      v.appointmentIds = (v.appointmentIds || []).concat([rec.id]);
    }
    rec.visitId = v.id;
    const invId = consult.invoiceId || v.invoiceId;
    if (invId) {
      rec.invoiceId = invId;
      if (!v.invoiceId) v.invoiceId = invId;
      const inv = invoice(invId);
      if (inv && (inv.appointmentIds || []).indexOf(rec.id) < 0) inv.appointmentIds.push(rec.id);
    }
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
    if (isClinicClosedDay(date)) return "closed";
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
    if (isLunchSlot(date, time, provider)) cls += " cal-lunch";
    return cls.trim();
  }
  function canManageAvailability() {
    return (BRIZZA.AVAILABILITY_ROLES || []).indexOf(state.actingRole) >= 0;
  }
  function typeFamilyFor(type) {
    const fams = BRIZZA.TYPE_FAMILIES || [];
    return fams.find(function (f) { return (f.types || []).indexOf(type) >= 0; }) || null;
  }
  function typeFill(type) {
    return BRIZZA.CARD_CREAM || "#FFFCF6";
  }
  function cardTypeStyle(a) {
    const fam = typeFamilyFor(a && a.type) || {};
    const m = statusMeta((a && a.status) || "");
    return "--type-band:" + (fam.band || "#C3C7CB") + ";--type-band-fg:" + (fam.bandFg || "#352820") + ";" + statusStyleVars((a && a.status) || "") + ";--status-bar:" + m.color + ";--type-fill:" + (BRIZZA.CARD_CREAM || "#FFFCF6");
  }
  function typeLegend() {
    const cur = state.scheduleTypeFilter || "";
    return '<div class="legend" aria-label="Appointment type colors">' +
      (BRIZZA.TYPE_FAMILIES || []).map(function (f) {
        return '<button type="button" class="type-chip type-family-chip' + (cur === f.id ? " is-active" : "") + '" data-type-filter="' + esc(f.id) + '" style="--type-band:' + esc(f.band || "#C3C7CB") + '">' + esc(f.name) + "</button>";
      }).join("") +
      (cur ? '<button type="button" class="btn tiny type-filter-clear" data-type-filter="">Clear</button>' : "") +
      '<span class="legend-item"><span class="swatch clinic"></span>Office hours (Mon–Fri 10:00 a.m.–6:00 p.m. ET)</span>' +
      '<span class="legend-item"><span class="swatch avail"></span>Available</span>' +
      '<span class="legend-item"><span class="swatch unavail"></span>Outside office hours</span></div>';
  }
  function appointmentMatchesTypeFilter(a) {
    const cur = state.scheduleTypeFilter;
    if (!cur) return true;
    const fam = typeFamilyFor(a && a.type);
    return !!(fam && fam.id === cur);
  }
  function dayPlusButton(date, expanded) {
    return '<button type="button" class="day-plus" data-day-plus="' + esc(date) + '" aria-label="' + (expanded ? "Add appointment on " : "Expand slots for ") + esc(fmtDate(date)) + '">＋</button>';
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
    if (typeof isWeekCalendar === "function" && isWeekCalendar()) return name === weekProviderName();
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
  function isWeekCalendar() {
    return state.page === "schedule" && state.scheduleView === "calendar" && state.calMode === "week";
  }
  function weekProviderId() {
    const list = providerChipList();
    const id = state.weekProviderId;
    if (id && list.some(function (p) { return p.id === id; })) return id;
    const chips = (state.providerChips || []).filter(function (c) { return c !== "all"; });
    if (chips.length && list.some(function (p) { return p.id === chips[0]; })) return chips[0];
    return (list[0] && list[0].id) || "rossi";
  }
  function weekProviderName() {
    const rec = providerChipList().find(function (p) { return p.id === weekProviderId(); });
    return rec ? rec.name : ((BRIZZA.PROVIDERS || [])[0] || "");
  }
  function providerChipsHtml() {
    if (!state.providerChips) state.providerChips = loadProviderChips();
    if (isWeekCalendar()) {
      const cur = weekProviderId();
      const rest = providerChipList().map(function (p) {
        const on = p.id === cur;
        return '<button type="button" class="prov-chip' + (on ? " active" : "") + '" data-week-prov="' + esc(p.id) + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(p.short) + "</button>";
      }).join("");
      return '<div class="prov-chips" role="radiogroup" aria-label="Week provider (one at a time)">' + rest + "</div>";
    }
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
    const cmp = '<button type="button" class="loc-chip' + (compare ? " active" : "") + '" data-loc-compare="1" aria-pressed="' + (compare ? "true" : "false") + '">Compare locations</button>';
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
      const blocks = blocksOnDate(pv, date).filter(function (b) { return !locationId || b.locationId === locationId; })
        .slice().sort(function (x, y) { return String(x.start).localeCompare(String(y.start)); });
      if (!blocks.length) {
        lines.push('<div class="avail-line">' + esc(providerAvailLabel(pv)) + " · " + esc(locationShort(locationId) || locationName(locationId) || "—") + " · Off</div>");
        return;
      }
      const byLoc = {};
      blocks.forEach(function (b) {
        const key = b.locationId || "_";
        (byLoc[key] = byLoc[key] || []).push(b);
      });
      Object.keys(byLoc).forEach(function (key) {
        const list = byLoc[key];
        const loc = locationShort(list[0].locationId) || locationName(list[0].locationId);
        const label = esc(providerAvailLabel(pv)) + " · " + esc(loc) + " · ";
        let gap = null, contiguous = list.length > 1;
        for (let i = 0; i < list.length - 1; i += 1) {
          if (list[i].end && list[i + 1].start && list[i].end < list[i + 1].start) {
            if (gap) { contiguous = false; break; }
            gap = { start: list[i].end, end: list[i + 1].start };
          } else if (list[i].end && list[i + 1].start && list[i].end > list[i + 1].start) {
            contiguous = false;
            break;
          }
        }
        if (contiguous && gap) {
          lines.push('<div class="avail-line">' + label + esc(compactRange(list[0].start, list[list.length - 1].end)) +
            " (lunch " + esc(compactRange(gap.start, gap.end)) + ")</div>");
        } else {
          list.forEach(function (b) {
            lines.push('<div class="avail-line">' + label + esc(compactRange(b.start, b.end)) + "</div>");
          });
        }
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
    let mid = a.type || "";
    if (isConsultType(a.type)) mid = service ? ("Consult · " + service) : "Consult";
    else {
      const reason = visitReasonLabel(a);
      if (reason && reason !== a.type) mid = (a.type || "") + " · " + reason;
    }
    const tag = isNew ? "New" : (isEst ? "Existing" : "");
    return tag ? ((mid ? mid + " · " : "") + tag) : mid;
  }

  function slotKey(date, time, provider) {
    return provider ? (date + "|" + time + "|" + provider) : (date + "|" + time);
  }
  function slotCellHtml(date, time, provider, inner) {
    const key = slotKey(date, time, provider);
    const closed = isClinicClosedDay(date);
    const cls = "cal-slot cal-cell " + slotClass(date, time, provider || "All providers") + (closed ? " is-holiday-closed" : "");
    return '<div class="' + cls + '" data-drop-slot="' + esc(key) + '">' + (inner || "") + (closed ? "" : addSlotButton(date, time, provider)) + "</div>";
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
    zone("[data-drop-status]", function (id, el) {
      const raw = el.getAttribute("data-drop-status") || "";
      const parts = raw.split("|").filter(Boolean);
      const a = appt(id);
      const next = (a && parts.indexOf(a.status) >= 0) ? a.status : (parts[0] || raw);
      if (a && next === a.status) return;
      if (next && !canSetVisitStatus(next)) {
        toast("That status is not available for this role");
        return;
      }
      setVisitStatus(id, next);
    });
    zone("[data-drop-role]", function (id, el) {
      const suiteId = el.getAttribute("data-drop-suite");
      const role = el.getAttribute("data-drop-role");
      setAppointmentSuite(id, suiteId, role);
    });
    zone(".suite-card[data-drop-suite]", function (id, el) {
      const suiteId = el.getAttribute("data-drop-suite");
      setAppointmentSuite(id, suiteId);
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
        if (f.type === "section" || f.type === "static" || f.type === "prose" || f.type === "units-sum") return;
        if (!fieldVisible(f, values)) return;
        const raw = values[f.id];
        const empty = raw == null || (Array.isArray(raw) ? !raw.length : String(raw).trim() === "");
        if (empty) missing.push(f.label);
      });
    });
    return missing;
  }
  /* noteFieldControl is defined with the template builder helpers */
  function listToLines(arr) { return (arr || []).join("\n"); }
  function linesToList(s) {
    return String(s || "").split(/\n|;/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function hxLockLabel(lock) {
    if (!lock) return "";
    return esc((lock.who || "") + (lock.role ? ", " + lock.role : "") + (lock.when ? " · " + lock.when : ""));
  }
  function persistHxReviewState() {
    const draft = state.noteDraft;
    if (!draft) return;
    const box = $("#hxReviewed");
    if (box) draft.hxReviewed = !!(box.checked || draft.hxConfirmLock);
    else draft.hxReviewed = !!draft.hxConfirmLock;
    if (!draft.noteId) return;
    const p = patient(draft.pid);
    const rec = p && (p.notes || []).find(function (n) { return n.id === draft.noteId; });
    if (!rec) return;
    rec.hxReviewed = !!draft.hxReviewed;
    rec.hxConfirmLock = draft.hxConfirmLock || null;
  }
  function paintHxLockUi() {
    const draft = state.noteDraft || {};
    const box = $("#hxReviewed");
    const lock = draft.hxConfirmLock;
    if (box) {
      box.checked = !!(draft.hxReviewed || lock);
      box.disabled = !!lock;
    }
    const meta = $("#hxLockMeta");
    const btn = $("#hxLockBtn");
    if (meta) {
      meta.hidden = !lock;
      meta.textContent = lock ? ("Confirmation locked by " + (lock.who || "") + (lock.role ? ", " + lock.role : "") + (lock.when ? " · " + lock.when : "")) : "";
    }
    if (btn) btn.hidden = !!lock;
  }
  function noteHistoryConfirmHtml(p, draft) {
    p = p || {};
    draft = draft || state.noteDraft || {};
    const locked = !!draft.hxConfirmLock;
    const checked = !!(draft.hxReviewed || locked);
    return '<section class="note-hx" id="noteHx">' +
      '<h3 class="section-title">Medical history</h3>' +
      '<p class="row-sub">Required on every note and cannot be removed. Edits update the chart right away. Check Reviewed, no changes when nothing is new. That confirmation auto-locks when you sign.</p>' +
      '<div class="field full"><label for="hxAllergies">Allergies</label><textarea id="hxAllergies" data-hx="allergies">' + esc(listToLines(p.allergies)) + "</textarea></div>" +
      '<div class="field full"><label for="hxMeds">Current medications</label><textarea id="hxMeds" data-hx="meds">' + esc(listToLines(p.meds)) + "</textarea></div>" +
      '<div class="field full"><label for="hxHistory">Medical history</label><textarea id="hxHistory" data-hx="conditions">' + esc(listToLines(p.conditions)) + "</textarea></div>" +
      '<div class="field full"><label for="hxPharmacy">Pharmacy <span class="row-sub">(if applicable)</span></label>' +
      '<input id="hxPharmacy" data-hx="pharmacy" value="' + esc(p.pharmacy || "") + '"></div>' +
      '<div class="hx-review">' +
      '<input type="checkbox" id="hxReviewed"' + (checked ? " checked" : "") + (locked ? " disabled" : "") + '>' +
      '<label for="hxReviewed">Reviewed, no changes</label></div>' +
      '<div class="hx-lock">' +
      '<button type="button" class="btn small" id="hxLockBtn" hidden>Lock confirmation</button>' +
      '<p class="row-sub" id="hxLockMeta"' + (locked ? "" : " hidden") + ">" + (locked ? ("Confirmation locked by " + hxLockLabel(draft.hxConfirmLock)) : "") + "</p>" +
      "</div>" +
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
    const r = $("#noteReadyBtn");
    if (r) r.remove();
    const save = $("#modalSave");
    if (save) {
      save.hidden = false;
      if (!noteComposerIsOpen()) {
        save.title = "";
        save.removeAttribute("title");
      }
    }
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
    let r = $("#noteReadyBtn");
    if (!r) {
      r = document.createElement("button");
      r.id = "noteReadyBtn";
      r.className = "btn";
      r.type = "button";
      r.textContent = "Ready for review";
      foot.insertBefore(r, $("#modalSave"));
    }
    r.onclick = function (e) { e.preventDefault(); saveNoteReady(); };
  }
  function collectNoteValues() {
    const values = {};
    $$("[data-nf]").forEach(function (el) {
      const id = el.getAttribute("data-nf");
      if (!id) return;
      const typ = el.getAttribute("data-nf-type") || el.type;
      if (typ === "checkbox-group" || el.getAttribute("data-nf-group")) {
        if (!Array.isArray(values[id])) values[id] = [];
        if (el.checked) values[id].push(el.value);
      } else if (typ === "checkbox" || el.type === "checkbox") {
        values[id] = el.checked ? (el.value || "Yes") : "";
      } else if (typ === "radio") {
        if (el.checked) values[id] = el.value;
        else if (values[id] == null) values[id] = "";
      } else if (el.multiple || typ === "multiselect") {
        values[id] = Array.prototype.filter.call(el.options, function (o) { return o.selected && o.value; }).map(function (o) { return o.value; });
      } else {
        values[id] = el.value;
      }
    });
    $$("[data-nf-table]").forEach(function (tbl) {
      const id = tbl.getAttribute("data-nf-table");
      const cols = (tbl.getAttribute("data-cols") || "").split("|").filter(Boolean);
      const rows = [];
      tbl.querySelectorAll("tbody tr").forEach(function (tr) {
        const row = {};
        let empty = true;
        cols.forEach(function (c) {
          const inp = tr.querySelector('[data-col="' + c + '"]');
          row[c] = inp ? inp.value : "";
          if (row[c]) empty = false;
        });
        if (!empty) rows.push(row);
      });
      values[id] = rows;
    });
    return values;
  }
  function noteComposerIsOpen() {
    const modal = $("#modal");
    return !!(state.noteDraft && modal && modal.classList.contains("open") && $("#noteTpl"));
  }
  function updateNoteSignState() {
    if (!noteComposerIsOpen()) return;
    const draft = state.noteDraft;
    const save = $("#modalSave");
    const draftBtn = $("#noteSaveDraft");
    const readyBtn0 = $("#noteReadyBtn");
    if (!draft || !draft.templateId) {
      if (save) { save.disabled = true; save.title = "Pick a template to start"; }
      if (draftBtn) { draftBtn.disabled = true; draftBtn.title = "Pick a template to start"; }
      if (readyBtn0) { readyBtn0.disabled = true; readyBtn0.title = "Pick a template to start"; }
      const miss = $("#noteMissing");
      if (miss) miss.innerHTML = '<div class="notice note-missing">Pick a template to start.</div>';
      return;
    }
    if (draftBtn) { draftBtn.disabled = false; draftBtn.title = ""; }
    const tpl = getNoteTemplate(draft.templateId) || (BRIZZA.NOTE_TEMPLATES || []).find((t) => t.id === draft.templateId);
    if (!tpl) return;
    draft.values = collectNoteValues();
    (tpl.sections || []).forEach(function (sec) {
      (sec.fields || []).forEach(function (f) {
        const wrap = document.querySelector('#modal [data-field-id="' + f.id + '"]');
        if (wrap) wrap.hidden = !fieldVisible(f, draft.values);
      });
    });
    const missing = missingAnyNoteFields(tpl, draft.values);
    const rec = draft.noteId && patient(draft.pid) && (patient(draft.pid).notes || []).find(function (n) { return n.id === draft.noteId; });
    const maySign = canFinalizeNote(rec || { provider: actingName() });
    if (save) {
      save.disabled = missing.length > 0 || !maySign;
      save.hidden = !maySign;
    }
    const readyBtn = $("#noteReadyBtn");
    if (readyBtn) {
      readyBtn.hidden = !canMarkReady(rec);
      readyBtn.disabled = missing.length > 0;
      readyBtn.title = readyBtn.disabled ? "Fill required fields before marking ready for review." : "";
    }
    if (save) save.title = save.disabled ? (maySign ? "Sign stays disabled until required fields are filled." : "You can start this note but you cannot sign it.") : "";
    const miss = $("#noteMissing");
    if (miss) {
      miss.innerHTML = missing.length
        ? '<div class="notice note-missing">Sign stays disabled until required fields are filled: ' + missing.map(esc).join(", ") + ".</div>"
        : (!maySign ? '<div class="notice note-missing">You can edit and save this note. Signing is limited to the authoring clinical role.</div>' : "");
    }
    const prev = $("#notePreview");
    if (prev && !draft.previewEdited) prev.value = compileNoteSentences(tpl, draft.values, draft) || compileFieldText(tpl, draft.values);
  }
  function openNoteComposer(pid, apptId, visitId, noteId) {
    if (!canStartNote()) { toast("Starting a note is limited to clinical roles and the medical assistant"); return; }
    captureNoteReturn();
    const p = patient(pid);
    const ap = apptId ? appt(apptId) : null;
    const existing = (noteId && p) ? (p.notes || []).find(function (n) { return n.id === noteId; }) : null;
    if (noteId && existing && (isNoteSigned(existing) || !canEditNote(existing))) {
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
          otherAreaLabel: existing.otherAreaLabel || "",
          otherUnits: existing.otherUnits || "",
          fromConsultId: existing.fromConsultId || null,
          hxReviewed: !!(existing.hxReviewed || existing.hxConfirmLock),
          hxConfirmLock: existing.hxConfirmLock || null,
          date: existing.date || (ap && ap.date) || todayET(),
          time: existing.time || (ap && ap.time) || (BRIZZA.DEMO_CLOCK && BRIZZA.DEMO_CLOCK.time) || ""
        }
      : { pid: pid, apptId: apptId || null, visitId: visitId || null, templateId: "", values: {}, preview: "", previewEdited: false, facePoints: [], otherAreaLabel: "", otherUnits: "", hxReviewed: false, hxConfirmLock: null, date: (ap && ap.date) || todayET(), time: (ap && ap.time) || (BRIZZA.DEMO_CLOCK && BRIZZA.DEMO_CLOCK.time) || "" };
    paintNoteComposer();
  }
  function paintNoteComposer() {
    const draft = state.noteDraft;
    const p = patient(draft.pid);
    const tpls = notesTemplatesForRole();
    const tpl = tpls.find((t) => t.id === draft.templateId || t.familyId === draft.templateId) || getNoteTemplate(draft.templateId);
    if (tpl) applyPullIns(draft, tpl);
    const picker = '<div class="note-meta"><div class="field"><label for="noteTpl">Type</label><select id="noteTpl"><option value="">Select a template</option>' +
      tpls.map((t) => "<option value=\"" + esc(t.id) + "\"" + (draft.templateId === t.id ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="noteTime">Time</label><input id="noteTime" type="time" value="' + esc(draft.time || "") + '">' +
      (draft.time ? '<p class="row-sub note-time-label" id="noteTimeLabel">' + esc(fmtTime(draft.time)) + "</p>" : '<p class="row-sub note-time-label" id="noteTimeLabel"></p>') +
      "</div></div>" +
      lastNoteLineHtml(draft.pid, draft.noteId);
    let sections = "";
    if (tpl) {
      const flag = tpl.draft ? openQ("Draft templates – Open question. This " + tpl.name + " template is not taken from the SOPs or V1 documents.") : '<div class="notice">' + esc(tpl.source) + "</div>";
      const face = templateHasType(tpl, "facemap") ? "" : ((typeof faceMapHtml === "function") ? faceMapHtml(tpl, draft) : "");
      const builder = "";
      const fields = (typeof templateFieldsHtml === "function") ? templateFieldsHtml(tpl, draft) : (builder || (tpl.sections || []).map(function (sec) { return "<h3 class=\"section-title\">" + esc(sec.title) + "</h3><div class=\"formgrid\">" + (sec.fields || []).map(function (f) { return noteFieldControl(f, (draft.values || {})[f.id], draft); }).join("") + "</div>"; }).join(""));
      const previewVal = draft.previewEdited ? (draft.preview || "") : (compileNoteSentences(tpl, draft.values || {}, draft) || compileFieldText(tpl, draft.values || {}));
      const preview = '<div class="note-preview" id="notePreviewWrap"><h3 class="section-title">Generated note</h3>' +
        '<p class="row-sub">This text is built only from what you selected or typed. You may edit it before saving.</p>' +
        '<label class="sr-only" for="notePreview">Generated note text</label>' +
        '<textarea id="notePreview">' + esc(previewVal) + "</textarea></div>";
      const proc = (isConsultNote({ templateId: tpl.id, type: tpl.name }) && isClinicalRole())
        ? '<div style="margin-top:14px"><button class="btn small" type="button" data-proc-from-draft="1">Create procedure note</button></div>'
        : "";
      const faceBlock = face ? '<div class="field facemap-row" id="noteFaceRow">' + face + "</div>" : "";
      sections = noteOutlineHtml(tpl) + noteHistoryConfirmHtml(p, draft) + flag + fields + faceBlock + preview + proc;
    }
    const title = (draft.noteId ? "Edit note · " : "Create note · ") + (p ? p.name : draft.pid);
    const alerts = p ? (alertsBanner(p, { readonly: true }) + '<p class="row-sub">Alerts are shown here for reference. Edit them on the patient chart.</p>') : "";
    showModal(title, alerts + picker + sections + '<div id="noteMissing"></div>', function () { signNote(); }, "Sign");
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
    const timeEl = $("#noteTime");
    if (timeEl) timeEl.addEventListener("change", function () {
      if (state.noteDraft) state.noteDraft.time = timeEl.value;
      const lab = $("#noteTimeLabel");
      if (lab) lab.textContent = fmtTime(timeEl.value) || "";
    });
    $$("[data-hx]").forEach(function (el) {
      el.addEventListener("input", function () {
        const box = $("#hxReviewed");
        if (state.noteDraft) state.noteDraft.hxConfirmLock = null;
        if (box) { box.checked = false; box.disabled = false; }
        applyHxToPatient(patient(draft.pid), readHxFromForm());
        paintHxLockUi();
        persistHxReviewState();
      });
    });
    const hxBox = $("#hxReviewed");
    if (hxBox) hxBox.addEventListener("change", function () {
      if (state.noteDraft) state.noteDraft.hxReviewed = !!hxBox.checked;
      persistHxReviewState();
    });
    const lockBtn = $("#hxLockBtn");
    if (lockBtn) lockBtn.addEventListener("click", function () {
      if (!state.noteDraft) return;
      state.noteDraft.hxReviewed = true;
      state.noteDraft.hxConfirmLock = { who: actingName(), role: state.actingRole, when: nowET() };
      paintHxLockUi();
      persistHxReviewState();
    });
    paintHxLockUi();
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
    if (!draft || !canStartNote()) return null;
    const tpl = getNoteTemplate(draft.templateId) || (BRIZZA.NOTE_TEMPLATES || []).find((t) => t.id === draft.templateId);
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
    rec.date = rec.date || draft.date || todayET();
    rec.time = ($("#noteTime") && $("#noteTime").value) || draft.time || rec.time || "";
    rec.type = tpl.name;
    rec.templateId = tpl.id;
    rec.procedurePerformed = draft.values.procedurePerformed || rec.procedurePerformed || "";
    rec.provider = rec.provider || actingName();
    rec.role = rec.role || state.actingRole;
    rec.fields = Object.assign({}, draft.values);
    rec.values = rec.fields;
    rec.text = preview;
    rec.facePoints = facePoints;
    rec.otherAreaLabel = draft.otherAreaLabel || "";
    rec.otherUnits = draft.otherUnits || "";
    rec.visitId = rec.visitId || draft.visitId || undefined;
    rec.appointmentId = rec.appointmentId || draft.apptId || undefined;
    rec.fromConsultId = rec.fromConsultId || draft.fromConsultId || undefined;
    (function fillNoteInfo() {
      const ap = rec.appointmentId ? appt(rec.appointmentId) : null;
      rec.dos = rec.dos || (ap && ap.date) || rec.date || todayET();
      rec.primaryProvider = rec.primaryProvider || (ap && ap.provider) || rec.provider || actingName();
      rec.secondaryProvider = rec.secondaryProvider || "";
      const ma = (BRIZZA.STAFF || []).find(function (s) { return s.role === "Medical Assistant"; });
      if (!rec.assistant) rec.assistant = (ma && ma.name) || "";
      if (!rec.title) {
        const reason = ap ? reasonText(ap) : "";
        rec.title = (rec.type || "Note") + (reason ? " - " + reason : (ap && ap.type ? " - " + ap.type : ""));
      }
      rec.charges = rec.charges || [];
    })();
    if (!rec.visitId && rec.appointmentId) {
      const a = appt(rec.appointmentId);
      if (a && a.visitId) rec.visitId = a.visitId;
    }
    if (opts.sign) {
      rec.status = "Finalized";
      rec.locked = true;
      rec.signedAt = nowET();
      rec.historySnapshot = historySnapshotOf(p);
      rec.hxReviewed = true;
      rec.hxConfirmLock = draft.hxConfirmLock || { who: actingName(), role: state.actingRole, when: nowET() };
      draft.hxConfirmLock = rec.hxConfirmLock;
    } else if (opts.ready) {
      rec.status = "Ready for review";
      rec.locked = false;
      rec.hxReviewed = !!(draft.hxReviewed || ($("#hxReviewed") && $("#hxReviewed").checked));
      rec.hxConfirmLock = draft.hxConfirmLock || rec.hxConfirmLock || null;
    } else {
      rec.status = "Draft";
      rec.locked = false;
      rec.hxReviewed = !!(draft.hxReviewed || ($("#hxReviewed") && $("#hxReviewed").checked));
      rec.hxConfirmLock = draft.hxConfirmLock || rec.hxConfirmLock || null;
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
    const existing = state.noteDraft && state.noteDraft.noteId && patient(state.noteDraft.pid) && (patient(state.noteDraft.pid).notes || []).find(function (n) { return n.id === state.noteDraft.noteId; });
    if (!canFinalizeNote(existing || { provider: actingName() })) {
      toast("Only the author or MD / Clinic Owner can finalize this note");
      return;
    }
    const rec = upsertNoteFromDraft({ sign: true, requireComplete: true });
    if (!rec) return;
    state.noteDraft = null;
    closeModal();
    toast("Note signed");
    returnAfterNote();
  }
  function saveNoteReady() {
    if (!canMarkReady()) { toast("Ready for review is limited to clinical roles"); return; }
    const rec = upsertNoteFromDraft({ ready: true, requireComplete: true });
    if (!rec) return;
    state.noteDraft = null;
    closeModal();
    toast("Marked ready for review");
    returnAfterNote();
  }
  function openProcedureFromConsult(pid, nid) {
    if (!isClinicalRole()) { toast("Create Note is limited to clinical roles"); return; }
    const p = patient(pid);
    const n = p && (p.notes || []).find(function (x) { return x.id === nid; });
    if (!n) return;
    const fields = noteFieldsOf(n);
    const procId = procedureTemplateId(n);
    const values = {};
    if (procId === "inj-procedure") {
      values.areasTreated = fields.areasDiscussed || fields.areasTreated || "";
    }
    if (fields.consentConfirmed) values.consentConfirmed = fields.consentConfirmed;
    closeModal();
    state.noteDraft = {
      pid: pid,
      apptId: n.appointmentId || null,
      visitId: n.visitId || null,
      templateId: procId,
      values: values,
      preview: "",
      previewEdited: false,
      facePoints: procId === "inj-procedure" ? (n.facePoints || []).map(function (pt) { return Object.assign({}, pt, { units: "" }); }) : [],
      fromConsultId: n.id,
      hxReviewed: false,
      hxConfirmLock: null
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
    n.status = "Amended";
    n.locked = true;
    addAudit({ action: "Added note addendum", recordType: "Note", recordId: n.id,
      recordPath: { page: "patients", selected: p.id, tab: "demographics" },
      changes: [{ field: "addendum", before: "—", after: text }] });
    toast("Addendum added");
    openNoteView(pid, nid);
    render();
  }

  function renderRooming() {
    const date = state.roomingDate || defaultClinicDate();
    state.roomingDate = date;
    (store.appointments || []).filter((a) => a.date === date && isBoardStatus(a.status)).forEach(ensureRooming);
    const records = (store.appointments || []).filter((a) => a.date === date && isBoardStatus(a.status) && a.status !== "Rescheduled")
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const head = pageHead("Patient flow", "Patient flow", esc(locationName(state.locationId)) + " · " + esc(fmtLong(date)), "");
    const toolbar = `<div class="room-toolbar datebar">
      <a class="btn small" href="${hashFor({ page: "rooming", date: addDays(date, -1) })}" aria-label="Previous day">‹</a>
      <strong>${esc(fmtLong(date))}</strong>
      <a class="btn small" href="${hashFor({ page: "rooming", date: addDays(date, 1) })}" aria-label="Next day">›</a>
      <a class="btn small" id="room-today" href="${hashFor({ page: "rooming", date: defaultClinicDate() })}">Clinic day</a>
    </div>` + clinicClosedBanner(date);
    const cardHtml = (a, place) => {
      const p = patient(a.patientId);
      const nxt = nextRoomingStatus(a.status);
      const last = "";
      const apptLink = '<a href="' + hashFor({ page: "schedule", date: a.date, appointmentId: a.id, view: "list" }) + '">' + esc(a.id) + "</a>";
      const uid = esc(a.id) + (place ? "-" + place : "");
      const sel = place === "suite" ? "" : ('<label class="sr-only" for="visit-status-' + esc(a.id) + '-flow">Set visit status</label>' + statusSelect(a, "flow"));
      const suiteOpts = ['<option value="">No suite</option>'].concat((BRIZZA.SUITES || []).map(function (s) {
        return "<option value=\"" + esc(s.id) + "\"" + (a.suiteId === s.id ? " selected" : "") + ">" + esc(s.name) + "</option>";
      }));
      const suiteSel = place === "suite" ? "" : ('<label class="sr-only" for="suite-set-' + uid + '">Move to suite</label><select id="suite-set-' + uid + '" class="suite-dd" data-suite-role="' + esc(a.id) + '">' + suiteOpts.join("") + "</select>");
      const adv = nxt && place !== "suite" ? '<button class="btn tiny" type="button" data-room-advance="' + esc(a.id) + '">Advance</button>' : "";
      const chartBtn = p ? '<a class="btn tiny" href="' + hashFor({ page: "patients", selected: p.id, tab: "demographics" }) + '">Open chart</a>' : "";
      const noteBtn = (canStartNote() && p) ? '<button class="btn tiny" type="button" data-open="note-composer" data-pid="' + esc(p.id) + '" data-appt="' + esc(a.id) + '"' + (a.visitId ? ' data-visit="' + esc(a.visitId) + '"' : "") + ">＋ New note</button>" : "";
      const visitNotes = p ? visitNotesOf(a) : [];
      const viewNotes = (p && visitNotes.length)
        ? visitNotes.map(function (n) {
            return '<button class="btn tiny" type="button" data-open="note-view" data-pid="' + esc(p.id) + '" data-nid="' + esc(n.id) + '">View ' + esc(n.type || "note") + "</button>";
          }).join("")
        : "";
      const editNotes = (p && visitNotes.length)
        ? visitNotes.map(function (n) {
            return canEditNote(n) ? '<button class="btn tiny" type="button" data-edit-note="' + esc(n.id) + '" data-pid="' + esc(p.id) + '">Edit notes</button>' : "";
          }).join("")
        : "";
      const inSuite = a.suiteId ? ((BRIZZA.SUITES.find(function (s) { return s.id === a.suiteId; }) || {}).name || a.suiteId) : "";
      const nameHtml = p
        ? '<a class="room-name" href="' + hashFor({ page: "patients", selected: p.id, tab: "demographics" }) + '">' + esc(p.name) + "</a>"
        : esc(a.patientId);
      const wait = place === 'suite' ? '' : ('<span class="' + timerClass(a.statusSince) + '" data-room-mins="' + esc(String(a.statusSince || nowMs())) + '">' + minutesLabel(a.statusSince) + "</span>");
      const menuItems = (chartBtn + noteBtn + viewNotes + editNotes);
      const more = (place === "suite" || !menuItems)
        ? ""
        : ('<div class="flow-more"><button class="btn tiny flow-more-btn" type="button" data-flow-more="' + esc(a.id) + '" aria-expanded="false" aria-haspopup="true" aria-label="Card actions">⋯</button><div class="flow-more-menu">' + menuItems + "</div></div>");
      const typeLine = esc(fmtTime(a.time)) + " · " + esc(a.type || "") + (reasonText(a) ? " · " + esc(reasonText(a)) : "") +
        ' <span class="type-tag">' + esc((typeFamilyFor(a.type) && (typeFamilyFor(a.type).short || typeFamilyFor(a.type).name)) || a.type || "Visit") + "</span> · " + apptLink;
      const notesBlock = (p && visitNotes.length)
        ? ('<div class="flow-notes">' + visitNotes.map(function (n) {
            return '<div class="emn-row"><div>' + esc(n.type || "Note") + " · " + esc(n.provider || "") + "</div>" + emnActionsHtml(p, n) + "</div>";
          }).join("") + "</div>")
        : "";
      const inner =
        '<div class="flow-head">' + nameHtml + last + wait + "</div>" +
        '<div class="row-sub">' + typeLine + "</div>" +
        '<div class="row-sub">' + esc(providerShortName(a.provider)) + (inSuite && place !== "suite" ? " · " + esc(inSuite) : "") + "</div>" +
        notesBlock +
        (place === "suite" ? ((menuItems || adv) ? '<div class="flow-actions">' + adv + menuItems + "</div>" : "") : ('<div class="flow-toolbar">' + sel + adv + more + suiteSel + "</div>"));
      return jewelWrap(a, inner, "room-card flow-card", 'data-rooming="' + esc(a.id) + '" tabindex="0"');
    };
    const buckets = BRIZZA.ROOMING_FLOW_BUCKETS || (BRIZZA.ROOMING_BOARD_STATUSES || []).map(function (s) { return { label: s, statuses: [s] }; });
    const cols = buckets.map(function (bk) {
      const here = records.filter((a) => (bk.statuses || []).indexOf(a.status) >= 0);
      const empty = !here.length;
      const cards = here.map((a) => cardHtml(a, "flow")).join("") || '<div class="empty">No patients in this step</div>';
      return '<div class="room-col' + (empty ? " is-empty" : "") + '" data-drop-status="' + esc((bk.statuses || []).join("|")) + '"><h2>' + esc(bk.label) + " · " + here.length + '</h2><div class="room-col-body">' + cards + "</div></div>";
    }).join("");
    const suites = (BRIZZA.SUITES || []).map((s) => {
      const occ = occupantInSuite(s.id, date, null);
      const occupied = !!occ;
      const occLabel = occupied
        ? ('Occupied' + (occ.suiteSince ? ' · <span class="' + timerClass(occ.suiteSince) + '" data-room-mins="' + esc(String(occ.suiteSince)) + '">' + minutesLabel(occ.suiteSince) + "</span>" : ""))
        : "Available";
      const inner = occupied ? cardHtml(occ, "suite") : '<div class="empty">Drop a patient here</div>';
      return '<div class="suite-card' + (occupied ? " occupied" : "") + '" data-drop-suite="' + esc(s.id) + '">' +
        '<div class="suite-card-head"><h2 class="suite-name">' + esc(s.name) + '</h2><span class="suite-occ' + (occupied ? " is-busy" : "") + '">' + occLabel + "</span></div>" +
        '<p class="suite-svc">' + esc(s.service) + "</p>" + inner + "</div>";
    }).join("");
    const body = '<div class="rooming-fit">' + head + toolbar +
      '<div class="room-flow-wrap"><h2 class="section-title">Patient flow</h2><div class="room-board">' + cols + "</div></div>" +
      '<div class="room-suites-wrap"><h2 class="section-title">Suites</h2>' +
      '<div class="room-suites">' + suites + "</div>" +
      '<div class="suite-unassign" data-drop-suite="" data-unassign="1">Drop here to remove from a suite</div></div></div>';
    renderChrome('<a href="' + hashFor({ page: "rooming", date: date }) + '">Patient flow</a>', "", body);
    startRoomingTick();
    bindRoomingDrag();
    bindStatusStops();
  }

  function openAddBlock(existingId) {
    const existing = existingId ? (store.blocks || []).find(function (b) { return b.id === existingId; }) : null;
    const staff = BRIZZA.PROVIDERS.concat(BRIZZA.ROLES);
    const times = BRIZZA.CLINIC_TIMES || [];
    const starts = times.filter((t) => t !== "18:00");
    const ends = times.filter((t) => t !== "10:00");
    const staffNow = existing ? existing.staff : "";
    const reasonNow = existing ? existing.reason : "";
    const staffOpts = staff.map(function (s) { return "<option" + (s === staffNow ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("");
    const reasonOpts = BRIZZA.BLOCK_REASONS.map(function (s) { return "<option" + (s === reasonNow ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("");
    showModal(existing ? "Edit Admin block" : "Add Admin block",
      '<input type="hidden" id="blkId" value="' + esc(existing ? existing.id : "") + '">' +
      '<div class="formgrid">' +
        '<div class="field"><label for="blkStaff">Provider / staff</label><select id="blkStaff">' + staffOpts + "</select></div>" +
        '<div class="field"><label for="blkReason">Reason</label><select id="blkReason">' + reasonOpts + "</select></div>" +
        '<div class="field"><label for="blkDate">Date</label><input id="blkDate" type="date" value="' + esc((existing && existing.date) || state.date) + '" required></div>' +
        '<div class="field"><label for="blkStart">Start</label><select id="blkStart">' + timeOptions((existing && existing.start) || "12:00", starts) + "</select></div>" +
        '<div class="field"><label for="blkEnd">End</label><select id="blkEnd">' + timeOptions((existing && existing.end) || "13:00", ends) + "</select></div>" +
        '<div class="field full"><label for="blkNotes">Note</label><textarea id="blkNotes" rows="3" placeholder="Optional note">' + esc((existing && (existing.notes || existing.note)) || "") + "</textarea></div>" +
      '</div><div id="blkWarn"></div>' +
      openQ("Whether an Admin block prevents booking, and who may create or override blocked availability, is not defined in the V1 documents. These reasons are not an approved catalog (Open question 15)."),
      function () { saveBlock(); }, existing ? "Save block" : "Add block");
  }
  function saveBlock() {
    const date = $("#blkDate").value;
    const start = $("#blkStart").value;
    const end = $("#blkEnd").value;
    const warn = $("#blkWarn");
    if (!date) { warn.innerHTML = '<div class="notice">Date is required.</div>'; return; }
    if (isClinicClosedDay(date)) { warn.innerHTML = '<div class="notice">Blocks must fall on an open clinic day (Monday–Friday, not a major US holiday).</div>'; return; }
    if (start >= end) { warn.innerHTML = '<div class="notice">End must be after start, within 10:00 a.m.–6:00 p.m. ET.</div>'; return; }
    if (start < "10:00" || end > "18:00") { warn.innerHTML = '<div class="notice">Start and end must stay within Monday–Friday, 10:00 a.m.–6:00 p.m. ET.</div>'; return; }
    const existingId = ($("#blkId") && $("#blkId").value) || "";
    const notes = ($("#blkNotes") && $("#blkNotes").value.trim()) || "";
    let rec = existingId ? (store.blocks || []).find(function (b) { return b.id === existingId; }) : null;
    const before = rec ? { date: rec.date, start: rec.start, end: rec.end, reason: rec.reason, staff: rec.staff, notes: rec.notes || "" } : null;
    if (!rec) {
      rec = {
        id: nextId("BLK-", store.blocks),
        type: "Admin",
        locationId: state.locationId || BRIZZA.DEFAULT_LOCATION
      };
      store.blocks = store.blocks || [];
      store.blocks.push(rec);
    }
    rec.reason = $("#blkReason").value;
    rec.staff = $("#blkStaff").value;
    rec.date = date;
    rec.start = start;
    rec.end = end;
    rec.notes = notes;
    rec.locationId = rec.locationId || state.locationId || BRIZZA.DEFAULT_LOCATION;
    addAudit({
      who: actingName(),
      role: state.actingRole,
      action: before ? "Edited Admin block" : "Added Admin block",
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
    toast(before ? "Admin block saved" : "Admin block added");
    state.date = date;
    const next = hashFor({ page: "schedule", date: date, view: "calendar", calMode: state.calMode });
    if (location.hash !== next) go({ page: "schedule", date: date, view: "calendar", calMode: state.calMode });
    else render();
  }

  function scheduleSearchHits(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) return "";
    const people = store.patients.filter((p) => (p.name + " " + p.id + " " + p.phone + " " + (p.dob || "")).toLowerCase().includes(q));
    const aps = store.appointments.filter((a) => {
      const p = patient(a.patientId);
      return ((p && p.name) + " " + (p && p.dob || "") + " " + a.patientId + " " + a.id + " " + a.type + " " + reasonText(a) + " " + a.provider + " " + a.date).toLowerCase().includes(q) && a.status !== "Rescheduled" && appointmentVisibleOnCalendar(a);
    }).slice(0, 8);
    const plist = people.map((p) => '<a class="row" href="' + hashFor({ page: "patients", selected: p.id, tab: "demographics" }) + '"><span>' + esc(p.name) + '</span><span class="row-sub">' + esc(p.id) + "</span></a>").join("") || '<div class="row-sub">No matching patients</div>';
    const alist = aps.map((a) => {
      const p = patient(a.patientId);
      return '<a class="row" href="' + hashFor({ page: "schedule", date: a.date, appointmentId: a.id, view: state.scheduleView, calMode: state.calMode }) + '"><span>' + esc(fmtTime(a.time)) + " · " + (p ? patientLink(p) : esc(a.patientId)) + '</span><span class="row-sub">' + esc(a.date) + " · " + esc(a.type) + " · " + esc(a.id) + "</span></a>";
    }).join("") || '<div class="row-sub">No matching appointments</div>';
    return '<div class="search-hits card" style="margin-bottom:12px"><div class="cardbody"><h3 class="section-title">Patient search</h3>' + plist + "<h3 class=\"section-title\">Appointments</h3>" + alist + "</div></div>";
  }

  function renderSchedule() {
    renderCalendar();
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
      const listInner = `<div class="appt-card-top">
          <div>
            <div class="appt-title"><a href="${openHref}">${esc(fmtTime(a.time))}</a> · ${p ? patientLink(p) : esc(a.patientId)} ${auditIconFor("Appointment", a.id)}</div>
            <div class="row-sub">${esc(a.type)} · ${esc(reasonText(a))} · ${esc(dur)} · ${esc(a.provider)}</div>
            ${paperworkBadge(a)}
          </div>
          <div class="actions">
            ${statusSelect(a, "list")}
            <a class="btn small" href="${posHref}">Invoice</a>
            <button class="btn small" type="button" data-expand-reg="${esc(a.id)}" aria-expanded="${open ? "true" : "false"}" aria-controls="reg-panel-${esc(a.id)}">Registration</button>
          </div>
        </div>
        ${open ? registrationPanel(a) : ""}`;
      return jewelWrap(a, listInner, "appt-card", 'data-open-appt="' + esc(a.id) + '"');
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
            <strong>${esc(fmtLong(state.date))}</strong> <span class="count">${esc(dayCountLabel(state.date))}</span>
            <a class="btn small" id="sched-next" href="${hashFor({ page: "schedule", date: addDays(state.date, 1), view: "list" })}" aria-label="Next day">›</a>
            <a class="btn small" id="sched-today" href="${hashFor({ page: "schedule", date: todayET(), view: "list" })}">Today</a>
          </div>
          <div class="sched-tools">
            <label class="sr-only" for="sched-search">Search patients and appointments</label>
            <input id="sched-search" class="sched-search" type="search" placeholder="Search patients and appointments" value="${esc(state.scheduleSearch || "")}">
            <label class="sr-only" for="locationSel">Location</label>
            <select id="locationSel">${locOpts}</select>
            ${providerChipsHtml()}
          </div>
        </div>
        <div class="cardbody">${isClinicClosedDay(state.date) ? clinicClosedBanner(state.date) : rows}
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
    const href = hashFor({ page: "schedule", date: state.date, appointmentId: a.id, view: "calendar", calMode: state.calMode });
    const locked = isApptLocked(a);
    const tip = [p ? p.name : a.patientId, cardTypeLabel(a), fmtTime(a.time), a.status].join(" · ");
    const canceled = a.status === "Canceled";
    const mate = linkedVisitMate(a);
    const linkBadge = mate ? '<span class="cal-link-tag" title="Linked visit, one invoice">Linked · ' + esc(mate.type) + "</span>" : "";
    const noRoom = !a.suiteId ? '<span class="cal-noroom">No suite</span>' : "";
    const due = visitUnpaid(a);
    const payCue = due.unpaid
      ? '<span class="cal-pay unpaid">' + (due.tbd ? "Unpaid TBD" : "Unpaid") + "</span>"
      : ((invoiceForAppt(a) || {}).status === "Paid" ? '<span class="cal-pay paid">Paid</span>' : "");
    const attrs = 'data-open-appt="' + esc(a.id) + '" data-appt-drag="' + esc(a.id) + '" draggable="' + (locked || canceled ? "false" : "true") + '"';
    const inner =
      '<span class="t">' + (p ? patientLink(p) : esc(a.patientId)) + ' <a href="' + href + '">' + esc(fmtTime(a.time)) + "</a></span>" +
      '<span class="cal-event-mid"><a href="' + href + '">' + esc(cardTypeLabel(a)) + "</a>" + linkBadge + "</span>" +
      '<span class="row-sub">' + esc(a.provider) + " " + statusChipHtml(a, { variant: "tint" }) + noRoom + payCue + "</span>" +
      '<span class="appt-pop" role="tooltip">' + esc(tip) + "</span>";
    return jewelWrap(a, inner, "cal-event" + (mate ? " is-linked" : ""), attrs);
  }

  function rangeAppointments(start, end, locationId) {
    const loc = activeLocationId(locationId);
    return store.appointments
      .filter((a) => a.date >= start && a.date <= end && a.status !== "Rescheduled" && appointmentVisibleOnCalendar(a))
      .filter((a) => !shouldFilterProvider() || providerMatches(a.provider))
      .filter((a) => !loc || a.locationId === loc)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  function weekJumperHtml(date) {
    const jumps = [2, 4, 6, 12];
    const links = jumps.map(function (w) {
      const d = addDays(date, w * 7);
      return '<a class="btn small" href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "week" }) + '">+' + w + "w</a>";
    }).join("");
    return '<span class="week-jump" role="group" aria-label="Jump ahead by weeks">' + links + "</span>";
  }
  function renderCalendar() {
    if (!state.providerChips) state.providerChips = loadProviderChips();
    const modes = calendarModeToggle();
    const shiftPrev = scheduleShift(state.date, -1);
    const shiftNext = scheduleShift(state.date, 1);
    let title = fmtLong(state.date);
    if (state.calMode === "week") title = "Week of " + fmtLong(weekMonday(state.date));
    if (state.calMode === "month") title = monthLabel(state.date);
    const bookBtns = isMarketingRole()
      ? ' <span class="row-sub">Read-only</span>'
      : ' <a class="btn primary" href="#modal-book" data-open="book">＋ New appointment</a> <button class="btn" type="button" data-open="block">＋ Admin block</button>';
    const head = pageHead("", "Schedule", esc(BRIZZA.CLINIC.hours), modes + bookBtns);
    const nav = `<div class="datebar">
      <a class="btn small" id="sched-prev" href="${hashFor({ page: "schedule", date: shiftPrev, view: "calendar", calMode: state.calMode })}" aria-label="Previous">‹</a>
      <strong>${esc(title)}</strong>
      <a class="btn small" id="sched-next" href="${hashFor({ page: "schedule", date: shiftNext, view: "calendar", calMode: state.calMode })}" aria-label="Next">›</a>
      <a class="btn small" id="sched-today" href="${hashFor({ page: "schedule", date: todayET(), view: "calendar", calMode: state.calMode })}">Today</a>
      ${state.calMode === "week" ? weekJumperHtml(state.date) : ""}
    </div>`;
    const tools = '<div class="cal-tools">' + locationToggleHtml() + providerChipsHtml() + hideCanceledToggleHtml() +
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
    if (isClinicClosedDay(date)) return clinicClosedBanner(date);
    const hours = scheduleHours();
    const list = dayAppointments(date, locationId);
    const blocks = dayBlocks(date).filter(function (b) { return !locationId || b.locationId === locationId; });
    const providers = selectedProviderNames();
    const q = (state.scheduleSearch || "").trim().toLowerCase();
    const vis = function (a) {
      if (!appointmentMatchesTypeFilter(a) || !appointmentMatchesStatusFilter(a)) return false;
      return !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + displayId(a.patientId) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().indexOf(q) >= 0;
    };
    const head = '<div class="cal-day-head"><div class="cal-hd">' + esc(fmtLong(date)) + ' <span class="count">' + esc(String(new Set(list.map(function (a) { return a.patientId; })).size)) + "</span> " + dayPlusButton(date, true) + "</div>" + availLinesHtml(date, locationId) + "</div>";
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
    const provider = weekProviderName();
    const appts = rangeAppointments(mon, addDays(mon, 4), locationId).filter(function (a) { return a.provider === provider; });
    const blocks = rangeBlocks(mon, addDays(mon, 4)).filter(function (b) {
      return (!locationId || b.locationId === locationId) && (!b.staff || b.staff === provider);
    });
    const q = (state.scheduleSearch || "").trim().toLowerCase();
    const vis = function (a) {
      if (!appointmentMatchesTypeFilter(a) || !appointmentMatchesStatusFilter(a)) return false;
      return !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + displayId(a.patientId) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().indexOf(q) >= 0;
    };
    const heads = '<div class="cal-time"></div>' + days.map(function (d) {
      const hol = holidayName(d);
      return '<div class="cal-hd' + (hol ? " is-holiday" : "") + '"><a href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" }) + '">' +
        esc(new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) +
        '</a> <span class="count">' + esc(dayCountLabel(d)) + "</span>" +
        (hol ? '<div class="row-sub">' + esc(hol) + " · closed</div>" : dayPlusButton(d, true)) + "</div>";
    }).join("");
    const rows = hours.map(function (h) {
      const cells = days.map(function (d) {
        const here = appts.filter(function (a) { return a.date === d && a.time === h; });
        const inner = here.filter(vis).map(calendarEvent).join("") +
          blocks.filter(function (b) { return b.date === d && b.start === h; }).map(calendarBlock).join("");
        return slotCellHtml(d, h, provider, inner);
      }).join("");
      return '<div class="cal-time">' + esc(fmtTime(h)) + "</div>" + cells;
    }).join("");
    return '<div class="cal-grid-week" data-week-provider="' + esc(provider) + '">' + heads + rows + "</div>";
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
      const hol = holidayName(d);
      const closed = isClinicClosedDay(d);
      const dayAppts = appts.filter(function (a) { return a.date === d; });
      const dayBlks = blocks.filter(function (b) { return b.date === d; });
      const q = (state.scheduleSearch || "").trim().toLowerCase();
      const vis = function (a) {
        if (!appointmentMatchesTypeFilter(a) || !appointmentMatchesStatusFilter(a)) return false;
        return !q || ((patient(a.patientId) && patient(a.patientId).name) + " " + a.patientId + " " + a.type + " " + a.id).toLowerCase().indexOf(q) >= 0;
      };
      const visAppts = dayAppts.filter(vis);
      const expanded = state.expandedCalDay === d;
      const monthApptChip = function (a, full) {
        const p = patient(a.patientId);
        const fam = typeFamilyFor(a.type) || {};
        return '<div class="month-chip' + (full ? " month-chip-full" : "") + '" style="--type-band:' + (fam.band || "#C3C7CB") + '" data-open-appt="' + esc(a.id) + '">' +
          (full ? '<span class="month-chip-time">' + esc(fmtTime(a.time)) + "</span> " : "") +
          '<span class="month-chip-name">' + esc((p && p.name) || a.patientId) + "</span> " +
          statusChipHtml(a, { variant: "tint" }) + "</div>";
      };
      const chips = inMonth && !closed && visAppts.length
        ? ('<div class="month-lite">' + (expanded ? visAppts : visAppts.slice(0, 3)).map(function (a) {
            return monthApptChip(a, !!expanded);
          }).join("") + (!expanded && visAppts.length > 3 ? '<div class="row-sub">+' + (visAppts.length - 3) + " more</div>" : "") + "</div>")
        : "";
      const slots = (inMonth && !closed && expanded)
        ? ('<div class="month-slots">' + (BRIZZA.BOOKING_TIMES || []).map(function (t) {
            return '<button type="button" class="month-slot" data-open-slot="' + esc(d + "|" + t) + '">' + esc(fmtTime(t)) + "</button>";
          }).join("") + "</div>")
        : "";
      const count = dayCountLabel(d);
      const dayLink = '<a class="d" href="' + hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" }) + '">' + Number(d.slice(8)) + "</a>" + (count && !closed ? ' <span class="count">' + esc(count) + "</span>" : "") + (inMonth && !closed ? dayPlusButton(d, expanded) : "");
      const closedLabel = closed && inMonth ? '<div class="row-sub">' + esc(hol || "Closed") + "</div>" : "";
      html += '<div class="cal-mcell' + (closed ? " closed" : "") + (expanded ? " is-expanded" : "") + '">' + (inMonth ? dayLink : "") + closedLabel + chips + slots + "</div>";
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
      const list = (store.audit || []).slice().reverse().slice(0, 50).map(function (e) {
        return '<a class="row" href="' + hashFor({ page: "audit", auditId: e.id }) + '"><div><div class="row-title">' + esc(e.action || e.id) + '</div><div class="row-sub">' + esc(e.when || "") + " · " + esc(e.who || "") + " · " + esc(e.recordType || "") + " " + esc(e.recordId || "") + "</div></div></a>";
      }).join("") || '<div class="empty">No audit events yet.</div>';
      const head = pageHead("", "Audit", "Recent events", "");
      renderChrome("Audit", head, '<div class="card"><div class="cardbody">' + list + "</div></div>");
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
    const confirmed = a.status !== "Scheduled" || !!a.confirmedAt || a.status === "Confirmed" || isBoardStatus(a.status) || a.status === "Checked out";
    const reminder = !!a.reminderAt || !!a.reminderSent || isBoardStatus(a.status) || a.status === "Checked out" || a.status === "No-show" || a.status === "Canceled";
    items.push({ label: "Confirmed (48 hours before)", ok: confirmed });
    items.push({ label: "Reminder sent (24 hours before)", ok: reminder });
    return { ready: items.every((i) => i.ok), items };
  }

  function seedClinicTasks() {
    const list = [];
    (store.patients || []).forEach(function (p) {
      (p.followups || []).forEach(function (f) {
        list.push({ id: f.id, kind: "follow-up", text: f.text, patientId: p.id, appointmentId: f.appointmentId || null, owner: f.owner || "", due: f.due || "", done: !!f.done, createdAt: f.due || "" });
      });
    });
    list.push({ id: "T-CALL-1", kind: "call", text: "Call to confirm today's consultation", patientId: "BZ0001", appointmentId: "A-6214", owner: "Serena Collins", due: "2026-11-17", done: false, createdAt: "2026-11-16", activity: [{ text: "Left VM", who: "Serena Collins", when: "Nov 16, 2026, 4:10 p.m. ET" }, { text: "Called pt", who: "Serena Collins", when: "Nov 17, 2026, 10:05 a.m. ET" }] });
    list.push({ id: "T-CALL-2", kind: "call", text: "Call about unpaid balance", patientId: "BZ0005", appointmentId: "A-6231", owner: "Serena Collins", due: "2026-11-25", done: false, createdAt: "2026-11-18" });
    list.push({ id: "T-CALL-3", kind: "call", text: "Recall after no-show", patientId: "BZ0004", appointmentId: "A-6236", owner: "Lily Morgan", due: "2026-11-19", done: false, createdAt: "2026-11-18" });
    return list;
  }
  function taskOwnerOptions(selected) {
    return '<option value="">Unassigned</option>' + (BRIZZA.STAFF || []).map(function (s) {
      return "<option" + (s.name === selected ? " selected" : "") + ">" + esc(s.name) + "</option>";
    }).join("");
  }
  function isTaskOverdue(t, today) {
    today = today || todayET();
    return !t.done && t.due && t.due < today;
  }
  function taskVisitLabel(t) {
    const a = t.appointmentId ? appt(t.appointmentId) : null;
    if (!a) return "";
    return fmtDate(a.date) + " · " + fmtTime(a.time) + " · " + (a.type || "Visit");
  }
  function openAddTask(pid) {
    const p0 = pid ? patient(pid) : null;
    const owner = actingName();
    const appts = (store.appointments || []).filter(function (a) { return !pid || a.patientId === pid; }).slice(-8);
    const patOpts = '<option value="">Select a patient</option>' + (store.patients || []).map(function (p) {
      return "<option value=\"" + esc(p.id) + "\"" + (p0 && p.id === p0.id ? " selected" : "") + ">" + esc(p.name) + "</option>";
    }).join("");
    const visOpts = '<option value="">None</option>' + appts.map(function (a) {
      const p = patient(a.patientId);
      return "<option value=\"" + esc(a.id) + "\">" + esc((p && p.name) || a.patientId) + " · " + esc(a.date) + " · " + esc(a.type) + "</option>";
    }).join("");
    showModal("Add task",
      '<div class="formgrid">' +
        '<div class="field"><label for="taskKind">Type</label><select id="taskKind"><option value="call">Front-desk call</option><option value="follow-up">Follow-up</option></select></div>' +
        '<div class="field"><label for="taskOwner">Assign to</label><select id="taskOwner">' + taskOwnerOptions(owner) + "</select></div>" +
        '<div class="field"><label for="taskPatient">Patient <span class="req">required</span></label><select id="taskPatient">' + patOpts + "</select></div>" +
        '<div class="field"><label for="taskVisit">Visit</label><select id="taskVisit">' + visOpts + "</select></div>" +
        '<div class="field"><label for="taskDue">Due</label><input id="taskDue" type="date" value="' + esc(todayET()) + '"></div>' +
        '<div class="field full"><label for="taskText">Task <span class="req">required</span></label><input id="taskText" placeholder="What needs to be done"></div>' +
      "</div>",
      function () {
        const text = ($("#taskText") && $("#taskText").value.trim()) || "";
        const patientId = $("#taskPatient") ? $("#taskPatient").value : "";
        if (!text || !patientId) { toast("Enter a task and a patient"); return; }
        const rec = {
          id: nextId("T-", store.tasks),
          kind: ($("#taskKind") && $("#taskKind").value) || "call",
          text: text,
          patientId: patientId,
          appointmentId: ($("#taskVisit") && $("#taskVisit").value) || null,
          owner: ($("#taskOwner") && $("#taskOwner").value) || "",
          due: ($("#taskDue") && $("#taskDue").value) || todayET(),
          done: false,
          createdAt: nowET()
        };
        store.tasks.push(rec);
        const p = patient(patientId);
        if (p && rec.kind === "follow-up") {
          p.followups = p.followups || [];
          p.followups.push({ id: rec.id, text: rec.text, due: rec.due, owner: rec.owner, appointmentId: rec.appointmentId });
        }
        closeModal();
        toast("Task added");
        render();
      }, "Add task");
  }
  function staffInitials(name) {
    const s = staffRecord(name);
    const src = (s && s.short) || name || "?";
    const parts = String(src).split(/[\s,]+/).filter(Boolean);
    const letters = (parts[0] ? parts[0].charAt(0) : "?") + (parts[1] ? parts[1].charAt(0) : "");
    return '<span class="staff-ava" aria-hidden="true">' + esc(letters.toUpperCase()) + "</span>";
  }
  function taskActivityHtml(t) {
    const log = t.activity || [];
    const open = state.expandedTask === t.id;
    const rows = log.slice().reverse().map(function (e) {
      return '<div class="task-act"><div>' + esc(e.text) + '</div><div class="row-sub">' + esc(e.who || "") + " · " + esc(e.when || "") + "</div></div>";
    }).join("") || '<div class="row-sub">No follow-up notes yet</div>';
    return '<details class="task-log"' + (open ? " open" : "") + ' data-task-log="' + esc(t.id) + '"><summary>Activity · ' + log.length + "</summary>" +
      rows +
      '<div class="task-log-add"><label class="sr-only" for="task-note-' + esc(t.id) + '">Add activity</label>' +
      '<input id="task-note-' + esc(t.id) + '" data-task-note-text="' + esc(t.id) + '" placeholder="called pt, left VM…">' +
      '<button type="button" class="btn tiny" data-task-note="' + esc(t.id) + '">Add</button></div></details>';
  }
  function addTaskActivity(id, text) {
    const rec = (store.tasks || []).find(function (t) { return t.id === id; });
    if (!rec) return;
    const note = String(text || "").trim();
    if (!note) { toast("Enter a follow-up note"); return; }
    rec.activity = rec.activity || [];
    rec.activity.push({ text: note, who: actingName(), when: nowET() });
    state.expandedTask = id;
    toast("Activity added");
    render();
  }
  function renderQueue() {
    const today = todayET();
    const mine = actingName();
    const scope = state.taskScope || "mine";
    const dueToday = !!state.taskDueToday;
    const showDone = !!state.showCompletedTasks;
    let list = (store.tasks || []).slice();
    if (scope === "mine") list = list.filter(function (t) { return (t.owner || "") === mine; });
    const overdueN = list.filter(function (t) { return isTaskOverdue(t, today); }).length;
    if (dueToday) list = list.filter(function (t) { return t.due === today; });
    if (state.taskOverdueOnly) list = list.filter(function (t) { return isTaskOverdue(t, today); });
    if (!showDone) list = list.filter(function (t) { return !t.done; });
    list.sort(function (a, b) { return String(a.due || "").localeCompare(String(b.due || "")) || String(a.id).localeCompare(String(b.id)); });
    const groups = {};
    list.forEach(function (t) {
      const key = t.owner || "Unassigned";
      (groups[key] = groups[key] || []).push(t);
    });
    const owners = Object.keys(groups).sort();
    const row = function (t) {
      const p = patient(t.patientId);
      const visit = taskVisitLabel(t);
      const over = isTaskOverdue(t, today);
      return '<div class="task-row' + (t.done ? " is-done" : "") + (over ? " is-overdue" : "") + '" data-task="' + esc(t.id) + '">' +
        '<div><div class="row-title">' + esc(t.text) + (t.kind === "call" ? ' <span class="cal-noroom">Call</span>' : "") + (over ? ' <span class="wl-unpaid-mark">Overdue</span>' : "") + "</div>" +
        '<div class="row-sub">' + esc(p ? p.name : t.patientId) + (visit ? " · " + esc(visit) : "") + " · due " + esc(fmtDate(t.due || "")) + "</div></div>" +
        '<div class="task-assign"><span class="staff-chip" title="Assignee">' + staffInitials(t.owner || "") + "</span>" +
        '<label class="sr-only" for="task-owner-' + esc(t.id) + '">Assign to</label>' +
        '<select id="task-owner-' + esc(t.id) + '" data-task-owner="' + esc(t.id) + '">' + taskOwnerOptions(t.owner || "") + "</select></div>" +
        (t.done ? "" : '<button type="button" class="btn tiny" data-task-done="' + esc(t.id) + '">Complete</button>') +
        (p ? '<a class="btn tiny" href="' + hashFor({ page: "patients", selected: p.id, tab: "visits" }) + '">Open chart</a>' : "") +
        taskActivityHtml(t) +
      "</div>";
    };
    const bodyGroups = owners.map(function (owner) {
      return '<section class="task-group"><h3>' + esc(owner) + " · " + groups[owner].length + "</h3>" + groups[owner].map(row).join("") + "</section>";
    }).join("") || '<div class="empty">No tasks in this view</div>';
    const head = pageHead("", "Tasks", "",
      '<button type="button" class="btn primary" data-open="add-task">＋ Add task</button>');
    const filters = '<div class="wl-filters" role="group" aria-label="Task filters">' +
      '<button type="button" class="wl-filter' + (scope === "mine" ? " active" : "") + '" data-task-scope="mine" aria-pressed="' + (scope === "mine" ? "true" : "false") + '">My tasks</button>' +
      '<button type="button" class="wl-filter' + (scope === "all" ? " active" : "") + '" data-task-scope="all" aria-pressed="' + (scope === "all" ? "true" : "false") + '">All tasks</button>' +
      '<button type="button" class="wl-filter' + (dueToday ? " active" : "") + '" data-task-due-today="1" aria-pressed="' + (dueToday ? "true" : "false") + '">Due today</button>' +
      '<button type="button" class="wl-filter' + (state.taskOverdueOnly ? " active" : "") + '" data-task-overdue="1" aria-pressed="' + (state.taskOverdueOnly ? "true" : "false") + '">' + (overdueN ? overdueN + " overdue" : "Overdue") + "</button>" +
      '<label class="hide-canceled"><input type="checkbox" data-task-show-done="1"' + (showDone ? " checked" : "") + "> Show completed</label>" +
      (overdueN ? '<span class="badge warn" id="taskOverdueCount">' + overdueN + " overdue</span>" : "") +
    "</div>";
    const body = '<div class="card"><div class="cardhead"><h2>Tasks</h2></div><div class="cardbody">' + filters + bodyGroups + "</div></div>";
    renderChrome('<a href="' + hashFor({ page: "queue", date: state.date }) + '">Tasks</a>', head, body);
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
    const head = pageHead("", v.label || "Visit", esc(p ? p.name : "") + " · " + esc(fmtDate(v.date)),
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
            <div class="cardbody">${inv ? '<div class="row"><span>' + esc(inv.id) + "</span><span>Balance: " + (inv.balance === "None" || inv.balance == 0 || inv.balance === "0" ? money(0) : (typeof inv.balance === "number" ? money(inv.balance) : esc(String(inv.balance)))) + '</span></div><p class="row-sub">Both appointments display this invoice status.</p><a class="btn small" href="' + hashFor({ page: "checkout", invoiceId: inv.id }) + '">Checkout</a>' : "No invoice"}</div>
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


  function accessLevelForRole(role) {
    if (role === "MD / Clinic Owner") return "Full access";
    if (role === "Clinic Manager") return "Manager";
    if (role === "Clinical Coordinator") return "Clinical Coordinator";
    if (role === "RN / NP Injector") return "Clinical · Injectables";
    if (role === "Aesthetician") return "Clinical · Aesthetics";
    if (role === "Marketing Specialist") return "Marketing";
    if (role === "Medical Assistant") return "Clinical support";
    return role || "—";
  }
  function teamUsers() {
    if (!store.teamUsers) {
      store.teamUsers = (BRIZZA.STAFF || []).map(function (s) {
        return { id: s.id, name: s.name, role: s.role, access: accessLevelForRole(s.role), status: "Active" };
      });
    }
    return store.teamUsers;
  }
  function canEditAdmin() {
    return isOwnerRole() || state.actingRole === "Clinic Manager";
  }
  function canInviteUsers() { return canEditAdmin(); }
  function adminTabsHtml(active) {
    const tab = active === "team" ? "users" : (active || state.adminTab || "home");
    const tabs = [
      { id: "home", label: "Home" },
      { id: "users", label: "Users & Roles" },
      { id: "availability", label: "Availability", lockable: true },
      { id: "types", label: "Appointment types & reasons" },
      { id: "templates", label: "Note templates", editorsOnly: true },
      { id: "inventory", label: "Inventory", lockable: true },
      { id: "locations", label: "Locations" },
      { id: "settings", label: "Settings" }
    ].filter(function (x) {
      if (x.editorsOnly) return canEditTemplates();
      return true;
    });
    return '<div class="admin-tabs" role="tablist" aria-label="Admin">' + tabs.map(function (x) {
      const locked = (x.id === "availability" && !canManageAvailability()) || (x.id === "inventory" && !canManageInventory());
      const label = esc(x.label) + (locked ? " 🔒" : "");
      return '<a href="' + hashFor({ page: "admin", adminTab: x.id }) + '" class="' + (tab === x.id ? "active" : "") + (locked ? " locked" : "") + '" role="tab" aria-selected="' + (tab === x.id ? "true" : "false") + '">' + label + "</a>";
    }).join("") + "</div>";
  }
  function adminTabLabel(id) {
    const tabs = { home: "Home", users: "Users & Roles", availability: "Availability", types: "Appointment types & reasons", reasons: "Appointment types & reasons", templates: "Note templates", inventory: "Inventory", locations: "Locations", settings: "Settings" };
    return tabs[id] || "Home";
  }
  function renderAdminChrome(head, body) {
    const tab = state.adminTab === "team" ? "users" : (state.adminTab || "home");
    const crumb = '<a href="' + hashFor({ page: "admin", adminTab: "home" }) + '">Admin</a>' + (tab && tab !== "home" ? " / " + esc(adminTabLabel(tab)) : "");
    renderChrome(crumb, head, adminTabsHtml(state.adminTab) + body);
  }
  function staffLastActive(u) {
    const today = todayET();
    if (u && u.lastActive && String(u.lastActive) <= today) return fmtDate(String(u.lastActive).slice(0, 10));
    if (!u || !u.name) return "—";
    const hits = (store.appointments || []).filter(function (a) { return a.provider === u.name && a.date && a.date <= today; })
      .sort(function (a, b) { return (b.date + " " + (b.time || "")).localeCompare(a.date + " " + (a.time || "")); });
    return hits[0] ? fmtDate(hits[0].date) : "—";
  }
  function renderAdminHome() {
    const day = demoClockDate();
    const activeToday = (BRIZZA.STAFF || []).filter(function (s) {
      return (store.appointments || []).some(function (a) { return a.date === day && a.provider === s.name && a.status !== "Canceled" && a.status !== "Rescheduled"; });
    });
    const users = (store.teamUsers || teamUsers() || []).filter(function (u) { return (u.status || "Active") === "Active"; });
    const staffRows = (activeToday.length ? activeToday : users.slice(0, 6)).map(function (s) {
      return '<div class="row"><span>' + esc(s.name) + '</span><span class="row-sub">' + esc(s.role || s.title || "") + (activeToday.indexOf(s) >= 0 ? " · On the schedule today" : "") + "</span></div>";
    }).join("") || '<div class="empty">No one is marked active today.</div>';
    const low = (store.catalog || []).filter(function (c) {
      if (c.reorderPoint == null) return false;
      const on = (typeof catalogOnHand === "function") ? catalogOnHand(c) : null;
      return on != null && on <= c.reorderPoint;
    });
    const expiredLots = (store.lots || []).filter(function (l) {
      return l && l.expiry && l.expiry < todayET() && l.status !== "Disposed" && l.status !== "Quarantined";
    });
    const invHref = hashFor({ page: "admin", adminTab: "inventory", invTab: "summary" });
    const stockSummary = (low.length || expiredLots.length)
      ? '<a href="' + invHref + '">' + low.length + " low" + (expiredLots.length ? " · " + expiredLots.length + " expired" : "") + " → Review</a>"
      : '<div class="empty">No low-stock or expiry alerts.</div>';
    const avN = (store.availabilityTemplates || []).length;
    const noteN = ((store.noteTemplates || BRIZZA.NOTE_TEMPLATES) || []).length;
    const head = pageHead("", "Home", "", "");
    const body = '<div class="grid admin-home">' +
      '<div class="card"><div class="cardhead"><h2>Active today</h2></div><div class="cardbody">' + staffRows + "</div></div>" +
      '<div class="card"><div class="cardhead"><h2>Inventory</h2></div><div class="cardbody">' + stockSummary + "</div></div>" +
      '<div class="card"><div class="cardhead"><h2>Templates</h2></div><div class="cardbody">' +
      '<div class="row"><span>Availability templates</span><a href="' + hashFor({ page: "admin", adminTab: "availability" }) + '">' + avN + "</a></div>" +
      '<div class="row"><span>Note templates</span><a href="' + hashFor({ page: "admin", adminTab: "templates" }) + '">' + noteN + "</a></div>" +
      "</div></div></div>";
    renderAdminChrome(head, body);
  }
  function renderLocations() {
    const head = pageHead("", "Locations", "", "");
    const rows = (BRIZZA.LOCATIONS || []).map(function (l) {
      return '<div class="card" style="margin-bottom:12px"><div class="cardhead"><h2>' + esc(l.name) + "</h2></div>" +
        '<div class="cardbody"><div class="row-sub">' + locationHoursHtml(l) + " · " + esc(l.tz || "America/New_York") + "</div></div></div>";
    }).join("");
    renderAdminChrome(head, rows || '<div class="empty">No locations</div>');
  }
  function renderTeamAccess() {
    const showInactive = !!state.showInactiveUsers;
    const users = teamUsers().slice().sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    }).filter(function (u) {
      return showInactive || (u.status || "Active") === "Active";
    });
    const canEdit = canInviteUsers();
    const rows = users.map(function (u) {
      return "<tr><td>" + esc(u.name) + "</td><td>" + esc(u.role) + "</td><td>" + esc(u.access || accessLevelForRole(u.role)) + "</td><td>" +
        badge(u.status || "Active") + "</td><td>" + esc(staffLastActive(u)) + "</td><td>" +
        (canEdit ? '<button type="button" class="btn small" data-team-edit="' + esc(u.id) + '">Edit</button>' : "") + "</td></tr>";
    }).join("") || '<tr><td colspan="6" class="empty">No users</td></tr>';
    const head = pageHead("Admin", "Users & Roles", "",
      (canEdit ? '<button class="btn primary" type="button" data-team-invite="1">＋ Invite user</button>' : ""));
    const body = '<div class="card"><div class="cardbody">' +
      '<label class="hide-canceled"><input type="checkbox" id="showInactiveUsers"' + (showInactive ? " checked" : "") + "> Show inactive</label>" +
      '<table class="table admin-table team-table"><thead><tr><th>Name</th><th>Role</th><th>Access</th><th>Status</th><th>Last active</th><th></th></tr></thead><tbody>' +
      rows + "</tbody></table></div></div>";
    renderAdminChrome(head, body);
  }
  function openTeamUserModal(id) {
    const existing = id && teamUsers().find(function (u) { return u.id === id; });
    const u = existing || { name: "", role: "Clinical Coordinator", status: "Active" };
    const roleOpts = (BRIZZA.ROLES || []).map(function (r) {
      return "<option" + (u.role === r ? " selected" : "") + ">" + esc(r) + "</option>";
    }).join("");
    const statusOpts = ["Active", "Inactive"].map(function (s) {
      return "<option" + ((u.status || "Active") === s ? " selected" : "") + ">" + s + "</option>";
    }).join("");
    showModal(existing ? ("Edit user · " + (u.name || "User")) : "Invite user",
      '<div class="formgrid">' +
        '<div class="field full"><label for="teamName">Name <span class="req">*</span></label><input id="teamName" value="' + esc(u.name) + '" required></div>' +
        '<div class="field full"><label for="teamEmail">Email <span class="req">*</span></label><input id="teamEmail" type="email" value="' + esc(u.email || "") + '" required placeholder="name@brizza.com"></div>' +
        '<div class="field"><label for="teamRole">Role</label><select id="teamRole">' + roleOpts + "</select></div>" +
        '<div class="field"><label for="teamStatus">Status</label><select id="teamStatus">' + statusOpts + "</select></div>" +
        '<div class="field"><label for="teamStart">Start date</label><input id="teamStart" type="date" value="' + esc(u.startDate || "") + '"></div>' +
        '<div class="field full"><label>Access</label><input id="teamAccess" value="' + esc(accessLevelForRole(u.role)) + '" disabled></div>' +
      "</div>" +
      openQ("There is no sign-in in this preview. Access follows the existing acting-role permissions and is in memory only."),
      function () {
        const name = ($("#teamName") && $("#teamName").value.trim()) || "";
        if (!name) { toast("Enter a name"); return; }
        const role = ($("#teamRole") && $("#teamRole").value) || "Clinical Coordinator";
        const status = ($("#teamStatus") && $("#teamStatus").value) || "Active";
        const rec = existing || { id: nextId("USR-", teamUsers()) };
        const email = ($("#teamEmail") && $("#teamEmail").value.trim()) || "";
        if (!email) { toast("Enter an email"); return; }
        rec.name = name;
        rec.email = email;
        rec.role = role;
        rec.access = accessLevelForRole(role);
        rec.status = status;
        rec.startDate = ($("#teamStart") && $("#teamStart").value) || rec.startDate || "";
        rec.lastActive = rec.lastActive && rec.lastActive <= todayET() ? rec.lastActive : rec.lastActive;
        if (!existing) teamUsers().push(rec);
        addAudit({
          action: existing ? "Updated team user" : "Invited team user",
          recordType: "User",
          recordId: rec.id,
          recordPath: { page: "admin", adminTab: "team" },
          changes: [{ field: "name", before: existing ? (existing.name || "—") : "—", after: name }]
        });
        closeModal();
        toast(existing ? "User updated" : "User added");
        render();
      }, existing ? "Save" : "Invite");
    const roleEl = $("#teamRole");
    if (roleEl) {
      roleEl.addEventListener("change", function () {
        const acc = $("#teamAccess");
        if (acc) acc.value = accessLevelForRole(roleEl.value);
      });
    }
  }

  function renderSettings() {
    const c = state.contrast || checkContrast();
    state.contrast = c;
    const themeRows = Object.entries(c.results).map(([id, rows]) => {
      const fails = rows.filter((r) => !r.pass);
      return '<div class="row"><div><strong>' + esc(BRIZZA.THEMES[id].name) + '</strong><div class="row-sub">' + rows.length + " body/UI text pairs checked · " + (fails.length ? fails.length + " below target" : "all at or above target") + "</div></div>" + (fails.length ? badge("Review") : badge("AA checked")) + "</div>";
    }).join("");
    const clinic = BRIZZA.CLINIC || {};
    const canTpl = canEditAdmin();
    const head = pageHead("Admin", "Settings", "", "");
    const body = '<div class="grid">' +
      '<div class="card"><div class="cardhead"><h2>Clinic</h2></div><div class="cardbody">' +
      '<div class="row"><span>Name</span><strong>' + esc(clinic.name || "Brizza Aesthetics") + "</strong></div>" +
      '<div class="row"><span>Hours</span><span>' + esc(clinic.hours || "") + "</span></div>" +
      '<div class="row"><span>Time zone</span><span>' + esc(clinic.tz || "America/New_York") + "</span></div>" +
      '<div class="row"><span>Locations</span><a href="' + hashFor({ page: "admin", adminTab: "locations" }) + '">Open Locations</a></div>' +
      "</div></div></div>";
    renderAdminChrome(head, body);
  }

  function noteTemplateKey() { return "brizza-emr-note-templates"; }
  function noteFieldTypes() {
    return [
      { id: "text", label: "Short answer", simple: true },
      { id: "textarea", label: "Paragraph", hasHeight: true, simple: true },
      { id: "number", label: "Number", simple: true },
      { id: "date", label: "Date", simple: true },
      { id: "time", label: "Time", simple: true },
      { id: "yesno", label: "Yes/No", simple: true },
      { id: "select", label: "Pick one", hasOptions: true, simple: true },
      { id: "checkbox-group", label: "Pick several", hasOptions: true, simple: true },
      { id: "table", label: "Table", hasColumns: true, hasHeight: true, simple: true },
      { id: "facemap", label: "Face map + units", simple: true },
      { id: "static", label: "Instructions text", simple: true },
      { id: "checkbox", label: "Checkbox" },
      { id: "multiselect", label: "Dropdown (multi)", hasOptions: true },
      { id: "radio", label: "Radio", hasOptions: true },
      { id: "section", label: "Section header" },
      { id: "signature", label: "Signature" },
      { id: "other", label: "Other area" },
      { id: "units-sum", label: "Units sum" },
      { id: "prose", label: "Generated prose" }
    ];
  }
  function simpleNoteFieldTypes() {
    return noteFieldTypes().filter(function (t) { return t.simple; });
  }
  function isHxSection(sec) {
    if (!sec) return false;
    if (sec.locked) return true;
    const t = String(sec.title || sec.id || "").toLowerCase();
    return sec.id === "medical-history" || /medical history/.test(t);
  }
  function ensureHxSection(draft) {
    if (!draft) return draft;
    draft.sections = draft.sections || [];
    let found = false;
    draft.sections.forEach(function (s) {
      if (isHxSection(s)) { s.locked = true; found = true; }
    });
    if (!found) {
      draft.sections.unshift({
        id: "medical-history",
        title: "Medical history",
        locked: true,
        fields: [normalizeNoteField({ id: "hx-summary", type: "textarea", label: "Medical history", pullIn: "history", pullMode: "live", width: "full" })]
      });
    }
    return draft;
  }
  function markTplDirty() { state.tplDirty = true; }
  function confirmLeaveTpl() {
    if (!state.tplDirty) return true;
    return window.confirm("You have unpublished changes. Leave without publishing?");
  }
  function pullInSources() {
    return [
      { id: "", label: "None" },
      { id: "demographics", label: "Demographics" },
      { id: "allergies", label: "Allergies" },
      { id: "meds", label: "Medications" },
      { id: "history", label: "Medical history" },
      { id: "pharmacy", label: "Pharmacy" },
      { id: "lastVisit", label: "Last visit" },
      { id: "provider", label: "Provider" },
      { id: "type", label: "Appointment type" },
      { id: "reason", label: "Reason" },
      { id: "suite", label: "Suite" }
    ];
  }
  function defaultRolesForTemplate(id) {
    if (String(id).indexOf("aes-") === 0) return ["Aesthetician"];
    if (String(id).indexOf("inj-") === 0) return ["RN / NP Injector"];
    return ["RN / NP Injector", "Aesthetician"];
  }
  function normalizeNoteField(f) {
    f = f || {};
    return {
      id: f.id || ("f-" + Math.random().toString(36).slice(2, 8)),
      type: f.type || "text",
      label: f.label || "Field",
      required: !!f.required,
      width: f.width || (f.type === "textarea" || f.type === "table" || f.type === "facemap" || f.type === "prose" || f.type === "static" || f.type === "section" ? "full" : "full"),
      height: f.height || "",
      options: (f.options || []).slice(),
      unit: f.unit || "",
      columns: (f.columns || []).slice(),
      pullIn: f.pullIn || "",
      pullMode: f.pullMode === "live" ? "live" : "copy",
      staticText: f.staticText || f.text || "",
      showIf: f.showIf || null,
      sentence: f.sentence || ""
    };
  }
  function cloneTemplate(tpl) {
    return JSON.parse(JSON.stringify(tpl));
  }
  function defaultNoteTemplates() {
    return (BRIZZA.NOTE_TEMPLATES || []).map(function (tpl) {
      const copy = cloneTemplate(tpl);
      copy.familyId = tpl.id;
      copy.version = 1;
      copy.hiddenFromNew = false;
      copy.roles = defaultRolesForTemplate(tpl.id);
      const qs = BRIZZA.NOTE_BUILDER && BRIZZA.NOTE_BUILDER[tpl.id];
      if (qs && qs.length) {
        copy.sections = [{ id: "visit", title: "Visit", fields: qs.map(normalizeNoteField) }];
      } else {
        (copy.sections || []).forEach(function (sec) {
          sec.fields = (sec.fields || []).map(normalizeNoteField);
        });
      }
      if (tpl.id === "inj-procedure") {
        const hasMap = (copy.sections || []).some(function (s) {
          return (s.fields || []).some(function (f) { return f.type === "facemap"; });
        });
        if (!hasMap) {
          copy.sections = copy.sections || [];
          copy.sections.push({
            id: "map",
            title: "Face map",
            fields: [
              normalizeNoteField({ id: "faceMap", type: "facemap", label: "Face map", width: "full" }),
              normalizeNoteField({ id: "otherArea", type: "other", label: "Other", width: "1/2" }),
              normalizeNoteField({ id: "unitsSum", type: "units-sum", label: "Units sum", width: "1/2" })
            ]
          });
        }
      }
      return copy;
    });
  }
  function loadNoteTemplates() {
    try {
      const raw = localStorage.getItem(noteTemplateKey());
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (err) {}
    return defaultNoteTemplates();
  }
  function persistNoteTemplates() {
    try { localStorage.setItem(noteTemplateKey(), JSON.stringify(store.noteTemplates || [])); } catch (err) {}
  }
  function currentNoteTemplates() {
    return (store.noteTemplates || []).filter(function (t) { return !t.hiddenFromNew; });
  }
  function getNoteTemplate(id) {
    if (!id) return null;
    return currentNoteTemplates().find(function (t) { return t.id === id || t.familyId === id; }) ||
      (store.noteTemplates || []).find(function (t) { return t.id === id; }) || null;
  }
  function pullInValue(source, pid, apptId) {
    const p = patient(pid);
    const a = apptId ? appt(apptId) : null;
    if (source === "demographics") return p ? (p.name + " · " + fmtDob(p.dob) + " · " + displayId(p.id)) : "";
    if (source === "allergies") return p ? allergyLabel(p) : "";
    if (source === "meds") return p ? ((p.meds || []).join(", ") || "None recorded") : "";
    if (source === "history") return p ? ((p.conditions || []).join(", ") || "None recorded") : "";
    if (source === "pharmacy") return (p && p.pharmacy) || "";
    if (source === "lastVisit") {
      const last = p && (typeof lastCompletedVisit === "function" ? lastCompletedVisit(p.id) : lastAppt(p));
      return last ? (fmtDate(last.date) + " · " + (last.type || "") + " · " + (last.provider || "")) : "";
    }
    if (source === "provider") return a ? a.provider : "";
    if (source === "type") return a ? a.type : "";
    if (source === "reason") return a ? (typeof visitReasonLabel === "function" ? visitReasonLabel(a) : reasonText(a)) : "";
    if (source === "suite") return a ? ((typeof suiteName === "function" && a.suiteId ? suiteName(a.suiteId) : "") || "") : "";
    return "";
  }
  function applyPullIns(draft, tpl) {
    if (!draft || !tpl) return;
    draft.values = draft.values || {};
    (tpl.sections || []).forEach(function (sec) {
      (sec.fields || []).forEach(function (f) {
        if (!f.pullIn) return;
        const v = pullInValue(f.pullIn, draft.pid, draft.apptId);
        if (f.pullMode === "live" || draft.values[f.id] == null || draft.values[f.id] === "") draft.values[f.id] = v;
      });
    });
  }
  function fieldWidthClass(w) {
    if (w === "1/2") return "w-12";
    if (w === "1/3") return "w-13";
    if (w === "1/4") return "w-14";
    return "w-full";
  }
  function fieldVisible(f, values) {
    const rule = f && f.showIf;
    if (!rule) return true;
    const cur = values && values[rule.field];
    if (rule.filled) return !!(cur && String(cur).trim());
    if (rule.in) return (rule.in || []).indexOf(cur) >= 0;
    if (rule.equals != null) return cur === rule.equals;
    return true;
  }
  function nextFieldId(tpl) {
    return "f-" + Math.random().toString(36).slice(2, 8);
  }

  function canEditTemplates() { return canEditAdmin(); }
  function templateHasType(tpl, typ) {
    return !!(tpl && (tpl.sections || []).some(function (s) {
      return (s.fields || []).some(function (f) { return f.type === typ; });
    }));
  }
  function fieldHeightClass(h) {
    if (h === "short" || h === "sm") return "h-sm";
    if (h === "tall" || h === "lg") return "h-lg";
    if (h === "medium" || h === "md" || h) return "h-md";
    return "";
  }
  function stringifyOptions(list) { return (list || []).join("\n"); }
  function parseOptions(s) { return String(s || "").split(/\n|;/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function tplOptionsEditorHtml(si, fi, list, prop) {
    const rows = (list || []).map(function (opt, i) {
      return '<div class="tpl-opt-row">' +
        '<input type="text" value="' + esc(opt) + '" data-tpl-opt-val="' + si + "," + fi + "," + i + '" data-prop="' + esc(prop) + '" aria-label="Option ' + (i + 1) + '">' +
        '<button type="button" class="btn-icon" data-tpl-opt-move="' + si + "," + fi + "," + i + ',-1" data-prop="' + esc(prop) + '" title="Move up">↑</button>' +
        '<button type="button" class="btn-icon" data-tpl-opt-move="' + si + "," + fi + "," + i + ',1" data-prop="' + esc(prop) + '" title="Move down">↓</button>' +
        '<button type="button" class="btn-icon" data-tpl-opt-del="' + si + "," + fi + "," + i + '" data-prop="' + esc(prop) + '" title="Remove">×</button>' +
      "</div>";
    }).join("") || '<div class="row-sub">No options yet</div>';
    return '<div class="tpl-opt-editor"><div class="row-sub">Options (one per row)</div>' + rows +
      '<button type="button" class="btn tiny" data-tpl-opt-add="' + si + "," + fi + '" data-prop="' + esc(prop) + '">＋ Add option</button></div>';
  }
  function tplFieldOptions(si, fi, prop) {
    const draft = ensureTplDraft();
    const field = draft && draft.sections && draft.sections[si] && draft.sections[si].fields && draft.sections[si].fields[fi];
    if (!field) return [];
    field[prop] = field[prop] || [];
    return field[prop];
  }

  function templateFieldsHtml(tpl, draft, opts) {
    opts = opts || {};
    draft = draft || {};
    const values = draft.values || {};
    const sections = tpl && tpl.sections ? tpl.sections : [];
    const html = sections.map(function (sec, si) {
      const fields = (sec.fields || []).map(function (f) {
        const html = noteFieldControl(f, values[f.id], draft, opts);
        if (!fieldVisible(f, values) && !opts.preview) {
          return html.replace('class="field', 'hidden class="field');
        }
        return html;
      }).join("");
      return '<section class="note-sec" id="sec-' + esc(sec.id || ("s" + si)) + '" data-sec="' + esc(sec.id || ("s" + si)) + '">' +
        (sec.title ? '<h3 class="section-title">' + esc(sec.title) + "</h3>" : "") +
        '<div class="note-fields">' + fields + "</div></section>";
    }).join("");
    return '<div class="note-template-fields" id="noteTemplateFields">' + html + "</div>";
  }
  function noteFieldControl(f, value, draft, opts) {
    opts = opts || {};
    draft = draft || state.noteDraft || {};
    const req = f.required ? ' aria-required="true"' : "";
    const star = f.required ? requiredMark() : "";
    const live = !!(f.pullIn && f.pullMode === "live");
    const ro = live ? " readonly" : "";
    const w = fieldWidthClass(f.width);
    const h = fieldHeightClass(f.height);
    const wrapOpen = '<div class="field ' + w + (h ? " " + h : "") + (f.type === "facemap" ? " facemap-row" : "") + (live ? " is-live" : "") + '"' +
      ' data-field-id="' + esc(f.id) + '"' +
      (f.showIf ? ' data-show-if-field="' + esc(f.showIf.field || "") + '"' : "") + ">";
    const label = (f.type === "section" || f.type === "static" || f.type === "checkbox") ? "" :
      '<label for="nf-' + esc(f.id) + '">' + esc(f.label) + star + (live ? ' <span class="row-sub">Live · freezes on sign</span>' : "") +
      (f.unit && f.type === "number" ? ' <span class="row-sub">(' + esc(f.unit) + ")</span>" : "") + "</label>";
    const idAttr = 'id="nf-' + esc(f.id) + '" data-nf="' + esc(f.id) + '" data-nf-type="' + esc(f.type) + '"';
    if (f.type === "section") return wrapOpen + '<h4 class="section-title">' + esc(f.label) + "</h4></div>";
    if (f.type === "static") return wrapOpen + '<p class="row-sub">' + esc(f.staticText || f.label) + "</p></div>";
    if (f.type === "yesno") {
      const cur = value || "";
      return wrapOpen + label + "<select " + idAttr + req + ro + ">" +
        '<option value="">Select</option>' +
        "<option" + (cur === "Yes" ? " selected" : "") + ">Yes</option>" +
        "<option" + (cur === "No" ? " selected" : "") + ">No</option></select></div>";
    }
    if (f.type === "textarea") return wrapOpen + label + "<textarea " + idAttr + req + ro + ">" + esc(value || "") + "</textarea></div>";
    if (f.type === "select") {
      const optsHtml = ['<option value="">Select</option>'].concat(fieldOptions(f).map(function (o) {
        return "<option" + (value === o ? " selected" : "") + ">" + esc(o) + "</option>";
      }));
      return wrapOpen + label + "<select " + idAttr + req + (live ? " disabled" : "") + ">" + optsHtml.join("") + "</select></div>";
    }
    if (f.type === "multiselect") {
      const picked = Array.isArray(value) ? value : String(value || "").split(/\n|,/).map(function (x) { return x.trim(); }).filter(Boolean);
      const optsHtml = fieldOptions(f).map(function (o) {
        return "<option" + (picked.indexOf(o) >= 0 ? " selected" : "") + ">" + esc(o) + "</option>";
      });
      return wrapOpen + label + "<select " + idAttr + " multiple" + req + (live ? " disabled" : "") + ">" + optsHtml.join("") + "</select></div>";
    }
    if (f.type === "radio") {
      const radios = fieldOptions(f).map(function (o, i) {
        const rid = "nf-" + f.id + "-" + i;
        return '<label class="choice" for="' + esc(rid) + '"><input type="radio" id="' + esc(rid) + '" name="nf-' + esc(f.id) + '" data-nf="' + esc(f.id) + '" data-nf-type="radio" value="' + esc(o) + '"' + (value === o ? " checked" : "") + (live ? " disabled" : "") + ">" + esc(o) + "</label>";
      }).join("");
      return wrapOpen + '<fieldset><legend>' + esc(f.label) + star + "</legend>" + radios + "</fieldset></div>";
    }
    if (f.type === "checkbox") {
      return wrapOpen + '<label class="choice" for="nf-' + esc(f.id) + '"><input type="checkbox" ' + idAttr + ' value="Yes"' + (value && value !== "No" && value !== "false" ? " checked" : "") + (live ? " disabled" : "") + ">" + esc(f.label) + star + "</label></div>";
    }
    if (f.type === "checkbox-group") {
      const picked = Array.isArray(value) ? value : String(value || "").split(/\n|,/).map(function (x) { return x.trim(); }).filter(Boolean);
      const boxes = fieldOptions(f).map(function (o, i) {
        const rid = "nf-" + f.id + "-" + i;
        return '<label class="choice" for="' + esc(rid) + '"><input type="checkbox" id="' + esc(rid) + '" data-nf="' + esc(f.id) + '" data-nf-type="checkbox-group" data-nf-group="1" value="' + esc(o) + '"' + (picked.indexOf(o) >= 0 ? " checked" : "") + (live ? " disabled" : "") + ">" + esc(o) + "</label>";
      }).join("");
      return wrapOpen + '<fieldset><legend>' + esc(f.label) + star + "</legend>" + boxes + "</fieldset></div>";
    }
    if (f.type === "number") return wrapOpen + label + "<input " + idAttr + ' type="number" inputmode="decimal"' + req + ro + ' value="' + esc(value == null ? "" : value) + '"></div>';
    if (f.type === "date") return wrapOpen + label + "<input " + idAttr + ' type="date"' + req + ro + ' value="' + esc(value || "") + '"></div>';
    if (f.type === "time") return wrapOpen + label + "<input " + idAttr + ' type="time"' + req + ro + ' value="' + esc(value || "") + '"></div>';
    if (f.type === "signature") return wrapOpen + label + "<input " + idAttr + ' type="text" placeholder="Type your name"' + req + ro + ' value="' + esc(value || "") + '"></div>';
    if (f.type === "table") {
      const cols = (f.columns && f.columns.length) ? f.columns : ["Column 1"];
      const rows = Array.isArray(value) ? value : [];
      const shown = rows.length ? rows : [{}];
      const head = cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "<th></th>";
      const body = shown.map(function (row, ri) {
        const tds = cols.map(function (c) {
          return '<td><input data-col="' + esc(c) + '" value="' + esc(row[c] || "") + '" aria-label="' + esc(c) + '"></td>';
        }).join("");
        return "<tr>" + tds + '<td><button type="button" class="btn small" data-tbl-del-row="' + ri + '">Remove</button></td></tr>';
      }).join("");
      return wrapOpen + label +
        '<div class="note-table-wrap"><table class="note-table" data-nf-table="' + esc(f.id) + '" data-cols="' + esc(cols.join("|")) + '"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table>" +
        '<button type="button" class="btn small" data-tbl-add-row="' + esc(f.id) + '">Add row</button></div></div>';
    }
    if (f.type === "facemap") {
      const map = (typeof faceMapHtml === "function") ? faceMapHtml({ id: "inj-procedure" }, draft) : "";
      return wrapOpen + label + map + "</div>";
    }
    if (f.type === "other") {
      return wrapOpen + label +
        '<input id="faceOtherLabel" data-face-other-label type="text" value="' + esc(draft.otherLabel || value || "") + '" placeholder="Other area"></div>';
    }
    if (f.type === "units-sum") {
      const sum = (draft.facePoints || []).reduce(function (n, pt) { return n + (Number(pt.units) || 0); }, 0) + (Number(draft.otherUnits) || 0);
      return wrapOpen + label + '<p class="units-sum" data-units-sum>' + (sum ? String(sum) : "—") + (f.unit ? " " + esc(f.unit) : "") + "</p></div>";
    }
    if (f.type === "prose") {
      const text = value || "";
      return wrapOpen + label + "<textarea " + idAttr + " readonly>" + esc(text) + "</textarea></div>";
    }
    return wrapOpen + label + "<input " + idAttr + ' type="text"' + req + ro + ' value="' + esc(value || "") + '"></div>';
  }
  function ensureTplDraft() {
    if (state.tplDraft) return state.tplDraft;
    const list = currentNoteTemplates();
    const id = state.tplEditId || (list[0] && list[0].id);
    const src = getNoteTemplate(id) || list[0];
    state.tplDraft = src ? cloneTemplate(src) : {
      id: "custom-new", familyId: "custom-new", name: "New template", version: 1, hiddenFromNew: false,
      roles: ["RN / NP Injector"], sections: [{ id: "visit", title: "Visit", fields: [normalizeNoteField({ id: "notes", type: "textarea", label: "Notes" })] }]
    };
    state.tplEditId = state.tplDraft.id;
    return ensureHxSection(state.tplDraft);
  }
  function saveTemplateVersion() {
    const draft = cloneTemplate(ensureTplDraft());
    const familyId = draft.familyId || draft.id;
    draft.familyId = familyId;
    draft.name = (draft.name || "Untitled").trim() || "Untitled";
    draft.hiddenFromNew = false;
    store.noteTemplates = store.noteTemplates || [];
    const prev = store.noteTemplates.filter(function (t) { return (t.familyId || t.id) === familyId; });
    const maxV = prev.reduce(function (n, t) { return Math.max(n, Number(t.version) || 1); }, 0);
    prev.forEach(function (t) {
      if (!t.hiddenFromNew) {
        t.hiddenFromNew = true;
        if (t.id === familyId) t.id = familyId + "__v" + (t.version || 1);
      }
    });
    draft.version = maxV + 1;
    draft.id = familyId;
    store.noteTemplates.push(draft);
    persistNoteTemplates();
    state.tplDraft = cloneTemplate(draft);
    state.tplEditId = draft.id;
    state.tplDirty = false;
    toast("Published as version " + draft.version);
  }
  function exportNoteTemplates() {
    const blob = new Blob([JSON.stringify(store.noteTemplates || [], null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "brizza-note-templates.json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
    toast("Exported templates");
  }
  function importNoteTemplates(text, opts) {
    opts = opts || {};
    let parsed;
    try { parsed = JSON.parse(text); } catch (err) { toast("That file is not valid JSON."); return false; }
    if (!Array.isArray(parsed) || !parsed.length) { toast("Import needs a list of templates."); return false; }
    if (!opts.confirmed) {
      const names = parsed.map(function (t) { return (t && t.name) || t.id || "Untitled"; });
      showModal("Import templates",
        "<p>This replaces all note templates in this session.</p><ul>" + names.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>",
        function () { closeModal(); importNoteTemplates(text, { confirmed: true }); render(); },
        "Replace templates");
      return false;
    }
    store.noteTemplates = parsed.map(function (t) {
      const copy = cloneTemplate(t);
      copy.sections = (copy.sections || []).map(function (s) {
        s.fields = (s.fields || []).map(normalizeNoteField);
        return s;
      });
      copy.familyId = copy.familyId || copy.id;
      copy.version = copy.version || 1;
      return copy;
    });
    persistNoteTemplates();
    state.tplDraft = null;
    state.tplEditId = null;
    toast("Imported " + store.noteTemplates.length + " template versions");
    return true;
  }
  function tplEditorHtml() {
    const draft = ensureTplDraft();
    const advanced = !!state.tplAdvanced;
    const types = advanced ? noteFieldTypes() : simpleNoteFieldTypes();
    const sel = state.tplFieldSel || "";
    const roleOpts = ["MD / Clinic Owner", "RN / NP Injector", "Aesthetician"];
    const roles = roleOpts.map(function (r) {
      const on = (draft.roles || []).indexOf(r) >= 0;
      return '<label class="choice"><input type="checkbox" data-tpl-role="' + esc(r) + '"' + (on ? " checked" : "") + ">" + esc(r) + "</label>";
    }).join("");
    const canvas = (draft.sections || []).map(function (sec, si) {
      const locked = isHxSection(sec);
      const fields = (sec.fields || []).map(function (f, fi) {
        const key = si + "," + fi;
        const on = sel === key;
        return '<div class="tpl-canvas-field' + (on ? " is-on" : "") + (locked ? " is-locked" : "") + '" data-tpl-pick-field="' + key + '">' +
          '<div class="tpl-canvas-label">' + esc(f.label || "Field") + ' <span class="row-sub">' + esc((noteFieldTypes().find(function (t) { return t.id === f.type; }) || { label: f.type }).label) + (f.required ? " · required" : "") + "</span></div>" +
          (locked ? "" : '<div class="tpl-hover-actions">' +
            '<button type="button" class="btn small" data-tpl-move-field="' + key + '" data-dir="-1" title="Move up">↑</button>' +
            '<button type="button" class="btn small" data-tpl-move-field="' + key + '" data-dir="1" title="Move down">↓</button>' +
            '<button type="button" class="btn small" data-tpl-dup-field="' + key + '">Duplicate</button>' +
            '<button type="button" class="btn small" data-tpl-del-field="' + key + '">Delete</button></div>') +
          "</div>";
      }).join("") || '<div class="empty">No fields yet.</div>';
      return '<section class="tpl-sec-canvas' + (locked ? " is-locked" : "") + '">' +
        '<header class="tpl-sec-h"><h3>' + esc(sec.title || "Section") + (locked ? ' <span class="badge">Locked</span>' : "") + "</h3>" +
        (locked ? '<p class="row-sub">Required on every note and cannot be removed.</p>' :
          '<div class="tpl-hover-actions">' +
          '<button type="button" class="btn small" data-tpl-move-section="' + si + '" data-dir="-1">↑</button>' +
          '<button type="button" class="btn small" data-tpl-move-section="' + si + '" data-dir="1">↓</button>' +
          '<button type="button" class="btn small" data-tpl-del-section="' + si + '">Delete</button></div>') +
        "</header>" + fields +
        (locked ? "" : '<button type="button" class="btn small" data-tpl-add-field="' + si + '">Add field</button>') +
        "</section>";
    }).join("");
    let inspector = '<p class="row-sub">Select a field to edit its settings.</p>';
    if (sel) {
      const p = sel.split(",");
      const si = Number(p[0]), fi = Number(p[1]);
      const sec = (draft.sections || [])[si];
      const f = sec && (sec.fields || [])[fi];
      if (f) {
        const typMeta = types.find(function (t) { return t.id === f.type; }) || types[0];
        const typeOpts = types.map(function (t) {
          return "<option value=\"" + t.id + "\"" + (f.type === t.id ? " selected" : "") + ">" + esc(t.label) + "</option>";
        }).join("");
        const widthOpts = [["full", "Full"], ["1/2", "1/2"], ["1/3", "1/3"], ["1/4", "1/4"]].map(function (w) {
          return "<option value=\"" + w[0] + "\"" + ((f.width || "full") === w[0] ? " selected" : "") + ">" + w[1] + "</option>";
        }).join("");
        const heightOpts = typMeta.hasHeight ? ("<label>Height <select data-tpl-f=\"" + si + "," + fi + "\" data-prop=\"height\">" +
          [["", "Default"], ["short", "Short"], ["medium", "Medium"], ["tall", "Tall"]].map(function (h) {
            return "<option value=\"" + h[0] + "\"" + ((f.height || "") === h[0] ? " selected" : "") + ">" + h[1] + "</option>";
          }).join("") + "</select></label>") : "";
        const optionsBlock = typMeta.hasOptions ? tplOptionsEditorHtml(si, fi, f.options, "options") : "";
        const colsBlock = typMeta.hasColumns ? tplOptionsEditorHtml(si, fi, f.columns, "columns") : "";
        const unitBlock = (f.type === "number" || f.type === "units-sum" || f.type === "facemap") ? ('<label>Unit <input data-tpl-f="' + si + "," + fi + '" data-prop="unit" value="' + esc(f.unit || "") + '"></label>') : "";
        const staticBlock = f.type === "static" ? ('<label>Text <textarea data-tpl-f="' + si + "," + fi + '" data-prop="staticText" rows="2">' + esc(f.staticText || "") + "</textarea></label>") : "";
        const pullOpts = pullInSources().map(function (s) {
          return "<option value=\"" + s.id + "\"" + (f.pullIn === s.id ? " selected" : "") + ">" + esc(s.label) + "</option>";
        }).join("");
        const advancedBits = advanced ? (
          '<label>Width <select data-tpl-f="' + si + "," + fi + '" data-prop="width">' + widthOpts + "</select></label>" +
          '<label>Pull-in <select data-tpl-f="' + si + "," + fi + '" data-prop="pullIn">' + pullOpts + "</select></label>" +
          '<label>Mode <select data-tpl-f="' + si + "," + fi + '" data-prop="pullMode">' +
          '<option value="copy"' + (f.pullMode !== "live" ? " selected" : "") + ">Copy once</option>" +
          '<option value="live"' + (f.pullMode === "live" ? " selected" : "") + ">Live read-only (freezes on sign)</option></select></label>"
        ) : "";
        inspector = '<div class="tpl-inspector">' +
          '<label>Label <input data-tpl-f="' + si + "," + fi + '" data-prop="label" value="' + esc(f.label) + '"></label>' +
          '<label>Type <select data-tpl-f="' + si + "," + fi + '" data-prop="type">' + typeOpts + "</select></label>" +
          heightOpts + unitBlock + optionsBlock + colsBlock + staticBlock +
          '<label class="choice"><input type="checkbox" data-tpl-f="' + si + "," + fi + '" data-prop="required"' + (f.required ? " checked" : "") + "> Required</label>" +
          advancedBits + "</div>";
      }
    }
    return '<div class="tpl-editor-grid">' +
      '<div class="tpl-canvas-col">' +
        '<div class="field"><label for="tplName">Template name</label><input id="tplName" data-tpl-name value="' + esc(draft.name || "") + '"></div>' +
        '<fieldset class="tpl-roles"><legend>Who uses this</legend>' + roles + "</fieldset>" +
        '<p class="row-sub">Version ' + esc(String(draft.version || 1)) + ". Publish keeps a history and hides older versions from new notes.</p>" +
        canvas +
        '<button type="button" class="btn" data-tpl-add-section>+ Section</button>' +
      "</div>" +
      '<aside class="tpl-settings-col"><h3>Field settings</h3>' + inspector +
        '<label class="choice" style="margin-top:16px"><input type="checkbox" data-tpl-advanced="1"' + (advanced ? " checked" : "") + "> Advanced</label>" +
      "</aside></div>";
  }
  function tplPreviewHtml() {
    const draft = ensureTplDraft();
    const sample = { values: {}, pid: "BZ0001", apptId: null, facePoints: [], otherLabel: "", otherUnits: "" };
    applyPullIns(sample, draft);
    return '<div class="tpl-preview" id="tplPreview"><h3>Preview</h3>' + templateFieldsHtml(draft, sample, { preview: true }) + "</div>";
  }
  function refreshTplPreview() {
    const el = document.getElementById("tplPreview");
    if (!el) return;
    el.outerHTML = tplPreviewHtml();
  }
  function tplHistoryHtml(draft) {
    const family = (draft && (draft.familyId || draft.id)) || "";
    const versions = (store.noteTemplates || []).filter(function (t) { return (t.familyId || t.id) === family; })
      .sort(function (a, b) { return (Number(b.version) || 0) - (Number(a.version) || 0); });
    if (!versions.length) return "<p>No history yet.</p>";
    return "<ul>" + versions.map(function (t) {
      return "<li>v" + esc(String(t.version || 1)) + " · " + esc(t.name) + (t.hiddenFromNew ? " (previous)" : " (current)") + "</li>";
    }).join("") + "</ul>";
  }
  function renderTemplateBuilder() {
    const canEdit = canEditTemplates();
    const list = currentNoteTemplates();
    if (!canEdit) {
      const items = list.map(function (tpl) {
        return '<div class="row"><div><div class="row-title">' + esc(tpl.name) + '</div><div class="row-sub">v' + esc(String(tpl.version || 1)) + " · " + esc((tpl.roles || []).join(", ") || "All clinical") + "</div></div></div>";
      }).join("") || '<p class="row-sub">No templates.</p>';
      const suggest = isClinicalRole() ? '<button type="button" class="btn primary" data-tpl-suggest="1">Suggest a change</button>' : "";
      const head = pageHead("", "Note templates", "Providers can suggest a change. Owner and Manager publish templates.", suggest);
      renderAdminChrome(head, '<div class="card"><div class="cardbody">' + items + "</div></div>");
      return;
    }
    const draft = ensureTplDraft();
    const items = list.map(function (tpl) {
      const on = (tpl.id === draft.id || tpl.familyId === draft.familyId) && !tpl.hiddenFromNew;
      return '<button type="button" class="row tpl-pick' + (on ? " is-on" : "") + '" data-tpl-select="' + esc(tpl.id) + '"><span>' + esc(tpl.name) +
        '</span><span class="row-sub">v' + esc(String(tpl.version || 1)) + " · " + esc((tpl.roles || []).join(", ") || "All clinical") + "</span></button>";
    }).join("") || '<p class="row-sub">No current templates.</p>';
    const ownerTools = isOwnerRole() || state.actingRole === "Clinic Manager";
    const more = state.tplMoreOpen ? (
      '<div class="tpl-more-menu">' +
        '<button type="button" class="btn small" data-tpl-history="1">History</button>' +
        (ownerTools ? '<button type="button" class="btn small" data-tpl-export>Export</button><button type="button" class="btn small" data-tpl-import>Import</button>' : "") +
      "</div>"
    ) : "";
    const head = pageHead("", "Note templates", "",
      '<button type="button" class="btn small" data-tpl-new>New template</button>' +
      '<button type="button" class="btn small primary" data-tpl-save>Publish</button>' +
      '<button type="button" class="btn small" data-tpl-more="1" aria-expanded="' + (state.tplMoreOpen ? "true" : "false") + '">⋯ More</button>' +
      more +
      '<input id="tplImportFile" type="file" accept="application/json,.json" hidden>');
    const body = '<div class="tpl-builder" id="tplBuilder">' +
      '<div class="card"><div class="cardhead"><h2>Templates</h2></div><div class="cardbody tpl-list">' + items + "</div></div>" +
      '<div class="tpl-main">' + tplEditorHtml() + tplPreviewHtml() + "</div></div>";
    renderAdminChrome(head, body);
  }
  function moveItem(arr, i, dir) {
    const j = i + Number(dir);
    if (!arr || j < 0 || j >= arr.length) return;
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  function handleTplBuilderClick(e) {
    const optBtn = e.target.closest("[data-tpl-opt-add], [data-tpl-opt-del], [data-tpl-opt-move]");
    if (optBtn) {
      e.preventDefault();
      const prop = optBtn.getAttribute("data-prop") || "options";
      if (optBtn.hasAttribute("data-tpl-opt-add")) {
        const p = optBtn.getAttribute("data-tpl-opt-add").split(",");
        const list = tplFieldOptions(Number(p[0]), Number(p[1]), prop);
        list.push("");
        markTplDirty();
        render();
        return true;
      }
      if (optBtn.hasAttribute("data-tpl-opt-del")) {
        const p = optBtn.getAttribute("data-tpl-opt-del").split(",");
        const list = tplFieldOptions(Number(p[0]), Number(p[1]), prop);
        list.splice(Number(p[2]), 1);
        markTplDirty();
        render();
        return true;
      }
      if (optBtn.hasAttribute("data-tpl-opt-move")) {
        const p = optBtn.getAttribute("data-tpl-opt-move").split(",");
        const list = tplFieldOptions(Number(p[0]), Number(p[1]), prop);
        const i = Number(p[2]), dir = Number(p[3]), j = i + dir;
        if (j >= 0 && j < list.length) {
          const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
          markTplDirty();
          render();
        }
        return true;
      }
    }
    const t = e.target.closest("[data-tpl-select], [data-tpl-new], [data-tpl-save], [data-tpl-export], [data-tpl-import], [data-tpl-add-section], [data-tpl-del-section], [data-tpl-move-section], [data-tpl-add-field], [data-tpl-del-field], [data-tpl-move-field], [data-tpl-dup-field], [data-tpl-pick-field], [data-tpl-more], [data-tpl-history], [data-tpl-suggest], [data-tbl-add-row], [data-tbl-del-row]");
    if (!t) return false;
    e.preventDefault();
    if (t.hasAttribute("data-tpl-suggest")) {
      showModal("Suggest a change",
        '<div class="field"><label for="tplSuggest">What should change?</label><textarea id="tplSuggest" rows="4" placeholder="Describe the change"></textarea></div>',
        function () {
          const text = ($("#tplSuggest") && $("#tplSuggest").value.trim()) || "";
          if (!text) { toast("Enter a suggestion"); return; }
          store.tasks = store.tasks || [];
          store.tasks.push({ id: nextId("T-", store.tasks), kind: "template", text: "Template suggestion · " + text, patientId: "", appointmentId: null, owner: "Dr. Valentina A. Rossi, MD", due: todayET(), done: false, createdAt: nowET() });
          closeModal();
          toast("Suggestion sent to the Owner");
          render();
        },
        "Send suggestion");
      return true;
    }
    if (t.hasAttribute("data-tpl-more")) { state.tplMoreOpen = !state.tplMoreOpen; render(); return true; }
    if (t.hasAttribute("data-tpl-history")) {
      showModal("Template history", tplHistoryHtml(ensureTplDraft()), function () { closeModal(); }, "Close");
      return true;
    }
    if (t.hasAttribute("data-tpl-select")) {
      if (!confirmLeaveTpl()) return true;
      state.tplDirty = false;
      state.tplEditId = t.getAttribute("data-tpl-select");
      state.tplDraft = null;
      state.tplFieldSel = "";
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-new")) {
      if (!confirmLeaveTpl()) return true;
      const id = "custom-" + Math.random().toString(36).slice(2, 8);
      state.tplDraft = ensureHxSection({
        id: id, familyId: id, name: "New template", version: 0, hiddenFromNew: false,
        roles: ["RN / NP Injector"],
        sections: [{ id: "visit", title: "Visit", fields: [normalizeNoteField({ id: "notes", type: "textarea", label: "Notes", width: "full" })] }]
      });
      state.tplEditId = id;
      state.tplDirty = true;
      state.tplFieldSel = "";
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-save")) { saveTemplateVersion(); render(); return true; }
    if (t.hasAttribute("data-tpl-export")) { exportNoteTemplates(); return true; }
    if (t.hasAttribute("data-tpl-import")) {
      const inp = document.getElementById("tplImportFile");
      if (inp) inp.click();
      return true;
    }
    const draft = ensureTplDraft();
    if (t.hasAttribute("data-tpl-pick-field")) {
      state.tplFieldSel = t.getAttribute("data-tpl-pick-field");
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-add-section")) {
      draft.sections = draft.sections || [];
      draft.sections.push({ id: "s-" + Math.random().toString(36).slice(2, 6), title: "New section", fields: [] });
      markTplDirty();
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-del-section")) {
      const si = Number(t.getAttribute("data-tpl-del-section"));
      const sec = draft.sections[si];
      if (isHxSection(sec)) { toast("Medical history cannot be removed"); return true; }
      const snap = draft.sections.splice(si, 1)[0];
      markTplDirty();
      toast("Section deleted", { undo: function () { draft.sections.splice(si, 0, snap); render(); } });
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-move-section")) {
      moveItem(draft.sections, Number(t.getAttribute("data-tpl-move-section")), t.getAttribute("data-dir"));
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-add-field")) {
      const si = Number(t.getAttribute("data-tpl-add-field"));
      draft.sections[si].fields = draft.sections[si].fields || [];
      draft.sections[si].fields.push(normalizeNoteField({ id: nextFieldId(draft), type: "text", label: "New field", width: "full" }));
      markTplDirty();
      state.tplFieldSel = si + "," + (draft.sections[si].fields.length - 1);
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-del-field")) {
      const p = t.getAttribute("data-tpl-del-field").split(",");
      const si = Number(p[0]), fi = Number(p[1]);
      if (isHxSection(draft.sections[si])) { toast("Medical history cannot be removed"); return true; }
      const snap = draft.sections[si].fields.splice(fi, 1)[0];
      markTplDirty();
      toast("Field deleted", { undo: function () { draft.sections[si].fields.splice(fi, 0, snap); render(); } });
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-dup-field")) {
      const p = t.getAttribute("data-tpl-dup-field").split(",");
      const si = Number(p[0]), fi = Number(p[1]);
      const src = draft.sections[si].fields[fi];
      const copy = normalizeNoteField(Object.assign({}, src, { id: nextFieldId(draft), label: (src.label || "Field") + " copy" }));
      draft.sections[si].fields.splice(fi + 1, 0, copy);
      markTplDirty();
      render();
      return true;
    }
    if (t.hasAttribute("data-tpl-move-field")) {
      const p = t.getAttribute("data-tpl-move-field").split(",");
      moveItem(draft.sections[Number(p[0])].fields, Number(p[1]), t.getAttribute("data-dir"));
      render();
      return true;
    }
    if (t.hasAttribute("data-tbl-add-row")) {
      const tbl = document.querySelector('[data-nf-table="' + t.getAttribute("data-tbl-add-row") + '"] tbody');
      if (tbl) {
        const cols = (tbl.parentNode.getAttribute("data-cols") || "").split("|");
        const tr = document.createElement("tr");
        tr.innerHTML = cols.map(function (c) { return '<td><input data-col="' + c + '" aria-label="' + c + '"></td>'; }).join("") +
          '<td><button type="button" class="btn small" data-tbl-del-row>Remove</button></td>';
        tbl.appendChild(tr);
      }
      return true;
    }
    if (t.hasAttribute("data-tbl-del-row")) {
      const tr = t.closest("tr");
      if (tr) tr.remove();
      return true;
    }
    return false;
  }
  function handleTplBuilderChange(e) {
    const optVal = e.target.closest && e.target.closest("[data-tpl-opt-val]");
    if (optVal) {
      const p = optVal.getAttribute("data-tpl-opt-val").split(",");
      const prop = optVal.getAttribute("data-prop") || "options";
      const list = tplFieldOptions(Number(p[0]), Number(p[1]), prop);
      list[Number(p[2])] = optVal.value;
      markTplDirty();
      return true;
    }
    const el = e.target;
    if (!el || !el.getAttribute) return false;
    if (el.id === "tplImportFile" && el.files && el.files[0]) {
      const reader = new FileReader();
      reader.onload = function () { if (importNoteTemplates(String(reader.result || ""))) render(); };
      reader.readAsText(el.files[0]);
      el.value = "";
      return true;
    }
    if (el.hasAttribute("data-tpl-advanced")) { state.tplAdvanced = !!el.checked; render(); return true; }
    if (el.hasAttribute("data-tpl-name")) { ensureTplDraft().name = el.value; markTplDirty(); return true; }
    if (el.hasAttribute("data-tpl-role") || el.hasAttribute("data-tpl-f") || el.hasAttribute("data-tpl-sec-title")) markTplDirty();
    if (el.hasAttribute("data-tpl-role")) {
      const draft = ensureTplDraft();
      const role = el.getAttribute("data-tpl-role");
      draft.roles = draft.roles || [];
      if (el.checked && draft.roles.indexOf(role) < 0) draft.roles.push(role);
      if (!el.checked) draft.roles = draft.roles.filter(function (r) { return r !== role; });
      return true;
    }
    if (el.hasAttribute("data-tpl-sec-title")) {
      const i = Number(el.getAttribute("data-tpl-sec-title"));
      if (ensureTplDraft().sections[i]) ensureTplDraft().sections[i].title = el.value;
      refreshTplPreview();
      return true;
    }
    if (el.hasAttribute("data-tpl-f")) {
      const p = el.getAttribute("data-tpl-f").split(",");
      const field = ensureTplDraft().sections[Number(p[0])] && ensureTplDraft().sections[Number(p[0])].fields[Number(p[1])];
      if (!field) return true;
      const prop = el.getAttribute("data-prop");
      if (prop === "required") field.required = !!el.checked;
      else if (prop === "options" || prop === "columns") field[prop] = parseOptions(el.value);
      else field[prop] = el.type === "checkbox" ? !!el.checked : el.value;
      if (prop === "type" || prop === "width" || prop === "height") render();
      else refreshTplPreview();
      return true;
    }
    return false;
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
    if (r.selected) { state.selected = r.selected; state.tab = normalizePatientTab(r.tab || "snapshot"); }
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

  function modalIsOpen() {
    const back = $("#modal");
    return !!(back && back.classList.contains("open"));
  }
  function currentModalReopen() {
    if (!modalIsOpen()) return null;
    if ($("#modal").classList.contains("pos-mode") && state.invoiceId) {
      return { type: "invoice", id: state.invoiceId, apptId: state.posAppointmentId || null };
    }
    if (state.appointmentId && document.querySelector("[data-appt-card]")) {
      return { type: "appointment", id: state.appointmentId };
    }
    return null;
  }
  function screenRouteFromState() {
    const view = (state.scheduleView === "list") ? "worklist" : (state.scheduleView || "worklist");
    return {
      page: state.page,
      date: state.page === "rooming" ? (state.roomingDate || state.date) : state.date,
      view: view,
      calMode: state.calMode,
      selected: state.selected,
      tab: state.tab,
      notesDash: state.notesDash,
      invTab: state.invTab,
      adminTab: state.adminTab,
      posTab: state.posTab,
      invoiceId: state.page === "pos" ? state.invoiceId : null,
      visitId: state.page === "visit" ? state.visitId : null,
      auditId: state.page === "audit" ? state.auditId : null,
      quoteId: state.page === "pos" ? state.quoteId : null,
      appointmentId: null
    };
  }
  function captureReturnContext(extra) {
    const main = $("#main");
    const cal = document.querySelector(".cal-grid-week, .cal-grid, .cal-month, .cal-day");
    const wl = document.querySelector(".wl, [data-worklist]");
    return Object.assign({
      hash: hashFor(screenRouteFromState()),
      page: state.page,
      scheduleView: state.scheduleView,
      calMode: state.calMode,
      date: state.date,
      roomingDate: state.roomingDate,
      locationId: state.locationId,
      compareLocations: !!state.compareLocations,
      providerChips: (state.providerChips || []).slice(),
      selected: state.selected,
      tab: state.tab,
      notesDash: state.notesDash,
      invTab: state.invTab,
      adminTab: state.adminTab,
      posTab: state.posTab,
      invoiceId: state.invoiceId,
      quoteId: state.quoteId,
      appointmentId: null,
      reopen: null,
      scrollY: window.scrollY || 0,
      mainScroll: main ? main.scrollTop : 0,
      calScroll: cal ? cal.scrollTop : 0,
      wlScroll: wl ? wl.scrollTop : 0
    }, extra || {});
  }
  var returnStack = [];
  function pushReturnContext(extra) {
    returnStack.push(captureReturnContext(extra));
  }
  function clearReturnStack() {
    returnStack.length = 0;
  }
  function reopenModal(desc) {
    if (!desc) return;
    if (desc.type === "appointment" && desc.id) openAppointmentModal(desc.id, { skipPush: true });
    else if (desc.type === "invoice" && desc.id) openInvoicePopup(invoice(desc.id), desc.apptId, { skipPush: true });
  }
  function restoreReturnContext() {
    const ctx = returnStack.pop();
    if (!ctx) return;
    state.page = ctx.page;
    state.scheduleView = ctx.scheduleView;
    state.calMode = ctx.calMode;
    state.date = ctx.date;
    state.roomingDate = ctx.roomingDate;
    if (ctx.locationId) state.locationId = ctx.locationId;
    state.compareLocations = !!ctx.compareLocations;
    if (ctx.providerChips && ctx.providerChips.length) state.providerChips = ctx.providerChips.slice();
    if (ctx.selected) state.selected = ctx.selected;
    if (ctx.tab) state.tab = ctx.tab;
    if (ctx.notesDash) state.notesDash = ctx.notesDash;
    if (ctx.invTab) state.invTab = ctx.invTab;
    if (ctx.adminTab) state.adminTab = ctx.adminTab;
    if (ctx.posTab) state.posTab = ctx.posTab;
    state.appointmentId = null;
    const nextHash = ctx.hash || hashFor(screenRouteFromState());
    if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
    render();
    const main = $("#main");
    if (main && ctx.mainScroll) main.scrollTop = ctx.mainScroll;
    if (ctx.scrollY) window.scrollTo(0, ctx.scrollY);
    const cal = document.querySelector(".cal-grid-week, .cal-grid, .cal-month, .cal-day");
    if (cal && ctx.calScroll) cal.scrollTop = ctx.calScroll;
    const wl = document.querySelector(".wl, [data-worklist]");
    if (wl && ctx.wlScroll) wl.scrollTop = ctx.wlScroll;
    if (ctx.reopen) reopenModal(ctx.reopen);
  }
  function closeModal(opts) {
    opts = opts || {};
    clearNoteFootButtons();
    const back = $("#modal");
    if (back) back.classList.remove("open", "pos-mode", "hist-mode", "book-mode", "hide-foot");
    if (opts.cancelPending) state.reschedulingId = null;
    if (opts.skipRestore) {
      state.appointmentId = null;
      return;
    }
    restoreReturnContext();
  }
  function syncModalFooter(onSave, saveLabel) {
    const save = $("#modalSave");
    const cancel = $("#modalCancel");
    saveLabel = saveLabel || "Save";
    const dismissOnly = !onSave || /^close$/i.test(String(saveLabel).trim());
    if (save) {
      save.disabled = false;
      save.title = "";
      save.removeAttribute("title");
      if (dismissOnly) {
        save.hidden = true;
        save.onclick = null;
        save.textContent = "Save";
        save.classList.remove("btn-lg");
      } else {
        save.hidden = false;
        save.textContent = saveLabel;
        save.onclick = onSave;
        save.classList.toggle("btn-lg", saveLabel === "Save appointment" || saveLabel === "Save patient");
      }
    }
    if (cancel) {
      cancel.hidden = false;
      cancel.textContent = (saveLabel === "Leave on balance") ? "Go back" : "Close";
    }
  }
  function showModal(title, body, onSave, saveLabel) {
    const skip = !!(state._skipModalPush);
    state._skipModalPush = false;
    if (!skip && !modalIsOpen()) pushReturnContext({ kind: "dialog" });
    clearNoteFootButtons();
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    syncModalFooter(onSave, saveLabel);
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
    if (el.tagName === "SELECT" && ![].some.call(el.options || [], function (o) { return o.value === v; })) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = mins + " min";
      el.appendChild(opt);
    }
    el.value = v;
  }
  function bookTimeSteps(from, to) {
    const out = [];
    for (let n = toMinutes(from); n <= toMinutes(to); n += 15) out.push(fromMinutes(n));
    return out;
  }
  function endOptionsAfter(start, selected) {
    const startM = toMinutes(start);
    const mins = bookSelectedMinutes();
    let sel = selected;
    if (!sel || toMinutes(sel) <= startM) sel = fromMinutes(startM + mins);
    const times = bookTimeSteps(fromMinutes(startM + 15), "20:00");
    if (times.indexOf(sel) < 0) times.push(sel);
    times.sort(function (a, b) { return toMinutes(a) - toMinutes(b); });
    return timeOptions(sel, times);
  }
  function refreshEndOptions(preferred) {
    const startEl = $("#fTime");
    const endEl = $("#fEnd");
    if (!startEl || !endEl) return;
    const start = startEl.value;
    const mins = bookSelectedMinutes();
    let endVal = preferred || endEl.value || fromMinutes(toMinutes(start) + mins);
    if (toMinutes(endVal) <= toMinutes(start)) endVal = fromMinutes(toMinutes(start) + mins);
    endEl.innerHTML = endOptionsAfter(start, endVal);
    endEl.value = endVal;
    const dur = toMinutes(endVal) - toMinutes(start);
    if (dur > 0) ensureDurationOption(dur);
  }
  function syncBookTimes(source) {
    const startEl = $("#fTime");
    const endEl = $("#fEnd");
    if (!startEl || !endEl) { updateBookDuration(); return; }
    if (source === "type") {
      const mins = durationMinutes($("#fType") ? $("#fType").value : "", selectedBookReasons()) || 30;
      ensureDurationOption(mins);
      refreshEndOptions(fromMinutes(toMinutes(startEl.value) + mins));
    } else if (source === "start" || source === "dur") {
      refreshEndOptions(fromMinutes(toMinutes(startEl.value) + bookSelectedMinutes()));
    } else if (source === "end") {
      if (toMinutes(endEl.value) <= toMinutes(startEl.value)) {
        refreshEndOptions(fromMinutes(toMinutes(startEl.value) + bookSelectedMinutes()));
      } else {
        ensureDurationOption(toMinutes(endEl.value) - toMinutes(startEl.value));
        refreshEndOptions(endEl.value);
      }
    }
    updateBookDuration();
    updateBookSaveState();
  }
  function isStandaloneNewPatientModal() {
    return !!( $("#npFirst") && !$("#fType") && !$("#bookApptGrid") );
  }
  function newPatientMissingRequired() {
    const missing = [];
    if (!$("#npFirst") || !$("#npFirst").value.trim()) missing.push("First name");
    if (!$("#npLast") || !$("#npLast").value.trim()) missing.push("Last name");
    if (!parseDob($("#npDob") ? $("#npDob").value : "")) missing.push("Date of birth");
    if (!$("#npPhone") || !$("#npPhone").value.trim()) missing.push("Phone");
    return missing;
  }
  function fieldIdForMissing(label) {
    const map = {
      "First name": "npFirst",
      "Last name": "npLast",
      "Date of birth": "npDob",
      "Date of birth (mm/dd/yyyy)": "npDob",
      "Phone": "npPhone",
      "Patient": "fPatientSearch",
      "Appointment type": "fType",
      "Provider": "fProvider",
      "Primary provider": "fProvider",
      "Date": "fDate",
      "Start time": "fTime",
      "End time": "fEnd",
      "Location": "fLocation",
      "Reason": "fReason",
      "Appointment reason": "fReason",
      "Admin override reason": "fOverride",
      "Outside-hours reason": "fOutsideReason",
      "Reason for booking outside office hours": "fOutsideReason",
      "Outside-availability reason": "fAvailReason",
      "Reason for booking outside provider availability": "fAvailReason",
      "Lunch-hours reason": "fLunchReason",
      "Reason for booking during lunch": "fLunchReason"
    };
    if (map[label]) return map[label];
    if (/clinic closed/i.test(label) || /^Date \(/.test(label)) return "fDate";
    return "";
  }
  function highlightMissingRequired(missing) {
    const labels = missing || [];
    const ids = {};
    labels.forEach(function (lab) {
      const id = fieldIdForMissing(lab);
      if (id) ids[id] = true;
    });
    $$("#modal .field").forEach(function (field) {
      const ctl = field.querySelector("input, select, textarea");
      const on = !!(ctl && ctl.id && ids[ctl.id]);
      field.classList.toggle("is-missing", on);
      if (ctl) ctl.setAttribute("aria-invalid", on ? "true" : "false");
    });
    const warn = $("#npWarn") || $("#bookWarn");
    if (warn) {
      warn.innerHTML = labels.length ? ('<div class="notice" role="alert">Required fields missing: ' + labels.map(esc).join(", ") + ".</div>") : "";
    }
  }
  function setModalSaveEnabled(save, missing, verb) {
    if (!save) return;
    const miss = missing || [];
    save.disabled = miss.length > 0;
    save.title = miss.length ? ((verb || "Save") + " stays disabled until required fields are filled: " + miss.join(", ")) : "";
    highlightMissingRequired(miss);
  }
  function bookMissingRequired() {
    if (isStandaloneNewPatientModal()) return newPatientMissingRequired();
    const newStep = $("#bookNewStep") && !$("#bookNewStep").hidden;
    if (newStep) return ["New patient"];
    const pid = ($("#fPatient") && $("#fPatient").value) || "";
    const pending = $("#bookNewPending") && $("#bookNewPending").value === "1";
    const missing = [];
    if (!pid && !pending) missing.push("Patient");
    if (pending) {
      if (!$("#npFirst") || !$("#npFirst").value.trim()) missing.push("First name");
      if (!$("#npLast") || !$("#npLast").value.trim()) missing.push("Last name");
      if (!parseDob($("#npDob") ? $("#npDob").value : "")) missing.push("Date of birth");
      if (!$("#npPhone") || !$("#npPhone").value.trim()) missing.push("Phone");
    }
    const type = $("#fType") ? $("#fType").value : "";
    const date = $("#fDate") ? $("#fDate").value : "";
    const time = $("#fTime") ? $("#fTime").value : "";
    const end = $("#fEnd") ? $("#fEnd").value : "";
    const provider = $("#fProvider") ? $("#fProvider").value : "";
    const locationId = $("#fLocation") ? $("#fLocation").value : "";
    const reasons = selectedBookReasons();
    let consultingFor = $("#fConsultingFor") ? $("#fConsultingFor").value : "";
    if (isConsultType(type)) consultingFor = consultingFor || (reasons[0] || "");
    if (!type) missing.push("Appointment type");
    if (!provider) missing.push("Provider");
    if (!date) missing.push("Date");
    else if (isClinicClosedDay(date)) missing.push(holidayName(date) ? "Date (" + holidayName(date) + ", clinic closed)" : "Date");
    if (!time) missing.push("Start time");
    if (!end || (time && toMinutes(end) <= toMinutes(time))) missing.push("End time");
    if (!locationId) missing.push("Location");
    if (isConsultType(type) ? !consultingFor : !reasons.length) missing.push("Reason");
    const hits = overlappingBlocks(date, time, type, reasons, provider, bookSelectedMinutes());
    const override = $("#fOverride") ? $("#fOverride").value.trim() : "";
    if (hits.length && !override) missing.push("Admin override reason");
    const closed = date && isClinicClosedDay(date);
    const outside = !closed && date && time && isOutsideClinicHours(date, time);
    const outsideReason = ($("#fOutsideReason") && $("#fOutsideReason").value.trim()) || "";
    if (outside && !outsideReason) missing.push("Outside-hours reason");
    const availOff = !closed && !outside && date && time && provider && isOutsideProviderAvailability(date, time, end, provider, locationId);
    const availReason = ($("#fAvailReason") && $("#fAvailReason").value.trim()) || "";
    if (availOff && !availReason) missing.push("Outside-availability reason");
    const lunch = date && time && !closed && appointmentTouchesLunch(date, time, end, provider);
    const lunchReason = ($("#fLunchReason") && $("#fLunchReason").value.trim()) || "";
    if (lunch && !lunchReason) missing.push("Lunch-hours reason");
    const roleNeed = providerRoleMismatch(type, provider);
    if (roleNeed) updateProviderRoleWarn();
    return missing;
  }
  function updateBookSaveState() {
    const save = $("#modalSave");
    if (!save || !$("#modal").classList.contains("book-mode")) return;
    if (isStandaloneNewPatientModal()) {
      setModalSaveEnabled(save, newPatientMissingRequired(), "Save");
      return;
    }
    const onNew = $("#bookNewStep") && !$("#bookNewStep").hidden;
    if (onNew) {
      setModalSaveEnabled(save, ["New patient"], "Save");
      return;
    }
    setModalSaveEnabled(save, bookMissingRequired(), "Save");
  }
  function providerOptionsHtml(selected) {
    const names = BRIZZA.PROVIDERS || [];
    const sel = selected || names[0] || "";
    return names.map(function (n) {
      return "<option value=\"" + esc(n) + "\"" + (n === sel ? " selected" : "") + ">" + esc(n) + "</option>";
    }).join("");
  }
  function bookPatientChipHtml(p) {
    if (!p) return "";
    return '<div class="book-patient-chip" aria-label="Patient"><strong>' + esc(p.name) + "</strong> <span>" +
      esc(fmtDob(p.dob)) + " · " + esc(displayId(p.id)) + "</span></div>";
  }
  function openBook(pid, preset) {
    preset = preset || {};
    const lockPatient = !!preset.lockPatient;
    const sel = pid || "";
    const p0 = sel ? patient(sel) : null;
    const dateVal = preset.date || state.date || todayET();
    const timeVal = preset.time || "10:00";
    const provVal = preset.provider || slotProvider() || (BRIZZA.PROVIDERS[0] || "");
    const locVal = preset.locationId || state.locationId || BRIZZA.DEFAULT_LOCATION;
    const typeVal = (preset && preset.type) || "Consultation";
    const durMins = durationMinutes(typeVal, preset.reasons || []) || 30;
    const endVal = fromMinutes(toMinutes(timeVal) + durMins);
    const locOpts = (BRIZZA.LOCATIONS || []).map((l) => "<option value=\"" + esc(l.id) + "\"" + (locVal === l.id ? " selected" : "") + ">" + esc(l.name) + (l.synthetic ? " (synthetic)" : "") + "</option>").join("");
    const startTimes = bookTimeSteps("08:00", "19:00");
    const patientBlock = lockPatient && p0
      ? (bookPatientChipHtml(p0) + '<input type="hidden" id="fPatient" required value="' + esc(p0.id) + '">')
      : ('<div class="field full" id="bookPatientField">' +
          '<label for="fPatientSearch">Patient <span class="req">required</span></label>' +
          '<input type="hidden" id="fPatient" required value="' + esc(sel || "") + '">' +
          '<button type="button" class="patient-picked" id="fPatientPicked" aria-expanded="false">' +
            (p0 ? esc(p0.name) + " · " + esc(fmtDob(p0.dob)) + " · " + esc(displayId(p0.id)) : "Select a patient") +
          "</button>" +
          '<div id="fPatientSearchWrap" hidden>' +
            '<input id="fPatientSearch" placeholder="Search name, #ID, or DOB (mm/dd/yyyy)" autocomplete="off">' +
            '<div id="fPatientResults" class="patient-results" role="listbox"></div>' +
          "</div>" +
          '<button class="btn small" type="button" id="bookNewToggle">+ Add new patient</button>' +
        "</div>");
    const newStep = lockPatient ? "" : (
      '<div id="bookNewStep" hidden class="book-new-step">' +
        '<input type="hidden" id="bookNewPending" value="">' +
        '<div class="formgrid">' +
          '<div class="field"><label for="npFirst">First name <span class="req">required</span></label><input id="npFirst"></div>' +
          '<div class="field"><label for="npLast">Last name <span class="req">required</span></label><input id="npLast"></div>' +
          '<div class="field"><label for="npDob">Date of birth <span class="req">required</span></label><input id="npDob" placeholder="mm/dd/yyyy" inputmode="numeric" data-mask="dob"></div>' +
          '<div class="field"><label for="npPhone">Phone <span class="req">required</span></label><input id="npPhone" placeholder="(XXX) XXX-XXXX" inputmode="tel" data-mask="phone"></div>' +
          '<div class="field full"><label>Address</label>' + addressFieldsHtml(emptyAddress(), "bkAddr") + "</div>" +
        "</div>" +
        '<div class="actions" style="margin-top:12px">' +
          '<button type="button" class="btn" id="bookNewBack">Back</button>' +
          '<button type="button" class="btn primary" id="bookNewContinue">Continue</button>' +
        "</div>" +
      "</div>"
    );
    const apptGrid = '<p class="row-sub book-req-legend">Fields marked <span class="req">required</span> must be completed before the appointment is saved.</p>' +
      '<div class="book-grid formgrid" id="bookApptGrid">' +
      '<div class="field"><label for="fType">Appointment type <span class="req">required</span></label>' +
        '<select id="fType" required>' + typesList().map((tp) => "<option" + (typeVal === tp.name ? " selected" : "") + ">" + esc(tp.name) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="fProvider">Provider <span class="req">required</span></label>' +
        '<select id="fProvider" required>' + providerOptionsHtml(provVal) + "</select></div>" +
      '<div class="field"><label for="fDate">Date <span class="req">required</span></label>' +
        '<input type="date" id="fDate" required value="' + esc(dateVal) + '"></div>' +
      '<div class="field"><div class="book-times">' +
        '<div><label for="fTime">Start <span class="req">required</span></label>' +
          '<select id="fTime" required>' + timeOptions(timeVal, startTimes) + "</select></div>" +
        '<div><label for="fEnd">End <span class="req">required</span></label>' +
          '<select id="fEnd" required>' + endOptionsAfter(timeVal, endVal) + "</select></div>" +
      "</div></div>" +
      '<div class="field"><label for="fLocation">Location <span class="req">required</span></label>' +
        '<select id="fLocation" required>' + locOpts + "</select></div>" +
      '<div class="field"><label for="fReason">Reason <span class="req">required</span></label>' +
        '<div id="reasonOptions">' + reasonDropdownHtml(typeVal, preset.reasons || [], preset.consultingFor || "") + "</div></div>" +
      '<div class="field full"><label for="fPrepNotes">Notes</label><textarea id="fPrepNotes" rows="2"></textarea></div>' +
      '<input type="hidden" id="fDuration" value="' + esc(String(durMins)) + '">' +
      '<div class="field full" id="overrideWrap"></div>' +
      '<div class="field full" id="hoursWrap"></div>' +
      '<div class="field full" id="roleWrap"></div>' +
      '<div class="field full" id="depositCue"></div>' +
      '<div class="field full" id="bookWarn"></div>' +
    "</div>";
    showModal("New appointment",
      '<div class="book-flow">' + newStep + '<div id="bookApptStep">' + patientBlock + apptGrid + "</div></div>",
      function () { saveAppt(); }, "Save appointment");
    $("#modal").classList.add("book-mode");
    bindPatientPicker();
    const showNewStep = function (on) {
      const step = $("#bookNewStep");
      const appt = $("#bookApptStep");
      if (step) step.hidden = !on;
      if (appt) appt.hidden = !!on;
      const save = $("#modalSave");
      if (save) save.style.display = on ? "none" : "";
      updateBookSaveState();
    };
    if ($("#bookNewToggle")) $("#bookNewToggle").addEventListener("click", function () {
      showNewStep(true);
      if ($("#npFirst")) $("#npFirst").focus();
    });
    if ($("#bookNewBack")) $("#bookNewBack").addEventListener("click", function () {
      showNewStep(false);
    });
    if ($("#bookNewContinue")) $("#bookNewContinue").addEventListener("click", function () {
      const first = ($("#npFirst") && $("#npFirst").value.trim()) || "";
      const last = ($("#npLast") && $("#npLast").value.trim()) || "";
      const dob = parseDob($("#npDob") ? $("#npDob").value : "");
      const phone = ($("#npPhone") && $("#npPhone").value.trim()) || "";
      if (!first || !last || !dob || !phone) {
        toast("Enter name, date of birth, and phone");
        return;
      }
      if ($("#bookNewPending")) $("#bookNewPending").value = "1";
      if ($("#fPatient")) $("#fPatient").value = "";
      const picked = $("#fPatientPicked");
      if (picked) picked.textContent = first + " " + last + " · " + fmtDob(dob) + " · New patient";
      showNewStep(false);
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
    if ($("#fDate")) $("#fDate").addEventListener("change", function () { updateBookDuration(); updateBookSaveState(); });
    if ($("#fProvider")) $("#fProvider").addEventListener("change", function () { updateBookDuration(); updateBookSaveState(); });
    if ($("#fLocation")) $("#fLocation").addEventListener("change", function () { updateBookDuration(); updateBookSaveState(); });
    const body = $("#modalBody");
    if (body) body.addEventListener("input", updateBookSaveState);
    if (body) body.addEventListener("change", updateBookSaveState);
    refreshEndOptions(endVal);
    updateBookDuration();
    updateBookSaveState();
  }

  function suggestedProvidersFor(type, reasons) {
    const blob = ((type || "") + " " + ((reasons || []).join(" "))).toLowerCase();
    const names = BRIZZA.PROVIDERS || [];
    const byRole = function (role) {
      return (BRIZZA.STAFF || []).filter(function (s) { return s.isProvider && s.role === role; }).map(function (s) { return s.name; });
    };
    if (/filler|inject|botox|toxin|juvederm|volbella|dissolve|lip|neuro|jeuveau/.test(blob)) return byRole("RN / NP Injector");
    if (/facial|skin|wax|peel|microneedl|hydra|laser|brow|aesth/.test(blob)) return byRole("Aesthetician");
    return names.slice();
  }
  function nextOpenProviderSlot(cands, date, mins) {
    const day = date || ($("#fDate") && $("#fDate").value) || defaultClinicDate();
    const times = BRIZZA.BOOKING_TIMES || [];
    for (let i = 0; i < cands.length; i += 1) {
      for (let t = 0; t < times.length; t += 1) {
        if (slotIsBookable(day, times[t], mins || 30, cands[i], null, { requireAvail: true, locationId: state.locationId })) {
          return { provider: cands[i], time: times[t], date: day };
        }
      }
    }
    return { provider: cands[0] || "", time: "", date: day };
  }
  function suggestBookProvider() {
    const typeEl = $("#fType");
    const provEl = $("#fProvider");
    if (!typeEl || !provEl) return;
    const type = typeEl.value;
    const reasons = selectedBookReasons();
    const cands = suggestedProvidersFor(type, reasons);
    if (!cands.length) return;
    if (cands.indexOf(provEl.value) >= 0) return;
    const slot = nextOpenProviderSlot(cands, $("#fDate") && $("#fDate").value, bookSelectedMinutes && bookSelectedMinutes());
    if (slot.provider) provEl.value = slot.provider;
    if (slot.time && $("#fTime") && !$("#fTime").value) $("#fTime").value = slot.time;
  }
  function updateBookDuration() {
    suggestBookProvider();
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
  function productsForBookReasons(reasons) {
    const out = [];
    const seen = {};
    (reasons || []).forEach(function (name) {
      const item = catalogItem(name);
      if (item && item.trackLots && !seen[item.id]) { seen[item.id] = 1; out.push(item); }
    });
    return out;
  }
  function outOfStockForReasons(reasons) {
    return productsForBookReasons(reasons).filter(function (c) {
      const on = catalogOnHand(c);
      return on != null && on <= 0;
    });
  }
  function updateHoursWarn() {
    const wrap = $("#hoursWrap");
    if (!wrap) return;
    const date = $("#fDate") ? $("#fDate").value : "";
    const time = $("#fTime") ? $("#fTime").value : "";
    const end = $("#fEnd") ? $("#fEnd").value : "";
    const provider = $("#fProvider") ? $("#fProvider").value : "";
    const locationId = $("#fLocation") ? $("#fLocation").value : "";
    let html = "";
    if (date && isClinicClosedDay(date)) {
      const hol = holidayName(date);
      html += '<div class="notice avail-warn" role="alert">The clinic is closed on ' + esc(fmtLong(date)) +
        (hol ? " (" + esc(hol) + ")" : "") + ". Choose another date. Bookings cannot be saved on a closed day.</div>";
    } else if (date && time && isOutsideClinicHours(date, time)) {
      const prior = $("#fOutsideReason") ? $("#fOutsideReason").value : "";
      html += '<div class="notice avail-warn" role="alert">This time is outside office hours (Monday–Friday, 10:00 a.m.–6:00 p.m. ET). Booking is allowed if you record a reason, which is logged.</div>' +
        '<label for="fOutsideReason">Reason for booking outside office hours <span class="req">required</span></label>' +
        '<input id="fOutsideReason" type="text" required value="' + esc(prior) + '">';
    } else if (date && time && provider && isOutsideProviderAvailability(date, time, end, provider, locationId)) {
      const priorA = $("#fAvailReason") ? $("#fAvailReason").value : "";
      const summary = providerAvailSummary(provider, date, locationId);
      const who = providerAvailLabel(provider) || provider;
      const loc = locationShort(locationId) || locationName(locationId) || "this location";
      const msg = summary
        ? (who + " is available at " + loc + " " + summary + " on this date. This time is outside that availability.")
        : (who + " is not on the schedule at " + loc + " on this date.");
      html += '<div class="notice avail-warn" role="alert">' + esc(msg) + " Booking is allowed if you record a reason, which is logged.</div>" +
        '<label for="fAvailReason">Reason for booking outside provider availability <span class="req">required</span></label>' +
        '<input id="fAvailReason" type="text" required value="' + esc(priorA) + '">';
    }
    if (date && time && !isClinicClosedDay(date) && appointmentTouchesLunch(date, time, end, provider)) {
      const priorL = $("#fLunchReason") ? $("#fLunchReason").value : "";
      const lunchLbl = lunchWindowLabel(lunchWindow(date, provider));
      html += '<div class="notice lunch-notice" role="alert">This time falls during lunch (' + esc(lunchLbl) + '). Booking is allowed if you record a reason, which is logged.</div>' +
        '<label for="fLunchReason">Reason for booking during lunch <span class="req">required</span></label>' +
        '<input id="fLunchReason" type="text" required value="' + esc(priorL) + '">';
    }
    const stock = outOfStockForReasons(selectedBookReasons());
    if (stock.length) {
      html += '<div class="notice stock-warn" role="alert">' + stock.map(function (c) {
        return esc(c.name) + " is out of stock (0 on hand)";
      }).join(". ") + ". You can still book; a substitution may be needed.</div>";
    }
    wrap.innerHTML = html;
    updateProviderRoleWarn();
    updateDepositCue();
  }
  function updateProviderRoleWarn() {
    const wrap = $("#roleWrap");
    if (!wrap) return;
    const type = $("#fType") ? $("#fType").value : "";
    const provider = $("#fProvider") ? $("#fProvider").value : "";
    const need = providerRoleMismatch(type, provider);
    if (!need) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = '<div class="notice" role="alert">' + esc(type) + " is typically scheduled with a " + esc(need) +
      ". You can still book another provider; this warning is recorded.</div>";
  }
  function updateDepositCue() {
    const wrap = $("#depositCue");
    if (!wrap) return;
    const type = $("#fType") ? $("#fType").value : "";
    const amt = consultDepositAmount(type);
    if (!amt) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = '<div class="notice">A ' + money(amt) +
      " consultation deposit must be collected before this appointment is saved. It applies to the consult if the patient attends, or to the no-show / late-cancel fee if they do not. It is never credited toward treatment.</div>";
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
    const newBox = $("#bookNewStep") || $("#bookNewFields");
    const newPending = ($("#bookNewPending") && $("#bookNewPending").value === "1") || (newBox && !newBox.hidden);
    if (newBox && newPending) {
      if (pid && patient(pid)) {
        /* already created on a prior Save that opened the deposit step */
      } else {
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
        if ($("#fPatient")) $("#fPatient").value = pid;
        addAudit({ action: "Created patient record", recordType: "Patient", recordId: pid,
          recordPath: { page: "patients", selected: pid, tab: "demographics" },
          changes: [{ field: "status", before: "—", after: "Active" }, { field: "name", before: "—", after: first + " " + last }, { field: "id", before: "—", after: displayId(pid) }] });
      }
    }
    let reasons = selectedBookReasons();
    const p = patient(pid);
    const type = $("#fType") ? $("#fType").value : "";
    const date = $("#fDate") ? $("#fDate").value : "";
    const time = $("#fTime") ? $("#fTime").value : "";
    const provider = ($("#fProvider") && $("#fProvider").value) || slotProvider() || "";
    const suiteId = $("#fSuite") ? $("#fSuite").value : "";
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
    else if (isClinicClosedDay(date)) missing.push(holidayName(date) ? ("Clinic closed · " + holidayName(date)) : "Date must be Monday–Friday");
    if (!time) missing.push("Start time");
    if (!provider) missing.push("Primary provider");
    const hits = overlappingBlocks(date, time, type, reasons, provider, bookSelectedMinutes());
    const override = $("#fOverride") ? $("#fOverride").value.trim() : "";
    if (hits.length && !override) missing.push("Admin override reason");
    const closedDay = date && isClinicClosedDay(date);
    const outside = !closedDay && date && time && isOutsideClinicHours(date, time);
    const outsideReason = ($("#fOutsideReason") && $("#fOutsideReason").value.trim()) || "";
    if (outside && !outsideReason) missing.push("Reason for booking outside office hours");
    const end = $("#fEnd") ? $("#fEnd").value : "";
    const availOff = !closedDay && !outside && date && time && provider && isOutsideProviderAvailability(date, time, end, provider, locationId);
    const availReason = ($("#fAvailReason") && $("#fAvailReason").value.trim()) || "";
    if (availOff && !availReason) missing.push("Reason for booking outside provider availability");
    const lunch = date && time && !closedDay && appointmentTouchesLunch(date, time, end, provider);
    const lunchReason = ($("#fLunchReason") && $("#fLunchReason").value.trim()) || "";
    if (lunch && !lunchReason) missing.push("Reason for booking during lunch");
    if (missing.length) {
      const w = $("#bookWarn");
      if (w) w.innerHTML = '<div class="notice">Required fields missing: ' + missing.map(esc).join(", ") + ".</div>";
      toast("Required fields missing");
      return;
    }
    const depositAmt = consultDepositAmount(type);
    const depositPaid = $("#fDepositPaid") && $("#fDepositPaid").value === "1";
    if (depositAmt && !depositPaid) {
      showConsultDepositStep(depositAmt);
      return;
    }
    const id = nextId("A-", store.appointments);
    const history = ["Scheduled"];
    const cf = p && isNewPatient(p) && type !== "Consultation" && type !== "Consult";
    if (cf) history.push("Consultation-first check noted · " + nowET());
    if (!reasons.length) history.push("Reason required before Confirmed · " + nowET());
    const mins = bookSelectedMinutes() || durationMinutes(type, reasons);
    const rec = { id: id, time: time, patientId: pid, type: type, reasons: reasons, provider: provider, durationLabel: (mins ? mins + " min" : durationLabelFor(type, reasons)), durationMinutes: mins, status: "Scheduled", consultation: "", treatment: "", suiteId: suiteId || null, date: date, locationId: locationId, consultingFor: consultingFor || "", prepNotes: ($("#fPrepNotes") && $("#fPrepNotes").value.trim()) || "", history: history, blockOverride: override || "", outsideHoursReason: outsideReason || "", outsideAvailReason: availReason || "", lunchReason: lunchReason || "", statusSince: nowMs() };
    const roleNeed = providerRoleMismatch(type, provider);
    if (roleNeed) {
      rec.providerRoleWarning = roleNeed;
      history.push("Provider role warning: " + type + " is typically with a " + roleNeed + " · booked with " + provider + " · " + nowET());
      rec.history = history;
    }
    if (depositAmt && depositPaid) {
      const method = ($("#fDepositMethod") && $("#fDepositMethod").value) || "Card";
      rec.deposit = { amount: depositAmt, method: method, status: "Collected", collectedAt: nowET(), appliedTo: null, neverTreatment: true };
      history.push("Consultation deposit " + money(depositAmt) + " collected (" + method + ") · applies to consult or no-show / late-cancel fee, never to treatment · " + nowET());
      rec.history = history;
    }
    if (state.reschedulingId) rec.replaces = state.reschedulingId;
    if (cf) rec.consultFirstFlag = true;
    store.appointments.push(rec);
    linkSameDayConsultVisit(rec);
    ensureConfirmReminderTasks();
    if (lunch && lunchReason) {
      history.push("Lunch hours reason: " + lunchReason + " · " + nowET());
      rec.history = history;
    }
    addAudit({ action: "Scheduled appointment", recordType: "Appointment", recordId: id,
      recordPath: { page: "schedule", date: date, appointmentId: id, view: state.scheduleView, calMode: state.calMode },
      changes: [
        { field: "status", before: "—", after: "Scheduled" },
        { field: "type", before: "—", after: type },
        { field: "location", before: "—", after: locationId },
        { field: "date", before: "—", after: date + " " + time }
      ].concat(consultingFor ? [{ field: "consultingFor", before: "—", after: consultingFor }] : [])
       .concat(override ? [{ field: "adminOverride", before: "—", after: override }, { field: "overlappedBlocks", before: "—", after: hits.map((b) => b.id || b.reason).join(", ") }] : [])
       .concat(outside && outsideReason ? [{ field: "outsideHoursReason", before: "—", after: outsideReason }] : [])
       .concat(lunch && lunchReason ? [{ field: "lunchReason", before: "—", after: lunchReason }] : [])
       .concat(roleNeed ? [{ field: "providerRoleWarning", before: "—", after: roleNeed + " · " + provider }] : [])
       .concat(rec.deposit ? [{ field: "consultDeposit", before: "—", after: money(rec.deposit.amount) + " · " + rec.deposit.method }] : []) });
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
    const dest = (state.page === "worklist")
      ? { page: "worklist", date: date }
      : { page: "schedule", date: date, view: "calendar", calMode: state.calMode };
    const next = hashFor(dest);
    if (location.hash !== next) go(dest);
    else render();
  }

  function showConsultDepositStep(amount) {
    const body = $("#modalBody");
    if (!body) { toast("Collect the " + money(amount) + " consultation deposit before saving"); return; }
    let step = $("#depositStep");
    if (!step) {
      step = document.createElement("div");
      step.id = "depositStep";
      body.appendChild(step);
    }
    if ($("#bookApptStep")) $("#bookApptStep").hidden = true;
    if ($("#bookNewStep")) $("#bookNewStep").hidden = true;
    step.hidden = false;
    const prior = ($("#fDepositMethod") && $("#fDepositMethod").value) || "Card";
    step.innerHTML = '<div class="deposit-step">' +
      '<h3>Collect consultation deposit</h3>' +
      '<p class="notice">Collect ' + money(amount) + " before this appointment is saved. The deposit applies to the consultation if the patient attends, or to the no-show / late-cancel fee if they do not. It is never credited toward treatment.</p>" +
      '<div class="field"><label for="fDepositMethod">Payment method <span class="req">required</span></label>' +
        '<select id="fDepositMethod"><option' + (prior === "Card" ? " selected" : "") + ">Card</option><option" + (prior === "Cash" ? " selected" : "") + ">Cash</option><option" + (prior === "Other" ? " selected" : "") + ">Other</option></select></div>" +
      '<input type="hidden" id="fDepositPaid" value="">' +
      '<div class="actions" style="margin-top:12px"><button type="button" class="btn" id="depositBack">Back</button></div>' +
      "</div>";
    const save = $("#modalSave");
    if (save) save.textContent = "Collect " + money(amount) + " and save";
    const back = $("#depositBack");
    if (back) back.addEventListener("click", function () {
      step.hidden = true;
      if ($("#bookApptStep")) $("#bookApptStep").hidden = false;
      if (save) save.textContent = "Save appointment";
      const paid = $("#fDepositPaid");
      if (paid) paid.value = "";
      updateBookSaveState();
    });
    if (save) {
      const prev = save.onclick;
      save.onclick = function () {
        const method = $("#fDepositMethod") && $("#fDepositMethod").value;
        if (!method) { toast("Choose a payment method"); return; }
        if ($("#fDepositPaid")) $("#fDepositPaid").value = "1";
        else {
          const hid = document.createElement("input");
          hid.type = "hidden"; hid.id = "fDepositPaid"; hid.value = "1";
          step.appendChild(hid);
        }
        saveAppt();
      };
    }
    toast("Collect the " + money(amount) + " consultation deposit to save");
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
    return (store.quotes || []).filter(function (q) { return q.patientId === pid && quoteIsActive(q); });
  }
  function openAppointment(id, opts) { return openAppointmentModal(id, opts); }
  function openAppointmentModal(id, opts) {
    const a = appt(id);
    if (!a) return;
    opts = opts || {};
    state.apptPane = opts.pane || "details";
    if (opts.skipPush) state._skipModalPush = true;
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
            '<span class="sr-only">Visit status</span>' +
            statusChipHtml(a, { variant: "solid" }) +
          "</div></header>" +
        '<div class="appt-mini-tabs">' +
          '<button type="button" class="btn tiny' + (state.apptPane === "consents" ? "" : " primary") + '" data-appt-pane="details">Details</button>' +
          '<button type="button" class="btn tiny' + (state.apptPane === "consents" ? " primary" : "") + '" data-appt-pane="consents">Consents</button>' +
        "</div>" +
        (state.apptPane === "consents" ? appointmentConsentsHtml(a, p) : ('<div class="appt-card-grid">' +
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
              '<div class="field full"><label for="fReason">Reason</label><div id="reasonOptions">' + reasonDropdownHtml(a.type, a.reasons || [], a.consultingFor || "") + "</div></div>" +
              '<div class="field full"><label for="apptNotes">Notes</label><textarea id="apptNotes" rows="4"' + dis + ">" + esc(a.prepNotes || "") + "</textarea></div>" +
            "</div>" +
            (locked ? "" :
              '<div class="actions" style="margin-top:12px">' +
                (isClinicalRole() && p ? '<button class="btn small" type="button" data-open="note-composer" data-pid="' + esc(p.id) + '" data-appt="' + esc(a.id) + '"' + (a.visitId ? ' data-visit="' + esc(a.visitId) + '"' : "") + ">＋ New note</button>" : "") +
                reminderActionsHtml(a) +
                '<button class="btn small" type="button" data-reschedule="' + esc(a.id) + '">Reschedule</button>' +
                '<button class="btn small btn-danger" type="button" data-appt-end="Canceled">Cancel appointment</button>' +
                '<button class="btn small" type="button" data-appt-end="No-show">No-show</button>' +
              "</div>" +
              '<div id="endReasonWrap" hidden class="field" style="margin-top:8px"><label for="endReason">Reason <span class="req">required</span></label>' +
                '<input id="endReason" placeholder="Required to cancel or mark a no-show">' +
                '<input type="hidden" id="endStatus">' +
                '<button class="btn small primary" type="button" data-confirm-end="' + esc(a.id) + '">Confirm</button></div>') +
          "</section>" +
          '<section class="appt-pane appt-pane-money">' +
            "<h3>Money</h3>" +
            cancelFeeNoticeHtml(a) +
            "<div>Balance <strong>" + (bal.tbd ? "TBD" : money(bal.sum || 0)) + "</strong></div>" +
            "<div>Credit <strong>" + money(credit) + "</strong></div>" +
            '<div style="margin-top:8px"><span class="row-sub">Open quotes</span>' + quoteRows + "</div>" +
            '<div style="margin-top:8px"><span class="row-sub">Last payments</span>' + payRows + "</div>" +
            (canCreateInvoice() ? '<button type="button" class="btn primary btn-invoice-lg" data-open-pos="' + esc(a.id) + '">Create invoice</button>' : "") +
            checkoutActionsHtml(a) +
          "</section>" +
        "</div>")) +
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
    const next = a.status;
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
    showModal("New patient", `
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
    const body = $("#modalBody");
    if (body) {
      body.addEventListener("input", updateBookSaveState);
      body.addEventListener("change", updateBookSaveState);
    }
    if (typeof bindZipLookups === "function") bindZipLookups();
    updateBookSaveState();
  }

  function openEdit(pid) {
    const p = patient(pid);
    showModal("Edit chart", `
      <div class="formgrid">
        <div class="field"><label>Patient number</label><input value="${esc(displayId(p.id))}" disabled></div>
        <div class="field"><label for="edFirst">First name</label><input id="edFirst" value="${esc(p.firstName || "")}"></div>
        <div class="field"><label for="edLast">Last name</label><input id="edLast" value="${esc(p.lastName || "")}"></div>
        <div class="field"><label for="edPreferred">Preferred name</label><input id="edPreferred" value="${esc(p.preferredName || "")}" placeholder="Optional"></div>
        <div class="field"><label for="edPhone">Phone</label><input id="edPhone" value="${esc(formatPhoneMask(p.phone))}" data-mask="phone" inputmode="tel" autocomplete="tel"></div>
        <div class="field"><label for="edEmail">Email</label><input id="edEmail" value="${esc(p.email)}"></div>
        <div class="field"><label for="edDob">Date of birth</label><input id="edDob" value="${esc(fmtDob(p.dob))}" placeholder="mm/dd/yyyy" data-mask="dob" inputmode="numeric"></div>
        <div class="field full">${addressFieldsHtml(addressPartsOf(p), "edAddr")}</div>
      </div>
      <div class="notice">Demographic changes are audit-tracked. The patient number cannot be changed.</div>`, function () {
      const phone = formatPhoneMask($("#edPhone").value), email = $("#edEmail").value;
      const dob = parseDob($("#edDob").value) || p.dob;
      const parts = readAddressFields(document);
      const address = formatAddressText(parts);
      const changes = [];
      applyNameEdits(p, changes);
      if (phone !== p.phone) { p.demoHistory = p.demoHistory || []; p.demoHistory.push("Phone " + p.phone + " → " + phone + " · " + nowET()); changes.push({ field: "phone", before: p.phone, after: phone }); }
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

  function applyNameEdits(p, changes) {
    if (!p || !$("#edFirst")) return;
    const first = ($("#edFirst").value || "").trim();
    const last = ($("#edLast").value || "").trim();
    const preferred = ($("#edPreferred") && $("#edPreferred").value || "").trim();
    const legal = (first + " " + last).trim();
    const display = preferred || legal || p.name;
    if (first !== (p.firstName || "")) changes.push({ field: "first name", before: p.firstName || "—", after: first || "—" });
    if (last !== (p.lastName || "")) changes.push({ field: "last name", before: p.lastName || "—", after: last || "—" });
    if (preferred !== (p.preferredName || "")) changes.push({ field: "preferred name", before: p.preferredName || "—", after: preferred || "—" });
    if (display !== p.name) changes.push({ field: "name", before: p.name || "—", after: display || "—" });
    p.firstName = first;
    p.lastName = last;
    p.preferredName = preferred;
    if (display) p.name = display;
  }
  function applyDemographicEdits(p) {
    if (!p || !$("#edPhone")) return false;
    const phone = formatPhoneMask($("#edPhone").value), email = $("#edEmail").value;
    const dob = parseDob($("#edDob").value) || p.dob;
    const parts = readAddressFields(document);
    const address = formatAddressText(parts);
    const changes = [];
    applyNameEdits(p, changes);
    if (phone !== p.phone) { p.demoHistory = p.demoHistory || []; p.demoHistory.push("Phone " + p.phone + " → " + phone + " · " + nowET()); changes.push({ field: "phone", before: p.phone, after: phone }); }
    if (email !== p.email) { p.demoHistory = p.demoHistory || []; p.demoHistory.push("Email " + p.email + " → " + email + " · " + nowET()); changes.push({ field: "email", before: p.email, after: email }); }
    if (address !== formatAddressText(addressPartsOf(p))) { changes.push({ field: "address", before: formatAddressText(addressPartsOf(p)) || "—", after: address || "—" }); }
    if (dob !== p.dob) { changes.push({ field: "date of birth", before: fmtDob(p.dob), after: fmtDob(dob) }); }
    if (changes.length) {
      addAudit({ action: "Updated demographics", recordType: "Patient", recordId: p.id,
        recordPath: { page: "patients", selected: p.id, tab: "demographics" }, changes: changes });
    }
    p.phone = phone; p.email = email; p.addressParts = parts; p.address = address; p.dob = dob;
    return changes.length > 0;
  }
  function lastReviewedHtml(p) {
    const rec = p && p.registration && p.registration.demographicsConfirmed;
    if (rec && rec.reviewedAt) {
      return '<p class="row-sub last-reviewed">Last reviewed: ' + esc(rec.reviewedAt) + " by " + esc(rec.reviewedBy || "") + "</p>";
    }
    return '<p class="row-sub last-reviewed">Last reviewed: —</p>';
  }
  function confirmDemographics(p) {
    if (!p) return;
    p.registration = p.registration || {};
    const prev = (p.registration.demographicsConfirmed && p.registration.demographicsConfirmed.status) || "Not confirmed";
    p.registration.demographicsConfirmed = { status: "Confirmed", date: todayET(), reviewedAt: nowET(), reviewedBy: actingName() };
    addAudit({ action: "Demographics manually confirmed", recordType: "Patient", recordId: p.id,
      recordPath: { page: "patients", selected: p.id, tab: "demographics" },
      changes: [{ field: "demographics confirmed", before: prev, after: "Confirmed" }] });
  }
  function openDemographicsPopup(pid) {
    const p = patient(pid);
    if (!p) return;
    const confirmed = p.registration && p.registration.demographicsConfirmed && p.registration.demographicsConfirmed.status === "Confirmed";
    showModal("Demographics · " + p.name, `
      <div class="formgrid">
        <div class="field"><label>Patient number</label><input value="${esc(displayId(p.id))}" disabled></div>
        <div class="field"><label for="edFirst">First name</label><input id="edFirst" value="${esc(p.firstName || "")}"></div>
        <div class="field"><label for="edLast">Last name</label><input id="edLast" value="${esc(p.lastName || "")}"></div>
        <div class="field"><label for="edPreferred">Preferred name</label><input id="edPreferred" value="${esc(p.preferredName || "")}" placeholder="Optional"></div>
        <div class="field"><label for="edPhone">Phone</label><input id="edPhone" value="${esc(formatPhoneMask(p.phone))}" data-mask="phone" inputmode="tel" autocomplete="tel"></div>
        <div class="field"><label for="edEmail">Email</label><input id="edEmail" value="${esc(p.email)}"></div>
        <div class="field"><label for="edDob">Date of birth</label><input id="edDob" value="${esc(fmtDob(p.dob))}" placeholder="mm/dd/yyyy" data-mask="dob" inputmode="numeric"></div>
        <div class="field full">${addressFieldsHtml(addressPartsOf(p), "edAddr")}</div>
      </div>
      <p class="row-sub">Demographics are ${confirmed ? "confirmed" : "not confirmed"}. You can edit the fields and confirm them here.</p>
      ${confirmed ? "" : '<div style="margin-top:10px"><button type="button" class="btn primary" data-confirm-demo-modal="' + esc(p.id) + '">Confirm demographics</button></div>'}
      <div class="notice">Demographic changes are audit-tracked. The patient number cannot be changed.</div>`, function () {
      applyDemographicEdits(p);
      closeModal(); toast("Demographic edits are audit-tracked"); render();
    }, "Save");
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
    let recordedAmt = (amt != null && !Number.isNaN(amt) ? amt : undefined);
    const p = patient(inv.patientId);
    if (status === "Paid" && recordedAmt != null) {
      const due = (t.balance != null && !t.tbd) ? Math.max(0, t.balance) : 0;
      if (due === 0 || !(inv.lines || []).length) {
        if (p) {
          const before = patientCredit(p);
          p.credit = Math.round((before + recordedAmt) * 100) / 100;
          p.ledgerPayments = p.ledgerPayments || [];
          p.ledgerPayments.push({ id: nextId("LPAY-", p.ledgerPayments), kind: "Prepayment", amount: recordedAmt, method: "Card", status: "Paid", recorded: nowET(), note: "Prepayment becomes credit" });
          toast("Prepayment " + money(recordedAmt) + " added to patient credit");
        }
        recordedAmt = 0;
      } else if (recordedAmt > due) {
        const extra = Math.round((recordedAmt - due) * 100) / 100;
        if (p && extra > 0) {
          const before = patientCredit(p);
          p.credit = Math.round((before + extra) * 100) / 100;
          p.ledgerPayments = p.ledgerPayments || [];
          p.ledgerPayments.push({ id: nextId("LPAY-", p.ledgerPayments), kind: "Prepayment", amount: extra, method: "Card", status: "Paid", recorded: nowET(), note: "Overpayment becomes credit" });
          toast(money(due) + " applied to the invoice · " + money(extra) + " added to credit");
        }
        recordedAmt = due;
      }
    }
    const pay = { id: nextId("PAY-", inv.payments || []), method: "Card (processor reference only)", status: status, recorded: nowET(), amount: recordedAmt };
    inv.payments = inv.payments || [];
    if (recordedAmt !== 0 || status !== "Paid") inv.payments.push(pay);
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
    return '<div class="pos-tabs" role="tablist"><a href="' + hashFor({ page: "pos", posTab: "invoice", invoiceId: state.invoiceId }) + '" class="active">Invoice</a></div>';
  }
  function lineHtml(l) {
    const conceptMark = l.kind === "membership" ? " " + concept("Memberships are deferred in the DB design.") : "";
    const amt = lineAmount(l);
    const qty = l.qty == null || l.qty === "" ? "qty blank" : ("qty " + l.qty);
    const unit = l.unitPrice == null ? "TBD" : money(l.unitPrice) + (l.unit ? "/" + l.unit : "");
    return '<div class="row"><div><span class="line-kind">' + esc(l.kind || "service") + '</span><div class="row-title">' + esc(l.name || l.service || "") + '</div><div class="row-sub">' + esc(qty) + ' · ' + esc(unit) + '</div></div><span>' + (amt == null ? "TBD" : money(amt)) + "</span>" + conceptMark + "</div>";
  }
  function todayInvoices(day) {
    day = day || demoClockDate();
    return (store.invoices || []).filter(function (inv) {
      const aps = (inv.appointmentIds || []).map(appt).filter(Boolean);
      if (aps.some(function (a) { return a.date === day; })) return true;
      if ((inv.payments || []).some(function (pay) { return String(pay.recorded || "").indexOf(day) === 0; })) return true;
      return inv.openedOn === day;
    });
  }
  function posTodayListHtml() {
    const day = demoClockDate();
    const aps = (store.appointments || []).filter(function (a) {
      return a.date === day && a.status !== "Canceled" && a.status !== "Rescheduled";
    }).sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });
    const visits = aps.map(function (a) {
      const p = patient(a.patientId);
      return '<a class="row" href="' + hashFor({ page: "pos", posTab: "invoice", appointmentId: a.id }) + '"><div><div class="row-title">' + esc(p ? p.name : a.patientId) + '</div><div class="row-sub">' + esc(fmtTime(a.time)) + " · " + esc(a.type) + " · " + esc(a.status) + "</div></div></a>";
    }).join("") || '<div class="empty">No visits today</div>';
    const invs = todayInvoices(day).map(function (inv) {
      refreshInvoiceBalance(inv);
      const p = patient(inv.patientId);
      return '<a class="row" href="' + hashFor({ page: "pos", posTab: "invoice", invoiceId: inv.id }) + '"><div><div class="row-title">' + esc(inv.id) + " · " + esc(p ? p.name : "") + '</div><div class="row-sub">' + esc(inv.status) + " · Balance " + esc(typeof inv.balance === "number" ? money(inv.balance) : String(inv.balance || "—")) + "</div></div>" + badge(inv.status) + "</a>";
    }).join("") || '<div class="empty">No invoices today</div>';
    return '<aside class="pos-side">' +
      "<h3>Today</h3>" + visits +
      '<h3 style="margin-top:16px">End of day invoices</h3>' + invs +
      "</aside>";
  }
  function newBlankInvoice(pid) {
    const id = nextId("INV-", store.invoices);
    const inv = { id: id, patientId: pid || null, visitId: null, appointmentIds: [], status: "Draft", balance: 0, lines: [], payments: [], finalized: false, finalizedAt: null, movements: [], openedOn: todayET() };
    store.invoices = store.invoices || [];
    store.invoices.push(inv);
    return inv;
  }
  function renderPOS() {
    if (state.posTab === "quotes" || state.quoteId) {
      state.page = "quotes";
      renderQuotesHome();
      return;
    }
    const ap = state.posAppointmentId ? appt(state.posAppointmentId) : (state.appointmentId ? appt(state.appointmentId) : null);
    let inv = state.invoiceId ? invoice(state.invoiceId) : (ap ? invoiceForAppt(ap) : null);
    if (!inv && ap) inv = ensureInvoiceForAppt(ap);
    if (inv) state.invoiceId = inv.id;
    const p = inv ? patient(inv.patientId) : (ap ? patient(ap.patientId) : null);
    const start = '<div class="actions pos-patient-tools">' +
      (canCreateInvoice() ? ('<div class="pos-patient-search"><label class="field"><span class="sr-only">Find a patient</span>' +
      '<input id="posPatientSearch" type="search" placeholder="Search patients by name, #ID, or DOB" value="' + esc(state.posPatientQ || "") + '"></label>' +
      '<div id="posPatientResults" class="patient-results"></div></div>' +
      '<button type="button" class="btn primary" data-new-blank-invoice="1">Create invoice</button>') : "") +
      "</div>";
    const head = pageHead("", "Point of Sale", p ? (patientLink(p) + " · " + esc(displayId(p.id)) + (inv ? " · " + esc(inv.id) : "")) : "", "");
    const main = inv ? invoicePopupHtml(inv, { embedded: true }) : (canCreateInvoice()
      ? '<div class="empty">Search for a patient and choose Create invoice, or open a visit.</div>'
      : '<div class="empty">Invoices are created by the Clinical Coordinator, Clinic Manager, or Owner.</div>');
    const body = posTabs("invoice") +
      concept("Nicole-given prices are used when a quantity is entered. Other items stay TBD. Invoice and payment statuses stay independent of appointment status.") +
      start +
      '<div class="pos-page pos-layout">' + main + posTodayListHtml() + "</div>";
    renderChrome('<a href="' + hashFor({ page: "pos" }) + '">Point of Sale</a>' + (inv ? " / " + esc(inv.id) : ""), head, body);
    if (inv) bindPosSearch(inv);
    bindPosPatientSearch();
  }
  function bindPosPatientSearch() {
    const input = $("#posPatientSearch");
    const box = $("#posPatientResults");
    if (!input || !box) return;
    const paint = function () {
      state.posPatientQ = input.value;
      const q = String(input.value || "").trim().toLowerCase();
      if (q.length < 2) { box.innerHTML = ""; return; }
      const hits = (store.patients || []).filter(function (pt) {
        return ((pt.name || "") + " " + displayId(pt.id) + " " + (pt.id || "") + " " + (pt.dob || "") + " " + fmtDob(pt.dob)).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 8);
      box.innerHTML = hits.map(function (pt) {
        return '<button type="button" class="row" data-pos-pick-patient="' + esc(pt.id) + '">' + esc(pt.name) + " · " + esc(displayId(pt.id)) + "</button>";
      }).join("") || '<div class="empty">No patients match</div>';
    };
    input.addEventListener("input", paint);
    if (input.value) paint();
  }
  function completeOrFinalizeSale(invId) {
    const inv = invoice(invId);
    if (!inv) return;
    if (inv.finalized) { toast("This receipt is already locked"); return; }
    finalizeInvoice(invId);
    const cur = invoice(invId);
    if (cur) {
      refreshInvoiceBalance(cur);
      if (cur.balance === 0) cur.status = "Paid";
    }
  }
  function addChargesFromNote(invId) {
    const inv = invoice(invId);
    if (!inv || inv.finalized) return;
    if (!inv.patientId) { toast("Pick a patient first"); return; }
    const pending = pendingNoteChargesForPatient(inv.patientId, inv);
    if (!pending.length) { toast("No pending charges on this patient's notes"); return; }
    inv.lines = inv.lines || [];
    pending.forEach(function (row) {
      const line = row.line;
      const cat = catalogByName(line.name);
      inv.lines.push({
        kind: (cat && cat.kind) || "product",
        name: line.name || "Note charge",
        catalogId: line.catalogId || (cat && cat.id) || "",
        unit: line.unit || (cat && cat.unit) || "",
        qty: line.qty,
        unitPrice: line.unitPrice,
        amount: line.amount != null ? line.amount : "TBD",
        fromNote: true,
        noteId: row.noteId
      });
    });
    refreshInvoiceBalance(inv);
    toast("Added " + pending.length + " charge" + (pending.length === 1 ? "" : "s") + " from notes");
    render();
  }

  function posPatientQuotesHtml(inv) {
    if (!inv || inv.finalized) return "";
    const list = (store.quotes || []).filter(function (q) {
      return q.patientId === inv.patientId && quoteIsActive(q);
    });
    if (!list.length) return "";
    return '<div class="pos-open-quotes"><div class="row-sub">Open quotes for this patient — add lines only when you choose to. This does not post a sale.</div>' +
      list.map(function (q) {
        return '<div class="pos-quote-row"><span>' + esc(q.name) + " · " + esc(q.id) + " · " + esc(q.status) +
          (q.depositAmount ? " · deposit " + money(q.depositAmount) : "") + "</span>" +
          '<button type="button" class="btn tiny" data-add-from-quote="' + esc(inv.id) + '" data-quote="' + esc(q.id) + '">Add from quote</button></div>';
      }).join("") + "</div>";
  }
  function quoteLineCopy(l) {
    if (!l || l.kind === "prepayment") return null;
    return { kind: l.kind, name: l.name, catalogId: l.catalogId, unit: l.unit, unitPrice: l.unitPrice, qty: l.qty, amount: l.amount, waived: l.waived };
  }
  function quoteCreatedOn(q) {
    return String((q && (q.created || q.createdAt)) || "").slice(0, 10);
  }
  function quoteExpiryDate(q) {
    if (!q) return "";
    if (q.expiresOn) return String(q.expiresOn).slice(0, 10);
    const c = quoteCreatedOn(q);
    return c ? addDays(c, 30) : "";
  }
  function quoteIsActive(q) {
    if (!q) return false;
    normalizeQuote(q);
    return q.status === "Draft" || q.status === "Sent" || q.status === "Accepted" || q.status === "Prepaid";
  }
  function normalizeQuote(q) {
    if (!q) return q;
    if (!q.expiresOn) q.expiresOn = quoteExpiryDate(q);
    if (!q.disclaimer) q.disclaimer = "This is an estimate. The final price may vary.";
    if (q.status === "Open") q.status = "Sent";
    if (q.status === "Prepaid") {
      q.status = "Accepted";
      q.depositCollected = true;
    }
    const expirable = q.status === "Draft" || q.status === "Sent";
    if (expirable && q.expiresOn && todayET() >= q.expiresOn) {
      q.status = "Expired";
      q.expiredAt = q.expiredAt || todayET();
    }
    return q;
  }
  function expireQuotes() {
    (store.quotes || []).forEach(normalizeQuote);
  }
  function canAcceptQuote() {
    return canManageQuotes() && !isMarketingRole();
  }
  function quotePatientApptOptions(pid, selected) {
    return (store.appointments || []).filter(function (a) { return a.patientId === pid; })
      .sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); })
      .map(function (a) {
        return '<option value="' + esc(a.id) + '"' + (a.id === selected ? " selected" : "") + ">" +
          esc(fmtDate(a.date) + " · " + fmtTime(a.time) + " · " + (a.type || "") + " · " + a.id) + "</option>";
      }).join("");
  }
  function quoteLineFromTpl(l) {
    return Object.assign({}, l, { qty: (l.qty != null && l.qty !== "") ? l.qty : null, amount: l.amount != null ? l.amount : "TBD" });
  }
  function sendQuote(id) {
    const q = quoteById(id); if (!q) return;
    normalizeQuote(q);
    if (q.status !== "Draft") { toast("Only a draft quote can be sent"); return; }
    const before = q.status;
    q.status = "Sent";
    q.sentAt = nowET();
    q.sentBy = actingName();
    if (!q.expiresOn) q.expiresOn = addDays(todayET(), 30);
    addAudit({ action: "Sent quote", recordType: "Quote", recordId: id,
      recordPath: { page: "quotes", quoteId: id },
      changes: [{ field: "status", before: before, after: "Sent" }] });
    toast("Quote sent · expires " + fmtDate(q.expiresOn));
    render();
  }
  function reissueQuote(id) {
    const old = quoteById(id); if (!old) return;
    normalizeQuote(old);
    if (old.status !== "Expired") { toast("Only an expired quote can be re-issued"); return; }
    store.quotes = store.quotes || [];
    const rec = {
      id: nextId("Q-", store.quotes),
      patientId: old.patientId,
      appointmentId: old.appointmentId || null,
      templateId: old.templateId,
      name: old.name,
      status: "Sent",
      wording: old.wording || "",
      treatmentArea: old.treatmentArea || "",
      recommendedPlan: old.recommendedPlan || "",
      sessions: old.sessions || "",
      disclaimer: old.disclaimer || "This is an estimate. The final price may vary.",
      depositRequired: !!old.depositRequired,
      depositAmount: old.depositAmount || null,
      lines: (old.lines || []).map(function (l) { return Object.assign({}, l, { qty: (l.qty != null && l.qty !== "") ? l.qty : null }); }),
      created: todayET(),
      createdBy: actingName(),
      createdByRole: state.actingRole,
      expiresOn: addDays(todayET(), 30),
      sentAt: nowET(),
      sentBy: actingName(),
      reissuedFrom: old.id,
      broughtToRoom: false,
      invoiceId: null,
      followUpDue: old.followUpDue || null
    };
    store.quotes.push(rec);
    addDocument(rec.patientId, { category: "Quotes", title: "Quote · " + rec.name + " · " + rec.id, date: rec.created, relatedId: rec.id, kind: "quote" });
    addAudit({ action: "Re-issued quote", recordType: "Quote", recordId: rec.id,
      recordPath: { page: "quotes", quoteId: rec.id },
      changes: [{ field: "status", before: "—", after: "Sent" }, { field: "reissuedFrom", before: "—", after: old.id }] });
    toast("Quote re-issued as " + rec.id + " · expires " + fmtDate(rec.expiresOn));
    go({ page: "quotes", quoteId: rec.id });
  }
  function printQuote(id) {
    const q = quoteById(id); if (!q) return;
    normalizeQuote(q);
    const p = patient(q.patientId);
    openPrintSheet("Quote · " + (p ? p.name : q.id), quotePrintHtml(q));
  }
  function quotePrintHtml(q) {
    const p = patient(q.patientId);
    const contact = clinicContactLines();
    const a = q.appointmentId ? appt(q.appointmentId) : null;
    const metaItem = function (k, v) {
      return '<div><span class="k">' + esc(k) + "</span>" + esc(v || "—") + "</div>";
    };
    const lines = (q.lines || []).map(function (l) {
      const qty = (l.qty != null && l.qty !== "") ? String(l.qty) : "—";
      const unit = l.unit ? " " + l.unit + (Number(l.qty) === 1 ? "" : "s") : "";
      const price = l.unitPrice != null && l.unitPrice !== "" ? money(l.unitPrice) : "TBD";
      const amt = (l.qty != null && l.qty !== "" && l.unitPrice != null && l.unitPrice !== "") ? money(Number(l.qty) * Number(l.unitPrice)) : "TBD";
      return "<tr><td>" + esc(l.name || "") + "</td><td>" + esc(qty) + (l.unit ? " " + esc(l.unit) : "") + "</td><td>" + esc(price) + "</td><td>" + esc(amt) + "</td></tr>";
    }).join("");
    const totals = invoiceTotals({ lines: q.lines || [] });
    return '<article class="note-print-sheet quote-print-sheet">' +
      '<header class="note-print-head">' + clinicLogoMark("print-logo") +
      '<p class="note-print-contact">' + esc(contact.address) + "<br>" + esc(contact.phone) + "</p></header>" +
      "<h1>Quote</h1>" +
      '<div class="note-print-meta">' +
        metaItem("Patient", p ? p.name : "") +
        metaItem("Date of birth", p ? fmtDob(p.dob) : "") +
        metaItem("Chart #", p ? displayId(p.id) : "") +
        metaItem("Quote", q.id) +
        metaItem("Status", q.status) +
        metaItem("Created", (q.created ? fmtDate(q.created) : "") + (q.createdBy ? " · " + q.createdBy : "") + (q.createdByRole ? " · " + q.createdByRole : "")) +
        metaItem("Expires", q.expiresOn ? fmtDate(q.expiresOn) : "") +
        metaItem("Appointment", a ? (fmtDate(a.date) + " · " + fmtTime(a.time) + " · " + (a.type || "")) : "Not attached") +
        metaItem("Treatment area", q.treatmentArea || "") +
        metaItem("Recommended plan / sessions", q.recommendedPlan || q.sessions || "") +
        metaItem("Deposit required", q.depositRequired ? ("Yes" + (q.depositAmount ? " · " + money(q.depositAmount) : "")) : "No") +
      "</div>" +
      (q.wording ? "<p>" + esc(q.wording) + "</p>" : "") +
      '<table class="quote-print-lines"><thead><tr><th>Item</th><th>Qty / units</th><th>Price</th><th>Line total</th></tr></thead><tbody>' +
      (lines || '<tr><td colspan="4">No lines</td></tr>') + "</tbody></table>" +
      "<p><strong>Estimate total: " + esc(totals.label) + "</strong></p>" +
      "<p>" + esc(q.disclaimer || "This is an estimate. The final price may vary.") + "</p>" +
      '<div class="note-print-sig"><div class="sig-line"></div><div><strong>Patient acceptance</strong></div>' +
      "<p>Signature _________________________________ Date ______________</p>" +
      '<p class="note-print-empty">Staff records acceptance in the clinic. This line is for the printed copy.</p></div>' +
      "</article>";
  }
  function quoteSheetHtml(q) {
    const p = patient(q.patientId);
    const a = q.appointmentId ? appt(q.appointmentId) : null;
    const totals = invoiceTotals({ lines: q.lines || [] });
    const lineRows = (q.lines || []).map(function (l, i) {
      const qtyBlank = l.qty == null || l.qty === "";
      const price = l.unitPrice != null && l.unitPrice !== "" ? money(l.unitPrice) : "TBD";
      const amt = (!qtyBlank && l.unitPrice != null && l.unitPrice !== "") ? money(Number(l.qty) * Number(l.unitPrice)) : "TBD";
      return '<div class="quote-line-row">' +
        "<div><strong>" + esc(l.name || "Line") + "</strong>" + (l.kind ? '<div class="row-sub">' + esc(l.kind) + (l.unit ? " · " + esc(l.unit) : "") + "</div>" : "") + "</div>" +
        '<div class="quote-line-qty"><label class="sr-only" for="qQty-' + i + '">Quantity</label>' +
        '<input id="qQty-' + i + '" data-quote-qty="' + i + '" type="number" min="0" step="1" value="' + esc(qtyBlank ? "" : String(l.qty)) + '" placeholder="Qty"></div>' +
        "<div>" + esc(price) + ' each · ' + esc(amt) + "</div></div>";
    }).join("");
    return '<div class="quote-sheet card"><div class="cardbody">' +
      '<header class="quote-sheet-head">' + clinicLogoMark("quote-logo") + "</header>" +
      '<div class="quote-meta">' +
        '<div><span class="k">Patient</span> ' + (p ? patientLink(p) : "—") + "</div>" +
        '<div><span class="k">Date of birth</span> ' + esc(p ? fmtDob(p.dob) : "—") + "</div>" +
        '<div><span class="k">Chart #</span> ' + esc(p ? displayId(p.id) : "—") + "</div>" +
        '<div><span class="k">Created by</span> ' + esc((q.createdBy || "—") + (q.createdByRole ? " · " + q.createdByRole : "")) + "</div>" +
        '<div><span class="k">Created</span> ' + esc(q.created ? fmtDate(q.created) : "—") + "</div>" +
        '<div><span class="k">Expires</span> ' + esc(q.expiresOn ? fmtDate(q.expiresOn) : "—") + (q.status === "Expired" ? " · Expired" : "") + "</div>" +
      "</div>" +
      (q.wording ? '<p class="quote-wording">' + esc(q.wording) + "</p>" : "") +
      '<div class="formgrid quote-sheet-fields">' +
        '<div class="field full"><label for="quoteArea">Treatment area</label><input id="quoteArea" value="' + esc(q.treatmentArea || "") + '"></div>' +
        '<div class="field full"><label for="quotePlan">Recommended plan / sessions</label><textarea id="quotePlan" rows="2">' + esc(q.recommendedPlan || "") + "</textarea></div>" +
        '<div class="field"><label for="quoteAppt">Attach to appointment</label><select id="quoteAppt"><option value="">Not attached</option>' + quotePatientApptOptions(q.patientId, q.appointmentId) + "</select></div>" +
        '<div class="field"><label class="choice"><input id="quoteDepositReq" type="checkbox"' + (q.depositRequired ? " checked" : "") + "> Deposit required</label>" +
          '<input id="quoteDepositAmt" type="number" min="0" step="0.01" placeholder="Deposit amount" value="' + esc(q.depositAmount != null ? String(q.depositAmount) : "") + '"></div>' +
      "</div>" +
      "<h3>Itemized lines</h3>" +
      '<p class="row-sub">Approved prices only. Quantity stays blank until entered.</p>' +
      '<div id="quoteLines">' + (lineRows || '<div class="empty">No lines</div>') + "</div>" +
      "<p>Estimate total: <strong>" + esc(totals.label) + "</strong></p>" +
      '<p class="quote-disclaimer">' + esc(q.disclaimer || "This is an estimate. The final price may vary.") + "</p>" +
      '<div class="quote-accept-line"><div class="sig-line"></div><div class="row-sub">Patient acceptance signature / date (printed copy). Staff records acceptance in the clinic. There is no patient-facing accept.</div></div>' +
      '<div class="actions"><button type="button" class="btn tiny primary" data-save-quote-fields="' + esc(q.id) + '">Save quote fields</button></div>' +
      "</div></div>";
  }
  function saveQuoteFields(id) {
    const q = quoteById(id); if (!q) return;
    q.treatmentArea = ($("#quoteArea") && $("#quoteArea").value) || "";
    q.recommendedPlan = ($("#quotePlan") && $("#quotePlan").value) || "";
    const ap = $("#quoteAppt") && $("#quoteAppt").value;
    q.appointmentId = ap || null;
    q.depositRequired = !!($("#quoteDepositReq") && $("#quoteDepositReq").checked);
    const raw = $("#quoteDepositAmt") && $("#quoteDepositAmt").value;
    q.depositAmount = (raw && isFinite(Number(raw))) ? Number(raw) : null;
    (q.lines || []).forEach(function (l, i) {
      const el = document.getElementById("qQty-" + i);
      if (!el) return;
      const v = el.value;
      l.qty = (v === "" || v == null) ? null : Number(v);
      if (l.qty != null && l.unitPrice != null && l.unitPrice !== "" && !isNaN(l.qty)) l.amount = Number(l.qty) * Number(l.unitPrice);
      else l.amount = "TBD";
    });
    toast("Quote saved");
    render();
  }
  function quoteStepperHtml(q) {
    normalizeQuote(q);
    const inv = q.invoiceId ? invoice(q.invoiceId) : null;
    const converted = q.status === "Converted";
    const accepted = q.status === "Accepted" || converted || !!q.acceptedAt;
    const sent = q.status === "Sent" || accepted || converted;
    const expired = q.status === "Expired";
    const steps = [
      { key: "Draft", done: sent || expired || converted, current: q.status === "Draft" },
      { key: "Sent", done: accepted || converted, current: q.status === "Sent" },
      { key: "Accepted", done: converted, current: q.status === "Accepted" },
      { key: "Converted", done: converted, current: converted }
    ];
    if (expired) steps.forEach(function (s) { s.current = false; });
    return '<div class="quote-stepper' + (expired ? " is-expired" : "") + '" aria-label="Quote path">' +
      steps.map(function (s) {
        const cls = "quote-step" + (s.done ? " is-done" : "") + (s.current ? " is-current" : "");
        return '<div class="' + cls + '">' + esc(s.key) + "</div>";
      }).join('<div class="quote-step-arrow" aria-hidden="true">→</div>') +
      (expired ? '<div class="quote-step-arrow" aria-hidden="true">→</div><div class="quote-step is-current">Expired</div>' : "") +
      "</div>";
  }
  function acceptQuote(id) {
    const q = quoteById(id); if (!q) return;
    if (!canAcceptQuote()) { toast("Only clinic staff can accept a quote"); return; }
    normalizeQuote(q);
    if (q.status !== "Draft" && q.status !== "Sent") { toast("Only a draft or sent quote can be marked accepted"); return; }
    const before = q.status;
    q.status = "Accepted";
    q.acceptedAt = nowET();
    q.acceptedBy = actingName();
    q.acceptedByRole = state.actingRole;
    addAudit({ action: "Accepted quote", recordType: "Quote", recordId: id,
      recordPath: { page: "quotes", quoteId: id },
      changes: [{ field: "status", before: before, after: "Accepted" }] });
    toast("Quote accepted by staff · not yet a sale");
    render();
  }
  function quoteRowHtml(q, href) {
    normalizeQuote(q);
    const p = patient(q.patientId);
    const due = q.followUpDue ? ("Follow up " + fmtDate(q.followUpDue)) : "";
    const exp = quoteExpiryDate(q);
    const expBit = exp ? ((q.status === "Expired" ? "Expired " : "Expires ") + fmtDate(exp)) : "";
    const reissue = q.status === "Expired" ? '<button type="button" class="btn tiny" data-pos="reissue" data-quote="' + esc(q.id) + '">Re-issue</button>' : "";
    return '<div class="row quote-row"><a href="' + href + '"><div><div class="row-title">' + esc(q.name) + " · " + (p ? p.name : q.patientId) + '</div><div class="row-sub">' +
      esc(q.id) + " · " + esc(q.created || "") + (expBit ? " · " + expBit : "") + (due ? " · " + due : "") +
      (q.createdBy ? " · " + esc(q.createdBy) : "") +
      '</div></div></a>' + badge(q.status) + reissue + "</div>";
  }
  function renderQuotes() {
    const qid = state.quoteId;
    if (qid) { renderQuoteDetail(qid); return; }
    expireQuotes();
    const head = pageHead("Point of Sale", "Quotes", "Statuses: Draft, Sent, Accepted, Expired, Converted.", "");
    const rows = (store.quotes || []).map(function (q) {
      return quoteRowHtml(q, hashFor({ page: "pos", posTab: "quotes", quoteId: q.id }));
    }).join("") || '<div class="empty">No quotes</div>';
    renderChrome('<a href="' + hashFor({ page: "pos", posTab: "quotes" }) + '">Quotes</a>', head, posTabs("quotes") + '<div class="card"><div class="cardbody">' + rows + "</div></div>");
  }
  function renderQuotesHome() {
    expireQuotes();
    if (state.quoteId) { renderQuoteDetail(state.quoteId); return; }
    const all = store.quotes || [];
    const open = all.filter(quoteIsActive);
    const follow = open.filter(function (q) { return q.followUpDue && q.followUpDue <= todayET(); });
    const count = function (s) { return all.filter(function (q) { return q.status === s; }).length; };
    const pipe = ["Draft", "Sent", "Accepted", "Expired", "Converted"].map(function (s) {
      return '<div class="quote-pipe-step"><div class="k">' + s + '</div><div class="n">' + count(s) + "</div></div>";
    }).join('<div class="quote-step-arrow" aria-hidden="true">→</div>');
    const head = pageHead("Quotes", "Quotes", "Draft → sent → accepted by staff → converted. Quotes expire 30 days after they are created. There is no patient-facing accept.",
      '<button type="button" class="btn small primary" data-new-quote="1">＋ New quote</button>');
    const openRows = open.map(function (q) { return quoteRowHtml(q, hashFor({ page: "quotes", quoteId: q.id })); }).join("") || '<div class="empty">No active quotes</div>';
    const expiredRows = all.filter(function (q) { return q.status === "Expired"; }).map(function (q) { return quoteRowHtml(q, hashFor({ page: "quotes", quoteId: q.id })); }).join("") || '<div class="empty">No expired quotes</div>';
    const followRows = follow.map(function (q) { return quoteRowHtml(q, hashFor({ page: "quotes", quoteId: q.id })); }).join("") || '<div class="empty">No quote follow-ups due today or earlier.</div>';
    const recent = all.slice().sort(function (x, y) { return String(y.created || "").localeCompare(String(x.created || "")); }).slice(0, 8)
      .map(function (q) { return quoteRowHtml(q, hashFor({ page: "quotes", quoteId: q.id })); }).join("") || '<div class="empty">No quotes yet</div>';
    const body = '<div class="quote-pipeline card"><div class="cardbody"><div class="row-sub">Path</div><div class="quote-stepper quote-pipe">' + pipe + "</div></div></div>" +
      '<div class="grid quotes-dash">' +
      '<div class="card"><div class="cardhead"><h2>Active quotes · ' + open.length + '</h2></div><div class="cardbody">' + openRows + '</div></div>' +
      '<div class="card"><div class="cardhead"><h2>Expired</h2></div><div class="cardbody">' + expiredRows + '</div></div>' +
      '<div class="card"><div class="cardhead"><h2>Follow-up worklist</h2></div><div class="cardbody">' + followRows + '</div></div>' +
      '<div class="card"><div class="cardhead"><h2>Recent</h2></div><div class="cardbody">' + recent + '</div></div></div>';
    renderChrome('<a href="' + hashFor({ page: "quotes" }) + '">Quotes</a>', head, body);
  }
  function openNewQuoteModal() {
    if (!canManageQuotes()) { toast("Marketing cannot create quotes"); return; }
    const pats = (store.patients || []).map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + "</option>"; }).join("");
    const tpls = (BRIZZA.QUOTE_TEMPLATES || []).map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + "</option>"; }).join("");
    const firstPid = (store.patients || [])[0] && (store.patients || [])[0].id;
    showModal("New quote",
      '<div class="formgrid"><div class="field"><label for="quotePatient">Patient</label><select id="quotePatient">' + pats + "</select></div>" +
      '<div class="field"><label for="quoteTpl">Template</label><select id="quoteTpl">' + tpls + "</select></div>" +
      '<div class="field"><label for="quoteApptNew">Attach to appointment <span class="row-sub">(optional)</span></label><select id="quoteApptNew"><option value="">Not attached</option></select></div>' +
      '<div class="field full"><label for="quoteAreaNew">Treatment area</label><input id="quoteAreaNew" placeholder="Optional"></div>' +
      '<div class="field full"><label for="quotePlanNew">Recommended plan / sessions</label><textarea id="quotePlanNew" rows="2" placeholder="Optional"></textarea></div>' +
      '<div class="field"><label class="choice"><input id="quoteDepositReqNew" type="checkbox"> Deposit required</label>' +
        '<input id="quoteDepositAmtNew" type="number" min="0" step="0.01" placeholder="Deposit amount"></div>' +
      '<div class="field"><label for="quoteFollow">Follow-up date <span class="row-sub">(optional)</span></label><input id="quoteFollow" type="date"></div></div>',
      function () {
        const pid = $("#quotePatient") && $("#quotePatient").value;
        const tid = $("#quoteTpl") && $("#quoteTpl").value;
        const apptId = ($("#quoteApptNew") && $("#quoteApptNew").value) || null;
        const extras = {
          treatmentArea: ($("#quoteAreaNew") && $("#quoteAreaNew").value) || "",
          recommendedPlan: ($("#quotePlanNew") && $("#quotePlanNew").value) || "",
          depositRequired: !!($("#quoteDepositReqNew") && $("#quoteDepositReqNew").checked),
          depositAmount: (function () { const raw = $("#quoteDepositAmtNew") && $("#quoteDepositAmtNew").value; return raw && isFinite(Number(raw)) ? Number(raw) : null; })(),
          followUpDue: ($("#quoteFollow") && $("#quoteFollow").value) || null
        };
        const q = saveQuoteFromTemplate(pid, apptId, tid, extras);
        if (q) { closeModal(); go({ page: "quotes", quoteId: q.id }); }
      }, "Save quote");
    const refreshAppts = function () {
      const sel = $("#quoteApptNew");
      const pid = $("#quotePatient") && $("#quotePatient").value;
      if (!sel) return;
      sel.innerHTML = '<option value="">Not attached</option>' + (pid ? quotePatientApptOptions(pid, "") : "");
    };
    if ($("#quotePatient")) $("#quotePatient").addEventListener("change", refreshAppts);
    refreshAppts();
  }
  function renderQuoteDetail(id) {
    const q = (store.quotes || []).find((x) => x.id === id);
    if (!q) { renderChrome("Quotes", pageHead("", "Quote not found", "", ""), ""); return; }
    normalizeQuote(q);
    const p = patient(q.patientId);
    const a = q.appointmentId ? appt(q.appointmentId) : null;
    const inv = q.invoiceId ? invoice(q.invoiceId) : null;
    const active = quoteIsActive(q);
    const head = pageHead("Quote", q.name, (p ? patientLink(p) : "") + " · " + esc(q.id) + (q.reissuedFrom ? " · Re-issued from " + esc(q.reissuedFrom) : ""), badge(q.status));
    const credit = p ? patientCredit(p) : 0;
    const body =
      '<div class="card"><div class="cardbody">' +
      quoteStepperHtml(q) +
      (q.status === "Expired" ? '<div class="notice">This quote expired on ' + esc(fmtDate(q.expiresOn || q.expiredAt)) + ". Staff can re-issue a new 30-day quote.</div>" : "") +
      (q.broughtToRoom ? '<div class="notice">Brought to the suite' + (q.broughtAt ? " · " + esc(q.broughtAt) : "") + ".</div>" : "") +
      (q.depositAmount ? '<div class="notice">Deposit ' + money(q.depositAmount) + " is on patient credit" + (credit ? " (credit now " + money(credit) + ")" : "") + ". Apply it at checkout. This is not a completed sale.</div>" : "") +
      (inv && inv.finalized ? '<div class="bill-complete">Bill complete on ' + esc(inv.id) + " · receipt locked</div>" : "") +
      "</div></div>" +
      quoteSheetHtml(q) +
      '<div class="card"><div class="cardbody"><div class="actions" style="margin-top:4px">' +
      (q.status === "Draft" ? '<button class="btn" type="button" data-pos="send" data-quote="' + q.id + '">Send quote</button>' : "") +
      ((q.status === "Draft" || q.status === "Sent") && canAcceptQuote() ? '<button class="btn primary" type="button" data-pos="accept" data-quote="' + q.id + '">Accept quote</button>' : "") +
      (q.status === "Expired" ? '<button class="btn primary" type="button" data-pos="reissue" data-quote="' + q.id + '">Re-issue quote</button>' : "") +
      '<button class="btn" type="button" data-pos="print" data-quote="' + q.id + '">Print / PDF</button>' +
      (!q.broughtToRoom && active ? '<button class="btn" type="button" data-pos="bring" data-quote="' + q.id + '">Bring quote to suite</button>' : "") +
      (active ? '<button class="btn" type="button" data-pos="prepay" data-quote="' + q.id + '">Collect deposit</button>' : "") +
      (active || q.status === "Converted" ? '<button class="btn" type="button" data-pos="book-quote" data-quote="' + q.id + '">Book from quote</button>' : "") +
      (active ? '<button class="btn primary" type="button" data-pos="treat-today" data-quote="' + q.id + '">Treat today</button>' : "") +
      (active ? '<button class="btn" type="button" data-pos="return" data-quote="' + q.id + '">Return</button>' : "") +
      "</div>" +
      '<p class="row-sub">Only clinic staff can accept a quote. There is no patient-facing accept.</p>' +
      openQ("Treat today converts the quote to a same-day invoice. Return books a return visit or leaves the quote open (Open question 20).") +
      "</div></div>";
    renderChrome('<a href="' + hashFor({ page: "quotes" }) + '">Quotes</a> / ' + esc(q.id), head, body);
  }
  function saveQuoteFromTemplate(pid, apptId, templateId, extras) {
    extras = extras || {};
    const tpl = (BRIZZA.QUOTE_TEMPLATES || []).find((t) => t.id === templateId) || (BRIZZA.QUOTE_TEMPLATES || [])[0];
    if (!tpl || !pid) { toast("Select a patient and a template"); return null; }
    store.quotes = store.quotes || [];
    const id = nextId("Q-", store.quotes);
    const created = todayET();
    const rec = {
      id: id, patientId: pid, appointmentId: apptId || null, templateId: tpl.id, name: tpl.name, status: "Draft",
      wording: tpl.wording || "",
      treatmentArea: extras.treatmentArea != null ? extras.treatmentArea : (tpl.treatmentArea || ""),
      recommendedPlan: extras.recommendedPlan != null ? extras.recommendedPlan : (tpl.recommendedPlan || ""),
      disclaimer: tpl.disclaimer || "This is an estimate. The final price may vary.",
      depositRequired: extras.depositRequired != null ? !!extras.depositRequired : !!tpl.depositRequired,
      depositAmount: extras.depositAmount != null ? extras.depositAmount : (tpl.depositAmount || null),
      followUpDue: extras.followUpDue || null,
      lines: (tpl.lines || []).map(quoteLineFromTpl),
      created: created,
      createdBy: actingName(),
      createdByRole: state.actingRole,
      expiresOn: addDays(created, 30),
      broughtToRoom: false,
      invoiceId: null
    };
    store.quotes.push(rec);
    addDocument(pid, { category: "Quotes", title: "Quote · " + rec.name + " · " + rec.id, date: rec.created, relatedId: rec.id, kind: "quote" });
    addAudit({ action: "Saved quote", recordType: "Quote", recordId: id,
      recordPath: { page: "quotes", quoteId: id },
      changes: [{ field: "status", before: "—", after: "Draft" }, { field: "template", before: "—", after: tpl.name }] });
    toast("Quote saved as draft · expires " + fmtDate(rec.expiresOn));
    return rec;
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
    const p = patient(q.patientId);
    showModal("Collect deposit",
      "<p>Record a deposit on this quote. The amount is added to patient credit and can be applied when the invoice is opened. This does not complete the sale.</p>" +
      '<div class="field"><label for="depositAmt">Deposit amount</label><input id="depositAmt" type="number" min="0" step="0.01" placeholder="Amount"' +
      (q.depositAmount ? ' value="' + esc(String(q.depositAmount)) + '"' : "") + "></div>",
      function () {
        const raw = $("#depositAmt") && $("#depositAmt").value;
        const amt = Number(raw);
        if (!raw || !isFinite(amt) || amt <= 0) { toast("Enter a deposit amount"); return; }
        const before = q.status;
        if (q.status === "Draft" || q.status === "Sent") q.status = "Accepted";
        q.depositCollected = true;
        q.depositAmount = Math.round(amt * 100) / 100;
        q.depositAt = nowET();
        if (p) {
          const c0 = patientCredit(p);
          p.credit = Math.round((c0 + amt) * 100) / 100;
          p.ledgerPayments = p.ledgerPayments || [];
          p.ledgerPayments.push({ id: nextId("LPAY-", p.ledgerPayments), method: "Quote deposit · " + q.id, amount: amt, recorded: todayET(), status: "Paid" });
        }
        addAudit({ action: "Collected deposit on quote", recordType: "Quote", recordId: id,
          recordPath: { page: "quotes", quoteId: id },
          changes: [{ field: "status", before: before, after: q.status }, { field: "deposit", before: "—", after: money(amt) }] });
        closeModal();
        toast("Deposit " + money(amt) + " added to patient credit");
        render();
      }, "Record deposit");
  }
  function convertQuoteToInvoice(id, visitKind) {
    const q = quoteById(id); if (!q) return;
    const before = q.status;
    const invId = nextId("INV-", store.invoices);
    const a = q.appointmentId ? appt(q.appointmentId) : null;
    const copied = (q.lines || []).map(quoteLineCopy).filter(Boolean);
    const credit = patientCredit(q.patientId);
    const inv = { id: invId, patientId: q.patientId, visitId: a ? a.visitId : null, appointmentIds: q.appointmentId ? [q.appointmentId] : [],
      status: "Issued", balance: "Outstanding (amount TBD)",
      lines: copied,
      payments: [],
      finalized: false, finalizedAt: null, movements: [], fromQuoteId: q.id, visitKind: visitKind };
    store.invoices.push(inv);
    if (a) a.invoiceId = invId;
    q.status = "Converted"; q.invoiceId = invId; q.visitKind = visitKind;
    addAudit({ action: visitKind === "same-day" ? "Converted quote to same-day invoice" : "Converted quote to return-visit invoice",
      recordType: "Quote", recordId: id,
      recordPath: { page: "pos", invoiceId: invId, posTab: "invoice" },
      changes: [{ field: "status", before: before, after: "Converted" }, { field: "invoice", before: "—", after: invId }] });
    toast("Quote converted · " + invId + (credit > 0 ? " · " + money(credit) + " credit available to apply" : ""));
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
      const ids = tp.reasonIds || [];
      const dep = tp.deposit != null ? String(tp.deposit) : "";
      const attached = '<div class="reason-attach-list">' + reasonsList().map(function (r) {
        return '<label class="reason-attach"><input type="checkbox" data-type-reason="' + i + '" value="' + esc(r.id) + '"' + (ids.indexOf(r.id) >= 0 ? " checked" : "") + "> " + esc(r.name) + "</label>";
      }).join("") + "</div>";
      return "<tr><td><input data-type-field=\"name\" data-i=\"" + i + "\" value=\"" + esc(tp.name) + "\"></td>" +
        "<td><input data-type-field=\"minutes\" data-i=\"" + i + "\" type=\"number\" min=\"1\" value=\"" + esc(tp.minutes) + "\"></td>" +
        "<td><input data-type-field=\"deposit\" data-i=\"" + i + "\" type=\"number\" min=\"0\" step=\"1\" placeholder=\"—\" value=\"" + esc(dep) + "\"></td>" +
        "<td><input data-type-field=\"confirmName\" data-i=\"" + i + "\" value=\"" + esc(tp.confirmName || tp.name) + "\"></td>" +
        "<td>" + attached + "</td></tr>";
    }).join("");
    const reasonRows = reasonsList().map((r, i) => {
      const override = r.minutes != null ? String(r.minutes) : "";
      return "<tr><td><input data-reason-field=\"name\" data-i=\"" + i + "\" value=\"" + esc(r.name) + "\"></td>" +
        "<td><input data-reason-field=\"minutes\" data-i=\"" + i + "\" type=\"number\" min=\"1\" placeholder=\"Type default\" value=\"" + esc(override) + "\"></td></tr>";
    }).join("");
    const head = pageHead("", "Appointment types & reasons", "Lengths are in minutes and include buffers. Leave a reason length blank to use the appointment type's length.",
      '<button class="btn primary" type="button" data-admin="save-types-reasons">Save</button>');
    const body = buffersNote() +
      '<h3 class="section-title">Appointment types</h3>' +
      '<table class="table admin-table"><thead><tr><th>Type</th><th>Length (min)</th><th>Deposit ($)</th><th>Confirmation name</th><th>Attached reasons</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<h3 class="section-title" style="margin-top:24px">Appointment reasons</h3>' +
      '<table class="table admin-table"><thead><tr><th>Reason</th><th>Length override (min)</th></tr></thead><tbody>' + reasonRows + "</tbody></table>";
    renderAdminChrome(head, body);
  }
  function renderReasons() {
    state.adminTab = "types";
    renderTypes();
  }
  function saveTypes() {
    $$("[data-type-field]").forEach((el) => {
      const i = Number(el.getAttribute("data-i"));
      const f = el.getAttribute("data-type-field");
      if (!store.appointmentTypes[i]) return;
      if (f === "minutes" || f === "deposit") store.appointmentTypes[i][f] = el.value === "" ? (f === "deposit" ? null : 0) : Number(el.value);
      else store.appointmentTypes[i][f] = el.value;
    });
    const byType = {};
    $$("[data-type-reason]").forEach(function (el) {
      const i = Number(el.getAttribute("data-type-reason"));
      if (!store.appointmentTypes[i]) return;
      if (!byType[i]) byType[i] = [];
      if (el.checked) byType[i].push(el.value);
    });
    Object.keys(byType).forEach(function (i) { store.appointmentTypes[i].reasonIds = byType[i]; });
    addAudit({ action: "Updated appointment types", recordType: "Configuration", recordId: "appointment-types",
      recordPath: { page: "types" }, changes: [{ field: "types", before: "prior in-memory values", after: "updated in this session" }] });
    toast("Types saved");
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
    toast("Reasons saved");
    render();
  }
  function saveTypesAndReasons() {
    $$("[data-type-field]").forEach((el) => {
      const i = Number(el.getAttribute("data-i"));
      const f = el.getAttribute("data-type-field");
      if (!store.appointmentTypes[i]) return;
      if (f === "minutes" || f === "deposit") store.appointmentTypes[i][f] = el.value === "" ? (f === "deposit" ? null : 0) : Number(el.value);
      else store.appointmentTypes[i][f] = el.value;
    });
    const byType = {};
    $$("[data-type-reason]").forEach(function (el) {
      const i = Number(el.getAttribute("data-type-reason"));
      if (!store.appointmentTypes[i]) return;
      if (!byType[i]) byType[i] = [];
      if (el.checked) byType[i].push(el.value);
    });
    Object.keys(byType).forEach(function (i) { store.appointmentTypes[i].reasonIds = byType[i]; });
    $$("[data-reason-field]").forEach((el) => {
      const i = Number(el.getAttribute("data-i"));
      const f = el.getAttribute("data-reason-field");
      if (!store.appointmentReasons[i]) return;
      if (f === "minutes") store.appointmentReasons[i].minutes = el.value === "" ? null : Number(el.value);
      else store.appointmentReasons[i][f] = el.value;
    });
    addAudit({ action: "Updated appointment types and reasons", recordType: "Configuration", recordId: "appointment-types",
      recordPath: { page: "types" }, changes: [{ field: "types-reasons", before: "prior in-memory values", after: "updated in this session" }] });
    toast("Saved");
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
    const printBtn = '<div class="actions" style="margin-top:12px"><button class="btn small" type="button" data-print-note="' + esc(pid) + '" data-nid="' + esc(n.id) + '">Print</button></div>';
    showModal(esc(n.type || "Note") + " · " + (p ? p.name : pid),
      (p ? alertsBanner(p) : "") +
      lock + " " + badge(n.status || "Open") +
      '<div class="note-print-preview">' + notePrintHtml(p, n) + "</div>" +
      (adds ? "" : "") +
      addForm + edit + proc + printBtn +
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
    const head = pageHead("Admin", "Availability", "",
      canManageAvailability() ? '<button class="btn primary" type="button" data-av-new="1">＋ Template</button>' : "");
    if (!canManageAvailability()) {
      const body = '<div class="card"><div class="cardbody"><div class="notice">Availability is available when acting as Clinic Manager or MD / Clinic Owner. Change Acting as in the top bar to open this module.</div></div></div>';
      renderAdminChrome(head, body);
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
         " · " + esc((Number(t.everyNWeeks || 1) === 1) ? "Every week" : ("Every " + String(t.everyNWeeks) + " weeks")) + " · " + esc(dayNames(t.days)) + "</div>" +
        '<div style="margin-top:6px">' + esc(locBlocks) + " " + flag + "</div></div></div>";
    }).join("") || '<div class="empty">No availability templates</div>';
    const body = '<div class="card"><div class="cardbody">' +
      '<p class="row-sub">Clinic baseline is Monday–Friday, 10:00 a.m.–6:00 p.m. ET. Templates can include earlier or later hours; those blocks are shown and flagged.</p>' +
      openQ("Can a provider template start before or end after clinic hours? Nicole's example uses 9–11 a.m., which begins before the 10 a.m. clinic open (Open question 27).") +
      openQ("Long Island is a synthetic second location added as an example. Real clinic locations are not confirmed (Open question 26).") +
      "</div></div>" + rows;
    renderAdminChrome(head, body);
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
    const snapshot = JSON.parse(JSON.stringify(existing));
    const idx = store.availabilityTemplates.indexOf(existing);
    store.availabilityTemplates = store.availabilityTemplates.filter((t) => t.id !== id);
    addAudit({ action: "Deleted availability template", recordType: "Availability", recordId: id,
      recordPath: { page: "availability" },
      changes: [{ field: "template", before: existing.provider, after: "Deleted" }] });
    toast("Template deleted", {
      undo: function () {
        store.availabilityTemplates = store.availabilityTemplates || [];
        store.availabilityTemplates.splice(Math.max(0, idx), 0, snapshot);
        toast("Template restored");
        render();
      }
    });
    render();
  }


  function actingProviderStaff() {
    return (BRIZZA.STAFF || []).find(function (s) { return s.isProvider && s.role === state.actingRole; }) || null;
  }
  function lastVisitBefore(pid, date) {
    return (store.appointments || []).filter(function (a) {
      return a.patientId === pid && a.date && a.date < date && a.status !== "Canceled" && a.status !== "Rescheduled";
    }).sort(function (a, b) { return (b.date + " " + (b.time || "")).localeCompare(a.date + " " + (a.time || "")); })[0] || null;
  }
  function allergyLabel(p) {
    const list = (p && p.allergies) || [];
    if (!list.length) return "No allergies on file";
    return list.join(", ");
  }
  function pendingNotesForProvider(providerName) {
    const items = [];
    (store.patients || []).forEach(function (p) {
      (p.notes || []).forEach(function (n) {
        if (!isNoteSigned(n) && (!providerName || n.provider === providerName)) items.push({ p: p, n: n });
      });
    });
    items.sort(function (a, b) { return String(b.n.date || "").localeCompare(String(a.n.date || "")); });
    return items;
  }
  function lastNoteOf(p) {
    return ((p && p.notes) || []).slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || "")) || String(b.id || "").localeCompare(String(a.id || ""));
    })[0] || null;
  }
  function lastCompletedVisit(pid, beforeDate) {
    return (store.appointments || []).filter(function (a) {
      return a.patientId === pid && a.status === "Checked out" && a.date && (!beforeDate || a.date < beforeDate);
    }).sort(function (a, b) { return (b.date + " " + (b.time || "")).localeCompare(a.date + " " + (a.time || "")); })[0] || null;
  }
  function pendingNoteFromLastVisit(p, day) {
    const last = lastCompletedVisit(p.id, day);
    if (!last) return null;
    const n = (p.notes || []).find(function (note) {
      return !isNoteSigned(note) && (note.appointmentId === last.id || (last.visitId && note.visitId === last.visitId) || note.date === last.date);
    });
    return n ? { n: n, visit: last } : null;
  }
  function isMaRole(role) {
    role = role || state.actingRole;
    return role === "Medical Assistant";
  }
  function isFrontDeskRole(role) {
    role = role || state.actingRole;
    return role === "Clinical Coordinator" || role === "Clinic Manager";
  }
  function canCreateInvoice(role) {
    role = role || state.actingRole;
    return role === "Clinical Coordinator" || role === "Clinic Manager" || role === "MD / Clinic Owner";
  }
  function canManageQuotes(role) {
    return !isMarketingRole(role);
  }
  function canEditChartHistory(role) {
    return isMaRole(role);
  }
  function canSignNotes(role) {
    return isClinicalRole(role);
  }
  function nextBusinessDay(iso) {
    let d = addDays(iso, 1);
    while (isClinicClosedDay(d)) d = addDays(d, 1);
    return d;
  }
  function visitHasCharges(a) {
    const inv = invoiceForAppt(a) || (a && a.invoiceId ? invoice(a.invoiceId) : null);
    if (!inv) return false;
    return (inv.lines || []).some(function (l) { const amt = lineAmount(l); return amt != null && Number(amt) > 0; });
  }
  function chargesMissing(a) {
    if (!a) return false;
    if (a.status === "Canceled" || a.status === "No-show" || a.status === "Scheduled" || a.status === "Confirmed") return false;
    return !visitHasCharges(a);
  }
  function clinicDayAppointments(date, opts) {
    opts = opts || {};
    return (store.appointments || []).filter(function (a) {
      if (a.date !== date || a.status === "Rescheduled") return false;
      if (a.status === "Canceled" && !opts.includeCanceled) return false;
      if (opts.provider && a.provider !== opts.provider) return false;
      if (opts.statuses && opts.statuses.indexOf(a.status) < 0) return false;
      return true;
    }).sort(function (a, b) { return String(a.time).localeCompare(String(b.time)) || String(a.id).localeCompare(String(b.id)); });
  }

  function consentInlineHtml(s) {
    let t = esc(s);
    t = t.replace(/\[SAMPLE\]/g, '<span class="consent-sample">[SAMPLE]</span>');
    t = t.replace(/\[PLACEHOLDER[^\]]*\]/g, function (m) { return '<span class="consent-sample">' + m + "</span>"; });
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return t;
  }
  function renderConsentMarkdown(md) {
    if (!md) return '<p class="empty">Wording is not loaded.</p>';
    const lines = String(md).replace(/\r\n/g, "\n").split("\n");
    let html = "", i = 0, inList = false;
    const flushList = function () { if (inList) { html += "</ul>"; inList = false; } };
    const isTableRow = function (line) { return /^\s*\|/.test(line) && /\|/.test(line.slice(1)); };
    const isTableSep = function (line) { return /^\s*\|?\s*:?-{3,}/.test(line); };
    while (i < lines.length) {
      const raw = lines[i];
      const line = raw.replace(/\s+$/, "");
      if (!line) { flushList(); html += ""; i += 1; continue; }
      if (isTableRow(line)) {
        flushList();
        const rows = [];
        while (i < lines.length && isTableRow(lines[i])) {
          if (!isTableSep(lines[i])) rows.push(lines[i]);
          i += 1;
        }
        html += "<table>" + rows.map(function (r, ri) {
          const cells = r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(function (c) { return c.trim(); });
          const tag = ri === 0 ? "th" : "td";
          return "<tr>" + cells.map(function (c) { return "<" + tag + ">" + consentInlineHtml(c) + "</" + tag + ">"; }).join("") + "</tr>";
        }).join("") + "</table>";
        continue;
      }
      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) { flushList(); html += "<h" + h[1].length + ">" + consentInlineHtml(h[2]) + "</h" + h[1].length + ">"; i += 1; continue; }
      if (/^>\s?/.test(line)) { flushList(); html += "<blockquote>" + consentInlineHtml(line.replace(/^>\s?/, "")) + "</blockquote>"; i += 1; continue; }
      if (/^[-*]\s+/.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + consentInlineHtml(line.replace(/^[-*]\s+/, "")) + "</li>";
        i += 1; continue;
      }
      flushList();
      html += "<p>" + consentInlineHtml(line) + "</p>";
      i += 1;
    }
    flushList();
    return html;
  }
  function consentWordingBlock(form) {
    const pack = (BRIZZA.CONSENT_WORDING || {})[form.id];
    if (!pack || !pack.markdown) return '<p class="row-sub">Wording is not loaded for this form.</p>';
    return '<details class="consent-wording-wrap"><summary>View form wording</summary>' +
      '<div class="consent-wording">' + renderConsentMarkdown(pack.markdown) + "</div></details>";
  }
  function canSeeDissolveConsent(a) {
    if (isOwnerRole()) return true;
    const prov = a && a.provider ? staffRecord(a.provider) : null;
    return !!(prov && (prov.isMd || prov.role === "MD / Clinic Owner"));
  }
  function consentFormVisible(form, a) {
    if (!form) return false;
    if (form.ownerMdOnly) return canSeeDissolveConsent(a);
    return true;
  }
  function consentExpired(rec) {
    if (!rec || !rec.signedAt) return false;
    const signed = String(rec.signedAt).slice(0, 10);
    if (signed && addDays(signed, 365) <= todayET()) return true;
    if (rec.productChanged) return true;
    return false;
  }
  function consentRecordFor(p, formId) {
    return ((p && p.consentRecords) || []).filter(function (r) { return r.formId === formId && !r.archived; }).slice(-1)[0] || null;
  }
  function consentStatusOf(rec) {
    if (rec && rec.signedAt) return consentExpired(rec) ? "Re-sign due" : "Signed";
    if (rec && rec.presentedAt) return "Presented";
    return "Not started";
  }
  function canRecordConsentSignature() {
    if (isMarketingRole()) return false;
    if (isMaRole() && !isOwnerRole() && !isClinicalRole()) return false;
    return true;
  }
  function consentListHtml(a, p, opts) {
    opts = opts || {};
    if (!p) return '<div class="consent-list"><div class="empty">No patient on this appointment.</div></div>';
    p.consentRecords = p.consentRecords || [];
    const forms = (BRIZZA.CONSENT_FORMS || []).filter(function (f) { return consentFormVisible(f, a); });
    const hiddenDissolve = (BRIZZA.CONSENT_FORMS || []).some(function (f) { return f.ownerMdOnly && !consentFormVisible(f, a); });
    const rows = forms.map(function (f) {
      const rec = consentRecordFor(p, f.id);
      const status = consentStatusOf(rec);
      const expired = consentExpired(rec);
      const when = rec && rec.signedAt ? rec.signedAt : (rec && rec.presentedAt ? rec.presentedAt : "");
      const vol = f.kind === "marketing-photo" ? '<div class="row-sub">Voluntary — never required to book or treat.</div>' : "";
      const flag = expired ? '<div class="row-sub consent-resign-flag">This record is flagged for re-sign.</div>' : "";
      const locked = f.ownerMdOnly && !canSeeDissolveConsent(a);
      return '<div class="consent-row compact" data-consent-kind="' + esc(f.kind) + '">' +
        "<div><strong>" + esc(f.title) + "</strong>" + vol + flag + "</div>" +
        '<div class="consent-sig">' + esc(status) + (when ? " · " + esc(when) : "") + (expired ? " · 12-month re-sign flag" : "") + "</div>" +
        "<div>" + (locked
          ? '<span class="row-sub">Owner / MD only</span>'
          : '<button type="button" class="btn tiny' + (status === "Not started" || expired ? " primary" : "") + '" data-open-consent-form="' + esc(f.id) + '" data-pid="' + esc(p.id) + '" data-appt="' + esc(a ? a.id : "") + '">Open</button>') +
        "</div></div>";
    }).join("");
    return '<div class="consent-list">' +
      (opts.heading === false ? "" : "<h3>Consents</h3>") +
      '<p class="row-sub">Open one form at a time. Re-sign at least once every 12 months, and whenever the service, product, or device changes. Consents are not clinical notes. Marketing photography is voluntary.</p>' +
      rows +
      (hiddenDissolve ? '<p class="row-sub">Filler dissolve consent is available only when the provider or acting role is Owner / MD.</p>' : "") +
      '<p class="row-sub">Cancellation: 24-hour cutoff, $50 late-cancel fee and $50 no-show fee.</p></div>';
  }
  function myDayConsentsHtml(a, p) {
    if (!p || isMarketingRole()) return "";
    return '<div class="myday-consents">' + consentListHtml(a, p, { heading: true }) + "</div>";
  }
  function appointmentConsentsHtml(a, p) {
    return '<div class="appt-consents">' + consentListHtml(a, p, { heading: true }) + "</div>";
  }
  function openConsentsPanel(apptId) {
    const a = appt(apptId);
    const p = a ? patient(a.patientId) : null;
    if (!a || !p) { toast("Open the appointment to complete consents"); return; }
    if (isMarketingRole()) { toast("Marketing does not complete consents"); return; }
    showModal("Consents · " + p.name, consentListHtml(a, p, { heading: false }), null, "Close");
  }
  function openConsentForm(pid, apptId, formId) {
    const p = patient(pid);
    const a = apptId ? appt(apptId) : null;
    const form = (BRIZZA.CONSENT_FORMS || []).find(function (f) { return f.id === formId; });
    if (!p || !form) return;
    if (form.ownerMdOnly && !canSeeDissolveConsent(a)) { toast("Filler dissolve consent is Owner / MD only"); return; }
    const rec = consentRecordFor(p, formId);
    const status = consentStatusOf(rec);
    const expired = consentExpired(rec);
    const vol = form.kind === "marketing-photo" ? '<p class="row-sub">Voluntary — never required to book or treat.</p>' : "";
    const pack = (BRIZZA.CONSENT_WORDING || {})[form.id];
    const wording = pack && pack.markdown
      ? '<div class="consent-wording consent-wording-open">' + renderConsentMarkdown(pack.markdown) + "</div>"
      : '<p class="row-sub">Wording is not loaded for this form.</p>';
    const canSign = canRecordConsentSignature();
    const maNote = (isMaRole() && !canSign) ? '<p class="row-sub">MA may present; the patient signs, not the MA as provider.</p>' : "";
    const presentBtn = '<button type="button" class="btn" data-consent-act="present" data-consent-form="' + esc(form.id) + '" data-pid="' + esc(p.id) + '" data-appt="' + esc(apptId || "") + '">Present</button>';
    const body =
      '<div class="consent-form-body" data-consent-form-modal="' + esc(form.id) + '">' +
      '<p class="consent-form-status">' + esc(status) + (expired ? " · 12-month re-sign flag" : "") + "</p>" +
      vol +
      '<p class="row-sub">Re-sign at least once every 12 months, and whenever the service, product, or device changes.' + (expired ? " This record is flagged for re-sign." : "") + "</p>" +
      maNote +
      wording +
      '<div class="consent-form-acts">' + presentBtn + "</div></div>";
    const saveLabel = canSign && (status !== "Signed" || expired) ? "Save" : null;
    showModal(form.title, body, saveLabel ? function () {
      applyConsentAction(pid, apptId, formId, "sign", { closeOnSave: true });
    } : null, saveLabel || "Close");
  }
  function applyConsentAction(pid, apptId, formId, act, opts) {
    opts = opts || {};
    const p = patient(pid);
    const form = (BRIZZA.CONSENT_FORMS || []).find(function (f) { return f.id === formId; });
    const a = appt(apptId);
    if (!p || !form) return;
    if (form.ownerMdOnly && !canSeeDissolveConsent(a)) { toast("Filler dissolve consent is Owner / MD only"); return; }
    p.consentRecords = p.consentRecords || [];
    let rec = consentRecordFor(p, formId);
    if (act === "sign" && rec && rec.signedAt && consentExpired(rec)) {
      rec.archived = true;
      rec = null;
    }
    if (!rec) {
      rec = { id: nextId("CN-", p.consentRecords), formId: formId, title: form.title, kind: form.kind, appointmentId: apptId };
      p.consentRecords.push(rec);
    }
    if (act === "present") {
      rec.presentedAt = nowET();
      rec.presentedBy = actingName();
      toast("Consent presented to the patient");
      if (opts.closeOnSave) { closeModal(); render(); return; }
      openConsentForm(pid, apptId, formId);
      return;
    }
    if (act === "sign") {
      if (!canRecordConsentSignature()) { toast("The medical assistant can present this form but cannot sign as the provider. The patient signs."); return; }
      rec.signedAt = nowET();
      rec.signedByPatient = p.name;
      rec.witnessedBy = actingName();
      rec.productChanged = false;
      toast("Patient signature recorded · " + rec.signedAt);
      if (opts.closeOnSave !== false) { closeModal(); render(); return; }
    }
    render();
  }
  function catalogByName(name) {
    return (BRIZZA.CATALOG || []).find(function (c) { return c.name === name; }) || null;
  }
  function noteChargeLine(c) {
    c = c || {};
    const cat = catalogByName(c.name);
    let qty = (c.qty != null && c.qty !== "") ? Number(c.qty) : null;
    let unitPrice = (c.unitPrice != null && c.unitPrice !== "") ? Number(c.unitPrice) : null;
    if ((unitPrice == null || isNaN(unitPrice)) && c.amount != null && c.amount !== "") {
      const amt = Number(c.amount);
      if (!isNaN(amt)) unitPrice = (qty && qty > 0) ? (amt / qty) : amt;
    }
    if ((unitPrice == null || isNaN(unitPrice)) && cat && cat.price != null) unitPrice = Number(cat.price);
    if (qty == null || isNaN(qty)) qty = 1;
    const line = (qty != null && unitPrice != null && !isNaN(qty) && !isNaN(unitPrice)) ? Math.round(qty * unitPrice * 100) / 100 : null;
    return {
      name: c.name || "",
      qty: qty,
      unitPrice: (unitPrice != null && !isNaN(unitPrice)) ? unitPrice : null,
      amount: line,
      unit: c.unit || (cat && cat.unit) || "",
      catalogId: c.catalogId || (cat && cat.id) || ""
    };
  }
  function emnChargeRowHtml(c, i) {
    const line = noteChargeLine(c || {});
    const cats = BRIZZA.CATALOG || [];
    const opts = cats.map(function (cat) {
      return '<option value="' + esc(cat.name) + '"' + (line.name === cat.name ? " selected" : "") + ">" + esc(cat.name) + (cat.price != null ? " · " + money(cat.price) : "") + (cat.unit ? " / " + esc(cat.unit) : "") + "</option>";
    }).join("");
    const extra = (line.name && !cats.some(function (cat) { return cat.name === line.name; }))
      ? '<option selected value="' + esc(line.name) + '">' + esc(line.name) + "</option>" : "";
    return '<div class="tpl-opt-row emn-charge-row">' +
      '<select data-emn-charge-name="' + i + '" aria-label="Charge">' +
        '<option value="">Select a charge</option>' + opts + extra + "</select>" +
      '<label class="emn-charge-qty">Qty <input type="number" min="0" step="any" inputmode="decimal" placeholder="Qty" data-emn-charge-qty="' + i + '" value="' + esc(line.qty != null ? String(line.qty) : "") + '" aria-label="Quantity"' + (line.unit ? ' title="' + esc(line.unit) + '"' : "") + ">" +
        (line.unit ? '<span class="row-sub">' + esc(line.unit) + "</span>" : "") + "</label>" +
      '<label class="emn-charge-price">Price <input type="number" min="0" step="0.01" placeholder="Unit price" data-emn-charge-price="' + i + '" value="' + esc(line.unitPrice != null ? String(line.unitPrice) : "") + '" aria-label="Unit price"></label>' +
      '<span class="emn-charge-total" data-emn-charge-total="' + i + '">' + (line.amount != null ? money(line.amount) : "—") + "</span>" +
    "</div>";
  }
  function refreshEmnChargeTotals() {
    $$("[data-emn-charge-name]").forEach(function (sel) {
      const i = sel.getAttribute("data-emn-charge-name");
      const qtyEl = document.querySelector('[data-emn-charge-qty="' + i + '"]');
      const priceEl = document.querySelector('[data-emn-charge-price="' + i + '"]');
      const totalEl = document.querySelector('[data-emn-charge-total="' + i + '"]');
      const qtyLab = qtyEl && qtyEl.closest(".emn-charge-qty");
      const cat = catalogByName(sel.value);
      if (qtyLab) {
        const sub = qtyLab.querySelector(".row-sub");
        if (cat && cat.unit) {
          if (sub) sub.textContent = cat.unit;
          else {
            const s = document.createElement("span");
            s.className = "row-sub";
            s.textContent = cat.unit;
            qtyLab.appendChild(s);
          }
        } else if (sub) sub.textContent = "";
      }
      const qty = qtyEl && qtyEl.value !== "" ? Number(qtyEl.value) : null;
      const price = priceEl && priceEl.value !== "" ? Number(priceEl.value) : null;
      if (totalEl) totalEl.textContent = (qty != null && price != null && !isNaN(qty) && !isNaN(price)) ? money(Math.round(qty * price * 100) / 100) : "—";
    });
  }
  function collectEmnCharges() {
    return Array.prototype.map.call(document.querySelectorAll("[data-emn-charge-name]"), function (sel) {
      const i = sel.getAttribute("data-emn-charge-name");
      const name = sel.value;
      if (!name) return null;
      const qtyEl = document.querySelector('[data-emn-charge-qty="' + i + '"]');
      const priceEl = document.querySelector('[data-emn-charge-price="' + i + '"]');
      const qty = qtyEl && qtyEl.value !== "" ? Number(qtyEl.value) : 1;
      const unitPrice = priceEl && priceEl.value !== "" ? Number(priceEl.value) : null;
      return noteChargeLine({ name: name, qty: isNaN(qty) ? 1 : qty, unitPrice: (unitPrice != null && !isNaN(unitPrice)) ? unitPrice : null });
    }).filter(Boolean);
  }
  function pendingNoteChargesForPatient(pid, inv) {
    const p = patient(pid);
    const existing = {};
    ((inv && inv.lines) || []).forEach(function (l) {
      if (l && l.fromNote && l.name) existing[(l.noteId || "") + "|" + l.name] = true;
    });
    const rows = [];
    ((p && p.notes) || []).forEach(function (n) {
      (n.charges || []).forEach(function (c) {
        if (!c || !c.name) return;
        const line = noteChargeLine(c);
        const key = (n.id || "") + "|" + line.name;
        if (existing[key]) return;
        rows.push({ noteId: n.id, noteTitle: n.title || n.type || "Note", line: line });
      });
    });
    return rows;
  }
  function pendingNoteChargesHtml(inv) {
    if (!inv || inv.finalized || !(isCoordinatorRole() || state.actingRole === "Clinic Manager" || isOwnerRole())) return "";
    const rows = pendingNoteChargesForPatient(inv.patientId, inv);
    if (!rows.length) return "";
    const list = rows.map(function (r) {
      const tot = r.line.amount != null ? money(r.line.amount) : "TBD";
      const q = r.line.qty != null ? String(r.line.qty) : "—";
      const unit = r.line.unit ? " " + r.line.unit : "";
      return '<div class="pos-note-charge-row"><span>' + esc(r.line.name) + " · qty " + esc(q) + esc(unit) + " · " + tot +
        ' <span class="row-sub">from ' + esc(r.noteTitle) + "</span></span></div>";
    }).join("");
    return '<div class="pos-pending-note-charges"><div class="row-sub">Pending charges from notes</div>' + list +
      '<button type="button" class="btn tiny" data-add-note-charges="' + esc(inv.id) + '">Add charges from note</button></div>';
  }
  function openEmnInfo(pid, nid) {
    const p = patient(pid);
    const n = p && (p.notes || []).find(function (x) { return x.id === nid; });
    if (!n) return;
    const ap = n.appointmentId ? appt(n.appointmentId) : null;
    const staffOpts = function (selected) {
      return '<option value=""></option>' + (BRIZZA.STAFF || []).map(function (s) {
        return "<option" + (s.name === selected ? " selected" : "") + ">" + esc(s.name) + "</option>";
      }).join("");
    };
    const statuses = (BRIZZA.NOTE_STATUSES || ["Draft", "Ready for review", "Finalized", "Amended"]).map(function (s) {
      return "<option" + ((n.status || "Draft") === s ? " selected" : "") + ">" + esc(s) + "</option>";
    }).join("");
    const catalogOpts = (BRIZZA.CATALOG || []).map(function (c) {
      return '<option value="' + esc(c.name) + '" data-price="' + (c.price != null ? esc(String(c.price)) : "") + '">' + esc(c.name) + (c.price != null ? " · " + money(c.price) : "") + "</option>";
    }).join("");
    const chargeRows = ((n.charges && n.charges.length) ? n.charges : [{ name: "", qty: 1, unitPrice: null }]).map(function (c, i) {
      return emnChargeRowHtml(c, i);
    }).join("");
    showModal("Note details",
      '<div class="formgrid">' +
        '<div class="field full"><label for="emnTitle">Note name</label><input id="emnTitle" value="' + esc(n.title || n.type || "") + '"></div>' +
        '<div class="field"><label for="emnDos">Date of service (DOS)</label><input id="emnDos" type="date" value="' + esc(n.dos || n.date || "") + '"></div>' +
        '<div class="field"><label for="emnStatus">Note status</label><select id="emnStatus">' + statuses + "</select></div>" +
        '<div class="field"><label for="emnPrimary">Primary provider</label><select id="emnPrimary">' + staffOpts(n.primaryProvider || n.provider || (ap && ap.provider) || "") + "</select></div>" +
        '<div class="field"><label for="emnSecondary">Secondary provider</label><select id="emnSecondary">' + staffOpts(n.secondaryProvider || "") + "</select></div>" +
        '<div class="field"><label for="emnAssistant">Assistant</label><select id="emnAssistant">' + staffOpts(n.assistant || "") + "</select></div>" +
        '<div class="field"><label for="emnNextAppt">Next appointment</label><input id="emnNextAppt" type="date" value="' + esc(n.nextAppointmentDate || "") + '"></div>' +
        '<div class="field full"><span>Charges</span>' +
        '<p class="row-sub">Pick from the catalog. The Clinical Coordinator can add these in Point of Sale with Add charges from note.</p>' +
        '<div id="emnChargeRows">' + chargeRows + "</div>" +
        '<button type="button" class="btn tiny" id="emnAddCharge">＋ Add charge</button></div></div>' +
        (isMaRole() ? '<p class="row-sub">The medical assistant can start and edit a draft but cannot set the status to Finalized.</p>' : ""),
      function () {
        const nextStatus = $("#emnStatus").value;
        if (nextStatus === "Finalized" && !canFinalizeNote(n)) { toast("The medical assistant cannot finalize a note"); return; }
        n.title = $("#emnTitle").value.trim() || n.type || "Note";
        n.dos = $("#emnDos").value || n.date;
        n.status = nextStatus;
        n.primaryProvider = $("#emnPrimary").value;
        n.secondaryProvider = $("#emnSecondary").value;
        n.assistant = $("#emnAssistant").value;
        n.nextAppointmentDate = ($("#emnNextAppt") && $("#emnNextAppt").value) || "";
        n.charges = collectEmnCharges();
        toast("Note details saved");
        closeModal();
        render();
      }, "Save details");
  }
  function checkoutIfAllowedHtml(a) {
    if (!(isFrontDeskRole() || isOwnerRole())) return "";
    if (a.status === "Checked out") {
      const due = visitUnpaid(a);
      return due.unpaid ? '<span class="wl-unpaid-mark">Completed, unpaid</span>' : "";
    }
    if (a.status !== "Ready for checkout") return "";
    if (!visitHasCharges(a)) return '<span class="row-sub">Check out once charges exist</span>';
    return '<button class="btn tiny primary" type="button" data-fd-checkout="' + esc(a.id) + '">Check out</button>';
  }
  function noteDueDate(n) {
    const d = n && n.date ? n.date : todayET();
    return nextBusinessDay(d);
  }
  function isNoteLate(n) {
    if (!n || isNoteSigned(n)) return false;
    return noteDueDate(n) < todayET();
  }
  function todayTab() {
    return "today";
  }
  function myDayTab() {
    const t = state.myDayTab || "patients";
    if (t === "today") return "patients";
    if (t === "mine") return "notes";
    return t;
  }
  function pendingEmnCount() {
    const who = actingName();
    let n = 0;
    (store.patients || []).forEach(function (p) {
      (p.notes || []).forEach(function (note) {
        if (isNoteSigned(note)) return;
        if (!isOwnerRole() && ! (state.actingRole === "Clinic Manager") && note.provider && note.provider !== who) return;
        n += 1;
      });
    });
    return n;
  }
  function myDayDate() {
    return state.myDayDate || defaultClinicDate();
  }
  function canSeeMyDayPending() {
    return canStartNote() || isOwnerRole() || state.actingRole === "Clinic Manager";
  }
  function canSeeMyDayClinicNotes() {
    return isOwnerRole() || state.actingRole === "Clinic Manager";
  }
  function myDayTabsHtml() {
    const cur = myDayTab();
    const tabs = [["patients", "Today's patients"]];
    if (canSeeMyDayPending()) tabs.push(["pending", "Pending EMNs (" + pendingEmnCount() + ")"]);
    if (canStartNote() || isOwnerRole() || canSeeMyDayClinicNotes()) tabs.push(["notes", "Notes"]);
    const tabBtns = tabs.map(function (t) {
      const on = t[0] === cur;
      return '<a class="btn small' + (on ? " primary" : "") + '" role="tab" aria-selected="' + (on ? "true" : "false") + '" href="' + hashFor({ page: "emr", myDayTab: t[0], myDayDate: myDayDate() }) + '">' + t[1] + "</a>";
    }).join("");
    const cal = cur === "patients"
      ? ('<label class="myday-cal">Calendar <input id="myDayDate" type="date" value="' + esc(myDayDate()) + '"></label>')
      : "";
    return '<div class="today-tabs myday-tabs" role="tablist" aria-label="My Day">' + tabBtns + cal + "</div>";
  }
  function todayTabsHtml() { return myDayTabsHtml(); }
  function noteStatusChip(n) {
    return '<span class="note-status-chip" data-note-status="' + esc((n && n.status) || "Draft") + '">' + esc((n && n.status) || "Draft") + "</span>";
  }
  function visitNotesOf(a) {
    const p = patient(a.patientId);
    return ((p && p.notes) || []).filter(function (n) { return n && n.appointmentId === a.id; });
  }
  function pastNotesOf(p, exceptApptId) {
    return ((p && p.notes) || []).filter(function (n) { return n && n.appointmentId !== exceptApptId; })
      .slice()
      .sort(function (x, y) { return String(y.date || "").localeCompare(String(x.date || "")) || String(y.id || "").localeCompare(String(x.id || "")); });
  }
  function emnActionsHtml(p, n) {
    const info = '<button type="button" class="btn tiny" data-emn-info="' + esc(n.id) + '" data-pid="' + esc(p.id) + '" title="Note details">Info</button>';
    const view = '<button type="button" class="btn tiny" data-open="note-view" data-pid="' + esc(p.id) + '" data-nid="' + esc(n.id) + '">View</button>';
    const preview = '<button type="button" class="btn tiny" data-toggle-emn="' + esc(n.id) + '">Preview</button>';
    const print = '<button type="button" class="btn tiny" data-print-note="' + esc(p.id) + '" data-nid="' + esc(n.id) + '">Print</button>';
    const edit = canEditNote(n) ? '<button type="button" class="btn tiny" data-edit-note="' + esc(n.id) + '" data-pid="' + esc(p.id) + '">Edit</button>' : "";
    const sign = (!isNoteSigned(n) && canFinalizeNote(n)) ? '<button type="button" class="btn tiny primary" data-quick-sign="' + esc(n.id) + '" data-pid="' + esc(p.id) + '">Sign</button>' : "";
    const openPreview = state.expandedEmn === n.id
      ? '<div class="emn-preview note-print-preview">' + notePrintHtml(p, n) + '<div class="emn-preview-actions no-print">' + print + "</div></div>"
      : "";
    const more = '<div class="emn-more"><button type="button" class="btn tiny" data-emn-more="' + esc(n.id) + '" aria-expanded="false" aria-haspopup="true" aria-label="More note actions">⋯</button><div class="emn-more-menu">' + info + preview + print + "</div></div>";
    return '<div class="emn-actions">' + noteStatusChip(n) + view + edit + sign + more + openPreview + "</div>";
  }
  function pastEmnDropdown(p, exceptApptId) {
    const list = pastNotesOf(p, exceptApptId);
    if (!list.length) return '<div class="row-sub">No earlier EMNs</div>';
    return '<details class="emn-past"><summary>Past EMNs · ' + list.length + "</summary>" +
      list.map(function (n) {
        return '<div class="emn-row"><div><strong>' + esc(n.type || "Note") + "</strong> · " + esc(fmtDate(n.date)) + " · " + esc(n.provider || "") + "</div>" + emnActionsHtml(p, n) + "</div>";
      }).join("") + "</details>";
  }
  function formLine(ok, label, detail) {
    return '<div class="form-line ' + (ok ? "is-ok" : "is-miss") + '">' + (ok ? "✓" : "○") + " " + esc(label) + (detail ? ' <span class="row-sub">' + esc(detail) + "</span>" : "") + "</div>";
  }
  function docList(p) {
    return (p && p.documents || []).map(function (d) { return typeof d === "string" ? d : ((d && d.title) || ""); });
  }
  function formsChecklistHtml(p) {
    if (!p) return "";
    const docs = docList(p);
    const intake = docs.find(function (t) { return /intake/i.test(t) && !/pending/i.test(t); });
    const hx = docs.find(function (t) { return /medical history|history/i.test(t) && !/pending/i.test(t); }) || intake;
    const consent = p.consents && p.consents.clinical && !/not yet/i.test(p.consents.clinical);
    const photo = p.consents && p.consents.photo && !/not (yet|authorized)/i.test(p.consents.photo);
    const marketing = p.consents && p.consents.marketing && !/not /i.test(p.consents.marketing);
    const id = p.idOnFile;
    return '<div class="forms-check">' +
      formLine(!!intake, "Intake", intake || "Not on file") +
      formLine(!!hx, "Medical history", hx || "Not on file") +
      formLine(!!consent, "Clinical consent", (p.consents && p.consents.clinical) || "Not yet recorded") +
      formLine(!!photo, "Photo consent", (p.consents && p.consents.photo) || "Not on file") +
      formLine(!!marketing, "Marketing consent", (p.consents && p.consents.marketing) || "Not authorized") +
      formLine(!!id, "ID on file", id ? ((id.type || "ID") + (id.collected ? " · " + fmtDate(id.collected) : "")) : "Not on file") +
      (id ? '<div class="id-preview" aria-label="ID on file"><div class="id-preview-card"><strong>' + esc(p.name) + "</strong><div>" + esc(fmtDob(p.dob)) + " · " + esc(displayId(p.id)) + "</div><div class=\"row-sub\">" + esc(id.type || "Photo ID") + " on file (synthetic placeholder)</div></div></div>" : "") +
      "</div>";
  }
  function checkinReady(a) {
    const items = BRIZZA.CHECKIN_PREP_ITEMS || [];
    const rec = (a && a.checkinPrep) || {};
    return items.length > 0 && items.every(function (it) { return !!rec[it.id]; });
  }
  function checkinCellHtml(a) {
    const ready = checkinReady(a);
    const open = state.expandedCheckin === a.id;
    const items = (BRIZZA.CHECKIN_PREP_ITEMS || []).map(function (it) {
      const on = !!(a.checkinPrep && a.checkinPrep[it.id]);
      return '<label class="choice"><input type="checkbox" data-checkin-item="' + esc(it.id) + '" data-checkin-appt="' + esc(a.id) + '"' + (on ? " checked" : "") + "> " + esc(it.label) + "</label>";
    }).join("");
    return '<span class="prep-cell">' +
      '<button type="button" class="checkin-pill ' + (ready ? "ready" : "needs") + '" data-expand-checkin="' + esc(a.id) + '">' +
        (ready ? "Check-in ready" : "Needs check-in prep") + "</button>" +
      (open ? '<div class="prep-detail checkin-detail" role="tooltip">' + items + '<p class="row-sub">Check-in prep is separate from clinical prep.</p></div>' : "") +
    "</span>";
  }
  function myDayVisitCard(a, opts) {
    opts = opts || {};
    const p = patient(a.patientId);
    const href = p ? hashFor({ page: "patients", selected: p.id, tab: "demographics" }) : "#";
    const visitNotes = visitNotesOf(a);
    const apptNote = a.prepNotes ? esc(a.prepNotes) : '<span class="muted">No appointment note</span>';
    const noteBtn = (canStartNote() && p) ? '<button class="btn tiny" type="button" data-open="note-composer" data-pid="' + esc(p.id) + '" data-appt="' + esc(a.id) + '"' + (a.visitId ? ' data-visit="' + esc(a.visitId) + '"' : "") + ">＋ New note</button>" : "";
    const hxBtn = (isMaRole() && p) ? '<a class="btn tiny" href="' + hashFor({ page: "patients", selected: p.id, tab: "clinical-profile" }) + '">Update history</a>' : "";
    const consentBtn = (!isMarketingRole() && p) ? '<button type="button" class="btn tiny" data-open-consents="' + esc(a.id) + '">Complete consents</button>' : "";
    const schedNextBtn = ((isCoordinatorRole() || isOwnerRole() || state.actingRole === "Clinic Manager") && p) ? '<button type="button" class="btn tiny" data-sched-next="' + esc(a.id) + '" data-pid="' + esc(p.id) + '">Schedule next appt</button>' : "";
    const emnBlock = p ? ('<div class="myday-emns"><div class="row-sub"><strong>Visit EMNs</strong></div>' +
      (visitNotes.map(function (n) {
        return '<div class="emn-row"><div>' + esc(n.type || "Note") + " · " + esc(n.provider || "") + "</div>" + emnActionsHtml(p, n) + "</div>";
      }).join("") || '<div class="row-sub">No EMN on this visit yet.' + (noteBtn ? " Start one from this card." : "") + "</div>") +
      (p ? pastEmnDropdown(p, a.id) : "") + "</div>") : "";
    const alerts = (opts.showClinical && p)
      ? ('<div class="emr-snap"><strong>Alerts</strong> ' + (((p.alerts || []).map(function (al) { return esc(al.text || al); }).join(" · ")) || "None") + "</div>" +
         '<div class="emr-snap"><strong>Allergies</strong> ' + esc(allergyLabel(p)) + "</div>")
      : "";
    const forms = ((!isMarketingRole() || opts.forms) && p)
      ? ('<details class="forms-exp"' + (state.expandedForms === a.id ? " open" : "") + '><summary>Forms and ID</summary>' + formsChecklistHtml(p) + "</details>" + myDayConsentsHtml(a, p))
      : "";
    const inner =
      '<div class="flow-head"><a class="patient-name room-name" href="' + href + '">' + esc(p ? p.name : a.patientId) + "</a> " + statusChipHtml(a, { variant: "tint" }) + "</div>" +
      '<div class="emr-snap">' + esc(fmtDate(a.date)) + " · " + esc(fmtTime(a.time)) + " · " + esc(a.type || "") +
        (reasonText(a) ? " · " + esc(reasonText(a)) : "") + " · " + esc(providerAvailLabel(a.provider) || a.provider) +
        (a.suiteId ? " · " + esc(suiteName(a.suiteId)) : "") +
        (p ? " · " + esc(displayId(p.id)) : "") + "</div>" +
      alerts +
      (opts.prep ? '<div class="emr-snap">' + prepCellHtml(a, state.expandedPrep === a.id) + "</div>" : "") +
      ((isCoordinatorRole() || isOwnerRole() || state.actingRole === "Clinic Manager") ? '<div class="emr-snap">' + checkinCellHtml(a) + "</div>" : "") +
      '<div class="emr-snap myday-appt-note"><strong>Appointment notes</strong> ' +
        (state.editingPrep === a.id
          ? ('<textarea id="prep-' + esc(a.id) + '" class="wl-note" data-prep-notes="' + esc(a.id) + '" rows="3" placeholder="Appointment notes">' + esc(a.prepNotes || "") + "</textarea>" +
             '<div class="myday-note-actions"><button type="button" class="btn tiny primary" data-save-prep="' + esc(a.id) + '">Save note</button> ' +
             '<button type="button" class="btn tiny" data-cancel-prep="' + esc(a.id) + '">Cancel</button></div>')
          : (apptNote + ' <button type="button" class="btn-icon" data-edit-prep="' + esc(a.id) + '" title="Edit appointment note" aria-label="Edit appointment note">✎</button>')) +
        "</div>" +
      emnBlock + forms +
      ((opts.providerCue && chargesMissing(a)) ? '<span class="cal-pay unpaid">Charges missing</span>' : "") +
      checkoutIfAllowedHtml(a) +
      '<div class="emr-actions flow-actions">' +
        reminderActionsHtml(a) +
        '<button type="button" class="btn tiny" data-open-appt="' + esc(a.id) + '">Open appointment</button>' +
        (p ? '<a class="btn tiny" href="' + href + '">Open chart</a>' : "") +
        noteBtn + hxBtn + consentBtn + schedNextBtn +
      "</div>";
    return jewelWrap(a, inner, "emr-patient myday-card", 'data-appt="' + esc(a.id) + '"');
  }
  function myDayNotesPanel(scope, pendingOnly) {
    const who = actingName();
    const items = [];
    (store.patients || []).forEach(function (p) {
      (p.notes || []).forEach(function (n) {
        if (scope === "mine" && n.provider && n.provider !== who && !isOwnerRole()) return;
        if (scope === "mine" && isOwnerRole() && n.provider && n.provider !== who && state.notesScope !== "all") {
          /* owner My notes = own notes only */
          if (n.provider !== who) return;
        }
        if (pendingOnly && isNoteSigned(n)) return;
        items.push({ p: p, n: n });
      });
    });
    const from = (state.notesFrom || "").trim();
    const to = (state.notesTo || "").trim();
    const statusFilter = state.notesStatusFilter || "all";
    const filtered = items.filter(function (it) {
      const d = it.n.date || "";
      if (from && d && d < from) return false;
      if (to && d && d > to) return false;
      if (statusFilter && statusFilter !== "all" && (it.n.status || "Draft") !== statusFilter) return false;
      return true;
    });
    filtered.sort(function (a, b) {
      return String(b.n.date || "").localeCompare(String(a.n.date || "")) || String((b.n.id || "")).localeCompare(String(a.n.id || ""));
    });
    const newBtn = canStartNote() ? '<button type="button" class="btn tiny primary" data-new-dash-note="1">＋ New note</button>' : "";
    const statusOpts = [["all", "All statuses"], ["Draft", "Draft"], ["Ready for review", "Ready for review"], ["Finalized", "Finalized"], ["Amended", "Amended"]];
    const filters = '<div class="myday-note-filters">' +
      (canSeeMyDayClinicNotes() && !pendingOnly
        ? ('<label class="field"><span class="row-sub">Whose</span><select id="notesScope">' +
           '<option value="mine"' + (scope === "mine" ? " selected" : "") + ">Mine</option>" +
           '<option value="all"' + (scope === "all" ? " selected" : "") + ">All clinic</option></select></label>")
        : "") +
      '<label class="field"><span class="row-sub">Status</span><select id="notesStatusFilter">' +
        statusOpts.map(function (pair) {
          return '<option value="' + pair[0] + '"' + (statusFilter === pair[0] ? " selected" : "") + ">" + esc(pair[1]) + "</option>";
        }).join("") +
      "</select></label>" +
      '<label class="field"><span class="row-sub">From</span><input type="date" id="notesFrom" value="' + esc(from) + '"></label>' +
      '<label class="field"><span class="row-sub">To</span><input type="date" id="notesTo" value="' + esc(to) + '"></label></div>';
    const rows = filtered.map(function (it) {
      const n = it.n, p = it.p;
      const lateMark = isNoteLate(n) ? ' <span class="wl-late">Late</span>' : "";
      return '<div class="emn-row myday-note-row">' +
        '<div><a href="' + hashFor({ page: "patients", selected: p.id, tab: "snapshot" }) + '">' + esc(p.name) + "</a> · " + esc(n.type || "Note") + lateMark +
        '<div class="row-sub">' + esc(fmtDate(n.date)) + (n.time ? " · " + esc(fmtTime(n.time)) : "") + " · " + esc(n.provider || "") + "</div></div>" +
        emnActionsHtml(p, n) + "</div>";
    }).join("") || '<div class="empty">No notes in this list.</div>';
    return '<div class="card"><div class="cardhead"><h2>' + (pendingOnly ? "Pending EMNs" : "Notes") + "</h2>" + filters + newBtn + "</div><div class=\"cardbody\">" + rows + "</div></div>";
  }
  function renderToday() {
    const day = myDayDate();
    const staff = actingProviderStaff();
    const ma = isMaRole();
    const fd = isFrontDeskRole() || (isOwnerRole() && !staff);
    const coord = state.actingRole === "Clinical Coordinator" || isFrontDeskRole();
    const tab = myDayTab();
    let sub = esc(fmtDate(day));
    if (fd || coord) sub += " · Clinical Coordinator";
    else if (ma) sub += " · Medical assistant · all providers";
    else if (staff) sub += " · " + esc(staff.name);
    const dayList = clinicDayAppointments(day) || [];
    if (dayList.length && !isClinicClosedDay(day)) sub += " · " + dayList.length + " visit" + (dayList.length === 1 ? "" : "s");
    const head = pageHead("My Day", "My Day", sub, myDayTabsHtml());
    let main = "";
    if (tab === "pending") {
      main = myDayNotesPanel("mine", true);
    } else if (tab === "notes") {
      main = myDayNotesPanel((state.notesScope === "all" && canSeeMyDayClinicNotes()) ? "all" : "mine", false);
    } else if (isClinicClosedDay(day)) {
      main = clinicClosedBanner(day);
    } else if (fd || coord) {
      const list = clinicDayAppointments(day);
      main = '<div class="card"><div class="cardhead"><h2>' + (day === todayET() ? "Today's patients" : esc(fmtLong(day))) + '</h2></div><div class="cardbody">' +
        (list.map(function (a) { return myDayVisitCard(a, { prep: true, forms: !isMarketingRole() }); }).join("") || '<div class="empty">No visits on the clinic schedule this day.</div>') +
        "</div></div>";
    } else if (ma) {
      const statuses = ["Checked in", "Ready for clinical", "With clinical", "Ready for provider"];
      const list = clinicDayAppointments(day);
      const focus = list.filter(function (a) { return statuses.indexOf(a.status) >= 0; });
      const rest = list.filter(function (a) { return statuses.indexOf(a.status) < 0 && a.status !== "Canceled" && a.status !== "No-show"; });
      main = '<div class="card"><div class="cardhead"><h2>Clinical work</h2><span class="row-sub">Checked in through Ready for provider, all providers</span></div><div class="cardbody">' +
        (focus.map(function (a) { return myDayVisitCard(a, { prep: true, showClinical: true }); }).join("") || '<div class="empty">No patients in Checked in through Ready for provider.</div>') +
        "</div></div>" +
        (rest.length ? '<div class="card"><div class="cardhead"><h2>Other visits this day</h2></div><div class="cardbody">' + rest.map(function (a) { return myDayVisitCard(a, { prep: true, showClinical: true }); }).join("") + "</div></div>" : "");
    } else {
      const list = clinicDayAppointments(day, { provider: staff ? staff.name : null }).filter(function (a) {
        return a.status !== "No-show" && a.status !== "Canceled";
      });
      main = '<div class="card"><div class="cardhead"><h2>' + (day === todayET() ? "Today's patients" : esc(fmtLong(day))) + "</h2></div><div class=\"cardbody\">" +
        (list.map(function (a) { return myDayVisitCard(a, { prep: true, showClinical: true, providerCue: true }); }).join("") || '<div class="empty">' + (staff ? "No patients on this provider's schedule this day." : "No patients on the clinic schedule this day.") + "</div>") +
        "</div></div>";
    }
    renderChrome('<a href="' + hashFor({ page: "emr", myDayTab: "patients", myDayDate: defaultClinicDate() }) + '">My Day</a>', head, main);
    const fromEl = $("#notesFrom");
    const toEl = $("#notesTo");
    const applyNotesDates = function () {
      state.notesFrom = (fromEl && fromEl.value) || "";
      state.notesTo = (toEl && toEl.value) || "";
      render();
    };
    if (fromEl) fromEl.addEventListener("change", applyNotesDates);
    if (toEl) toEl.addEventListener("change", applyNotesDates);
    const scopeEl = $("#notesScope");
    if (scopeEl) scopeEl.addEventListener("change", function () { state.notesScope = scopeEl.value; render(); });
    const stEl = $("#notesStatusFilter");
    if (stEl) stEl.addEventListener("change", function () { state.notesStatusFilter = stEl.value; render(); });
  }

  function renderEmr() { renderToday(); }

  function renderNotesDash() {
    const mode = state.notesDash === "signed" ? "signed" : "pending";
    state.notesDash = mode;
    const groupBy = notesGroupMode();
    const provFilter = state.notesProvider || "All providers";
    const items = [];
    (store.patients || []).forEach(function (p) {
      (p.notes || []).forEach(function (n) {
        const signed = isNoteSigned(n);
        if (mode === "signed" ? signed : !signed) items.push({ p: p, n: n });
      });
    });
    items.sort(function (a, b) {
      const dc = String(b.n.date || "").localeCompare(String(a.n.date || ""));
      if (dc) return dc;
      return String(noteVisitTime(b.n) || "").localeCompare(String(noteVisitTime(a.n) || ""));
    });
    const mineScope = state.notesScope === "mine" || (isClinicalRole() && !isOwnerRole() && state.actingRole !== "Clinic Manager");
    if (mineScope) {
      const who = actingName();
      const kept = items.filter(function (item) { return !who || item.n.provider === who; });
      items.length = 0;
      kept.forEach(function (item) { items.push(item); });
    }
    const from = state.notesFrom || "";
    const to = state.notesTo || "";
    const ranged = items.filter(function (item) {
      const d = item.n.date || "";
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (provFilter && provFilter !== "All providers" && (item.n.provider || "") !== provFilter) return false;
      return true;
    });
    const providers = [];
    items.forEach(function (item) {
      const name = item.n.provider || "";
      if (name && providers.indexOf(name) < 0) providers.push(name);
    });
    providers.sort();
    const newBtn = (isClinicalRole() ? '<button type="button" class="btn small primary" data-new-dash-note="1">＋ New note</button>' : "") +
      (isClinicalRole() && !canEditTemplates() ? ' <button type="button" class="btn small" data-tpl-suggest="1">Suggest a change</button>' : "");
    const mine = mineScope;
    const head = pageHead(mine ? "My notes" : "Notes", mine ? "My notes" : "Notes",
      mine ? "Your open notes. Late notes are due at the end of the next business day." : "Clinic-wide clinical notes. Late notes are flagged to the Owner.",
      newBtn);
    const toggle = '<div class="notes-dash-toggle" role="tablist" aria-label="Note lists">' +
      '<button type="button" class="btn small' + (mode === "pending" ? " primary" : "") + '" data-notes-dash="pending" aria-pressed="' + (mode === "pending" ? "true" : "false") + '">Pending clinical notes</button>' +
      '<button type="button" class="btn small' + (mode === "signed" ? " primary" : "") + '" data-notes-dash="signed" aria-pressed="' + (mode === "signed" ? "true" : "false") + '">Signed notes</button></div>';
    const range = '<div class="notes-range">' +
      '<label for="notesFrom">From</label><input id="notesFrom" type="date" value="' + esc(from) + '">' +
      '<label for="notesTo">To</label><input id="notesTo" type="date" value="' + esc(to) + '">' +
      '<button type="button" class="btn small" data-notes-today="1">Today</button>' +
      (from || to ? '<button type="button" class="btn small" data-notes-range-clear="1">All dates</button>' : "") +
      '<label for="notesProvider">Provider</label><select id="notesProvider">' +
      '<option value="All providers"' + (provFilter === "All providers" ? " selected" : "") + ">All providers</option>" +
      providers.map(function (name) {
        return "<option" + (provFilter === name ? " selected" : "") + ">" + esc(name) + "</option>";
      }).join("") + "</select>" +
      '<label for="notesGroup">Group by</label><select id="notesGroup">' +
      '<option value="date"' + (groupBy === "date" ? " selected" : "") + ">Date</option>" +
      '<option value="provider"' + (groupBy === "provider" ? " selected" : "") + ">Provider</option></select></div>";
    function rowHtml(item) {
      const n = item.n, p = item.p;
      const tm = noteVisitTime(n);
      const canEdit = isNoteEditable(n) && isClinicalRole() && canUseTemplate(templateIdFromNote(n));
      const menu = '<details class="row-menu"><summary>Actions</summary><div class="row-menu-list">' +
        '<button type="button" class="btn small" data-open="note-view" data-nid="' + esc(n.id) + '" data-pid="' + esc(p.id) + '">View</button>' +
        (canEdit ? '<button type="button" class="btn small" data-edit-note="' + esc(n.id) + '" data-pid="' + esc(p.id) + '">Edit</button>' : "") +
        '<a class="btn small" href="' + hashFor({ page: "patients", selected: p.id, tab: "snapshot" }) + '">Open chart</a>' +
        "</div></details>";
      return '<div class="row note-dash-row">' +
        '<div><div class="row-title">' + esc(p.name) + " · " + esc(n.type || "Note") + "</div>" +
        '<div class="row-sub">' + esc(fmtDate(n.date)) + (tm ? " · " + esc(fmtTime(tm)) : "") +
        " · " + esc(n.provider || "") + " · " + esc(displayId(p.id)) +
        (n.status ? " · " + esc(n.status) : "") + "</div></div>" + menu + "</div>";
    }
    const groups = [];
    const seen = {};
    ranged.forEach(function (item) {
      const key = groupBy === "provider" ? (item.n.provider || "Unassigned") : (item.n.date || "");
      if (!seen[key]) { seen[key] = []; groups.push({ key: key, items: seen[key] }); }
      seen[key].push(item);
    });
    if (groupBy === "provider") groups.sort(function (a, b) { return a.key.localeCompare(b.key); });
    const list = groups.length
      ? groups.map(function (g) {
          const title = groupBy === "provider" ? (g.key || "Unassigned") : (g.key ? fmtDate(g.key) : "No date");
          return '<section class="notes-group"><h3 class="section-title">' + esc(title) + "</h3>" + g.items.map(rowHtml).join("") + "</section>";
        }).join("")
      : '<div class="empty">' + (mode === "pending" ? "No unsigned clinical notes." : "No signed clinical notes.") + "</div>";
    renderChrome('<a href="' + hashFor({ page: "notes" }) + '">Notes</a>', head, '<div class="card"><div class="cardbody notes-dash">' + toggle + range + list + "</div></div>");
  }
  function render() {
    expireQuotes();
    if (state.page !== "rooming") stopRoomingTick();
    if (state.page === "worklist") renderWorklist();
    else if (state.page === "schedule") renderSchedule();
    else if (state.page === "queue") renderQueue();
    else if (state.page === "admin") {
      const tab = state.adminTab === "team" ? "users" : (state.adminTab || "home");
      if (tab === "home") renderAdminHome();
      else if (tab === "users") renderTeamAccess();
      else if (tab === "availability") renderAvailability();
      else if (tab === "types") renderTypes();
      else if (tab === "reasons") renderReasons();
      else if (tab === "inventory") renderInventory();
      else if (tab === "locations") renderLocations();
      else if (tab === "templates") { if (typeof renderTemplateBuilder === "function") renderTemplateBuilder(); else renderSettings(); }
      else renderSettings();
    }
    else if (state.page === "visit") renderVisit();
    else if (state.page === "quotes") renderQuotesHome();
    else if (state.page === "checkout" || state.page === "pos") renderPOS();
    else if (state.page === "audit") renderAudit();
    else if (state.page === "rooming") renderRooming();
    else if (state.page === "inventory") renderInventory();
    else if (state.page === "emr") renderEmr();
    else if (state.page === "notes") { state.page = "emr"; state.myDayTab = state.notesScope === "mine" ? "mine" : "notes"; renderToday(); }
    else renderPatients();
    if (state.demo.running) paintDemoPanel();
    bindStatusStops();
    bindZipLookups();
    if (state.page === "schedule" && state.scheduleView === "calendar") bindCalendarDrag();
  }

  function savePrepNotes(id, value) {
    const ap = appt(id);
    if (!ap) return false;
    const next = value == null ? (ap.prepNotes || "") : value;
    const before = ap.prepNotes || "";
    if (next === before) return false;
    ap.prepNotes = next;
    addAudit({ action: "Updated appointment notes", recordType: "Appointment", recordId: ap.id,
      recordPath: { page: "emr", myDayTab: "patients", myDayDate: ap.date, appointmentId: ap.id },
      changes: [{ field: "appointment notes", before: before || "—", after: next || "—" }] });
    toast("Appointment notes saved");
    return true;
  }
  function saveChartHistory(pid, markReviewed) {
    const p = patient(pid);
    if (!p || !canEditChartHistory()) { toast("Only the medical assistant updates history on the chart"); return; }
    function lines(id) { const el = document.getElementById(id); return el ? String(el.value || "").split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean) : []; }
    const before = { allergies: (p.allergies || []).slice(), meds: (p.meds || []).slice(), conditions: (p.conditions || []).slice() };
    p.conditions = lines("chartHxConditions");
    p.meds = lines("chartHxMeds");
    p.allergies = lines("chartHxAllergies");
    if (markReviewed) {
      p.hxChartReviewedAt = nowET();
      p.hxChartReviewedBy = "Camila Ortiz";
    }
    addAudit({ action: markReviewed ? "Reviewed chart history" : "Updated chart history", recordType: "Patient", recordId: p.id,
      recordPath: { page: "patients", selected: p.id, tab: "clinical-profile" },
      changes: [
        { field: "allergies", before: (before.allergies || []).join(", ") || "—", after: (p.allergies || []).join(", ") || "—" },
        { field: "medications", before: (before.meds || []).join(", ") || "—", after: (p.meds || []).join(", ") || "—" },
        { field: "medical history", before: (before.conditions || []).join(", ") || "—", after: (p.conditions || []).join(", ") || "—" }
      ] });
    toast(markReviewed ? "History saved and marked reviewed" : "History saved on the chart");
    render();
  }
  function onClick(e) {
    const statusPick = e.target.closest("[data-status-pick]");
    if (statusPick) {
      e.preventDefault();
      e.stopPropagation();
      setVisitStatus(statusPick.getAttribute("data-status-pick"), statusPick.getAttribute("data-status-value"));
      return;
    }
    const statusBtn = e.target.closest("[data-status-menu]");
    if (statusBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (statusBtn.getAttribute("aria-expanded") === "true") closeStatusMenu();
      else openStatusMenu(statusBtn);
      return;
    }
    if (!e.target.closest("#statusChipMenu, .status-chip-wrap")) closeStatusMenu();
    const moreBtn = e.target.closest("[data-flow-more], [data-emn-more]");
    if (moreBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrap = moreBtn.closest(".flow-more, .emn-more");
      const open = wrap && wrap.classList.contains("is-open");
      $$(".flow-more.is-open, .emn-more.is-open").forEach(function (el) {
        el.classList.remove("is-open");
        const b = el.querySelector("[data-flow-more], [data-emn-more]");
        if (b) b.setAttribute("aria-expanded", "false");
      });
      if (wrap && !open) {
        wrap.classList.add("is-open");
        moreBtn.setAttribute("aria-expanded", "true");
      }
      return;
    }
    if (!e.target.closest(".flow-more, .emn-more")) {
      $$(".flow-more.is-open, .emn-more.is-open").forEach(function (el) {
        el.classList.remove("is-open");
        const b = el.querySelector("[data-flow-more], [data-emn-more]");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    }
    if (e.target.closest("[data-undo]")) { e.preventDefault(); applyUndo(); return; }
    const qLot = e.target.closest("[data-quarantine-lot]");
    if (qLot) {
      e.preventDefault();
      const lot = (store.lots || []).find(function (l) { return l.id === qLot.getAttribute("data-quarantine-lot"); });
      if (lot) {
        const prev = lot.status;
        lot.status = "Quarantined";
        toast("Lot quarantined", { undo: function () { lot.status = prev; toast("Lot restored"); render(); } });
        render();
      }
      return;
    }
    const editPrep = e.target.closest("[data-edit-prep]");
    if (editPrep) {
      e.preventDefault();
      state.editingPrep = editPrep.getAttribute("data-edit-prep");
      render();
      const ta = document.getElementById("prep-" + state.editingPrep);
      if (ta) ta.focus();
      return;
    }
    const savePrep = e.target.closest("[data-save-prep]");
    if (savePrep) {
      e.preventDefault();
      const id = savePrep.getAttribute("data-save-prep");
      const ta = document.getElementById("prep-" + id) || document.querySelector('[data-prep-notes="' + id + '"]');
      savePrepNotes(id, ta ? ta.value : null);
      state.editingPrep = null;
      render();
      return;
    }
    const cancelPrep = e.target.closest("[data-cancel-prep]");
    if (cancelPrep) {
      e.preventDefault();
      state.editingPrep = null;
      render();
      return;
    }
    if (handleTplBuilderClick(e)) return;
    const fdOut = e.target.closest("[data-fd-checkout]");
    if (fdOut) { e.preventDefault(); checkoutVisit(fdOut.getAttribute("data-fd-checkout")); return; }
    const saveHx = e.target.closest("[data-save-chart-hx]");
    if (saveHx) { e.preventDefault(); saveChartHistory(saveHx.getAttribute("data-save-chart-hx"), false); return; }
    const reviewHx = e.target.closest("[data-review-chart-hx]");
    if (reviewHx) { e.preventDefault(); saveChartHistory(reviewHx.getAttribute("data-review-chart-hx"), true); return; }
    const jump = e.target.closest("[data-note-jump]");
    if (jump) {
      e.preventDefault();
      const el = document.getElementById(jump.getAttribute("data-note-jump"));
      if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    const viewN = e.target.closest("[data-view-note]");
    if (viewN) {
      e.preventDefault();
      const pid = viewN.getAttribute("data-pid");
      const nid = viewN.getAttribute("data-view-note");
      if (state.noteDraft) upsertNoteFromDraft({ sign: false, requireComplete: false });
      openNoteView(pid, nid);
      return;
    }
    if (e.target.closest(".status-dd, [data-visit-status], .status-chip-wrap, [data-status-menu], #statusChipMenu, [data-toggle-paperwork], .audit-icon")) {
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
      persistWorklistFilters();
      render();
      return;
    }
    const taskScope = e.target.closest("[data-task-scope]");
    if (taskScope) {
      e.preventDefault();
      state.taskScope = taskScope.getAttribute("data-task-scope") || "mine";
      render();
      return;
    }
    const taskDue = e.target.closest("[data-task-due-today]");
    if (taskDue) {
      e.preventDefault();
      state.taskDueToday = !state.taskDueToday;
      render();
      return;
    }
    const taskOver = e.target.closest("[data-task-overdue]");
    if (taskOver) {
      e.preventDefault();
      state.taskOverdueOnly = !state.taskOverdueOnly;
      render();
      return;
    }
    const taskShow = e.target.closest("[data-task-show-done]");
    if (taskShow) {
      const box = taskShow.matches("input") ? taskShow : taskShow.querySelector("input");
      state.showCompletedTasks = box ? box.checked : !state.showCompletedTasks;
      render();
      return;
    }
    const taskNote = e.target.closest("[data-task-note]");
    if (taskNote) {
      e.preventDefault();
      const id = taskNote.getAttribute("data-task-note");
      const inp = document.getElementById("task-note-" + id) || document.querySelector("[data-task-note-text=\"" + id + "\"]");
      addTaskActivity(id, inp && inp.value);
      return;
    }
    const taskDone = e.target.closest("[data-task-done]");
    if (taskDone) {
      e.preventDefault();
      const rec = (store.tasks || []).find(function (t) { return t.id === taskDone.getAttribute("data-task-done"); });
      if (rec) { rec.done = true; rec.doneAt = nowET(); toast("Task completed"); render(); }
      return;
    }
    const addTask = e.target.closest("[data-open='add-task']");
    if (addTask) {
      e.preventDefault();
      openAddTask(addTask.getAttribute("data-pid") || "");
      return;
    }
    const checkin = e.target.closest("[data-open='checkin-forms']");
    if (checkin) {
      e.preventDefault();
      openCheckinForms();
      return;
    }
    const formCat = e.target.closest("[data-form-cat]");
    if (formCat) {
      e.preventDefault();
      state.formCat = formCat.getAttribute("data-form-cat");
      if ($("#modal") && $("#modalTitle") && /Check-in forms/.test($("#modalTitle").textContent || "")) {
        $("#modalBody").innerHTML = checkinFormsHtml(state.formCat);
      } else render();
      return;
    }
    const markForm = e.target.closest("[data-mark-form]");
    if (markForm) {
      e.preventDefault();
      markFormReceived(markForm.getAttribute("data-pid"), markForm.getAttribute("data-mark-form"));
      return;
    }
    const blankInv = e.target.closest("[data-new-blank-invoice]");
    if (blankInv) {
      e.preventDefault();
      if (!canCreateInvoice()) { toast("Only the Clinical Coordinator, Clinic Manager, or Owner can create invoices"); return; }
      const pid = state.selected || null;
      if (!pid) { toast("Search for a patient, then create the invoice"); return; }
      const inv = newBlankInvoice(pid);
      state.invoiceId = inv.id;
      state.posAppointmentId = null;
      toast("Invoice " + inv.id + " created");
      go({ page: "pos", posTab: "invoice", invoiceId: inv.id });
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
    const confirmVisitBtn = e.target.closest("[data-confirm-visit]");
    if (confirmVisitBtn) {
      e.preventDefault();
      confirmVisit(confirmVisitBtn.getAttribute("data-confirm-visit"));
      return;
    }
    const sendReminderBtn = e.target.closest("[data-send-reminder]");
    if (sendReminderBtn) {
      e.preventDefault();
      sendVisitReminder(sendReminderBtn.getAttribute("data-send-reminder"));
      return;
    }
    const waiveBtn = e.target.closest("[data-waive-fee]");
    if (waiveBtn) {
      e.preventDefault();
      const inv = invoice(waiveBtn.getAttribute("data-waive-fee"));
      if (!inv) return;
      const idx = waiveBtn.getAttribute("data-waive-line");
      const line = (idx != null && idx !== "") ? (inv.lines || [])[Number(idx)] : (inv.lines || []).find(isCancelFeeLine);
      waiveCancelFee(inv, line);
      return;
    }
    const posOpen = e.target.closest("[data-open-pos]");
    if (posOpen) {
      e.preventDefault();
      e.stopPropagation();
      if (!canCreateInvoice()) { toast("Only the Clinical Coordinator, Clinic Manager, or Owner can create invoices"); return; }
      openPosPopup(posOpen.getAttribute("data-open-pos"));
      return;
    }
    const ledInv = e.target.closest("[data-ledger-invoice]");
    if (ledInv) {
      e.preventDefault();
      if (!canCreateInvoice()) { toast("Only the Clinical Coordinator, Clinic Manager, or Owner can create invoices"); return; }
      openLedgerInvoice(ledInv.getAttribute("data-ledger-invoice"));
      return;
    }
    const ledPay = e.target.closest("[data-ledger-payment]");
    if (ledPay) { e.preventDefault(); openLedgerPayment(ledPay.getAttribute("data-ledger-payment")); return; }
    const nd = e.target.closest("[data-notes-dash]");
    if (nd) { e.preventDefault(); go({ page: "notes", notesDash: nd.getAttribute("data-notes-dash") }); return; }
    const notesToday = e.target.closest("[data-notes-today]");
    if (notesToday) {
      e.preventDefault();
      const day = demoClockDate();
      state.notesFrom = day;
      state.notesTo = day;
      render();
      return;
    }
    const newDash = e.target.closest("[data-new-dash-note]");
    if (newDash) { e.preventDefault(); openNewNotePicker(); return; }
    const notesClear = e.target.closest("[data-notes-range-clear]");
    if (notesClear) { e.preventDefault(); state.notesFrom = ""; state.notesTo = ""; render(); return; }
    const openForm = e.target.closest("[data-open-form]");
    if (openForm) { e.preventDefault(); openFormPlaceholder(openForm.getAttribute("data-pid"), openForm.getAttribute("data-open-form")); return; }
    const confirmD = e.target.closest("[data-confirm-demo]");
    if (confirmD) {
      e.preventDefault();
      const p = patient(confirmD.getAttribute("data-confirm-demo"));
      if (p) { confirmDemographics(p); toast("Demographics confirmed"); render(); }
      return;
    }
    const confirmM = e.target.closest("[data-confirm-demo-modal]");
    if (confirmM) {
      e.preventDefault();
      const p = patient(confirmM.getAttribute("data-confirm-demo-modal"));
      if (p) {
        applyDemographicEdits(p);
        confirmDemographics(p);
        closeModal();
        toast("Demographics confirmed");
        render();
      }
      return;
    }
    const openDemo = e.target.closest("[data-open-demo]");
    if (openDemo) {
      e.preventDefault();
      e.stopPropagation();
      openDemographicsPopup(openDemo.getAttribute("data-open-demo"));
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
    if (e.target && (e.target.id === "emnAddCharge" || e.target.closest("#emnAddCharge"))) {
      e.preventDefault();
      const host = document.getElementById("emnChargeRows");
      if (host) {
        const i = host.querySelectorAll("[data-emn-charge-name]").length;
        const opts = (BRIZZA.CATALOG || []).map(function (cat) {
          return '<option value="' + esc(cat.name) + '">' + esc(cat.name) + (cat.price != null ? " · " + money(cat.price) : "") + "</option>";
        }).join("");
        const row = document.createElement("div");
        row.className = "tpl-opt-row emn-charge-row";
        row.innerHTML = emnChargeRowHtml({ name: "", qty: 1, unitPrice: null }, i);
        host.appendChild(row);
      }
      return;
    }
    const emailRcpt = e.target.closest("[data-email-receipt]");
    if (emailRcpt) {
      e.preventDefault();
      toast("Email receipt is simulated in this mockup");
      return;
    }
    const completeSale = e.target.closest("[data-complete-sale], [data-finalize-receipt]");
    if (completeSale) {
      e.preventDefault();
      completeOrFinalizeSale(completeSale.getAttribute("data-complete-sale") || completeSale.getAttribute("data-finalize-receipt"));
      return;
    }
    const catTab = e.target.closest("[data-pos-cat-tab]");
    if (catTab) {
      e.preventDefault();
      state.posCatalogTab = catTab.getAttribute("data-pos-cat-tab") || "services";
      render();
      return;
    }
    const noteCh = e.target.closest("[data-add-note-charges]");
    if (noteCh) {
      e.preventDefault();
      addChargesFromNote(noteCh.getAttribute("data-add-note-charges"));
      return;
    }
    const pickPos = e.target.closest("[data-pos-pick-patient]");
    if (pickPos) {
      e.preventDefault();
      if (!canCreateInvoice()) { toast("Only the Clinical Coordinator, Clinic Manager, or Owner can create invoices"); return; }
      const inv = newBlankInvoice(pickPos.getAttribute("data-pos-pick-patient"));
      state.invoiceId = inv.id;
      state.posAppointmentId = null;
      state.posPatientQ = "";
      toast("Invoice " + inv.id + " created");
      go({ page: "pos", posTab: "invoice", invoiceId: inv.id });
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
        refreshPosView();
      }
      return;
    }
    const saveQf = e.target.closest("[data-save-quote-fields]");
    if (saveQf) { e.preventDefault(); saveQuoteFields(saveQf.getAttribute("data-save-quote-fields")); return; }
    const newQ = e.target.closest("[data-new-quote]");
    if (newQ) { e.preventDefault(); openNewQuoteModal(); return; }
    const cred = e.target.closest("[data-apply-credit]");
    if (cred) { e.preventDefault(); applyInvoiceCredit(cred.getAttribute("data-apply-credit")); return; }
    const fromQ = e.target.closest("[data-add-from-quote]");
    if (fromQ) { e.preventDefault(); addInvoiceLinesFromQuote(fromQ.getAttribute("data-add-from-quote"), fromQ.getAttribute("data-quote")); return; }
    const rem = e.target.closest("[data-add-remaining]");
    if (rem) { e.preventDefault(); addRemainingToBalance(rem.getAttribute("data-add-remaining")); return; }
    const leftUnpaid = e.target.closest("[data-left-unpaid]");
    if (leftUnpaid) { e.preventDefault(); leftWithoutPaying(leftUnpaid.getAttribute("data-left-unpaid")); return; }
    const paneBtn = e.target.closest("[data-appt-pane]");
    if (paneBtn) {
      e.preventDefault();
      const pane = paneBtn.getAttribute("data-appt-pane") || "details";
      const aid = ($(".appt-card-ui") && $(".appt-card-ui").getAttribute("data-appt-card"));
      if (aid) openAppointment(aid, { pane: pane });
      return;
    }
    const photoC = e.target.closest("[data-photo-consent]");
    if (photoC && e.target === photoC) {
      const p = patient(photoC.getAttribute("data-photo-consent"));
      if (p) {
        p.consents = p.consents || {};
        if (photoC.checked) {
          p.consents.photo = "Authorized · signed " + nowET();
          p.consentsHistory = p.consentsHistory || [];
          p.consentsHistory.push({ kind: "Photo", status: "Current", when: todayET() });
        } else {
          p.consents.photo = "Not authorized";
        }
        toast(photoC.checked ? "Photo consent recorded" : "Photo consent cleared");
      }
      return;
    }
    const emnInfo = e.target.closest("[data-emn-info]");
    if (emnInfo) { e.preventDefault(); openEmnInfo(emnInfo.getAttribute("data-pid"), emnInfo.getAttribute("data-emn-info")); return; }
    const toggleEmn = e.target.closest("[data-toggle-emn]");
    if (toggleEmn) {
      e.preventDefault();
      const id = toggleEmn.getAttribute("data-toggle-emn");
      state.expandedEmn = state.expandedEmn === id ? null : id;
      render();
      return;
    }
    const quickSign = e.target.closest("[data-quick-sign]");
    if (quickSign) {
      e.preventDefault();
      openNoteComposer(quickSign.getAttribute("data-pid"), null, null, quickSign.getAttribute("data-quick-sign"));
      return;
    }
    const openConsents = e.target.closest("[data-open-consents]");
    if (openConsents) {
      e.preventDefault();
      openConsentsPanel(openConsents.getAttribute("data-open-consents"));
      return;
    }
    const openConsentFormBtn = e.target.closest("[data-open-consent-form]");
    if (openConsentFormBtn) {
      e.preventDefault();
      openConsentForm(openConsentFormBtn.getAttribute("data-pid"), openConsentFormBtn.getAttribute("data-appt"), openConsentFormBtn.getAttribute("data-open-consent-form"));
      return;
    }
    const consentAct = e.target.closest("[data-consent-act]");
    if (consentAct) {
      e.preventDefault();
      applyConsentAction(consentAct.getAttribute("data-pid"), consentAct.getAttribute("data-appt"), consentAct.getAttribute("data-consent-form"), consentAct.getAttribute("data-consent-act"));
      return;
    }
    const schedNext = e.target.closest("[data-sched-next]");
    if (schedNext) {
      e.preventDefault();
      if (isMarketingRole()) { toast("Schedule is read-only for Marketing"); return; }
      const ap = appt(schedNext.getAttribute("data-sched-next"));
      const pid = schedNext.getAttribute("data-pid");
      const provider = (ap && ap.provider) || "";
      let jump = defaultClinicDate();
      if (ap) {
        const notes = visitNotesOf(ap);
        notes.forEach(function (n) {
          const d = n.nextAppointmentDate || (n.values && (n.values.nextAppointment || n.values.nextAppt));
          if (d && String(d).match(/^\d{4}-\d{2}-\d{2}$/)) jump = d;
        });
      }
      const staff = staffRecord(provider);
      if (staff && staff.id) state.weekProviderId = staff.id;
      location.hash = hashFor({ page: "schedule", date: jump, view: "calendar", calMode: "week" });
      setTimeout(function () { openBook(pid, { date: jump, provider: provider, lockPatient: true }); }, 0);
      return;
    }
    const expandCheckin = e.target.closest("[data-expand-checkin]");
    if (expandCheckin) {
      e.preventDefault();
      const id = expandCheckin.getAttribute("data-expand-checkin");
      state.expandedCheckin = state.expandedCheckin === id ? null : id;
      render();
      return;
    }
    const checkItem = e.target.closest("[data-checkin-item]");
    if (checkItem) {
      e.preventDefault();
      const ap = appt(checkItem.getAttribute("data-checkin-appt"));
      if (!ap) return;
      ap.checkinPrep = ap.checkinPrep || {};
      const key = checkItem.getAttribute("data-checkin-item");
      ap.checkinPrep[key] = !ap.checkinPrep[key];
      render();
      return;
    }
    const expandPrep = e.target.closest("[data-expand-prep]");
    if (expandPrep) {
      e.preventDefault();
      const id = expandPrep.getAttribute("data-expand-prep");
      state.expandedPrep = state.expandedPrep === id ? null : id;
      render();
      return;
    }
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
        const rec = { id: nextId("AL-", pt.alerts), text: text, kind: alertKindFromText(text), when: nowET(), who: actingName() };
        pt.alerts.push(rec);
        addAudit({ action: "Added patient alert", recordType: "Patient", recordId: pid,
          recordPath: { page: "patients", selected: pid, tab: "demographics" },
          changes: [{ field: "alert", before: "—", after: text }] });
        toast("Alert added");
        state.alertsOpen = pid;
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
        const aidx = (pt.alerts || []).findIndex((x) => x.id === aid);
        pt.alerts = (pt.alerts || []).filter((x) => x.id !== aid);
        addAudit({ action: "Removed patient alert", recordType: "Patient", recordId: pid,
          recordPath: { page: "patients", selected: pid, tab: "demographics" },
          changes: [{ field: "alert", before: al ? al.text : aid, after: "Removed" }] });
        toast("Alert removed", {
          undo: al ? function () {
            const p2 = patient(pid);
            if (!p2) return;
            p2.alerts = p2.alerts || [];
            p2.alerts.splice(Math.max(0, aidx), 0, al);
            toast("Alert restored");
            render();
          } : null
        });
        state.alertsOpen = pid;
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
    if (e.target.closest("[data-open-templates]")) {
      e.preventDefault();
      state.adminTab = "templates";
      go({ page: "admin", adminTab: "templates" });
      return;
    }
    if (e.target.closest("[data-team-invite]")) { e.preventDefault(); openTeamUserModal(); return; }
    const teamEdit = e.target.closest("[data-team-edit]");
    if (teamEdit) { e.preventDefault(); openTeamUserModal(teamEdit.getAttribute("data-team-edit")); return; }
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
      else if (act === "accept") acceptQuote(qid);
      else if (act === "reissue") reissueQuote(qid);
      else if (act === "print") printQuote(qid);
      else if (act === "send") sendQuote(qid);
      else if (act === "bring") bringQuote(qid);
      else if (act === "prepay") prepayQuote(qid);
      else if (act === "book-quote") bookFromQuote(qid);
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
      else if (adm.dataset.admin === "save-types-reasons") saveTypesAndReasons();
      return;
    }
    const weekChip = e.target.closest("[data-week-prov]");
    if (weekChip) {
      e.preventDefault();
      state.weekProviderId = weekChip.getAttribute("data-week-prov");
      render();
      return;
    }
    const chip = e.target.closest("[data-prov-chip]");
    if (chip) { e.preventDefault(); toggleProviderChip(chip.getAttribute("data-prov-chip")); return; }
    const locChip = e.target.closest("[data-loc-chip]");
    if (locChip) { e.preventDefault(); state.locationId = locChip.getAttribute("data-loc-chip"); state.compareLocations = false; render(); return; }
    const locCmp = e.target.closest("[data-loc-compare]");
    if (locCmp) { e.preventDefault(); state.compareLocations = true; render(); return; }
    const typeFilt = e.target.closest("[data-type-filter]");
    if (typeFilt) {
      e.preventDefault();
      const next = typeFilt.getAttribute("data-type-filter") || "";
      state.scheduleTypeFilter = (state.scheduleTypeFilter && state.scheduleTypeFilter === next) ? "" : next;
      render();
      return;
    }
    const statusFilt = e.target.closest("[data-status-filter]");
    if (statusFilt) {
      e.preventDefault();
      const next = statusFilt.getAttribute("data-status-filter") || "";
      state.scheduleStatusFilter = (state.scheduleStatusFilter && state.scheduleStatusFilter === next) ? "" : next;
      render();
      return;
    }
    const dayPlus = e.target.closest("[data-day-plus]");
    if (dayPlus) {
      e.preventDefault();
      if (isMarketingRole()) { toast("Schedule is read-only for Marketing"); return; }
      const d = dayPlus.getAttribute("data-day-plus");
      if (state.page === "schedule" && state.scheduleView === "calendar" && state.calMode === "month" && state.expandedCalDay !== d) {
        state.expandedCalDay = d;
        state.date = d;
        render();
        return;
      }
      if (!(state.page === "schedule" && state.calMode === "day" && state.date === d)) {
        location.hash = hashFor({ page: "schedule", date: d, view: "calendar", calMode: "day" });
        return;
      }
      openBook(state.selected, { date: d, provider: slotProvider() });
      return;
    }
    const openBlk = e.target.closest("[data-open-block]");
    if (openBlk) {
      e.preventDefault();
      if (isMarketingRole()) { toast("Schedule is read-only for Marketing"); return; }
      openAddBlock(openBlk.getAttribute("data-open-block"));
      return;
    }
    const emptySlot = e.target.closest("[data-drop-slot]");
    if (emptySlot && !e.target.closest(".cal-event, .cal-block, .block-card, select, button, a, input, .status-dd, .status-chip-wrap, #statusChipMenu, .audit-icon, [data-open-appt], [data-open-block], [data-day-plus]")) {
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
    const alertsToggle = e.target.closest("[data-alerts-toggle]");
    if (alertsToggle) {
      e.preventDefault();
      const pid = alertsToggle.getAttribute("data-alerts-toggle");
      state.alertsOpen = state.alertsOpen === pid ? null : pid;
      render();
      return;
    }
    const collect = e.target.closest("[data-collect-balance]");
    if (collect) { e.preventDefault(); collectPatientBalance(collect.getAttribute("data-collect-balance")); return; }
    const sendForms = e.target.closest("[data-send-forms]");
    if (sendForms) { e.preventDefault(); sendPatientForms(sendForms.getAttribute("data-send-forms")); return; }
    if (state.alertsOpen && !e.target.closest(".alert-pills") && !e.target.closest("[data-add-alert]") && !e.target.closest("[data-remove-alert]")) {
      state.alertsOpen = null;
      render();
    }
    const t = e.target.closest("[data-open],[data-demo],[data-reschedule],[data-record-pay],[data-finalize],[data-expand-reg],[data-room-advance],[data-open-slot]");
    if (!t) {
      const card = e.target.closest("[data-open-appt]");
      if (card && !e.target.closest("select,input,.status-dd,.status-chip-wrap,#statusChipMenu,.audit-icon") && (e.target.closest("button[data-open-appt]") || !e.target.closest("button,a"))) {
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
    if (t.dataset.open === "rebook") { e.preventDefault(); if (isMarketingRole()) { toast("Schedule is read-only for Marketing"); return; } openRebook(t.dataset.pid); return; }
    if (t.dataset.open === "book") { e.preventDefault(); if (isMarketingRole()) { toast("Schedule is read-only for Marketing"); return; } openBook(t.dataset.pid, { lockPatient: state.page === "patients" }); }
    else if (t.dataset.open === "block") { e.preventDefault(); if (isMarketingRole()) { toast("Schedule is read-only for Marketing"); return; } openAddBlock(); }
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
    const chName = e.target && e.target.closest && e.target.closest("[data-emn-charge-name]");
    if (chName) {
      const i = chName.getAttribute("data-emn-charge-name");
      const priceEl = document.querySelector('[data-emn-charge-price="' + i + '"]');
      const cat = catalogByName(chName.value);
      if (priceEl && cat && cat.price != null) priceEl.value = cat.price;
      refreshEmnChargeTotals();
    }
    if (e.target && (e.target.hasAttribute("data-emn-charge-qty") || e.target.hasAttribute("data-emn-charge-price"))) {
      refreshEmnChargeTotals();
    }
    if (handleTplBuilderChange(e)) return;
    if (e.target && e.target.getAttribute && e.target.getAttribute("data-task-owner")) {
      const rec = (store.tasks || []).find(function (t) { return t.id === e.target.getAttribute("data-task-owner"); });
      if (rec) rec.owner = e.target.value || "";
      toast("Task assigned");
      render();
      return;
    }
    if (e.target.id === "prov") { state.providerFilter = e.target.value; render(); }
    else if (e.target.id === "locationSel") { state.locationId = e.target.value; render(); }
    else if (e.target.id === "hideCanceled" || e.target.closest("[data-hide-canceled]")) {
      const box = e.target.id === "hideCanceled" ? e.target : e.target.closest("[data-hide-canceled]");
      setHideCanceled(!!(box && box.checked));
      render();
    }
    else if (e.target.id === "actingRole") { state.actingRole = e.target.value; if (enforceRoleRoute()) return; render(); }
    else if (e.target.id === "showInactiveUsers") { state.showInactiveUsers = !!e.target.checked; render(); }
    else if (e.target.id === "notesFrom") { state.notesFrom = e.target.value; render(); }
    else if (e.target.id === "notesTo") { state.notesTo = e.target.value; render(); }
    else if (e.target.id === "notesProvider") { state.notesProvider = e.target.value; render(); }
    else if (e.target.id === "notesGroup") { state.notesGroup = e.target.value; render(); }
    else if (e.target.id === "myDayDate") {
      state.myDayDate = e.target.value || defaultClinicDate();
      state.myDayTab = "patients";
      go({ page: "emr", myDayTab: "patients", myDayDate: state.myDayDate });
    }
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
        else paintInvoiceLive(inv);
        syncPayAmount(inv);
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
        else { render(); syncPayAmount(inv); }
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
        setAppointmentSuite(e.target.dataset.suiteRole, parts[0], parts[1] || null);
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
    } else if (e.target.dataset.setMarketingConsent) {
      const p = patient(e.target.dataset.setMarketingConsent);
      if (p) {
        p.consents = p.consents || {};
        const before = p.consents.marketing || "";
        p.consents.marketing = e.target.value;
        addAudit({ action: "Updated marketing consent", recordType: "Patient", recordId: p.id,
          recordPath: { page: "patients", selected: p.id, tab: "marketing" },
          changes: [{ field: "consents.marketing", before: before, after: p.consents.marketing }] });
        toast("Marketing consent updated");
        render();
      }
    }
  }

  function boot() {
    normalizeSeedNotes();
    ensureConfirmReminderTasks();
    state.contrast = checkContrast();
    if (state.contrast.failed) console.warn("Contrast check failures", state.contrast);
    else console.info("Theme contrast: all configured text/background pairs meet their WCAG targets.");
    if (!location.hash) history.replaceState(null, "", hashFor({ page: "emr", myDayTab: "patients", myDayDate: defaultClinicDate() }));
    window.addEventListener("hashchange", applyRoute);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", function (e) {
      if (!(e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown"))) return;
      if (state.page !== "admin" || (state.adminTab !== "templates" && state.adminTab !== "settings")) return;
      if (!state.tplFieldSel || !canEditTemplates()) return;
      e.preventDefault();
      const bits = String(state.tplFieldSel).split(",");
      const draft = ensureTplDraft();
      const si = Number(bits[0]), fi = Number(bits[1]);
      if (!draft.sections[si] || isHxSection(draft.sections[si])) return;
      moveItem(draft.sections[si].fields, fi, e.key === "ArrowUp" ? -1 : 1);
      const next = fi + (e.key === "ArrowUp" ? -1 : 1);
      if (next >= 0 && next < draft.sections[si].fields.length) state.tplFieldSel = si + "," + next;
      markTplDirty();
      render();
    });
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
      if (handleTplBuilderChange(e)) return;
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-mask")) applyInputMask(e.target);
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-zip-lookup")) applyZipLookup(e.target);
      if (e.target && (e.target.hasAttribute("data-emn-charge-qty") || e.target.hasAttribute("data-emn-charge-price"))) refreshEmnChargeTotals();
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
        const rel = e.relatedTarget;
        if (rel && rel.closest && rel.closest("[data-cancel-prep]")) return;
        savePrepNotes(e.target.dataset.prepNotes, e.target.value);
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
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      const menu = document.getElementById("statusChipMenu");
      if (menu && !menu.hidden) { closeStatusMenu(); return; }
      closeModal();
    });
    document.addEventListener("scroll", function () { closeStatusMenu(); }, true);
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
