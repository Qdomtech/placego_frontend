/**
 * PlaceGo website script
 * - Renders services, products, industries, clients and testimonials
 * - Loads dynamic content from the backend API, falls back to built-in data
 * - Sends the contact form to POST /api/contact
 */
(function () {
  "use strict";

  const CFG = window.PLACEGO_CONFIG || { API_BASE_URL: "http://localhost:5000/api", REQUEST_TIMEOUT_MS: 8000 };

  /* ---------------- helpers ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function api(path, options = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CFG.REQUEST_TIMEOUT_MS || 8000);
    try {
      const res = await fetch(CFG.API_BASE_URL + path, {
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        ...options
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body.message || "Request failed (" + res.status + ")");
        err.details = body.errors;
        throw err;
      }
      return body;
    } finally {
      clearTimeout(t);
    }
  }

  /* ---------------- icons ---------------- */
  const I = {
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
    bi: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12 3.5 3.5 0 0 0 6 19z"/>',
    loop: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5z"/><circle cx="15" cy="9" r="1.5"/>',
    swap: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
    wand: '<path d="M15 4V2M15 10V8M11 6h2M17 6h2"/><path d="M3 21l12-12"/>',
    bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    heart: '<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11 8.8 11s8.8-5.6 8.8-11z"/><path d="M7 12h3l1-2 2 4 1-2h3"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h11l2-8H6"/>',
    factory: '<path d="M2 21V10l6 4V10l6 4V6l8 4v11z"/><path d="M6 17h2M12 17h2M18 17h2"/>',
    edu: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    building: '<rect x="4" y="3" width="16" height="18"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    truck: '<rect x="1" y="6" width="14" height="10"/><path d="M15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    gov: '<path d="M12 2l3 3H9z"/><path d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 21h18"/>'
  };
  const svg = (k) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[k] || I.grid}</svg>`;

  /* ---------------- fallback content (used if API is offline) ---------------- */
  const FALLBACK = {
    products: [
      { name: "PlaceGo DataPulse", tag: "Flagship · Data Platform", featured: true,
        description: "A ready-to-deploy lakehouse on Azure and Databricks. Connect your sources, apply the medallion architecture and get governed, analytics-ready data in days.",
        features: ["50+ pre-built source connectors", "Bronze, silver and gold layers out of the box", "Unity Catalog governance and lineage", "Cost and pipeline health monitoring"] },
      { name: "InsightIQ", tag: "AI Analytics",
        description: "Ask questions about your business in plain English and get charts, answers and summaries grounded in your own data.",
        features: ["Natural-language querying", "Auto-generated KPI dashboards", "Power BI integration"] },
      { name: "DocuSense AI", tag: "Document AI",
        description: "Extract structured data from invoices, contracts and forms with field-level confidence and a human review queue.",
        features: ["OCR plus LLM extraction", "Validation and approval workflow", "ERP and API export"] },
      { name: "ForecastPro", tag: "Machine Learning",
        description: "Demand and sales forecasting models that retrain automatically and plug into your planning tools.",
        features: ["Store, SKU and region level forecasts", "Automated retraining with MLOps", "What-if scenario planning"] },
      { name: "MigrateX", tag: "Modernization",
        description: "A toolkit for moving legacy databases and applications to the cloud with code analysis, mapping and validation.",
        features: ["Legacy code and schema discovery", "Automated data validation", "Zero-downtime cutover plans"] }
    ],
    industries: [
      { name: "Banking & Financial Services", icon: "bank", points: ["Fraud detection and risk scoring", "Regulatory reporting automation", "Customer 360 and churn analytics"], segments: "Fintech · NBFC · Insurance" },
      { name: "Healthcare & Life Sciences", icon: "heart", points: ["Patient data platforms", "Clinical and claims analytics", "AI-assisted diagnostics support"], segments: "Hospitals · Pharma · Diagnostics" },
      { name: "Retail & E-commerce", icon: "cart", points: ["Demand forecasting and inventory", "Personalised recommendations", "Pricing and promotion analytics"], segments: "D2C · Marketplaces · FMCG" },
      { name: "Manufacturing", icon: "factory", points: ["Predictive maintenance with IoT", "Quality inspection using vision AI", "Production and OEE dashboards"], segments: "Auto · Textiles · Industrial" },
      { name: "Education & EdTech", icon: "edu", points: ["Student performance analytics", "Learning platforms and apps", "Admissions and fee automation"], segments: "Schools · Universities · EdTech" },
      { name: "Real Estate & Construction", icon: "building", points: ["Project cost and timeline tracking", "Property and lead management CRM", "Site monitoring dashboards"], segments: "Developers · Brokers · Infra" },
      { name: "Logistics & Supply Chain", icon: "truck", points: ["Route and fleet optimisation", "Real-time shipment tracking", "Warehouse analytics"], segments: "3PL · Transport · Distribution" },
      { name: "Government & Public Sector", icon: "gov", points: ["Citizen service portals", "Open data and MIS dashboards", "Secure, compliant cloud hosting"], segments: "Departments · Smart cities" }
    ],
    clients: [
      { name: "Client One", sector: "Fintech" }, { name: "Client Two", sector: "Healthcare" },
      { name: "Client Three", sector: "Retail" }, { name: "Client Four", sector: "Manufacturing" },
      { name: "Client Five", sector: "EdTech" }, { name: "Client Six", sector: "Logistics" },
      { name: "Client Seven", sector: "Real Estate" }, { name: "Client Eight", sector: "Public Sector" }
    ],
    testimonials: [
      { quote: "Add a short testimonial from a client here, describing the problem PlaceGo solved and the result.", name: "Client Name", designation: "Designation", company: "Company" },
      { quote: "A second testimonial works well when it mentions a measurable outcome, such as time saved or cost reduced.", name: "Client Name", designation: "Designation", company: "Company" },
      { quote: "A third testimonial can speak to working style: communication, speed of delivery and support.", name: "Client Name", designation: "Designation", company: "Company" }
    ]
  };

  /* ---------------- services (static) ---------------- */
  const SERVICES = {
    data: [
      ["db", "Data Engineering", "Batch and streaming pipelines, lakehouses and warehouses on Databricks and Azure."],
      ["chart", "Enterprise Data Analytics", "Unified analytics across finance, sales and operations with a single source of truth."],
      ["bi", "Business Intelligence", "Self-service Power BI and Tableau dashboards that leaders actually use."],
      ["bolt", "Accelerators", "Reusable frameworks that cut setup time for data and AI projects."]
    ],
    ai: [
      ["brain", "AI / Machine Learning", "Forecasting, recommendation, NLP and GenAI solutions taken to production with MLOps."],
      ["cloud", "Cloud Infrastructure & Security", "Secure, cost-optimised Azure landing zones and managed infrastructure."],
      ["layers", "Cloud-Native Development", "Applications designed for elastic scale using containers and serverless."],
      ["loop", "DevSecOps & CI/CD", "Automated build, test, security scanning and release pipelines."]
    ],
    app: [
      ["phone", "Web & Mobile App Development", "Fast, responsive web and mobile apps built with modern frameworks."],
      ["code", "Custom Software Development", "Tailored software designed around your exact business workflows."],
      ["grid", "Cross-Platform Engineering", "One codebase for Android, iOS and web without compromising quality."],
      ["wand", "Low-Code & Rapid Prototyping", "Validate ideas quickly with clickable prototypes and low-code tools."]
    ],
    mod: [
      ["rocket", "Application Modernization", "Re-architect ageing applications for performance and maintainability."],
      ["swap", "Legacy System Migration", "Move legacy databases and apps to the cloud with zero data loss."],
      ["grid", "Microservices Architecture", "Break monoliths into independently deployable, scalable services."],
      ["link", "Enterprise Integration", "Connect ERP, CRM and third-party systems with robust APIs."]
    ]
  };

  function renderServices() {
    const panels = $("#svc-panels");
    panels.innerHTML = Object.entries(SERVICES)
      .map(([k, arr], i) =>
        `<div class="svc-grid" role="tabpanel" data-panel="${k}" ${i ? "hidden" : ""}>` +
        arr.map(([ic, t, d]) => `<article class="svc"><span class="ico">${svg(ic)}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("") +
        `</div>`)
      .join("");
    document.querySelectorAll(".tab").forEach((b) =>
      b.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", x === b));
        document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
      })
    );
  }

  /* ---------------- dynamic renderers ---------------- */
  function renderProducts(list) {
    const li = (f) => (f || []).map((x) => `<li>${esc(x)}</li>`).join("");
    const featured = list.find((p) => p.featured) || null;
    const rest = list.filter((p) => p !== featured);
    let html = "";
    if (featured) {
      html += `<article class="prod feature">
        <div class="feat-l">
          <div class="prod-top"><span class="tag">${esc(featured.tag)}</span></div>
          <h3>${esc(featured.name)}</h3>
          <p>${esc(featured.description)}</p>
          <a href="#contact" class="more" data-product="${esc(featured.name)}">Request a demo →</a>
        </div>
        <div class="feat-r"><ul>${li(featured.features)}</ul></div>
      </article>`;
    }
    html += rest
      .map((p) => `<article class="prod">
        <div class="prod-top"><h3>${esc(p.name)}</h3><span class="tag">${esc(p.tag)}</span></div>
        <p>${esc(p.description)}</p>
        <ul>${li(p.features)}</ul>
        <a href="#contact" class="more" data-product="${esc(p.name)}">Learn more →</a>
      </article>`)
      .join("");
    $("#prod-grid").innerHTML = html;
    // pre-select "Products" in contact form when a product link is clicked
    document.querySelectorAll("[data-product]").forEach((a) =>
      a.addEventListener("click", () => {
        $("#f-service").value = "Products / Accelerators";
        const m = $("#f-msg");
        if (!m.value) m.value = "I'd like to know more about " + a.dataset.product + ".";
      })
    );
  }

  function renderIndustries(list) {
    $("#ind-grid").innerHTML = list
      .map((d) => `<article class="ind"><span class="ico">${svg(d.icon)}</span><h3>${esc(d.name)}</h3>
        <ul>${(d.points || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="uses">${esc(d.segments)}</div></article>`)
      .join("");
  }

  function renderClients(list) {
    const card = (c, hidden) =>
      `<div class="client"${hidden ? ' aria-hidden="true"' : ""}>` +
      (c.logoUrl
        ? `<img src="${esc(c.logoUrl)}" alt="${esc(c.name)}" style="max-height:48px;max-width:160px;object-fit:contain">`
        : `<span><b>${esc(c.name)}</b><small>${esc(c.sector)}</small></span>`) +
      `</div>`;
    $("#clients-track").innerHTML = list.map((c) => card(c, false)).join("") + list.map((c) => card(c, true)).join("");
  }

  function renderTestimonials(list) {
    const initials = (n) => String(n || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    $("#quote-grid").innerHTML = list
      .map((t) => `<figure class="quote" style="margin:0">
        <p>"${esc(t.quote)}"</p>
        <footer><span>${esc(initials(t.name))}</span><span><b>${esc(t.name)}</b>${esc([t.designation, t.company].filter(Boolean).join(", "))}</span></footer>
      </figure>`)
      .join("");
  }

  /* Render fallback immediately, then replace with live API data if available */
  function loadSection(key, render) {
    render(FALLBACK[key]);
    api("/" + key)
      .then((res) => { if (Array.isArray(res.data) && res.data.length) render(res.data); })
      .catch(() => { /* API offline: keep fallback content */ });
  }

  /* ---------------- nav ---------------- */
  function initNav() {
    const menu = $("#menu"), burger = $("#burger");
    burger.addEventListener("click", () => {
      const o = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", o);
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); })
    );
  }

  /* ---------------- contact form ---------------- */
  function initContact() {
    const f = $("#contact-form"), msg = $("#form-msg"), btn = f.querySelector('button[type="submit"]');
    const show = (text, ok) => { msg.style.color = ok ? "" : "#B42318"; msg.textContent = text; };

    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      d.name = (d.name || "").trim(); d.email = (d.email || "").trim(); d.message = (d.message || "").trim();

      if (!d.name || !/^\S+@\S+\.\S+$/.test(d.email) || d.message.length < 10) {
        return show("Please enter your name, a valid email and a message of at least 10 characters.", false);
      }

      btn.disabled = true; btn.textContent = "Sending…"; show("", true);
      try {
        await api("/contact", { method: "POST", body: JSON.stringify(d) });
        show("Thanks, " + d.name.split(" ")[0] + ". We received your message and will reply within one business day.", true);
        f.reset();
      } catch (err) {
        const detail = err.details && err.details[0] ? " " + err.details[0].message : "";
        show(
          err.name === "AbortError" || err instanceof TypeError
            ? "We couldn't reach the server. Please email info@placego.online or call +91 96367 13474."
            : err.message + detail,
          false
        );
      } finally {
        btn.disabled = false; btn.textContent = "Send message";
      }
    });
  }

  /* ---------------- boot ---------------- */
  /* ---------------- social links ---------------- */
  const SOCIAL_ICONS = {
    linkedin:  '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    twitter:   '<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.43.36a9 9 0 0 1-2.88 1.1A4.52 4.52 0 0 0 16.11 0c-2.5 0-4.52 2-4.52 4.5 0 .35.04.7.11 1.03C7.69 5.35 4.07 3.58 1.64.9a4.5 4.5 0 0 0-.61 2.27c0 1.56.8 2.94 2 3.75a4.48 4.48 0 0 1-2.05-.57v.06c0 2.18 1.55 4 3.6 4.42a4.52 4.52 0 0 1-2.04.08c.57 1.8 2.24 3.1 4.21 3.13A9.05 9.05 0 0 1 0 19.54 12.77 12.77 0 0 0 6.92 21.5c8.3 0 12.84-6.88 12.84-12.85 0-.2 0-.39-.01-.58A9.17 9.17 0 0 0 23 3z"/>',
    facebook:  '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
    youtube:   '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>',
    github:    '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
    link:      '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'
  };

  function loadSocialLinks() {
    const wrap = $("#social-links");
    if (!wrap) return;
    api("/social-links")
      .then((res) => {
        if (!Array.isArray(res.data) || !res.data.length) return;
        wrap.innerHTML = res.data.map((s) => {
          const key = (s.icon || s.platform || "link").toLowerCase();
          const svg = SOCIAL_ICONS[key] || SOCIAL_ICONS.link;
          return `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.platform)}"><svg viewBox="0 0 24 24">${svg}</svg></a>`;
        }).join("");
      })
      .catch(() => {});
  }

  renderServices();
  loadSection("products", renderProducts);
  loadSection("industries", renderIndustries);
  loadSection("clients", renderClients);
  loadSection("testimonials", renderTestimonials);
  loadSocialLinks();
  initNav();
  initContact();
  const yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();
})();
