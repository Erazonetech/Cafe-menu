import "./env.js";
import express from "express";
import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import {
  initializeDatabase,
  pool,
  getCafeBySlug,
  getCafeById,
  listCafes,
  createCafe,
  toggleCafeActive,
  getTrafficAnalytics,
  getSiteConfig,
  updateSiteConfig,
  getPublicMenu,
  getAdminMenu,
  readPalettes,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
  updateItemPrices,
  duplicateItem,
  getPublicReviews,
  getAdminReviews,
  createReview,
  updateReviewVisibility,
  deleteReview,
  DEFAULT_ABOUT_MARKDOWN
} from "./db.js";
import { recordActivity, readRecentFileLogs } from "./logger.js";
import { renderMarkdown, computeOpenStatus, generateHoursSummary, getCategoryIcon } from "./customer-end/art.js";
import {
  authenticateAdmin,
  createCafeAdmin,
  resetCafeAdminPassword,
  changeAdminPassword,
  createSession,
  deleteSession,
  expiredSessionCookie,
  getSession,
  initializeAdminUser,
  readSessionCookie,
  sessionCookie,
  authenticateManager,
  createManagerSession,
  getManagerSession,
  deleteManagerSession,
  managerSessionCookie,
  expiredManagerSessionCookie,
  readManagerSessionCookie,
  getManagerProfile,
  updateManagerEmail,
  changeManagerPassword,
  createManagerPasswordReset,
  verifyManagerResetToken,
  resetManagerPasswordWithToken
} from "./auth.js";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const uploadsPath = join(root, "uploads");
const palettesPath = join(root, "palettes");
const port = Number(process.env.PORT || 3000);
const configuredDomain = (process.env.DOMAIN || "").toLowerCase().replace(/:\d+$/, "");
const app = express();

await fs.mkdir(uploadsPath, { recursive: true });
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: false }));
app.use("/design-assets", express.static(join(root, "design-assets")));
app.use("/uploads", express.static(uploadsPath, { maxAge: "1y" }));
app.use("/palettes", express.static(palettesPath));

// Static files for Manager App
app.use("/manager/styles.css", (_req, res) => res.sendFile(join(root, "manager-end", "styles.css")));
app.use("/manager/app.js", (_req, res) => res.sendFile(join(root, "manager-end", "app.js")));

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}

function imageTag(src, alt = "") {
  return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">` : "";
}

// ==========================================
// Tenant & Host Resolution Middleware
// ==========================================

export async function resolveRequestTenant(request) {
  const hostname = request.hostname.toLowerCase();
  const urlPath = request.path;

  // 1. Explicit Manager paths or manager subdomain
  if (
    hostname.startsWith("manager.") ||
    hostname === "manager" ||
    urlPath === "/manager" ||
    urlPath.startsWith("/manager/") ||
    urlPath.startsWith("/api/manager/")
  ) {
    return { mode: "manager", cafe: null };
  }

  // 2. Path-based tenant fallbacks (allows testing without /etc/hosts DNS mapping)
  const adminPathMatch = urlPath.match(/^\/admin\/([a-z0-9_-]+)(.*)/i);
  if (adminPathMatch) {
    const slug = adminPathMatch[1];
    const cafe = await getCafeBySlug(slug);
    if (cafe) {
      return { mode: "admin", cafe, subpath: adminPathMatch[2] || "/" };
    }
  }

  const cafePathMatch = urlPath.match(/^\/cafe\/([a-z0-9_-]+)(.*)/i);
  if (cafePathMatch) {
    const slug = cafePathMatch[1];
    const cafe = await getCafeBySlug(slug);
    if (cafe) {
      return { mode: "customer", cafe, subpath: cafePathMatch[2] || "/" };
    }
  }

  // 3. Subdomain parsing:
  // - admin.<cafename>.<domain> -> mode: admin, cafe: <cafename>
  // - <cafename>.<domain> -> mode: customer, cafe: <cafename>
  const parts = hostname.split(".");
  if (parts[0] === "admin") {
    if (parts.length >= 3) {
      const slug = parts[1];
      const cafe = await getCafeBySlug(slug);
      if (cafe) return { mode: "admin", cafe };
    }
    // admin.localhost fallback to default 'bambiscafe'
    const defaultCafe = (await getCafeBySlug("bambiscafe")) || (await getCafeBySlug("bambis")) || (await listCafes())[0];
    return { mode: "admin", cafe: defaultCafe };
  }

  // Check if first subdomain is a cafe slug (e.g. bambiscafe.<domain> or aroma.<domain>)
  if (parts.length >= 2 && parts[0] !== "localhost" && parts[0] !== "127") {
    const slug = parts[0];
    const cafe = await getCafeBySlug(slug);
    if (cafe) return { mode: "customer", cafe };
  }

  // 4. Default fallback: naked domain (localhost:3000, 127.0.0.1, or main domain) defaults to MANAGER APP
  return { mode: "manager", cafe: null };
}

// Tenant identification & Activity tracking middleware
app.use(async (request, response, next) => {
  const start = Date.now();
  try {
    const tenantInfo = await resolveRequestTenant(request);
    request.tenantMode = tenantInfo.mode;
    request.cafe = tenantInfo.cafe;

    // Track request activity on finish (non-blocking)
    response.on("finish", () => {
      const isAsset = request.path.match(/\.(css|js|jpg|jpeg|png|gif|svg|woff2?|ico|map)$/i);
      if (!isAsset) {
        const duration = Date.now() - start;
        let eventType = "pageview";
        if (request.path.startsWith("/api/admin")) eventType = "admin_action";
        else if (request.path.startsWith("/api/manager")) eventType = "manager_action";
        else if (request.path.includes("review")) eventType = "review_action";

        recordActivity({
          cafeId: request.cafe?.id || null,
          cafeSlug: request.cafe?.slug || (request.tenantMode === "manager" ? "manager" : "platform"),
          eventType,
          action: `${request.method} ${request.path} -> ${response.statusCode}`,
          path: request.path,
          method: request.method,
          status: response.statusCode,
          ip: request.ip || request.socket.remoteAddress || "127.0.0.1",
          userAgent: request.get("user-agent") || "",
          responseTimeMs: duration
        }).catch(() => {});
      }
    });

    next();
  } catch (err) {
    next(err);
  }
});

// Serve static assets per host mode
app.get([
  "/styles.css", "/app.js", "/art.js",
  "/customer/styles.css", "/customer/app.js", "/customer/art.js"
], async (request, response, next) => {
  try {
    const isCustomer = request.tenantMode === "customer";
    const dir = isCustomer ? "customer-end" : "admin-end";
    const fileName = request.path.replace(/^\/customer/, "").slice(1);
    const filePath = join(root, dir, fileName);
    try {
      await fs.access(filePath);
      return response.sendFile(filePath);
    } catch {
      if (fileName === "art.js") {
        return response.sendFile(join(root, "customer-end", "art.js"));
      }
      return next();
    }
  } catch (error) { next(error); }
});

function getTenantCustomerUrl(request, cafe) {
  const protocol = request.headers["x-forwarded-proto"] || request.protocol;
  const rawHost = request.get("host") || "";
  const hostNoPort = rawHost.replace(/:\d+$/, "");
  const portPart = rawHost.includes(":") ? `:${rawHost.split(":")[1]}` : "";

  if (cafe && cafe.slug) {
    // If running with subdomains: <slug>.<domain>
    const baseHost = hostNoPort.replace(/^(admin|manager)\./i, "").replace(new RegExp(`^${cafe.slug}\\.`, "i"), "");
    return `${protocol}://${cafe.slug}.${baseHost}${portPart}/`;
  }
  return `${protocol}://${rawHost}/`;
}

function generatePaletteCss(palette) {
  if (!palette) return "";
  const light = palette.light || {};
  const dark = palette.dark || {};
  return `
    :root, :root[data-theme="light"] {
      --bg: ${light.bg || "#faf7f2"};
      --surface: ${light.surface || "#ffffff"};
      --ink: ${light.ink || "#1d1a17"};
      --muted: ${light.muted || "#6b645c"};
      --line: ${light.line || "#e7e2de"};
      --accent: ${light.accent || "#d97706"};
      --accent-ink: ${light.accentInk || "#ffffff"};
      --chip: ${light.chip || "#eee6de"};
    }
    :root[data-theme="dark"] {
      --bg: ${dark.bg || "#171412"};
      --surface: ${dark.surface || "#231f1c"};
      --ink: ${dark.ink || "#f5eee8"};
      --muted: ${dark.muted || "#a89b91"};
      --line: ${dark.line || "#3c3530"};
      --accent: ${dark.accent || "#d97706"};
      --accent-ink: ${dark.accentInk || "#171412"};
      --chip: ${dark.chip || "#2b2622"};
    }
  `;
}

function serverRenderedCustomerMenu(menu, currency = "ETB", language = "en") {
  return (menu || []).map((group) => {
    const groupName = group.name?.[language] || group.name?.en || "";
    const groupNote = group.note?.[language] || group.note?.en || "";
    const itemsHtml = (group.items || []).map((item) => {
      const itemName = item.name?.[language] || item.name?.en || "";
      const itemDesc = item.description?.[language] || item.description?.en || "";
      const minPriceCents = item.prices?.length ? Math.min(...item.prices.map((p) => p.amountCents)) : 0;
      const formattedPrice = item.prices?.length > 1
        ? `${language === "am" ? "ከ " : "from "}${currency} ${(minPriceCents / 100).toFixed(2)}`
        : `${currency} ${(minPriceCents / 100).toFixed(2)}`;

      return `
        <article class="menu-item ${!item.isAvailable ? "sold-out" : ""}" data-item-id="${item.id}">
          <div class="food-image" aria-hidden="true">
            ${item.imageUrl ? imageTag(item.imageUrl, itemName) : `<span class="food-emoji">${escapeHtml(group.emoji || "🍽")}</span>`}
          </div>
          <div class="item-copy">
            <div class="item-title-row">
              <h3>${escapeHtml(itemName)}</h3>
              ${item.badge ? `<span class="badge">${escapeHtml(item.badge)}</span>` : ""}
            </div>
            <p class="price">${escapeHtml(formattedPrice)}</p>
            <p class="description">${escapeHtml(itemDesc)}</p>
            ${!item.isAvailable ? `<span class="sold-out-tag">${language === "am" ? "አልቋል" : "Sold out"}</span>` : ""}
          </div>
          <button class="add-button" data-item-id="${item.id}" ${!item.isAvailable ? "disabled" : ""}>
            ${language === "am" ? "ጨምር" : "ADD"} <strong>＋</strong>
          </button>
        </article>`;
    }).join("");

    const categoryIcon = getCategoryIcon(group.emoji || group.name?.en || "plate");

    return `
      <section class="menu-group-section" id="group-${group.id}">
        <div class="group-header">
          <div class="category-header-wrap">
            <span class="category-icon-wrapper">${categoryIcon}</span>
            <h2>${escapeHtml(groupName)}</h2>
          </div>
          ${groupNote ? `<p class="group-note">${escapeHtml(groupNote)}</p>` : ""}
        </div>
        <div class="group-items">${itemsHtml}</div>
      </section>`;
  }).join("");
}

async function renderCustomerPage(response, language, customerUrl, cafe) {
  const cafeId = cafe?.id || 1;
  const [html, site, menu, reviews] = await Promise.all([
    fs.readFile(join(root, "customer-end", "index.html"), "utf8"),
    getSiteConfig(cafeId),
    getPublicMenu(cafeId),
    getPublicReviews(cafeId)
  ]);

  const paletteCss = generatePaletteCss(site.palette);
  const renderedItems = serverRenderedCustomerMenu(menu, site.currency, language);
  const serializedSite = JSON.stringify(site).replace(/</g, "\\u003c");
  const serializedMenu = JSON.stringify(menu).replace(/</g, "\\u003c");
  const serializedReviews = JSON.stringify(reviews).replace(/</g, "\\u003c");
  const serializedCustomerUrl = JSON.stringify(customerUrl).replace(/</g, "\\u003c");

  let finalHtml = html
    .replace("</head>", `<style id="palette-styles">${paletteCss}</style><script>window.__SITE_CONFIG__=${serializedSite};window.__MENU_DATA__=${serializedMenu};window.__REVIEWS_DATA__=${serializedReviews};window.__CUSTOMER_URL__=${serializedCustomerUrl};window.__SERVER_RENDERED__=true;</script></head>`)
    .replace('<div class="menu-list" id="menu-items"></div>', `<div class="menu-list" id="menu-items">${renderedItems}</div>`);

  if (site.bannerUrl) {
    finalHtml = finalHtml.replace('src="design-assets/photo_2026-11-05_12-15-00.jpg"', `src="${escapeHtml(site.bannerUrl)}"`);
  } else {
    finalHtml = finalHtml
      .replace(/<img[^>]*src="design-assets\/photo_2026-11-05_12-15-00\.jpg"[^>]*>/i, "")
      .replace('class="hero-banner"', 'class="hero-banner no-image"');
  }

  if (site.cuisineType) {
    finalHtml = finalHtml.replace(/data-i18n="cuisine">[^<]*</, `data-i18n="cuisine">${escapeHtml(site.cuisineType)}<`);
  }
  if (site.address) {
    finalHtml = finalHtml.replace(/id="display-address">[^<]*</, `id="display-address">${escapeHtml(site.address)}<`);
  }
  if (site.phone) {
    finalHtml = finalHtml.replace(/id="display-phone">[^<]*</, `id="display-phone">${escapeHtml(site.phone)}<`);
  }
  const hoursDisplay = site.hoursText || generateHoursSummary(site.schedule);
  finalHtml = finalHtml.replace(/id="display-hours">[^<]*</, `id="display-hours">${escapeHtml(hoursDisplay)}<`);

  const customerBase = (customerUrl || "/").replace(/\/+$/, "");
  finalHtml = finalHtml
    .replace(/href="\/about"/g, `href="${escapeHtml(`${customerBase}/about`)}"`)
    .replace(/href="\/reviews"/g, `href="${escapeHtml(`${customerBase}/reviews`)}"`);

  const statusInfo = computeOpenStatus(site.schedule, site.timezone || "Africa/Addis_Ababa");
  const dotHtml = statusInfo.isOpen
    ? `<span class="status-dot pulsing" style="background:#10b981;" aria-hidden="true"></span>`
    : `<span class="status-dot" style="background:#f59e0b;" aria-hidden="true"></span>`;
  const badgeHtml = `<div class="status-badge ${statusInfo.statusClass}" id="status-badge">${dotHtml}<span class="status-text" id="status-text">${escapeHtml(statusInfo.text)}</span></div>`;
  finalHtml = finalHtml.replace(/<div class="status-badge"[^>]*>[\s\S]*?<\/div>/, badgeHtml);

  response.type("html").send(finalHtml);
}

async function renderAboutPage(response, customerUrl, cafe) {
  const cafeId = cafe?.id || 1;
  const [html, site] = await Promise.all([
    fs.readFile(join(root, "customer-end", "about.html"), "utf8"),
    getSiteConfig(cafeId)
  ]);

  const paletteCss = generatePaletteCss(site.palette);
  const serializedSite = JSON.stringify(site).replace(/</g, "\\u003c");
  const serializedCustomerUrl = JSON.stringify(customerUrl).replace(/</g, "\\u003c");
  const renderedAboutHtml = renderMarkdown(site.aboutMarkdown || DEFAULT_ABOUT_MARKDOWN);

  let finalHtml = html
    .replace("</head>", `<style id="palette-styles">${paletteCss}</style><script>window.__SITE_CONFIG__=${serializedSite};window.__CUSTOMER_URL__=${serializedCustomerUrl};</script></head>`)
    .replace("<!-- RENDERED_MARKDOWN -->", renderedAboutHtml);

  response.type("html").send(finalHtml);
}

async function renderReviewsPage(response, customerUrl, cafe) {
  const cafeId = cafe?.id || 1;
  const [html, site, reviews] = await Promise.all([
    fs.readFile(join(root, "customer-end", "reviews.html"), "utf8"),
    getSiteConfig(cafeId),
    getPublicReviews(cafeId)
  ]);

  const paletteCss = generatePaletteCss(site.palette);
  const serializedSite = JSON.stringify(site).replace(/</g, "\\u003c");
  const serializedCustomerUrl = JSON.stringify(customerUrl).replace(/</g, "\\u003c");
  const serializedReviews = JSON.stringify(reviews).replace(/</g, "\\u003c");

  const finalHtml = html
    .replace("</head>", `<style id="palette-styles">${paletteCss}</style><script>window.__SITE_CONFIG__=${serializedSite};window.__REVIEWS_DATA__=${serializedReviews};window.__CUSTOMER_URL__=${serializedCustomerUrl};</script></head>`);

  response.type("html").send(finalHtml);
}

async function renderAdminPage(response, customerUrl, cafe) {
  const cafeId = cafe?.id || 1;
  const [html, site, adminMenu, palettes, reviews] = await Promise.all([
    fs.readFile(join(root, "admin-end", "index.html"), "utf8"),
    getSiteConfig(cafeId),
    getAdminMenu(cafeId),
    readPalettes(),
    getAdminReviews(cafeId)
  ]);

  const serializedSite = JSON.stringify(site).replace(/</g, "\\u003c");
  const serializedMenu = JSON.stringify(adminMenu).replace(/</g, "\\u003c");
  const serializedPalettes = JSON.stringify(palettes).replace(/</g, "\\u003c");
  const serializedReviews = JSON.stringify(reviews).replace(/</g, "\\u003c");
  const serializedCustomerUrl = JSON.stringify(customerUrl).replace(/</g, "\\u003c");

  const finalHtml = html
    .replace("</head>", `<script>window.__SITE_CONFIG__=${serializedSite};window.__ADMIN_MENU__=${serializedMenu};window.__PALETTES__=${serializedPalettes};window.__ADMIN_REVIEWS__=${serializedReviews};window.__CUSTOMER_URL__=${serializedCustomerUrl};</script></head>`)
    .replace(/class="view-store-link"[^>]*href="[^"]*"/, `class="view-store-link" id="view-store-link" href="${escapeHtml(customerUrl || "/")}"`);

  response.type("html").send(finalHtml);
}

async function renderLogin(response, error = "", customerUrl = "/", cafe = null) {
  const cafeId = cafe?.id || 1;
  const [html, site] = await Promise.all([
    fs.readFile(join(root, "admin-end", "login.html"), "utf8"),
    getSiteConfig(cafeId)
  ]);

  const paletteCss = generatePaletteCss(site.palette);
  const errorHtml = error ? `
    <div class="login-error-alert" role="alert">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${escapeHtml(error)}</span>
    </div>
  ` : "";

  let finalHtml = html
    .replace("</head>", `<style id="palette-styles">${paletteCss}</style></head>`)
    .replace("<!-- LOGIN_ERROR -->", errorHtml)
    .replace(/id="brand-header-title">[^<]*</, `id="brand-header-title">${escapeHtml(site.brandName || "Cafe Admin")}<`);

  response.status(error ? 401 : 200).type("html").send(finalHtml);
}

// ==========================================
// Auth Guards
// ==========================================

async function requireManager(request, response, next) {
  const token = readManagerSessionCookie(request);
  const session = await getManagerSession(token);
  if (!session) {
    if (request.path.startsWith("/api/")) {
      return response.status(401).json({ error: "Manager authentication required" });
    }
    const html = await fs.readFile(join(root, "manager-end", "login.html"), "utf8");
    return response.status(401).type("html").send(html.replace("<!-- LOGIN_ERROR -->", ""));
  }
  request.manager = session;
  return next();
}

async function requireAdmin(request, response, next) {
  const token = readSessionCookie(request);
  const cafeId = request.cafe ? request.cafe.id : 1;
  const session = await getSession(token, cafeId);
  if (!session) {
    if (request.path.startsWith("/api/")) {
      return response.status(401).json({ error: "Authentication required" });
    }
    const customerUrl = getTenantCustomerUrl(request, request.cafe);
    return renderLogin(response, "", customerUrl, request.cafe);
  }
  request.admin = session;
  return next();
}

// ==========================================
// Manager App Endpoints (/manager & /api/manager/*)
// ==========================================

app.get(["/manager", "/manager/"], requireManager, async (_req, res) => {
  const html = await fs.readFile(join(root, "manager-end", "index.html"), "utf8");
  res.type("html").send(html);
});

app.get(["/manager/login", "/manager/login/"], async (request, response) => {
  const token = readManagerSessionCookie(request);
  const session = await getManagerSession(token);
  if (session) return response.redirect("/manager");
  const html = await fs.readFile(join(root, "manager-end", "login.html"), "utf8");
  return response.type("html").send(html.replace("<!-- LOGIN_ERROR -->", ""));
});

app.post("/api/manager/auth/login", async (request, response, next) => {
  try {
    const username = typeof request.body.username === "string" ? request.body.username.trim() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const mgrId = await authenticateManager(username, password);
    if (!mgrId) {
      if (request.is("json") || request.headers.accept?.includes("application/json")) {
        return response.status(401).json({ error: "Invalid manager username or password." });
      }
      const html = await fs.readFile(join(root, "manager-end", "login.html"), "utf8");
      return response.status(401).type("html").send(html.replace("<!-- LOGIN_ERROR -->", '<div class="login-error">Invalid manager username or password.</div>'));
    }
    const token = await createManagerSession(mgrId);
    response.set("Set-Cookie", managerSessionCookie(token, request.secure));
    if (request.is("json") || request.headers.accept?.includes("application/json")) {
      return response.json({ ok: true, redirect: "/manager" });
    }
    response.redirect("/manager");
  } catch (error) { next(error); }
});

app.post("/api/manager/auth/logout", async (request, response, next) => {
  try {
    await deleteManagerSession(readManagerSessionCookie(request));
    response.set("Set-Cookie", expiredManagerSessionCookie(request.secure));
    if (request.is("json") || request.headers.accept?.includes("application/json")) {
      return response.json({ ok: true, redirect: "/manager/login" });
    }
    response.redirect("/manager/login");
  } catch (error) { next(error); }
});

app.get("/api/manager/cafes", requireManager, async (_req, res, next) => {
  try {
    const cafes = await listCafes();
    res.json(cafes);
  } catch (err) { next(err); }
});

app.post("/api/manager/cafes", requireManager, async (req, res, next) => {
  try {
    const cafe = await createCafe(req.body);
    recordActivity({
      cafeId: cafe.id,
      cafeSlug: cafe.slug,
      eventType: "admin_action",
      action: `Manager provisioned new cafe '${cafe.name}' (${cafe.slug}) with initial admin account`,
      ip: req.ip
    });
    res.status(201).json(cafe);
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
});

app.patch("/api/manager/cafes/:id/toggle", requireManager, async (req, res, next) => {
  try {
    const { isActive } = req.body || {};
    const updated = await toggleCafeActive(Number(req.params.id), isActive);
    recordActivity({
      cafeId: Number(req.params.id),
      eventType: "admin_action",
      action: `Manager toggled cafe ID ${req.params.id} active status to: ${isActive}`,
      ip: req.ip
    });
    res.json(updated);
  } catch (err) { next(err); }
});

app.post("/api/manager/cafes/:id/reset-password", requireManager, async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    await resetCafeAdminPassword(Number(req.params.id), newPassword);
    recordActivity({
      cafeId: Number(req.params.id),
      eventType: "admin_action",
      action: `Manager updated initial admin password for cafe ID ${req.params.id}`,
      ip: req.ip
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

app.get("/api/manager/analytics", requireManager, async (req, res, next) => {
  try {
    const days = Number(req.query.days || 7);
    const analytics = await getTrafficAnalytics({ days });
    res.json(analytics);
  } catch (err) { next(err); }
});

app.get("/api/manager/logs", requireManager, async (_req, res, next) => {
  try {
    const logs = await readRecentFileLogs(100);
    res.json({ logs });
  } catch (err) { next(err); }
});

// Manager Profile & Security Endpoints
app.get("/api/manager/profile", requireManager, async (req, res, next) => {
  try {
    const profile = await getManagerProfile(req.manager.manager_user_id);
    res.json(profile);
  } catch (err) { next(err); }
});

app.patch("/api/manager/email", requireManager, async (req, res, next) => {
  try {
    const { newEmail, currentPassword } = req.body || {};
    const updated = await updateManagerEmail(req.manager.manager_user_id, newEmail, currentPassword);
    recordActivity({
      cafeSlug: "manager",
      eventType: "manager_action",
      action: `Manager updated recovery email to '${updated.email}'`,
      ip: req.ip
    });
    res.json({ ok: true, email: updated.email });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

app.post("/api/manager/password", requireManager, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    await changeManagerPassword(req.manager.manager_user_id, currentPassword, newPassword);
    recordActivity({
      cafeSlug: "manager",
      eventType: "manager_action",
      action: "Manager successfully changed account password",
      ip: req.ip
    });
    res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Manager Password Reset Endpoints (Public)
app.post("/api/manager/auth/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host") || `localhost:${port}`;
    const hostUrl = `${protocol}://${host}`;
    const result = await createManagerPasswordReset(email, hostUrl);

    recordActivity({
      cafeSlug: "manager",
      eventType: "auth",
      action: `Password reset dispatched to ${result.email} (valid 10 mins). Link: ${result.resetLink}`,
      ip: req.ip
    });

    res.json({
      ok: true,
      message: "A password reset link has been dispatched to your email (valid for 10 minutes).",
      expiresAt: result.expiresAt,
      resetLink: result.resetLink
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

app.get("/manager/reset-password", async (_req, res) => {
  const html = await fs.readFile(join(root, "manager-end", "reset-password.html"), "utf8");
  res.type("html").send(html);
});

app.get("/api/manager/auth/verify-reset-token", async (req, res) => {
  const { token } = req.query;
  const result = await verifyManagerResetToken(token);
  if (!result.valid) {
    return res.status(400).json({ valid: false, error: result.error });
  }
  res.json({ valid: true, email: result.email, expiresAt: result.expiresAt });
});

app.post("/api/manager/auth/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    const result = await resetManagerPasswordWithToken(token, newPassword);
    recordActivity({
      cafeSlug: "manager",
      eventType: "auth",
      action: `Manager password reset successfully completed for ${result.email}`,
      ip: req.ip
    });
    res.json({ ok: true, message: "Password has been reset successfully. Please sign in with your new password." });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ==========================================
// Root Handler (Dynamic Subdomain / Host Routing)
// ==========================================

app.get("/", async (request, response, next) => {
  try {
    const mode = request.tenantMode;
    const cafe = request.cafe;

    // 1. Manager App host
    if (mode === "manager") {
      const token = readManagerSessionCookie(request);
      const session = await getManagerSession(token);
      if (!session) {
        const html = await fs.readFile(join(root, "manager-end", "login.html"), "utf8");
        return response.type("html").send(html.replace("<!-- LOGIN_ERROR -->", ""));
      }
      const html = await fs.readFile(join(root, "manager-end", "index.html"), "utf8");
      return response.type("html").send(html);
    }

    // Check if cafe tenant is suspended
    if (cafe && !cafe.isActive) {
      return response.status(403).send(`
        <!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#141210;color:#f5eee8;text-align:center;">
          <div><h2>${escapeHtml(cafe.name)} is Temporarily Inactive</h2><p style="color:#a3958c;">This cafe application has been paused by the platform administrator.</p></div>
        </body></html>
      `);
    }

    const customerUrl = getTenantCustomerUrl(request, cafe);

    // 2. Cafe Admin App host
    if (mode === "admin") {
      const session = await getSession(readSessionCookie(request), cafe?.id);
      if (!session) return renderLogin(response, "", customerUrl, cafe);
      return renderAdminPage(response, customerUrl, cafe);
    }

    // 3. Cafe Customer App host
    const language = request.query.lang === "am" ? "am" : "en";
    return renderCustomerPage(response, language, customerUrl, cafe);
  } catch (error) { next(error); }
});

// Path-based fallback routes for testing
app.get(["/cafe/:slug", "/cafe/:slug/"], async (req, res, next) => {
  try {
    const cafe = await getCafeBySlug(req.params.slug);
    if (!cafe) return res.status(404).send("Cafe not found");
    if (!cafe.isActive) {
      return res.status(403).send(`
        <!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#141210;color:#f5eee8;text-align:center;">
          <div><h2>${escapeHtml(cafe.name)} is Temporarily Inactive</h2><p style="color:#a3958c;">This cafe application has been paused by the platform administrator.</p></div>
        </body></html>
      `);
    }
    const customerUrl = `/cafe/${cafe.slug}`;
    return renderCustomerPage(res, req.query.lang === "am" ? "am" : "en", customerUrl, cafe);
  } catch (err) { next(err); }
});

app.get(["/admin/:slug", "/admin/:slug/"], async (req, res, next) => {
  try {
    const cafe = await getCafeBySlug(req.params.slug);
    if (!cafe) return res.status(404).send("Cafe not found");
    const customerUrl = `/cafe/${cafe.slug}`;
    const session = await getSession(readSessionCookie(req), cafe.id);
    if (!session) return renderLogin(res, "", customerUrl, cafe);
    return renderAdminPage(res, customerUrl, cafe);
  } catch (err) { next(err); }
});

app.get(["/login", "/admin/login", "/admin/:slug/login"], async (request, response, next) => {
  try {
    const slug = request.params.slug;
    const cafe = slug ? await getCafeBySlug(slug) : (request.cafe || (await getCafeBySlug("bambis")));
    const customerUrl = getTenantCustomerUrl(request, cafe);
    const session = await getSession(readSessionCookie(request), cafe?.id);
    if (session) {
      if (slug) return response.redirect(`/admin/${slug}`);
      return response.redirect("/");
    }
    return renderLogin(response, "", customerUrl, cafe);
  } catch (err) { next(err); }
});

app.get(["/about", "/customer/about", "/cafe/:slug/about"], async (request, response, next) => {
  try {
    const cafe = request.cafe || (request.params.slug ? await getCafeBySlug(request.params.slug) : null);
    const customerUrl = getTenantCustomerUrl(request, cafe);
    return renderAboutPage(response, customerUrl, cafe);
  } catch (error) { next(error); }
});

app.get(["/reviews", "/customer/reviews", "/cafe/:slug/reviews"], async (request, response, next) => {
  try {
    const cafe = request.cafe || (request.params.slug ? await getCafeBySlug(request.params.slug) : null);
    const customerUrl = getTenantCustomerUrl(request, cafe);
    return renderReviewsPage(response, customerUrl, cafe);
  } catch (error) { next(error); }
});

// ==========================================
// Cafe Admin Endpoints (/login, /logout, /api/admin/*)
// ==========================================

app.post(["/login", "/admin/:slug/login"], async (request, response, next) => {
  try {
    const slug = request.params.slug;
    const cafe = slug ? await getCafeBySlug(slug) : (request.cafe || (await getCafeBySlug("bambis")));
    const cafeId = cafe ? cafe.id : 1;
    const username = typeof request.body.username === "string" ? request.body.username.trim() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const adminId = await authenticateAdmin(cafeId, username, password);
    const customerUrl = getTenantCustomerUrl(request, cafe);

    if (!adminId) {
      recordActivity({
        cafeId,
        cafeSlug: cafe?.slug,
        eventType: "auth",
        action: `Failed admin login attempt for user '${username}'`,
        ip: request.ip
      });
      return renderLogin(response, "Invalid username or password.", customerUrl, cafe);
    }

    const token = await createSession(adminId);
    response.set("Set-Cookie", sessionCookie(token, request.secure));

    recordActivity({
      cafeId,
      cafeSlug: cafe?.slug,
      eventType: "auth",
      action: `Admin user '${username}' successfully signed in`,
      ip: request.ip
    });

    if (slug) {
      return response.redirect(`/admin/${slug}`);
    }
    response.redirect("/");
  } catch (error) { next(error); }
});

app.post(["/logout", "/admin/:slug/logout"], async (request, response, next) => {
  try {
    const slug = request.params.slug;
    const cafe = slug ? await getCafeBySlug(slug) : (request.cafe || (await getCafeBySlug("bambis")));
    await deleteSession(readSessionCookie(request));
    response.set("Set-Cookie", expiredSessionCookie(request.secure));

    recordActivity({
      cafeId: cafe?.id,
      cafeSlug: cafe?.slug,
      eventType: "auth",
      action: "Admin logged out",
      ip: request.ip
    });

    if (slug) {
      return response.redirect(`/admin/${slug}`);
    }
    response.redirect("/");
  } catch (error) { next(error); }
});

// Admin Data APIs
app.get("/api/admin/menu", requireAdmin, async (request, response, next) => {
  try {
    const menu = await getAdminMenu(request.cafe?.id || 1);
    response.json(menu);
  } catch (error) { next(error); }
});

app.get("/api/admin/config", requireAdmin, async (request, response, next) => {
  try {
    const site = await getSiteConfig(request.cafe?.id || 1);
    response.json(site);
  } catch (error) { next(error); }
});

app.put("/api/admin/config", requireAdmin, async (request, response, next) => {
  try {
    const cafeId = request.cafe?.id || 1;
    const updated = await updateSiteConfig(request.body, cafeId);
    recordActivity({
      cafeId,
      cafeSlug: request.cafe?.slug,
      eventType: "admin_action",
      action: `Admin updated cafe branding/config: brand='${updated.brandName}', palette='${updated.paletteId}'`,
      ip: request.ip
    });
    response.json(updated);
  } catch (error) { next(error); }
});

app.get("/api/admin/reviews", requireAdmin, async (request, response, next) => {
  try {
    const reviews = await getAdminReviews(request.cafe?.id || 1);
    response.json(reviews);
  } catch (error) { next(error); }
});

app.post("/api/admin/groups", requireAdmin, async (request, response, next) => {
  try {
    const cafeId = request.cafe?.id || 1;
    const group = await createGroup({ ...request.body, cafeId });
    recordActivity({
      cafeId,
      cafeSlug: request.cafe?.slug,
      eventType: "admin_action",
      action: `Admin created menu category '${group.name_en}'`,
      ip: request.ip
    });
    response.status(201).json(group);
  } catch (error) { next(error); }
});

app.patch("/api/admin/groups/:id", requireAdmin, async (request, response, next) => {
  try {
    const group = await updateGroup(Number(request.params.id), request.body);
    if (!group) return response.status(404).json({ error: "Group not found" });
    response.json(group);
  } catch (error) { next(error); }
});

app.delete("/api/admin/groups/:id", requireAdmin, async (request, response, next) => {
  try {
    await deleteGroup(Number(request.params.id));
    response.status(204).end();
  } catch (error) {
    if (error.status === 409) return response.status(409).json({ error: error.message });
    next(error);
  }
});

app.post("/api/admin/groups/reorder", requireAdmin, async (request, response, next) => {
  try {
    const { ids } = request.body || {};
    if (!Array.isArray(ids)) return response.status(400).json({ error: "ids array required" });
    await reorderGroups(ids);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

app.post("/api/admin/items", requireAdmin, async (request, response, next) => {
  try {
    const cafeId = request.cafe?.id || 1;
    const itemId = await createItem({ ...request.body, cafeId });
    recordActivity({
      cafeId,
      cafeSlug: request.cafe?.slug,
      eventType: "admin_action",
      action: `Admin added new menu item '${request.body.nameEn}' (ID: ${itemId})`,
      ip: request.ip
    });
    response.status(201).json({ id: itemId });
  } catch (error) { next(error); }
});

app.patch("/api/admin/items/:id", requireAdmin, async (request, response, next) => {
  try {
    const updated = await updateItem(Number(request.params.id), request.body);
    if (!updated) return response.status(404).json({ error: "Item not found" });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

app.delete("/api/admin/items/:id", requireAdmin, async (request, response, next) => {
  try {
    const deleted = await deleteItem(Number(request.params.id));
    if (!deleted) return response.status(404).json({ error: "Item not found" });
    response.status(204).end();
  } catch (error) { next(error); }
});

app.post("/api/admin/items/reorder", requireAdmin, async (request, response, next) => {
  try {
    const { groupId, ids } = request.body || {};
    if (!groupId || !Array.isArray(ids)) return response.status(400).json({ error: "groupId and ids array required" });
    await reorderItems(Number(groupId), ids);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

app.put("/api/admin/items/:id/prices", requireAdmin, async (request, response, next) => {
  try {
    const { prices } = request.body || {};
    if (!Array.isArray(prices) || !prices.length) return response.status(400).json({ error: "At least one price row required" });
    await updateItemPrices(Number(request.params.id), prices);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

app.post("/api/admin/items/:id/duplicate", requireAdmin, async (request, response, next) => {
  try {
    const newItemId = await duplicateItem(Number(request.params.id));
    if (!newItemId) return response.status(404).json({ error: "Item not found" });
    response.status(201).json({ id: newItemId });
  } catch (error) { next(error); }
});

app.post("/api/admin/password", requireAdmin, async (request, response, next) => {
  try {
    const { oldPassword, newPassword } = request.body || {};
    await changeAdminPassword(request.admin.admin_user_id, oldPassword, newPassword);
    response.json({ ok: true });
  } catch (error) {
    if (error.status === 400 || error.status === 404) {
      return response.status(error.status).json({ error: error.message });
    }
    next(error);
  }
});

// Image upload API
app.post("/api/admin/images", requireAdmin, async (request, response, next) => {
  try {
    const { dataUrl, filename = "image.png" } = request.body || {};
    if (!dataUrl || typeof dataUrl !== "string") {
      return response.status(400).json({ error: "dataUrl string is required" });
    }
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return response.status(400).json({ error: "Invalid dataUrl format" });
    const ext = match[1] === "jpeg" ? "jpg" : match[1].replace(/[^a-zA-Z0-9]/g, "");
    const buffer = Buffer.from(match[2], "base64");
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    await fs.writeFile(join(uploadsPath, uniqueName), buffer);
    response.status(201).json({ url: `/uploads/${uniqueName}` });
  } catch (error) { next(error); }
});

// Reviews Moderation APIs
app.patch("/api/admin/reviews/:id/visibility", requireAdmin, async (request, response, next) => {
  try {
    const { isVisible } = request.body || {};
    const review = await updateReviewVisibility(Number(request.params.id), Boolean(isVisible));
    if (!review) return response.status(404).json({ error: "Review not found" });
    response.json(review);
  } catch (error) { next(error); }
});

app.delete("/api/admin/reviews/:id", requireAdmin, async (request, response, next) => {
  try {
    await deleteReview(Number(request.params.id));
    response.status(204).end();
  } catch (error) { next(error); }
});

// ==========================================
// Cafe Customer Public Endpoints
// ==========================================

app.get("/api/menu", async (request, response, next) => {
  try {
    const cafeId = request.cafe?.id || 1;
    const [menu, site] = await Promise.all([
      getPublicMenu(cafeId),
      getSiteConfig(cafeId)
    ]);
    response.json({ menu, currency: site.currency });
  } catch (error) { next(error); }
});

app.get("/api/config", async (request, response, next) => {
  try {
    const site = await getSiteConfig(request.cafe?.id || 1);
    response.json(site);
  } catch (error) { next(error); }
});

app.get("/api/reviews", async (request, response, next) => {
  try {
    const reviews = await getPublicReviews(request.cafe?.id || 1);
    response.json(reviews);
  } catch (error) { next(error); }
});

app.post("/api/reviews", async (request, response, next) => {
  try {
    const cafeId = request.cafe?.id || 1;
    const review = await createReview({ ...request.body, cafeId });
    recordActivity({
      cafeId,
      cafeSlug: request.cafe?.slug,
      eventType: "review_submit",
      action: `Guest '${review.authorName}' submitted review (${review.rating} stars)`,
      ip: request.ip
    });
    response.status(201).json(review);
  } catch (error) {
    if (error.status === 400) return response.status(400).json({ error: error.message });
    next(error);
  }
});

// Error handling middleware
app.use((error, request, response, _next) => {
  console.error("Unhandled error:", error);
  const status = error.status || 500;
  if (request.path.startsWith("/api/")) {
    return response.status(status).json({ error: error.message || "Internal server error" });
  }
  response.status(status).send(`
    <!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;background:#141210;color:#f5eee8;">
      <h2>Service Error (${status})</h2><p style="color:#a3958c;">${escapeHtml(error.message || "An unexpected error occurred.")}</p>
    </body></html>
  `);
});

// Bootstrap server
await initializeDatabase();
await initializeAdminUser();

app.listen(port, () => {
  console.log(`[Platform] Multi-tenant server running on port ${port}`);
  console.log(`[Platform] Manager URL: http://localhost:${port}/manager`);
  console.log(`[Platform] Primary Cafe: http://localhost:${port}/`);
});
