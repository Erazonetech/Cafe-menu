import "../env.js";
import { pool } from "../db.js";
import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";

const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${Buffer.from(derivedKey).toString("hex")}`;
}

export async function runMultiTenantMigration() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create cafes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cafes (
        id BIGSERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS cafes_slug_idx ON cafes(slug);
    `);

    // 2. Create manager_users, manager_sessions & manager_password_resets tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS manager_users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE manager_users ADD COLUMN IF NOT EXISTS email TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS manager_users_email_idx ON manager_users(email) WHERE email IS NOT NULL;

      CREATE TABLE IF NOT EXISTS manager_sessions (
        id BIGSERIAL PRIMARY KEY,
        manager_user_id BIGINT NOT NULL REFERENCES manager_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS manager_sessions_token_hash_idx ON manager_sessions(token_hash);
      CREATE INDEX IF NOT EXISTS manager_sessions_expires_at_idx ON manager_sessions(expires_at);

      CREATE TABLE IF NOT EXISTS manager_password_resets (
        id BIGSERIAL PRIMARY KEY,
        manager_user_id BIGINT NOT NULL REFERENCES manager_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS manager_password_resets_token_hash_idx ON manager_password_resets(token_hash);
      CREATE INDEX IF NOT EXISTS manager_password_resets_expires_at_idx ON manager_password_resets(expires_at);
    `);

    // 3. Create traffic_events table for analytics dashboard
    await client.query(`
      CREATE TABLE IF NOT EXISTS traffic_events (
        id BIGSERIAL PRIMARY KEY,
        cafe_id BIGINT REFERENCES cafes(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL DEFAULT 'pageview',
        path TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        status_code INTEGER NOT NULL DEFAULT 200,
        ip_address TEXT,
        user_agent TEXT,
        response_time_ms INTEGER DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS traffic_events_cafe_id_idx ON traffic_events(cafe_id);
      CREATE INDEX IF NOT EXISTS traffic_events_created_at_idx ON traffic_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS traffic_events_event_type_idx ON traffic_events(event_type);
    `);

    // 4. Ensure default cafe 'bambiscafe' exists (id: 1)
    const defaultCafeRes = await client.query(`
      INSERT INTO cafes (id, slug, name, is_active)
      VALUES (1, 'bambiscafe', 'Bambis Cafe', true)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const defaultCafeId = defaultCafeRes.rows[0].id;

    // Reset sequence if needed
    await client.query(`
      SELECT setval(pg_get_serial_sequence('cafes', 'id'), COALESCE(MAX(id), 1)) FROM cafes;
    `);

    // 5. Add cafe_id column to existing tables and backfill
    // First, fix site_config.id so it uses a sequence instead of DEFAULT 1
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS site_config_id_seq;
      ALTER TABLE site_config ALTER COLUMN id SET DEFAULT nextval('site_config_id_seq');
      SELECT setval('site_config_id_seq', COALESCE((SELECT MAX(id) FROM site_config), 1));
    `);

    const tablesToScope = [
      { name: "site_config", alterUnique: true },
      { name: "groups", alterUnique: false },
      { name: "items", alterUnique: false },
      { name: "admin_users", alterUnique: false },
      { name: "reviews", alterUnique: false }
    ];

    for (const { name } of tablesToScope) {
      // Check if cafe_id column exists
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'cafe_id'
      `, [name]);

      if (colCheck.rowCount === 0) {
        await client.query(`ALTER TABLE ${name} ADD COLUMN cafe_id BIGINT`);
        await client.query(`UPDATE ${name} SET cafe_id = $1 WHERE cafe_id IS NULL`, [defaultCafeId]);
        await client.query(`ALTER TABLE ${name} ALTER COLUMN cafe_id SET NOT NULL`);
        await client.query(`ALTER TABLE ${name} ADD CONSTRAINT fk_${name}_cafe FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE`);
      }
    }

    // 6. Ensure unique constraints per tenant
    // admin_users: username should be unique PER CAFE
    const constraintCheck = await client.query(`
      SELECT conname FROM pg_constraint WHERE conname = 'admin_users_username_key'
    `);
    if (constraintCheck.rowCount > 0) {
      await client.query(`ALTER TABLE admin_users DROP CONSTRAINT admin_users_username_key`);
    }
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS admin_users_cafe_username_idx ON admin_users(cafe_id, username);
    `);

    // site_config: each cafe has 1 site_config row
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS site_config_cafe_id_idx ON site_config(cafe_id);
    `);

    // 7. Seed default manager user if empty, or ensure email is set
    const defaultMgrEmail = process.env.MANAGER_EMAIL || "manager@bambiscafe.com";
    const mgrCount = await client.query("SELECT id, email FROM manager_users LIMIT 1");
    if (mgrCount.rowCount === 0) {
      const defaultMgrUser = process.env.MANAGER_USERNAME || "manager";
      const defaultMgrPass = process.env.MANAGER_PASSWORD || process.env.ADMIN_PASSWORD || "manager_secret_2026";
      const passHash = await hashPassword(defaultMgrPass);
      await client.query(`
        INSERT INTO manager_users (username, email, password_hash)
        VALUES ($1, $2, $3)
      `, [defaultMgrUser, defaultMgrEmail, passHash]);
      console.log(`[Migration] Created initial manager account: ${defaultMgrUser} (${defaultMgrEmail})`);
    } else if (!mgrCount.rows[0].email) {
      await client.query(`
        UPDATE manager_users SET email = $1 WHERE id = $2
      `, [defaultMgrEmail, mgrCount.rows[0].id]);
      console.log(`[Migration] Backfilled manager recovery email: ${defaultMgrEmail}`);
    }

    // 8. Update primary cafe slug to bambiscafe
    await client.query(`
      UPDATE cafes SET slug = 'bambiscafe' WHERE id = 1 AND (slug = 'bambis' OR slug = 'bambiscafe')
    `);

    await client.query("COMMIT");
    console.log("[Migration] Multi-tenant migration successfully applied.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Migration] Error applying multi-tenant migration:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith("migrate.js")) {
  runMultiTenantMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
