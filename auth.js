import "./env.js";
import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from "node:crypto";
import { pool } from "./db.js";

const scrypt = promisify(scryptCallback);
const sessionDurationMs = 8 * 60 * 60 * 1000;

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const [, saltHex, hashHex] = storedHash.split("$");
  if (!saltHex || !hashHex) return false;
  const derivedKey = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), 64));
  const expected = Buffer.from(hashHex, "hex");
  return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected);
}

// ==========================================
// Cafe Admin Authentication
// ==========================================

export async function initializeAdminUser() {
  const result = await pool.query("SELECT id FROM admin_users LIMIT 1");
  if (result.rowCount > 0) return;
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin_secret_pass";
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long");
  }
  await pool.query(
    "INSERT INTO admin_users (cafe_id, username, password_hash) VALUES ($1, $2, $3)",
    [1, username, await hashPassword(password)],
  );
  console.log(`Created initial admin account for ${username} (cafe_id: 1)`);
}

export async function createCafeAdmin(cafeId, username, password) {
  if (!username || !password) {
    throw new Error("Admin username and password are required");
  }
  const passwordHash = await hashPassword(password);
  const result = await pool.query(`
    INSERT INTO admin_users (cafe_id, username, password_hash)
    VALUES ($1, $2, $3)
    ON CONFLICT (cafe_id, username) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
    RETURNING id
  `, [cafeId, username.trim(), passwordHash]);
  return result.rows[0].id;
}

export async function resetCafeAdminPassword(cafeId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    const err = new Error("New password must be at least 6 characters long");
    err.status = 400;
    throw err;
  }
  const passwordHash = await hashPassword(newPassword);
  const result = await pool.query(`
    UPDATE admin_users
    SET password_hash = $1, updated_at = NOW()
    WHERE cafe_id = $2
    RETURNING id, username
  `, [passwordHash, cafeId]);
  return result.rows[0] || null;
}

export async function authenticateAdmin(cafeId, username, password) {
  // Support either (username, password) legacy or (cafeId, username, password)
  let cid = cafeId;
  let uName = username;
  let pWord = password;

  if (pWord === undefined && typeof cid === "string" && typeof uName === "string") {
    // Called as authenticateAdmin(username, password)
    pWord = uName;
    uName = cid;
    cid = 1;
  }

  const result = await pool.query(
    "SELECT id, password_hash FROM admin_users WHERE cafe_id = $1 AND username = $2",
    [cid, uName]
  );
  if (result.rowCount === 0 || !(await verifyPassword(pWord, result.rows[0].password_hash))) return null;
  return result.rows[0].id;
}

export async function changeAdminPassword(adminUserId, oldPassword, newPassword) {
  if (!oldPassword || !newPassword) {
    const err = new Error("Both old and new passwords are required");
    err.status = 400;
    throw err;
  }
  if (newPassword.length < 8) {
    const err = new Error("New password must be at least 8 characters long");
    err.status = 400;
    throw err;
  }
  const result = await pool.query("SELECT id, password_hash FROM admin_users WHERE id = $1", [adminUserId]);
  if (result.rowCount === 0) {
    const err = new Error("Admin user not found");
    err.status = 404;
    throw err;
  }
  const isMatch = await verifyPassword(oldPassword, result.rows[0].password_hash);
  if (!isMatch) {
    const err = new Error("Current password is incorrect");
    err.status = 400;
    throw err;
  }
  const newHash = await hashPassword(newPassword);
  await pool.query("UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, adminUserId]);
  return { ok: true };
}

export async function createSession(adminUserId) {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    "INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [adminUserId, hashToken(token), new Date(Date.now() + sessionDurationMs)],
  );
  return token;
}

export async function getSession(token, cafeId = null) {
  if (!token) return null;
  let query = `
    SELECT s.admin_user_id, u.username, u.cafe_id
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.admin_user_id
    WHERE s.token_hash = $1 AND s.expires_at > NOW()
  `;
  const params = [hashToken(token)];
  if (cafeId) {
    query += " AND u.cafe_id = $2";
    params.push(cafeId);
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

export async function deleteSession(token) {
  if (token) await pool.query("DELETE FROM admin_sessions WHERE token_hash = $1", [hashToken(token)]);
}

export function sessionCookie(token, secure = false) {
  return `admin_session=${encodeURIComponent(token)}; Max-Age=${sessionDurationMs / 1000}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function expiredSessionCookie(secure = false) {
  return `admin_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function readSessionCookie(request) {
  const cookies = request.get("cookie")?.split(";").map((part) => part.trim()) || [];
  const session = cookies.find((cookie) => cookie.startsWith("admin_session="));
  return session ? decodeURIComponent(session.slice("admin_session=".length)) : "";
}

// ==========================================
// Manager (Superadmin) Authentication
// ==========================================

export async function authenticateManager(username, password) {
  if (!username || !password) return null;
  const result = await pool.query(
    "SELECT id, password_hash FROM manager_users WHERE username = $1",
    [username.trim()]
  );
  if (result.rowCount === 0) return null;
  const valid = await verifyPassword(password, result.rows[0].password_hash);
  return valid ? result.rows[0].id : null;
}

export async function createManagerSession(managerUserId) {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    "INSERT INTO manager_sessions (manager_user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [managerUserId, hashToken(token), new Date(Date.now() + sessionDurationMs)],
  );
  return token;
}

export async function getManagerSession(token) {
  if (!token) return null;
  const result = await pool.query(`
    SELECT s.manager_user_id, m.username
    FROM manager_sessions s
    JOIN manager_users m ON m.id = s.manager_user_id
    WHERE s.token_hash = $1 AND s.expires_at > NOW()
  `, [hashToken(token)]);
  return result.rows[0] || null;
}

export async function deleteManagerSession(token) {
  if (token) await pool.query("DELETE FROM manager_sessions WHERE token_hash = $1", [hashToken(token)]);
}

export function managerSessionCookie(token, secure = false) {
  return `manager_session=${encodeURIComponent(token)}; Max-Age=${sessionDurationMs / 1000}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function expiredManagerSessionCookie(secure = false) {
  return `manager_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function readManagerSessionCookie(request) {
  const cookies = request.get("cookie")?.split(";").map((part) => part.trim()) || [];
  const session = cookies.find((cookie) => cookie.startsWith("manager_session="));
  return session ? decodeURIComponent(session.slice("manager_session=".length)) : "";
}

export async function getManagerProfile(managerUserId) {
  if (!managerUserId) return null;
  const result = await pool.query(
    "SELECT id, username, email, created_at, updated_at FROM manager_users WHERE id = $1",
    [Number(managerUserId)]
  );
  if (result.rowCount === 0) return null;
  const r = result.rows[0];
  return {
    id: Number(r.id),
    username: r.username,
    email: r.email || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export async function updateManagerEmail(managerUserId, newEmail, currentPassword) {
  if (!managerUserId) throw new Error("Manager user ID is required");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = (newEmail || "").trim().toLowerCase();
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error("Please provide a valid email address (e.g. manager@example.com)");
    err.status = 400;
    throw err;
  }
  if (!currentPassword) {
    const err = new Error("Current password is required to authorize updating the recovery email");
    err.status = 403;
    throw err;
  }

  const userRes = await pool.query("SELECT password_hash FROM manager_users WHERE id = $1", [managerUserId]);
  if (userRes.rowCount === 0) throw new Error("Manager user not found");

  const valid = await verifyPassword(currentPassword, userRes.rows[0].password_hash);
  if (!valid) {
    const err = new Error("Current password is incorrect. Email update authorization failed.");
    err.status = 403;
    throw err;
  }

  const updateRes = await pool.query(
    "UPDATE manager_users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email",
    [cleanEmail, managerUserId]
  );
  return updateRes.rows[0];
}

export async function changeManagerPassword(managerUserId, currentPassword, newPassword) {
  if (!managerUserId) throw new Error("Manager user ID is required");
  if (!currentPassword || !newPassword) {
    const err = new Error("Both current and new passwords are required");
    err.status = 400;
    throw err;
  }
  if (newPassword.length < 8) {
    const err = new Error("New password must be at least 8 characters long");
    err.status = 400;
    throw err;
  }

  const userRes = await pool.query("SELECT password_hash FROM manager_users WHERE id = $1", [managerUserId]);
  if (userRes.rowCount === 0) throw new Error("Manager user not found");

  const valid = await verifyPassword(currentPassword, userRes.rows[0].password_hash);
  if (!valid) {
    const err = new Error("Current password is incorrect");
    err.status = 403;
    throw err;
  }

  const newHash = await hashPassword(newPassword);
  await pool.query(
    "UPDATE manager_users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [newHash, managerUserId]
  );
  return { ok: true };
}

export async function createManagerPasswordReset(email, hostUrl = "") {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) {
    const err = new Error("Email address is required");
    err.status = 400;
    throw err;
  }

  const userRes = await pool.query(
    "SELECT id, username, email FROM manager_users WHERE LOWER(email) = $1",
    [cleanEmail]
  );
  if (userRes.rowCount === 0) {
    const err = new Error("No manager account found associated with this email address");
    err.status = 404;
    throw err;
  }

  const user = userRes.rows[0];
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  // Reset token expires in 10 minutes (between 5 and 10 minutes)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate any unexpired existing resets for this manager
  await pool.query(
    "DELETE FROM manager_password_resets WHERE manager_user_id = $1 AND used_at IS NULL",
    [user.id]
  );

  await pool.query(
    "INSERT INTO manager_password_resets (manager_user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.id, tokenHash, expiresAt]
  );

  const cleanHost = hostUrl ? hostUrl.replace(/\/+$/, "") : "";
  const resetLink = `${cleanHost}/manager/reset-password?token=${token}`;

  return {
    ok: true,
    email: user.email,
    token,
    resetLink,
    expiresAt
  };
}

export async function verifyManagerResetToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing password reset token." };
  }
  const tokenHash = hashToken(token.trim());
  const res = await pool.query(`
    SELECT r.id, r.manager_user_id, r.expires_at, r.used_at, m.username, m.email
    FROM manager_password_resets r
    JOIN manager_users m ON m.id = r.manager_user_id
    WHERE r.token_hash = $1
  `, [tokenHash]);

  if (res.rowCount === 0) {
    return { valid: false, error: "Invalid password reset link or token." };
  }
  const row = res.rows[0];
  if (row.used_at) {
    return { valid: false, error: "This password reset link has already been used." };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, error: "This password reset link has expired. Reset links are valid for 10 minutes." };
  }

  return {
    valid: true,
    managerUserId: row.manager_user_id,
    username: row.username,
    email: row.email,
    expiresAt: row.expires_at
  };
}

export async function resetManagerPasswordWithToken(token, newPassword) {
  const check = await verifyManagerResetToken(token);
  if (!check.valid) {
    const err = new Error(check.error);
    err.status = 400;
    throw err;
  }

  if (!newPassword || newPassword.length < 8) {
    const err = new Error("New password must be at least 8 characters long");
    err.status = 400;
    throw err;
  }

  const newHash = await hashPassword(newPassword);
  const tokenHash = hashToken(token.trim());

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE manager_users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newHash, check.managerUserId]
    );
    await client.query(
      "UPDATE manager_password_resets SET used_at = NOW() WHERE token_hash = $1",
      [tokenHash]
    );
    // Invalidate all active manager sessions upon password reset
    await client.query(
      "DELETE FROM manager_sessions WHERE manager_user_id = $1",
      [check.managerUserId]
    );
    await client.query("COMMIT");
    return { ok: true, username: check.username, email: check.email };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
