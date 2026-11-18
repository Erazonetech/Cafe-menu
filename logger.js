import fs from "node:fs";
import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const logDir = join(root, "logs");
const logFilePath = join(logDir, "cafe-activity.log");

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Write stream for high throughput append-only file logging
let logStream = fs.createWriteStream(logFilePath, { flags: "a", encoding: "utf8" });

logStream.on("error", (err) => {
  console.error("[Logger] File stream error:", err);
});

/**
 * Record a cafe activity event both to the log file and to traffic_events table
 */
export async function recordActivity({
  cafeId = null,
  cafeSlug = "platform",
  eventType = "action", // 'pageview', 'admin_action', 'review_submit', 'order', 'auth'
  action = "",
  path = "/",
  method = "GET",
  status = 200,
  ip = "127.0.0.1",
  userAgent = "",
  responseTimeMs = 0,
  metadata = {}
}) {
  const timestamp = new Date().toISOString();
  const summaryMsg = action || `${method} ${path} -> ${status}`;
  const logLine = `[${timestamp}] [CAFE:${cafeSlug || "all"}] [${eventType.toUpperCase()}] ${summaryMsg} | IP: ${ip} | Duration: ${responseTimeMs}ms\n`;

  // 1. Write to logs/cafe-activity.log
  try {
    if (logStream && !logStream.destroyed) {
      logStream.write(logLine);
    } else {
      await fsp.appendFile(logFilePath, logLine, "utf8");
    }
  } catch (err) {
    console.error("[Logger] Failed writing to cafe-activity.log:", err);
  }

  // 2. Persist to traffic_events table for analytics dashboard
  if (cafeId) {
    try {
      await pool.query(`
        INSERT INTO traffic_events (cafe_id, event_type, path, method, status_code, ip_address, user_agent, response_time_ms, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        cafeId,
        eventType,
        path,
        method,
        status,
        ip,
        userAgent.slice(0, 255),
        responseTimeMs,
        JSON.stringify(metadata)
      ]);
    } catch (dbErr) {
      // Don't crash request if traffic tracking has a transient DB error
      console.warn("[Logger] Warning: failed to save traffic_event to db:", dbErr.message);
    }
  }
}

/**
 * Read the most recent lines from logs/cafe-activity.log
 */
export async function readRecentFileLogs(limit = 100) {
  try {
    if (!fs.existsSync(logFilePath)) return [];
    const content = await fsp.readFile(logFilePath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).reverse();
  } catch (err) {
    console.error("[Logger] Failed reading log file:", err);
    return [];
  }
}
