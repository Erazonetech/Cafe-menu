import "./env.js";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = join(__dirname, "db", "schema.sql");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 10),
});

export async function readPalettes() {
  const palettesDir = join(__dirname, "palettes");
  try {
    const files = await fs.readdir(palettesDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    return Promise.all(
      jsonFiles.map(async (file) => JSON.parse(await fs.readFile(join(palettesDir, file), "utf8")))
    );
  } catch {
    return [];
  }
}

export async function resolvePalette(paletteId, customOverrides = {}) {
  const palettes = await readPalettes();
  const base = palettes.find((p) => p.id === paletteId) || palettes[0] || {
    id: "espresso",
    name: "Espresso Warmth",
    light: { bg: "#fbf6f0", surface: "#ffffff", ink: "#2d1a10", muted: "#806657", line: "#e8dbd0", accent: "#c25e00", accentInk: "#ffffff", chip: "#f2e4d8" },
    dark: { bg: "#1a120b", surface: "#261a10", ink: "#f5ece4", muted: "#a89485", line: "#3d2b1d", accent: "#d97706", accentInk: "#ffffff", chip: "#332214" }
  };

  return {
    id: base.id,
    name: base.name,
    light: { ...base.light, ...(customOverrides?.light || {}) },
    dark: { ...base.dark, ...(customOverrides?.dark || {}) }
  };
}

export const DEFAULT_ABOUT_MARKDOWN = `# Welcome to Bambis Cafe

Founded with a passion for **exceptional culinary traditions** and contemporary café culture, Bambis Cafe brings together the rich heritage of Ethiopian coffee ceremony with artisan bistro delicacies.

## Our Philosophy

Every dish we prepare tells a story of craftsmanship:

- **Hand-Selected Coffee Beans**: Sourced directly from local Ethiopian highlands, roasted to perfection, and ground fresh for every cup.
- **Farm-to-Table Ingredients**: Crisp organic greens, prime local meats, and freshly baked artisan buns delivered every morning.
- **Warm Hospitality**: A serene, welcoming sanctuary designed for heartfelt conversations, productive work sessions, and family gatherings.

> "Food is our common ground, a universal experience that brings people together."

## Visit Us

Whether you are stopping by for your morning single-origin espresso, a hearty midday lunch, or an evening gathering with friends, our team is honored to welcome you.`;

export const DEFAULT_SCHEDULE = [
  { day: "Monday", short: "Mon", isOpen: true, open: "08:00", close: "22:00" },
  { day: "Tuesday", short: "Tue", isOpen: true, open: "08:00", close: "22:00" },
  { day: "Wednesday", short: "Wed", isOpen: true, open: "08:00", close: "22:00" },
  { day: "Thursday", short: "Thu", isOpen: true, open: "08:00", close: "22:00" },
  { day: "Friday", short: "Fri", isOpen: true, open: "08:00", close: "23:00" },
  { day: "Saturday", short: "Sat", isOpen: true, open: "09:00", close: "23:00" },
  { day: "Sunday", short: "Sun", isOpen: true, open: "09:00", close: "22:00" }
];

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set before starting the application");
  }
  const client = await pool.connect();
  try {
    await client.query(await fs.readFile(schemaPath, "utf8"));

    // Ensure migration script is executed
    const { runMultiTenantMigration } = await import("./db/migrate.js");
    await runMultiTenantMigration();
  } finally {
    client.release();
  }
}

// ==========================================
// Multi-Tenant Cafes & Manager Queries
// ==========================================

export async function getCafeBySlug(slug) {
  if (!slug) return null;
  const clean = slug.trim().toLowerCase();
  const result = await pool.query(
    `SELECT id, slug, name, is_active, created_at, updated_at 
     FROM cafes 
     WHERE slug = $1 
        OR (slug = 'bambiscafe' AND $1 = 'bambis') 
        OR (slug = 'bambis' AND $1 = 'bambiscafe')
     LIMIT 1`,
    [clean]
  );
  if (result.rowCount === 0) return null;
  const r = result.rows[0];
  return { id: Number(r.id), slug: r.slug, name: r.name, isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function getCafeById(id) {
  if (!id) return null;
  const result = await pool.query(
    "SELECT id, slug, name, is_active, created_at, updated_at FROM cafes WHERE id = $1",
    [Number(id)]
  );
  if (result.rowCount === 0) return null;
  const r = result.rows[0];
  return { id: Number(r.id), slug: r.slug, name: r.name, isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function listCafes() {
  const result = await pool.query(`
    SELECT c.id, c.slug, c.name, c.is_active, c.created_at, c.updated_at,
           COUNT(DISTINCT i.id) as items_count,
           COUNT(DISTINCT r.id) as reviews_count,
           COALESCE(sc.currency, 'ETB') as currency,
           COALESCE(sc.palette_id, 'espresso') as palette_id,
           COALESCE(sc.brand_name, c.name) as brand_name
    FROM cafes c
    LEFT JOIN site_config sc ON sc.cafe_id = c.id
    LEFT JOIN groups g ON g.cafe_id = c.id
    LEFT JOIN items i ON i.group_id = g.id
    LEFT JOIN reviews r ON r.cafe_id = c.id
    GROUP BY c.id, sc.currency, sc.palette_id, sc.brand_name
    ORDER BY c.id ASC
  `);
  return result.rows.map(r => ({
    id: Number(r.id),
    slug: r.slug,
    name: r.name,
    brandName: r.brand_name,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    itemsCount: Number(r.items_count || 0),
    reviewsCount: Number(r.reviews_count || 0),
    currency: r.currency,
    paletteId: r.palette_id
  }));
}

export async function createCafe({
  name,
  slug,
  adminUsername = "admin",
  adminPassword,
  cuisineType = "ARTISAN COFFEE & CONTEMPORARY DINING",
  tagline = "Crafted with passion, served fresh daily.",
  paletteId = "espresso"
}) {
  const cleanSlug = (slug || name || "").toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  if (!cleanSlug) throw new Error("A valid unique subdomain slug is required");
  if (!name || !name.trim()) throw new Error("Cafe name is required");
  if (!adminPassword || adminPassword.length < 6) {
    throw new Error("Initial admin password must be at least 6 characters long");
  }

  // Check uniqueness
  const existing = await getCafeBySlug(cleanSlug);
  if (existing) {
    const err = new Error(`The subdomain '${cleanSlug}' is already taken.`);
    err.status = 409;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cafeRes = await client.query(`
      INSERT INTO cafes (slug, name, is_active)
      VALUES ($1, $2, true)
      RETURNING id, slug, name, is_active, created_at
    `, [cleanSlug, name.trim()]);
    const cafe = cafeRes.rows[0];
    const cafeId = Number(cafe.id);

    // Initial site config
    const defaultAbout = `## Welcome to ${name.trim()}\n\nFounded with a passion for exceptional coffee and culinary craft.\n\n## Our Philosophy\n\nQuality ingredients, warm hospitality, and community.\n\n## Visit Us\n\nWe look forward to welcoming you!`;
    await client.query(`
      INSERT INTO site_config (
        cafe_id, brand_name, tagline, cuisine_type, palette_id, about_markdown, schedule, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      cafeId,
      name.trim(),
      tagline.trim(),
      cuisineType.trim(),
      paletteId || "espresso",
      defaultAbout,
      JSON.stringify(DEFAULT_SCHEDULE)
    ]);

    // Initial admin account
    const { hashPassword } = await import("./auth.js");
    const pHash = await hashPassword(adminPassword);
    await client.query(`
      INSERT INTO admin_users (cafe_id, username, password_hash)
      VALUES ($1, $2, $3)
    `, [cafeId, adminUsername.trim() || "admin", pHash]);

    // Initial starter category
    const groupRes = await client.query(`
      INSERT INTO groups (cafe_id, name_en, name_am, note_en, emoji, sort_order)
      VALUES ($1, 'House Specials', 'የቤቱ ልዩ', 'Chef curated favorites', '☕', 1)
      RETURNING id
    `, [cafeId]);
    const groupId = groupRes.rows[0].id;

    // Initial starter item
    const itemRes = await client.query(`
      INSERT INTO items (cafe_id, group_id, name_en, name_am, description_en, sort_order)
      VALUES ($1, $2, 'House Signature Espresso', 'ኤስፕሬሶ', 'Rich, aromatic single-origin roast.', 1)
      RETURNING id
    `, [cafeId, groupId]);
    const itemId = itemRes.rows[0].id;

    await client.query(`
      INSERT INTO item_prices (item_id, label, amount_cents, sort_order)
      VALUES ($1, 'Single', 15000, 1), ($1, 'Double', 22000, 2)
    `, [itemId]);

    await client.query("COMMIT");
    return {
      id: cafeId,
      slug: cafe.slug,
      name: cafe.name,
      isActive: cafe.is_active,
      createdAt: cafe.created_at
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function toggleCafeActive(cafeId, isActive) {
  const res = await pool.query(
    "UPDATE cafes SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, is_active",
    [Boolean(isActive), Number(cafeId)]
  );
  if (res.rowCount === 0) return null;
  return { id: Number(res.rows[0].id), isActive: res.rows[0].is_active };
}

export async function getTrafficAnalytics({ cafeId = null, days = 7 } = {}) {
  const dayLimit = Math.max(1, Math.min(90, Number(days) || 7));
  
  // Total summary
  let sumQuery = `
    SELECT 
      COUNT(*) as total_requests,
      COUNT(DISTINCT ip_address) as unique_visitors,
      COUNT(*) FILTER (WHERE event_type = 'pageview') as pageviews,
      COUNT(*) FILTER (WHERE event_type = 'admin_action') as admin_actions,
      COUNT(*) FILTER (WHERE event_type = 'review_submit') as reviews_submitted
    FROM traffic_events
    WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
  `;
  const sumParams = [dayLimit];
  if (cafeId) {
    sumQuery += " AND cafe_id = $2";
    sumParams.push(cafeId);
  }
  const summaryRes = await pool.query(sumQuery, sumParams);

  // Daily trend
  let trendQuery = `
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM-DD') as date,
      COUNT(*) as requests,
      COUNT(DISTINCT ip_address) as visitors
    FROM traffic_events
    WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
  `;
  const trendParams = [dayLimit];
  if (cafeId) {
    trendQuery += " AND cafe_id = $2";
    trendParams.push(cafeId);
  }
  trendQuery += " GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY date ASC";
  const trendRes = await pool.query(trendQuery, trendParams);

  // Breakdown by cafe
  const cafeBreakdownRes = await pool.query(`
    SELECT 
      c.id as cafe_id,
      c.slug,
      c.name,
      COUNT(te.id) as requests,
      COUNT(DISTINCT te.ip_address) as visitors
    FROM cafes c
    LEFT JOIN traffic_events te ON te.cafe_id = c.id AND te.created_at >= NOW() - ($1 || ' days')::INTERVAL
    GROUP BY c.id, c.slug, c.name
    ORDER BY requests DESC
  `, [dayLimit]);

  // Top visited paths
  let pathQuery = `
    SELECT path, COUNT(*) as hits
    FROM traffic_events
    WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
  `;
  const pathParams = [dayLimit];
  if (cafeId) {
    pathQuery += " AND cafe_id = $2";
    pathParams.push(cafeId);
  }
  pathQuery += " GROUP BY path ORDER BY hits DESC LIMIT 8";
  const pathRes = await pool.query(pathQuery, pathParams);

  return {
    summary: {
      totalRequests: Number(summaryRes.rows[0]?.total_requests || 0),
      uniqueVisitors: Number(summaryRes.rows[0]?.unique_visitors || 0),
      pageviews: Number(summaryRes.rows[0]?.pageviews || 0),
      adminActions: Number(summaryRes.rows[0]?.admin_actions || 0),
      reviewsSubmitted: Number(summaryRes.rows[0]?.reviews_submitted || 0)
    },
    dailyTrend: trendRes.rows.map(r => ({ date: r.date, requests: Number(r.requests), visitors: Number(r.visitors) })),
    cafeBreakdown: cafeBreakdownRes.rows.map(r => ({
      cafeId: Number(r.cafe_id),
      slug: r.slug,
      name: r.name,
      requests: Number(r.requests),
      visitors: Number(r.visitors)
    })),
    topPaths: pathRes.rows.map(r => ({ path: r.path, hits: Number(r.hits) }))
  };
}

// ==========================================
// Site Config Operations (Tenant Scoped)
// ==========================================

export async function getSiteConfig(cafeId = 1) {
  const cid = Number(cafeId) || 1;
  const result = await pool.query(`
    SELECT id, brand_name, tagline, hours_text, currency, palette_id,
           palette_overrides, font_pair, logo_image_url, banner_url,
           address, phone, cuisine_type, whatsapp_number, email, schedule, about_markdown, timezone, updated_at
    FROM site_config
    WHERE cafe_id = $1
    LIMIT 1
  `, [cid]);

  if (result.rowCount === 0) {
    const cafe = await getCafeById(cid);
    const brandName = cafe ? cafe.name : "Bambis Cafe";
    return {
      brandName,
      tagline: "Artisanal flavors, crafted with passion.",
      hoursText: "Mon - Sun | 8:00 AM - 10:00 PM",
      currency: "ETB",
      paletteId: "espresso",
      paletteOverrides: {},
      fontPair: "Bricolage Grotesque / Figtree",
      logoImageUrl: "",
      bannerUrl: "/design-assets/photo_2026-11-05_12-15-00.jpg",
      address: "Bole Road, Addis Ababa, Ethiopia",
      phone: "+251 99 320 6426",
      cuisineType: "AUTHENTIC ETHIOPIAN & CONTEMPORARY DINING",
      whatsappNumber: "251993206426",
      email: "hello@bambiscafe.com",
      schedule: DEFAULT_SCHEDULE,
      aboutMarkdown: DEFAULT_ABOUT_MARKDOWN,
      timezone: "Africa/Addis_Ababa",
      palette: await resolvePalette("espresso", {})
    };
  }

  const row = result.rows[0];
  const palette = await resolvePalette(row.palette_id, row.palette_overrides || {});
  const schedule = Array.isArray(row.schedule) && row.schedule.length ? row.schedule : DEFAULT_SCHEDULE;
  return {
    brandName: row.brand_name,
    tagline: row.tagline,
    hoursText: row.hours_text,
    currency: row.currency,
    paletteId: row.palette_id,
    paletteOverrides: row.palette_overrides || {},
    fontPair: row.font_pair,
    logoImageUrl: row.logo_image_url,
    bannerUrl: row.banner_url,
    address: row.address || "Bole Road, Addis Ababa, Ethiopia",
    phone: row.phone || "+251 99 320 6426",
    cuisineType: row.cuisine_type || "AUTHENTIC ETHIOPIAN & CONTEMPORARY DINING",
    whatsappNumber: row.whatsapp_number || "251993206426",
    email: row.email || "hello@bambiscafe.com",
    schedule,
    aboutMarkdown: row.about_markdown || DEFAULT_ABOUT_MARKDOWN,
    timezone: row.timezone || "Africa/Addis_Ababa",
    palette,
    updatedAt: row.updated_at
  };
}

export async function updateSiteConfig(data = {}, cafeId = 1) {
  const cid = Number(cafeId) || 1;
  const current = await getSiteConfig(cid);
  const brandName = data.brandName !== undefined ? data.brandName : current.brandName;
  const tagline = data.tagline !== undefined ? data.tagline : current.tagline;
  const hoursText = data.hoursText !== undefined ? data.hoursText : current.hoursText;
  const currency = data.currency !== undefined ? data.currency : current.currency;
  const paletteId = data.paletteId !== undefined ? data.paletteId : current.paletteId;
  const paletteOverrides = data.paletteOverrides !== undefined ? data.paletteOverrides : current.paletteOverrides;
  const fontPair = data.fontPair !== undefined ? data.fontPair : current.fontPair;
  const logoImageUrl = data.logoImageUrl !== undefined ? data.logoImageUrl : current.logoImageUrl;
  const bannerUrl = data.bannerUrl !== undefined ? data.bannerUrl : current.bannerUrl;
  const address = data.address !== undefined ? data.address : current.address;
  const phone = data.phone !== undefined ? data.phone : current.phone;
  const cuisineType = data.cuisineType !== undefined ? data.cuisineType : current.cuisineType;
  const whatsappNumber = data.whatsappNumber !== undefined ? data.whatsappNumber : current.whatsappNumber;
  const email = data.email !== undefined ? data.email : current.email;
  const schedule = data.schedule !== undefined ? data.schedule : current.schedule;
  const aboutMarkdown = data.aboutMarkdown !== undefined ? data.aboutMarkdown : current.aboutMarkdown;
  const timezone = data.timezone !== undefined ? data.timezone : current.timezone;

  await pool.query(`
    INSERT INTO site_config (
      cafe_id, brand_name, tagline, hours_text, currency,
      palette_id, palette_overrides, font_pair, logo_image_url, banner_url,
      address, phone, cuisine_type, whatsapp_number, email, schedule, about_markdown, timezone, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
    ON CONFLICT (cafe_id) DO UPDATE SET
      brand_name = EXCLUDED.brand_name,
      tagline = EXCLUDED.tagline,
      hours_text = EXCLUDED.hours_text,
      currency = EXCLUDED.currency,
      palette_id = EXCLUDED.palette_id,
      palette_overrides = EXCLUDED.palette_overrides,
      font_pair = EXCLUDED.font_pair,
      logo_image_url = EXCLUDED.logo_image_url,
      banner_url = EXCLUDED.banner_url,
      address = EXCLUDED.address,
      phone = EXCLUDED.phone,
      cuisine_type = EXCLUDED.cuisine_type,
      whatsapp_number = EXCLUDED.whatsapp_number,
      email = EXCLUDED.email,
      schedule = EXCLUDED.schedule,
      about_markdown = EXCLUDED.about_markdown,
      timezone = EXCLUDED.timezone,
      updated_at = NOW()
  `, [
    cid, brandName, tagline, hoursText, currency, paletteId,
    JSON.stringify(paletteOverrides), fontPair, logoImageUrl, bannerUrl,
    address, phone, cuisineType, whatsappNumber, email, JSON.stringify(schedule), aboutMarkdown, timezone
  ]);

  return getSiteConfig(cid);
}

// ==========================================
// Menu Operations (Tenant Scoped)
// ==========================================

export async function getPublicMenu(cafeId = 1) {
  const cid = Number(cafeId) || 1;
  const groupsResult = await pool.query(`
    SELECT id, name_en, name_am, note_en, note_am, emoji, sort_order
    FROM groups
    WHERE is_visible = true AND cafe_id = $1
    ORDER BY sort_order, id
  `, [cid]);

  const itemsResult = await pool.query(`
    SELECT i.id, i.group_id, i.name_en, i.name_am, i.description_en, i.description_am,
           i.badge, i.is_available, i.sort_order, i.image_url, i.placeholder_kind, i.allergies,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', ip.id,
                 'label', ip.label,
                 'amountCents', ip.amount_cents,
                 'sortOrder', ip.sort_order
               ) ORDER BY ip.sort_order, ip.id
             ) FILTER (WHERE ip.id IS NOT NULL),
             '[]'::json
           ) AS prices
    FROM items i
    JOIN groups g ON g.id = i.group_id
    LEFT JOIN item_prices ip ON ip.item_id = i.id
    WHERE i.is_visible = true AND g.cafe_id = $1
    GROUP BY i.id
    ORDER BY i.sort_order, i.id
  `, [cid]);

  const itemsByGroup = new Map();
  for (const row of itemsResult.rows) {
    const list = itemsByGroup.get(row.group_id) || [];
    list.push({
      id: row.id,
      name: { en: row.name_en, am: row.name_am || row.name_en },
      description: { en: row.description_en, am: row.description_am || row.description_en },
      badge: row.badge,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      placeholderKind: row.placeholder_kind,
      allergies: row.allergies || [],
      prices: row.prices
    });
    itemsByGroup.set(row.group_id, list);
  }

  return groupsResult.rows.map((g) => ({
    id: g.id,
    name: { en: g.name_en, am: g.name_am || g.name_en },
    note: { en: g.note_en, am: g.note_am || g.note_en },
    emoji: g.emoji,
    items: itemsByGroup.get(g.id) || []
  }));
}

export async function getAdminMenu(cafeId = 1) {
  const cid = Number(cafeId) || 1;
  const groupsResult = await pool.query(`
    SELECT id, name_en, name_am, note_en, note_am, emoji, sort_order, is_visible
    FROM groups
    WHERE cafe_id = $1
    ORDER BY sort_order, id
  `, [cid]);

  const itemsResult = await pool.query(`
    SELECT i.id, i.group_id, i.name_en, i.name_am, i.description_en, i.description_am,
           i.badge, i.is_available, i.is_visible, i.sort_order, i.image_url, i.placeholder_kind, i.allergies,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', ip.id,
                 'label', ip.label,
                 'amountCents', ip.amount_cents,
                 'sortOrder', ip.sort_order
               ) ORDER BY ip.sort_order, ip.id
             ) FILTER (WHERE ip.id IS NOT NULL),
             '[]'::json
           ) AS prices
    FROM items i
    JOIN groups g ON g.id = i.group_id
    LEFT JOIN item_prices ip ON ip.item_id = i.id
    WHERE g.cafe_id = $1
    GROUP BY i.id
    ORDER BY i.sort_order, i.id
  `, [cid]);

  const itemsByGroup = new Map();
  for (const row of itemsResult.rows) {
    const list = itemsByGroup.get(row.group_id) || [];
    list.push({
      id: row.id,
      groupId: row.group_id,
      nameEn: row.name_en,
      nameAm: row.name_am,
      descriptionEn: row.description_en,
      descriptionAm: row.description_am,
      badge: row.badge,
      isAvailable: row.is_available,
      isVisible: row.is_visible,
      imageUrl: row.image_url,
      placeholderKind: row.placeholder_kind,
      allergies: row.allergies || [],
      prices: row.prices
    });
    itemsByGroup.set(row.group_id, list);
  }

  return groupsResult.rows.map((g) => ({
    id: g.id,
    nameEn: g.name_en,
    nameAm: g.name_am,
    noteEn: g.note_en,
    noteAm: g.note_am,
    emoji: g.emoji,
    isVisible: g.is_visible,
    sortOrder: g.sort_order,
    items: itemsByGroup.get(g.id) || []
  }));
}

export async function createGroup({ cafeId = 1, nameEn, nameAm = "", noteEn = "", noteAm = "", emoji = "🍽", isVisible = true }) {
  const cid = Number(cafeId) || 1;
  const posRes = await pool.query("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_pos FROM groups WHERE cafe_id = $1", [cid]);
  const nextPos = posRes.rows[0].next_pos;
  const result = await pool.query(`
    INSERT INTO groups (cafe_id, name_en, name_am, note_en, note_am, emoji, sort_order, is_visible)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, name_en, name_am, note_en, note_am, emoji, sort_order, is_visible
  `, [cid, nameEn, nameAm || nameEn, noteEn, noteAm, emoji, nextPos, isVisible]);
  return result.rows[0];
}

export async function updateGroup(id, fields = {}) {
  const currentRes = await pool.query("SELECT * FROM groups WHERE id = $1", [id]);
  if (currentRes.rowCount === 0) return null;
  const cur = currentRes.rows[0];

  const nameEn = fields.nameEn !== undefined ? fields.nameEn : cur.name_en;
  const nameAm = fields.nameAm !== undefined ? fields.nameAm : cur.name_am;
  const noteEn = fields.noteEn !== undefined ? fields.noteEn : cur.note_en;
  const noteAm = fields.noteAm !== undefined ? fields.noteAm : cur.note_am;
  const emoji = fields.emoji !== undefined ? fields.emoji : cur.emoji;
  const isVisible = fields.isVisible !== undefined ? fields.isVisible : cur.is_visible;

  const result = await pool.query(`
    UPDATE groups
    SET name_en = $1, name_am = $2, note_en = $3, note_am = $4,
        emoji = $5, is_visible = $6, updated_at = NOW()
    WHERE id = $7
    RETURNING id, name_en, name_am, note_en, note_am, emoji, sort_order, is_visible
  `, [nameEn, nameAm, noteEn, noteAm, emoji, isVisible, id]);
  return result.rows[0];
}

export async function deleteGroup(id) {
  const itemsCheck = await pool.query("SELECT id FROM items WHERE group_id = $1 LIMIT 1", [id]);
  if (itemsCheck.rowCount > 0) {
    const error = new Error("Group contains items. Move or delete them first.");
    error.status = 409;
    throw error;
  }
  const result = await pool.query("DELETE FROM groups WHERE id = $1 RETURNING id", [id]);
  return result.rowCount > 0;
}

export async function reorderGroups(ids = []) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < ids.length; i++) {
      await client.query("UPDATE groups SET sort_order = $1 WHERE id = $2", [i, ids[i]]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function createItem({
  cafeId = null,
  groupId,
  nameEn,
  nameAm = "",
  descriptionEn = "",
  descriptionAm = "",
  badge = "",
  isAvailable = true,
  isVisible = true,
  imageUrl = null,
  placeholderKind = "plate",
  allergies = [],
  prices = [{ label: "Regular", amountCents: 0 }]
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch cafe_id from group if not explicitly provided
    let cid = cafeId;
    if (!cid) {
      const gRes = await client.query("SELECT cafe_id FROM groups WHERE id = $1", [groupId]);
      cid = gRes.rows[0]?.cafe_id || 1;
    }

    const posRes = await client.query("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_pos FROM items WHERE group_id = $1", [groupId]);
    const nextPos = posRes.rows[0].next_pos;

    const itemRes = await client.query(`
      INSERT INTO items (cafe_id, group_id, name_en, name_am, description_en, description_am, badge,
                         is_available, is_visible, sort_order, image_url, placeholder_kind, allergies)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      cid, groupId, nameEn, nameAm || nameEn, descriptionEn, descriptionAm,
      badge, isAvailable, isVisible, nextPos, imageUrl, placeholderKind, allergies
    ]);
    const itemId = itemRes.rows[0].id;

    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      await client.query(`
        INSERT INTO item_prices (item_id, label, amount_cents, sort_order)
        VALUES ($1, $2, $3, $4)
      `, [itemId, p.label || "Regular", Number(p.amountCents || 0), i]);
    }

    await client.query("COMMIT");
    return itemId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateItem(id, fields = {}) {
  const curRes = await pool.query("SELECT * FROM items WHERE id = $1", [id]);
  if (curRes.rowCount === 0) return null;
  const cur = curRes.rows[0];

  const groupId = fields.groupId !== undefined ? fields.groupId : cur.group_id;
  const nameEn = fields.nameEn !== undefined ? fields.nameEn : cur.name_en;
  const nameAm = fields.nameAm !== undefined ? fields.nameAm : cur.name_am;
  const descEn = fields.descriptionEn !== undefined ? fields.descriptionEn : cur.description_en;
  const descAm = fields.descriptionAm !== undefined ? fields.descriptionAm : cur.description_am;
  const badge = fields.badge !== undefined ? fields.badge : cur.badge;
  const isAvailable = fields.isAvailable !== undefined ? fields.isAvailable : cur.is_available;
  const isVisible = fields.isVisible !== undefined ? fields.isVisible : cur.is_visible;
  const imageUrl = fields.imageUrl !== undefined ? fields.imageUrl : cur.image_url;
  const placeholderKind = fields.placeholderKind !== undefined ? fields.placeholderKind : cur.placeholder_kind;
  const allergies = fields.allergies !== undefined ? fields.allergies : cur.allergies;

  await pool.query(`
    UPDATE items
    SET group_id = $1, name_en = $2, name_am = $3, description_en = $4, description_am = $5,
        badge = $6, is_available = $7, is_visible = $8, image_url = $9,
        placeholder_kind = $10, allergies = $11, updated_at = NOW()
    WHERE id = $12
  `, [groupId, nameEn, nameAm, descEn, descAm, badge, isAvailable, isVisible, imageUrl, placeholderKind, allergies, id]);

  return { id };
}

export async function deleteItem(id) {
  const result = await pool.query("DELETE FROM items WHERE id = $1 RETURNING id", [id]);
  return result.rowCount > 0;
}

export async function reorderItems(groupId, ids = []) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < ids.length; i++) {
      await client.query("UPDATE items SET sort_order = $1 WHERE id = $2 AND group_id = $3", [i, ids[i], groupId]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateItemPrices(itemId, prices = []) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM item_prices WHERE item_id = $1", [itemId]);
    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      await client.query(`
        INSERT INTO item_prices (item_id, label, amount_cents, sort_order)
        VALUES ($1, $2, $3, $4)
      `, [itemId, p.label || "Regular", Number(p.amountCents || 0), i]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function duplicateItem(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const itemRes = await client.query("SELECT * FROM items WHERE id = $1", [id]);
    if (itemRes.rowCount === 0) return null;
    const item = itemRes.rows[0];

    const pricesRes = await client.query("SELECT * FROM item_prices WHERE item_id = $1 ORDER BY sort_order", [id]);

    const posRes = await client.query("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_pos FROM items WHERE group_id = $1", [item.group_id]);
    const nextPos = posRes.rows[0].next_pos;

    const newItemRes = await client.query(`
      INSERT INTO items (cafe_id, group_id, name_en, name_am, description_en, description_am, badge,
                         is_available, is_visible, sort_order, image_url, placeholder_kind, allergies)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      item.cafe_id, item.group_id, `${item.name_en} (Copy)`, item.name_am ? `${item.name_am} (ቅጂ)` : "",
      item.description_en, item.description_am, item.badge, item.is_available,
      item.is_visible, nextPos, item.image_url, item.placeholder_kind, item.allergies
    ]);
    const newItemId = newItemRes.rows[0].id;

    for (const p of pricesRes.rows) {
      await client.query(`
        INSERT INTO item_prices (item_id, label, amount_cents, sort_order)
        VALUES ($1, $2, $3, $4)
      `, [newItemId, p.label, p.amount_cents, p.sort_order]);
    }

    await client.query("COMMIT");
    return newItemId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ==========================================
// Reviews Operations (Tenant Scoped)
// ==========================================

export async function getPublicReviews(cafeId = 1) {
  const cid = Number(cafeId) || 1;
  const result = await pool.query(`
    SELECT id, author_name, rating, service_rating, food_rating, review_type, comment, created_at
    FROM reviews
    WHERE is_visible = true AND cafe_id = $1
    ORDER BY created_at DESC
    LIMIT 100
  `, [cid]);
  return result.rows.map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    serviceRating: r.service_rating,
    foodRating: r.food_rating,
    reviewType: r.review_type || "both",
    comment: r.comment,
    createdAt: r.created_at
  }));
}

export async function getAdminReviews(cafeId = 1) {
  const cid = Number(cafeId) || 1;
  const result = await pool.query(`
    SELECT id, author_name, rating, service_rating, food_rating, review_type, comment, is_visible, created_at
    FROM reviews
    WHERE cafe_id = $1
    ORDER BY created_at DESC
  `, [cid]);
  return result.rows.map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    serviceRating: r.service_rating,
    foodRating: r.food_rating,
    reviewType: r.review_type || "both",
    comment: r.comment,
    isVisible: r.is_visible,
    createdAt: r.created_at
  }));
}

export async function createReview({ cafeId = 1, authorName, rating, serviceRating, foodRating, reviewType, comment }) {
  const cid = Number(cafeId) || 1;
  const cleanAuthor = String(authorName || "").trim().slice(0, 100);
  const cleanRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  const cleanServiceRating = serviceRating ? Math.max(1, Math.min(5, Math.round(Number(serviceRating)))) : null;
  const cleanFoodRating = foodRating ? Math.max(1, Math.min(5, Math.round(Number(foodRating)))) : null;
  const cleanType = ["food", "service", "both"].includes(reviewType) ? reviewType : "both";
  const cleanComment = String(comment || "").trim().slice(0, 1000);
  if (!cleanAuthor || !cleanComment) {
    const error = new Error("Name and review comment are required");
    error.status = 400;
    throw error;
  }
  const result = await pool.query(`
    INSERT INTO reviews (cafe_id, author_name, rating, service_rating, food_rating, review_type, comment, is_visible)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    RETURNING id, author_name, rating, service_rating, food_rating, review_type, comment, is_visible, created_at
  `, [cid, cleanAuthor, cleanRating, cleanServiceRating, cleanFoodRating, cleanType, cleanComment]);
  const r = result.rows[0];
  return {
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    serviceRating: r.service_rating,
    foodRating: r.food_rating,
    reviewType: r.review_type,
    comment: r.comment,
    isVisible: r.is_visible,
    createdAt: r.created_at
  };
}

export async function updateReviewVisibility(id, isVisible) {
  const result = await pool.query(`
    UPDATE reviews
    SET is_visible = $1
    WHERE id = $2
    RETURNING id, author_name, rating, comment, is_visible, created_at
  `, [Boolean(isVisible), Number(id)]);
  if (result.rowCount === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    isVisible: r.is_visible,
    createdAt: r.created_at
  };
}

export async function deleteReview(id) {
  await pool.query("DELETE FROM reviews WHERE id = $1", [Number(id)]);
}
