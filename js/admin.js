/**
 * PlaceGo Admin Panel
 * Login, enquiries inbox, and CRUD for products / industries / clients / testimonials.
 * Talks to the backend at PLACEGO_CONFIG.API_BASE_URL.
 */
(function () {
  "use strict";

  const API = (window.PLACEGO_CONFIG || {}).API_BASE_URL || "http://localhost:5000/api";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  /* ---------- token storage ---------- */
  const store = {
    get() { try { return sessionStorage.getItem("pg_token"); } catch { return null; } },
    set(t) { try { sessionStorage.setItem("pg_token", t); } catch {} },
    clear() { try { sessionStorage.removeItem("pg_token"); } catch {} }
  };
  let TOKEN = store.get();

  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}) }
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== "/auth/login") { logout(); throw new Error("Session expired. Please sign in again."); }
    if (!res.ok) {
      const extra = body.errors && body.errors.length ? ": " + body.errors.map((e) => e.message).join(", ") : "";
      throw new Error((body.message || "Request failed") + extra);
    }
    return body;
  }

  function toast(text) {
    const t = $("#toast"); t.textContent = text; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600);
  }

  /* ---------- resource definitions (drive tables + forms) ---------- */
  const ICONS = ["bank", "heart", "cart", "factory", "edu", "building", "truck", "gov", "db", "chart", "brain", "cloud", "code", "grid"];
  const SOCIAL_ICONS = ["linkedin", "twitter", "facebook", "instagram", "youtube", "github", "link"];
  const RESOURCES = {
    products: {
      title: "Products",
      columns: [["name", "Name"], ["tag", "Tag"], ["featured", "Featured"]],
      fields: [
        { k: "name", label: "Product name", required: true },
        { k: "tag", label: "Tag / category", required: true, hint: "e.g. AI Analytics" },
        { k: "description", label: "Description", type: "textarea", required: true },
        { k: "features", label: "Features", type: "list", hint: "One per line" },
        { k: "featured", label: "Show as flagship (large card)", type: "bool" }
      ]
    },
    industries: {
      title: "Industries",
      columns: [["name", "Industry"], ["segments", "Segments"], ["icon", "Icon"]],
      fields: [
        { k: "name", label: "Industry name", required: true },
        { k: "icon", label: "Icon", type: "select", options: ICONS },
        { k: "points", label: "Use cases", type: "list", hint: "One per line, 3 recommended" },
        { k: "segments", label: "Segments", hint: "e.g. Fintech · NBFC · Insurance" }
      ]
    },
    clients: {
      title: "Clients",
      columns: [["name", "Client"], ["sector", "Sector"], ["logoUrl", "Logo"]],
      fields: [
        { k: "name", label: "Client name", required: true },
        { k: "sector", label: "Sector" },
        { k: "logoUrl", label: "Logo URL", hint: "https://… (PNG/SVG). Leave empty to show the name." },
        { k: "website", label: "Website" }
      ]
    },
    testimonials: {
      title: "Testimonials",
      columns: [["name", "Name"], ["company", "Company"], ["quote", "Quote"]],
      fields: [
        { k: "quote", label: "Quote", type: "textarea", required: true },
        { k: "name", label: "Person name", required: true },
        { k: "designation", label: "Designation" },
        { k: "company", label: "Company" }
      ]
    },
    "social-links": {
      title: "Social Links",
      columns: [["platform", "Platform"], ["url", "URL"], ["icon", "Icon"]],
      fields: [
        { k: "platform", label: "Platform name", required: true, hint: "e.g. LinkedIn, Twitter" },
        { k: "url", label: "URL", required: true, hint: "Full URL e.g. https://linkedin.com/company/placego" },
        { k: "icon", label: "Icon", type: "select", options: SOCIAL_ICONS }
      ]
    }
  };
  const COMMON_FIELDS = [
    { k: "order", label: "Display order", type: "number", hint: "Lower numbers appear first" },
    { k: "isActive", label: "Visible on website", type: "bool", default: true }
  ];

  /* ---------- auth ---------- */
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button"), err = $("#login-err");
    err.textContent = ""; btn.disabled = true;
    try {
      const r = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: $("#l-email").value.trim(), password: $("#l-pass").value }) });
      TOKEN = r.token; store.set(TOKEN);
      startApp(r.admin);
    } catch (ex) {
      err.textContent = ex.message === "Failed to fetch" ? "Cannot reach the API at " + API + ". Is the backend running?" : ex.message;
    } finally { btn.disabled = false; }
  });

  function logout() {
    TOKEN = null; store.clear();
    $("#app-view").hidden = true; $("#login-view").hidden = false;
  }
  $("#logout").addEventListener("click", logout);

  function startApp(admin) {
    $("#login-view").hidden = true; $("#app-view").hidden = false;
    $("#who").textContent = admin ? admin.email : "";
    go("dashboard");
  }

  /* ---------- navigation ---------- */
  $$("#side button").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  function go(view) {
    $$("#side button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    if (view === "dashboard") return renderDashboard();
    if (view === "contacts") return renderContacts();
    return renderResource(view);
  }

  async function refreshBadge() {
    try {
      const s = (await api("/contact/stats")).data;
      const b = $("#unread-badge"); b.textContent = s.unread; b.hidden = !s.unread;
      return s;
    } catch { return null; }
  }

  /* ---------- dashboard ---------- */
  async function renderDashboard() {
    const main = $("#main");
    main.innerHTML = `<div class="head"><h2>Dashboard</h2></div><div class="cards" id="kpis"><div class="kpi"><span>Loading…</span></div></div>
      <div class="head"><h3>Latest enquiries</h3><button class="btn ghost sm" id="see-all">See all</button></div><div class="table-wrap" id="latest"></div>`;
    $("#see-all").onclick = () => go("contacts");
    try {
      const [s, latest] = await Promise.all([refreshBadge(), api("/contact?limit=5")]);
      $("#kpis").innerHTML = [
        [s.total, "Total enquiries"], [s.unread, "Unread"], [s.new, "New"], [s.last7Days, "Last 7 days"], [s.closed, "Closed"]
      ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");
      $("#latest").innerHTML = contactTable(latest.data, true);
      bindContactRows();
    } catch (e) { main.insertAdjacentHTML("beforeend", `<p class="err">${esc(e.message)}</p>`); }
  }

  /* ---------- enquiries ---------- */
  const cState = { page: 1, status: "", search: "" };
  async function renderContacts() {
    const main = $("#main");
    main.innerHTML = `<div class="head"><h2>Enquiries</h2>
      <div class="filters">
        <input id="c-search" type="search" placeholder="Search name, email, company" value="${esc(cState.search)}">
        <select id="c-status"><option value="">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select>
        <a class="btn ghost" id="c-export" href="#">Export CSV</a>
      </div></div>
      <div class="table-wrap" id="c-table"><div class="empty">Loading…</div></div><div class="pager" id="c-pager"></div>`;
    $("#c-status").value = cState.status;
    let t;
    $("#c-search").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { cState.search = e.target.value; cState.page = 1; loadContacts(); }, 350); });
    $("#c-status").addEventListener("change", (e) => { cState.status = e.target.value; cState.page = 1; loadContacts(); });
    $("#c-export").addEventListener("click", exportCsv);
    loadContacts();
  }

  async function loadContacts() {
    const q = new URLSearchParams({ page: cState.page, limit: 20, ...(cState.status && { status: cState.status }), ...(cState.search && { search: cState.search }) });
    try {
      const r = await api("/contact?" + q);
      $("#c-table").innerHTML = contactTable(r.data, false);
      const p = r.pagination;
      $("#c-pager").innerHTML = `<span>${p.total} total · page ${p.page} of ${Math.max(p.pages, 1)}</span>
        <button class="btn ghost sm" id="pg-prev" ${p.page <= 1 ? "disabled" : ""}>Previous</button>
        <button class="btn ghost sm" id="pg-next" ${p.page >= p.pages ? "disabled" : ""}>Next</button>`;
      $("#pg-prev").onclick = () => { cState.page--; loadContacts(); };
      $("#pg-next").onclick = () => { cState.page++; loadContacts(); };
      bindContactRows();
      refreshBadge();
    } catch (e) { $("#c-table").innerHTML = `<div class="empty err">${esc(e.message)}</div>`; }
  }

  function contactTable(rows, compact) {
    if (!rows.length) return `<div class="empty">No enquiries yet.</div>`;
    return `<table><thead><tr><th>From</th><th>Interest</th>${compact ? "" : "<th>Message</th>"}<th>Received</th><th>Status</th><th></th></tr></thead><tbody>` +
      rows.map((c) => `<tr class="${c.isRead ? "" : "unread"}" data-id="${c._id}">
        <td><b>${esc(c.name)}</b><div class="sub">${esc(c.email)}</div>${c.phone ? `<div class="sub">${esc(c.phone)}</div>` : ""}${c.company ? `<div class="sub">${esc(c.company)}</div>` : ""}</td>
        <td>${esc(c.service || "—")}</td>
        ${compact ? "" : `<td><div class="msg">${esc(c.message)}</div></td>`}
        <td style="white-space:nowrap">${fmtDate(c.createdAt)}</td>
        <td><select class="c-st" aria-label="Status">${["new", "contacted", "closed"].map((s) => `<option value="${s}" ${c.status === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></td>
        <td><div class="actions">${c.isRead ? "" : `<button class="btn ghost sm c-read">Mark read</button>`}<button class="btn danger sm c-del">Delete</button></div></td>
      </tr>`).join("") + `</tbody></table>`;
  }

  function bindContactRows() {
    $$("tr[data-id]").forEach((tr) => {
      const id = tr.dataset.id;
      $(".c-st", tr).addEventListener("change", async (e) => {
        try { await api("/contact/" + id, { method: "PATCH", body: JSON.stringify({ status: e.target.value, isRead: true }) }); tr.classList.remove("unread"); toast("Status updated"); refreshBadge(); }
        catch (ex) { toast(ex.message); }
      });
      const rd = $(".c-read", tr);
      if (rd) rd.addEventListener("click", async () => {
        try { await api("/contact/" + id, { method: "PATCH", body: JSON.stringify({ isRead: true }) }); tr.classList.remove("unread"); rd.remove(); refreshBadge(); }
        catch (ex) { toast(ex.message); }
      });
      const del = $(".c-del", tr);
      del.addEventListener("click", async () => {
        if (del.dataset.confirm !== "1") { del.dataset.confirm = "1"; del.textContent = "Confirm delete"; setTimeout(() => { del.dataset.confirm = ""; del.textContent = "Delete"; }, 3000); return; }
        try { await api("/contact/" + id, { method: "DELETE" }); tr.remove(); toast("Enquiry deleted"); refreshBadge(); }
        catch (ex) { toast(ex.message); }
      });
    });
  }

  async function exportCsv(e) {
    e.preventDefault();
    try {
      const r = await api("/contact?limit=1000" + (cState.status ? "&status=" + cState.status : ""));
      const cols = ["createdAt", "name", "email", "phone", "company", "service", "status", "message"];
      const csv = [cols.join(",")].concat(r.data.map((c) => cols.map((k) => `"${String(c[k] ?? "").replace(/"/g, '""')}"`).join(","))).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "placego-enquiries-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click(); URL.revokeObjectURL(a.href);
    } catch (ex) { toast(ex.message); }
  }

  /* ---------- generic CRUD ---------- */
  async function renderResource(key) {
    const R = RESOURCES[key], main = $("#main");
    main.innerHTML = `<div class="head"><h2>${R.title}</h2><button class="btn primary" id="add">+ Add ${R.title.slice(0, -1).toLowerCase()}</button></div>
      <div class="table-wrap" id="r-table"><div class="empty">Loading…</div></div>`;
    $("#add").onclick = () => openEditor(key, null);
    try {
      const r = await api("/" + key + "?all=true");
      const rows = r.data;
      if (!rows.length) { $("#r-table").innerHTML = `<div class="empty">Nothing here yet. Add the first one.</div>`; return; }
      $("#r-table").innerHTML = `<table><thead><tr><th>#</th>${R.columns.map(([, l]) => `<th>${l}</th>`).join("")}<th>Status</th><th></th></tr></thead><tbody>` +
        rows.map((d) => `<tr data-rid="${d._id}"><td>${d.order ?? 0}</td>${R.columns.map(([k]) => `<td>${cell(d[k])}</td>`).join("")}
          <td><span class="pill ${d.isActive ? "closed" : "off"}">${d.isActive ? "Visible" : "Hidden"}</span></td>
          <td><div class="actions"><button class="btn ghost sm r-edit">Edit</button><button class="btn danger sm r-del">Delete</button></div></td></tr>`).join("") +
        `</tbody></table>`;
      $$("tr[data-rid]").forEach((tr) => {
        const doc = rows.find((x) => x._id === tr.dataset.rid);
        $(".r-edit", tr).onclick = () => openEditor(key, doc);
        const del = $(".r-del", tr);
        del.onclick = async () => {
          if (del.dataset.confirm !== "1") { del.dataset.confirm = "1"; del.textContent = "Confirm delete"; setTimeout(() => { del.dataset.confirm = ""; del.textContent = "Delete"; }, 3000); return; }
          try { await api("/" + key + "/" + doc._id, { method: "DELETE" }); toast("Deleted"); renderResource(key); } catch (ex) { toast(ex.message); }
        };
      });
    } catch (e) { $("#r-table").innerHTML = `<div class="empty err">${esc(e.message)}</div>`; }
  }

  function cell(v) {
    if (typeof v === "boolean") return v ? "Yes" : "—";
    if (Array.isArray(v)) return esc(v.join(", "));
    const s = String(v ?? "");
    return s ? esc(s.length > 70 ? s.slice(0, 70) + "…" : s) : "—";
  }

  function openEditor(key, doc) {
    const R = RESOURCES[key], fields = R.fields.concat(COMMON_FIELDS), dlg = $("#editor");
    $("#editor-title").textContent = (doc ? "Edit " : "Add ") + R.title.slice(0, -1).toLowerCase();
    $("#editor-err").textContent = "";
    $("#editor-fields").innerHTML = fields.map((f) => {
      const id = "fld-" + f.k, v = doc ? doc[f.k] : f.default;
      const hint = f.hint ? ` <span class="hint">${esc(f.hint)}</span>` : "";
      if (f.type === "bool") return `<label class="check" for="${id}"><input id="${id}" type="checkbox" ${v ? "checked" : ""}> ${esc(f.label)}</label>`;
      if (f.type === "textarea") return `<label for="${id}">${esc(f.label)}${hint}<textarea id="${id}" ${f.required ? "required" : ""}>${esc(v)}</textarea></label>`;
      if (f.type === "list") return `<label for="${id}">${esc(f.label)}${hint}<textarea id="${id}">${esc((v || []).join("\n"))}</textarea></label>`;
      if (f.type === "select") return `<label for="${id}">${esc(f.label)}<select id="${id}">${f.options.map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
      return `<label for="${id}">${esc(f.label)}${hint}<input id="${id}" type="${f.type === "number" ? "number" : "text"}" value="${esc(v ?? (f.type === "number" ? 0 : ""))}" ${f.required ? "required" : ""}></label>`;
    }).join("");

    $("#editor-form").onsubmit = async (e) => {
      e.preventDefault();
      const body = {};
      for (const f of fields) {
        const el = $("#fld-" + f.k);
        if (f.type === "bool") body[f.k] = el.checked;
        else if (f.type === "list") body[f.k] = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
        else if (f.type === "number") body[f.k] = Number(el.value) || 0;
        else body[f.k] = el.value.trim();
        if (f.required && !body[f.k]) { $("#editor-err").textContent = f.label + " is required."; return; }
      }
      try {
        await api("/" + key + (doc ? "/" + doc._id : ""), { method: doc ? "PUT" : "POST", body: JSON.stringify(body) });
        dlg.close(); toast(doc ? "Saved" : "Added"); renderResource(key);
      } catch (ex) { $("#editor-err").textContent = ex.message; }
    };
    $("#editor-cancel").onclick = () => dlg.close();
    dlg.showModal();
  }

  /* ---------- boot ---------- */
  if (TOKEN) api("/auth/me").then((r) => startApp(r.admin)).catch(logout);
})();
