// Platform Manager Frontend Controller

let currentCafes = [];
let mainDomain = window.location.host;
// If accessing on port, preserve port
const hostParts = window.location.hostname.split(".");
let baseHost = window.location.host;
if (hostParts.length > 1 && (hostParts[0] === "manager" || hostParts[0] === "admin")) {
  baseHost = window.location.host.replace(/^(manager|admin)\./i, "");
}

// 1. Theme Management
function getStoredTheme() {
  try { return localStorage.getItem("manager-theme"); } catch { return null; }
}
function applyTheme(theme) {
  if (!theme) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try { localStorage.setItem("manager-theme", theme || ""); } catch {}
  document.querySelectorAll(".theme-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.themeVal === (theme || "light"));
  });
}
const initialTheme = getStoredTheme() || "dark";
applyTheme(initialTheme);

document.querySelector("#btn-theme-light")?.addEventListener("click", () => applyTheme("light"));
document.querySelector("#btn-theme-dark")?.addEventListener("click", () => applyTheme("dark"));

// 2. Tab Navigation
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

function switchTab(tabId) {
  tabButtons.forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive);
  });
  tabContents.forEach(content => {
    content.classList.toggle("active", content.id === tabId);
  });
  if (tabId === "tab-analytics") loadAnalytics();
  if (tabId === "tab-cafes") loadCafes();
  if (tabId === "tab-logs") loadLogs();
  if (tabId === "tab-settings") loadProfile();
}

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Toast notification helper
function showToast(message, isError = false) {
  const toast = document.querySelector("#manager-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = isError ? "var(--danger)" : "var(--ink)";
  toast.style.color = isError ? "#fff" : "var(--bg)";
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 3500);
}

// 3. Analytics & Traffic Dashboard
async function loadAnalytics() {
  const rangeSelect = document.querySelector("#analytics-range-select");
  const days = rangeSelect ? rangeSelect.value : 7;
  try {
    const res = await fetch(`/api/manager/analytics?days=${days}`);
    if (!res.ok) throw new Error("Failed fetching analytics");
    const data = await res.json();
    renderAnalytics(data, days);
  } catch (err) {
    console.error("Analytics load error:", err);
  }
}

function renderAnalytics(data, days) {
  const { summary, dailyTrend, cafeBreakdown, topPaths } = data;

  // KPI counters
  const elReq = document.querySelector("#kpi-total-requests");
  const elVis = document.querySelector("#kpi-unique-visitors");
  const elPages = document.querySelector("#kpi-pageviews");
  const elAct = document.querySelector("#kpi-active-cafes");
  const elTot = document.querySelector("#kpi-cafes-total");

  if (elReq) elReq.textContent = summary.totalRequests.toLocaleString();
  if (elVis) elVis.textContent = summary.uniqueVisitors.toLocaleString();
  if (elPages) elPages.textContent = summary.pageviews.toLocaleString();
  
  const activeCafesCount = cafeBreakdown.filter(c => c.requests > 0).length || currentCafes.filter(c => c.isActive).length;
  if (elAct) elAct.textContent = activeCafesCount;
  if (elTot) elTot.textContent = `${currentCafes.length || cafeBreakdown.length} total provisioned`;

  // Render Daily Trend Chart (SVG)
  renderTrendChart(dailyTrend);

  // Render Cafe Breakdown
  renderCafeBreakdown(cafeBreakdown, summary.totalRequests);

  // Render Top Paths Table
  renderTopPaths(topPaths);
}

function renderTrendChart(trendData = []) {
  const container = document.querySelector("#trend-chart-container");
  if (!container) return;

  if (!trendData || trendData.length === 0) {
    container.innerHTML = `<div style="display:flex;height:100%;align-items:center;justify-content:center;color:var(--muted);">No traffic recorded in this time range yet.</div>`;
    return;
  }

  const width = container.clientWidth || 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 35, left: 45 };

  const maxVal = Math.max(5, ...trendData.map(d => d.requests));
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const points = trendData.map((d, i) => {
    const x = padding.left + (i / Math.max(1, trendData.length - 1)) * innerW;
    const y = padding.top + innerH - (d.requests / maxVal) * innerH;
    return { x, y, date: d.date, requests: d.requests, visitors: d.visitors };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  // Area under curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;

  // Y-axis grid lines
  const gridLines = [0, 0.5, 1].map(ratio => {
    const y = padding.top + innerH * (1 - ratio);
    const val = Math.round(maxVal * ratio);
    return `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--line)" stroke-dasharray="3,3" />
      <text x="${padding.left - 8}" y="${y + 4}" font-size="10" fill="var(--muted)" text-anchor="end">${val}</text>
    `;
  }).join("");

  // X-axis labels
  const xLabels = points.map((pt, i) => {
    if (points.length > 10 && i % 2 !== 0 && i !== points.length - 1) return "";
    const shortDate = pt.date.slice(5); // MM-DD
    return `<text x="${pt.x}" y="${height - 10}" font-size="10" fill="var(--muted)" text-anchor="middle">${shortDate}</text>`;
  }).join("");

  // Point circles
  const circles = points.map(pt => `
    <circle cx="${pt.x}" cy="${pt.y}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2">
      <title>${pt.date}: ${pt.requests} requests (${pt.visitors} visitors)</title>
    </circle>
  `).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaD}" fill="url(#chartGradient)" />
      <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${circles}
      ${xLabels}
    </svg>
  `;
}

function renderCafeBreakdown(breakdown = [], totalRequests = 1) {
  const list = document.querySelector("#cafe-breakdown-list");
  if (!list) return;

  if (!breakdown.length) {
    list.innerHTML = `<p style="color:var(--muted);font-size:13px;">No cafe traffic data available yet.</p>`;
    return;
  }

  const maxCafeReq = Math.max(1, ...breakdown.map(c => c.requests));

  list.innerHTML = breakdown.map(c => {
    const percent = Math.round((c.requests / Math.max(1, totalRequests)) * 100);
    const barWidth = Math.round((c.requests / maxCafeReq) * 100);
    return `
      <div class="cafe-stat-row">
        <div class="cafe-stat-top">
          <span>${escapeHtml(c.name)} <code style="font-size:11px;opacity:0.75;">(${c.slug})</code></span>
          <span style="color:var(--accent);">${c.requests.toLocaleString()} reqs (${percent}%)</span>
        </div>
        <div class="cafe-stat-bar-bg">
          <div class="cafe-stat-bar-fill" style="width: ${barWidth}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderTopPaths(topPaths = []) {
  const tbody = document.querySelector("#top-paths-tbody");
  if (!tbody) return;

  if (!topPaths.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted);">No route visits recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = topPaths.map(p => {
    let typeBadge = '<span class="status-tag active">Pageview</span>';
    if (p.path.includes("/api/")) typeBadge = '<span class="status-tag" style="background:var(--info-bg);color:var(--info);">API Endpoint</span>';
    if (p.path.includes("admin")) typeBadge = '<span class="status-tag" style="background:#fef3c7;color:#b45309;">Admin Route</span>';
    return `
      <tr>
        <td><code>${escapeHtml(p.path)}</code></td>
        <td><strong>${p.hits.toLocaleString()}</strong></td>
        <td>${typeBadge}</td>
      </tr>
    `;
  }).join("");
}

document.querySelector("#analytics-range-select")?.addEventListener("change", loadAnalytics);

// 4. Cafes Fleet Management
async function loadCafes() {
  try {
    const res = await fetch("/api/manager/cafes");
    if (!res.ok) throw new Error("Failed fetching cafes");
    currentCafes = await res.json();
    renderCafesTable(currentCafes);
  } catch (err) {
    console.error("Cafes load error:", err);
  }
}

function renderCafesTable(cafes = []) {
  const tbody = document.querySelector("#cafes-tbody");
  if (!tbody) return;

  if (!cafes.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px;">No cafe applications provisioned yet.</td></tr>`;
    return;
  }

  const protocol = window.location.protocol;
  const portPart = window.location.port ? `:${window.location.port}` : "";
  const hostNoPort = window.location.hostname.replace(/^(manager|admin)\./i, "");

  tbody.innerHTML = cafes.map(c => {
    const custSubdomainUrl = `${protocol}//${c.slug}.${hostNoPort}${portPart}/`;
    const adminSubdomainUrl = `${protocol}//admin.${c.slug}.${hostNoPort}${portPart}/`;
    // Fallback path routes for local environments where DNS wildcard isn't set up
    const custLocalUrl = `/cafe/${c.slug}/`;
    const adminLocalUrl = `/admin/${c.slug}/`;

    return `
      <tr>
        <td class="cafe-name-cell">
          <strong>${escapeHtml(c.name)}</strong>
          <span class="cafe-subdomain">${c.slug} · Currency: ${c.currency || 'ETB'}</span>
        </td>
        <td>
          <a href="${custSubdomainUrl}" target="_blank" class="btn-sm-action" title="Open customer subdomain">
            <span>${c.slug}.${hostNoPort}</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <a href="${custLocalUrl}" target="_blank" style="font-size:11px;color:var(--muted);display:block;margin-top:2px;">[Path fallback: /cafe/${c.slug}]</a>
        </td>
        <td>
          <a href="${adminSubdomainUrl}" target="_blank" class="btn-sm-action" title="Open admin subdomain">
            <span>admin.${c.slug}.${hostNoPort}</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <a href="${adminLocalUrl}" target="_blank" style="font-size:11px;color:var(--muted);display:block;margin-top:2px;">[Path fallback: /admin/${c.slug}]</a>
        </td>
        <td>
          <strong>${c.itemsCount || 0}</strong> dishes<br/>
          <span style="font-size:11px;color:var(--muted);">${c.reviewsCount || 0} reviews</span>
        </td>
        <td>
          <button type="button" class="status-tag ${c.isActive ? 'active' : 'inactive'}" onclick="toggleCafe(${c.id}, ${!c.isActive})" title="Click to toggle active status">
            ${c.isActive ? '● Active' : '○ Suspended'}
          </button>
        </td>
        <td>
          <div class="action-btns-group">
            <button type="button" class="btn-sm-action" onclick="openResetPasswordModal(${c.id}, '${escapeHtml(c.name)}')" title="Reset admin initial password">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Password</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Global functions for inline action buttons
window.toggleCafe = async (cafeId, newStatus) => {
  try {
    const res = await fetch(`/api/manager/cafes/${cafeId}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: newStatus })
    });
    if (!res.ok) throw new Error("Failed toggling cafe status");
    showToast(`Cafe status updated to ${newStatus ? 'Active' : 'Suspended'}`);
    loadCafes();
  } catch (err) {
    showToast(err.message, true);
  }
};

window.openResetPasswordModal = (cafeId, cafeName) => {
  const backdrop = document.querySelector("#reset-pass-modal-backdrop");
  const inputId = document.querySelector("#reset-pass-cafe-id");
  const label = document.querySelector("#reset-pass-cafe-label");
  const inputPass = document.querySelector("#reset-new-password");

  if (inputId) inputId.value = cafeId;
  if (label) label.textContent = `Set a new administrator password for ${cafeName}.`;
  if (inputPass) inputPass.value = "";
  if (backdrop) backdrop.hidden = false;
};

document.querySelector("#btn-close-reset-pass")?.addEventListener("click", () => {
  document.querySelector("#reset-pass-modal-backdrop").hidden = true;
});
document.querySelector("#btn-cancel-reset-pass")?.addEventListener("click", () => {
  document.querySelector("#reset-pass-modal-backdrop").hidden = true;
});

document.querySelector("#reset-pass-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const cafeId = document.querySelector("#reset-pass-cafe-id").value;
  const newPassword = document.querySelector("#reset-new-password").value;

  try {
    const res = await fetch(`/api/manager/cafes/${cafeId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed resetting password");
    }
    showToast("Cafe admin password successfully updated!");
    document.querySelector("#reset-pass-modal-backdrop").hidden = true;
  } catch (err) {
    showToast(err.message, true);
  }
});

// Search Filter
document.querySelector("#cafe-search-input")?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderCafesTable(currentCafes);
    return;
  }
  const filtered = currentCafes.filter(c =>
    c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query)
  );
  renderCafesTable(filtered);
});

// Provision New Cafe Modal
const createModal = document.querySelector("#create-cafe-modal-backdrop");
const btnOpenCreate = document.querySelector("#btn-open-create-cafe");
const btnCloseCreate = document.querySelector("#btn-close-create-cafe");
const btnCancelCreate = document.querySelector("#btn-cancel-create-cafe");
const createForm = document.querySelector("#create-cafe-form");
const nameInput = document.querySelector("#new-cafe-name");
const slugInput = document.querySelector("#new-cafe-slug");
const slugHint = document.querySelector("#slug-preview-hint");

btnOpenCreate?.addEventListener("click", () => {
  createForm?.reset();
  updateSlugHint();
  if (createModal) createModal.hidden = false;
});
btnCloseCreate?.addEventListener("click", () => { if (createModal) createModal.hidden = true; });
btnCancelCreate?.addEventListener("click", () => { if (createModal) createModal.hidden = true; });

function updateSlugHint() {
  const slug = (slugInput?.value || "example").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  if (slugHint) {
    slugHint.textContent = `Customer: ${slug}.${baseHost} | Admin: admin.${slug}.${baseHost}`;
  }
}

nameInput?.addEventListener("input", () => {
  if (!slugInput.dataset.manual) {
    slugInput.value = nameInput.value.toLowerCase().trim().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    updateSlugHint();
  }
});
slugInput?.addEventListener("input", () => {
  slugInput.dataset.manual = "true";
  updateSlugHint();
});

createForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const slug = slugInput.value.trim().toLowerCase();
  const adminUsername = document.querySelector("#new-admin-user").value.trim();
  const adminPassword = document.querySelector("#new-admin-pass").value;
  const paletteId = document.querySelector("#new-cafe-palette").value;
  const cuisineType = document.querySelector("#new-cafe-cuisine").value.trim();
  const tagline = document.querySelector("#new-cafe-tagline").value.trim();

  const submitBtn = document.querySelector("#btn-submit-create-cafe");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch("/api/manager/cafes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        adminUsername,
        adminPassword,
        paletteId,
        cuisineType,
        tagline
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed creating cafe");
    }
    const created = await res.json();
    showToast(`Successfully created cafe '${created.name}' (${created.slug})!`);
    createModal.hidden = true;
    loadCafes();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// 5. Activity Logs Stream
let logPollTimer = null;

async function loadLogs() {
  try {
    const res = await fetch("/api/manager/logs");
    if (!res.ok) return;
    const { logs } = await res.json();
    renderLogs(logs);
  } catch (err) {
    console.error("Logs load error:", err);
  }
}

function renderLogs(logs = []) {
  const box = document.querySelector("#log-stream-box");
  if (!box) return;

  if (!logs.length) {
    box.innerHTML = `<div style="color:#777;padding:20px;text-align:center;">No activity logged to file yet. Actions performed on customer and admin subdomains will stream here live.</div>`;
    return;
  }

  box.innerHTML = logs.map(line => {
    // Format timestamp, cafe tag, event tag
    let formatted = escapeHtml(line);
    formatted = formatted.replace(/^\[([^\]]+)\]/, '<span class="timestamp">[$1]</span>');
    formatted = formatted.replace(/\[CAFE:([^\]]+)\]/, '<span class="tag-cafe">[CAFE:$1]</span>');
    formatted = formatted.replace(/\[([A-Z_]+)\]/, '<span class="tag-event">[$1]</span>');
    formatted = formatted.replace(/IP: ([^ \|]+)/, '<span class="tag-ip">IP: $1</span>');
    return `<div class="log-line">${formatted}</div>`;
  }).join("");
}

document.querySelector("#btn-refresh-logs")?.addEventListener("click", loadLogs);
document.querySelector("#log-auto-refresh-check")?.addEventListener("change", (e) => {
  if (e.target.checked) {
    startLogPolling();
  } else {
    clearInterval(logPollTimer);
  }
});

function startLogPolling() {
  clearInterval(logPollTimer);
  logPollTimer = setInterval(() => {
    const activeTab = document.querySelector(".tab-content.active");
    if (activeTab && activeTab.id === "tab-logs") {
      loadLogs();
    }
  }, 5000);
}
startLogPolling();

// 6. Manager Security & Profile
async function loadProfile() {
  try {
    const res = await fetch("/api/manager/profile");
    if (!res.ok) return;
    const profile = await res.json();
    const emailDisplay = document.querySelector("#current-email-display");
    if (emailDisplay) {
      emailDisplay.textContent = profile.email || "No recovery email set yet";
    }
    const emailInput = document.querySelector("#new-manager-email");
    if (emailInput && !emailInput.value && profile.email) {
      emailInput.value = profile.email;
    }
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

// Update Email Form Submission
document.querySelector("#update-email-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newEmail = document.querySelector("#new-manager-email").value.trim();
  const currentPassword = document.querySelector("#email-auth-pass").value;
  const submitBtn = document.querySelector("#btn-save-email");

  if (!newEmail || !currentPassword) {
    showToast("Both new email and current password are required.", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Updating...";

  try {
    const res = await fetch("/api/manager/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, currentPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed updating email");

    showToast("Recovery email updated successfully!");
    document.querySelector("#email-auth-pass").value = "";
    loadProfile();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Update Recovery Email</span>`;
  }
});

// Change Password Form Submission
document.querySelector("#change-pass-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const currentPassword = document.querySelector("#change-curr-pass").value;
  const newPassword = document.querySelector("#change-new-pass").value;
  const confirmPassword = document.querySelector("#change-confirm-pass").value;
  const submitBtn = document.querySelector("#btn-save-pass");

  if (newPassword !== confirmPassword) {
    showToast("New password and confirmation do not match.", true);
    return;
  }
  if (newPassword.length < 8) {
    showToast("New password must be at least 8 characters long.", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Updating...";

  try {
    const res = await fetch("/api/manager/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed changing password");

    showToast("Password updated successfully!");
    document.querySelector("#change-pass-form").reset();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg><span>Update Password</span>`;
  }
});

// Initialize on page load
loadAnalytics();
loadCafes();
loadProfile();

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
