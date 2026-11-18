CREATE TABLE IF NOT EXISTS cafes (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cafes_slug_idx ON cafes(slug);

CREATE TABLE IF NOT EXISTS manager_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE SEQUENCE IF NOT EXISTS site_config_id_seq;

CREATE TABLE IF NOT EXISTS site_config (
  id BIGINT PRIMARY KEY DEFAULT nextval('site_config_id_seq'),
  cafe_id BIGINT NOT NULL UNIQUE REFERENCES cafes(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL DEFAULT 'Bambis Cafe',
  tagline TEXT NOT NULL DEFAULT 'Good food & coffee, made fresh daily.',
  hours_text TEXT NOT NULL DEFAULT 'Monday - Sunday | 8:00 AM - 10:00 PM',
  currency TEXT NOT NULL DEFAULT 'ETB',
  palette_id TEXT NOT NULL DEFAULT 'espresso',
  palette_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  font_pair TEXT NOT NULL DEFAULT 'Bricolage Grotesque / Figtree',
  logo_image_url TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '/design-assets/photo_2026-11-05_12-15-00.jpg',
  address TEXT NOT NULL DEFAULT 'Bole Road, Addis Ababa, Ethiopia',
  phone TEXT NOT NULL DEFAULT '+251 99 320 6426',
  cuisine_type TEXT NOT NULL DEFAULT 'AUTHENTIC ETHIOPIAN & CONTEMPORARY DINING',
  whatsapp_number TEXT NOT NULL DEFAULT '251993206426',
  email TEXT NOT NULL DEFAULT 'hello@bambiscafe.com',
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  about_markdown TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  cafe_id BIGINT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_am TEXT NOT NULL DEFAULT '',
  note_en TEXT NOT NULL DEFAULT '',
  note_am TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🍽',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS groups_cafe_id_idx ON groups(cafe_id);

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  cafe_id BIGINT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  name_en TEXT NOT NULL,
  name_am TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_am TEXT NOT NULL DEFAULT '',
  badge TEXT NOT NULL DEFAULT '',
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  placeholder_kind TEXT DEFAULT 'plate',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS items_cafe_id_idx ON items(cafe_id);
CREATE INDEX IF NOT EXISTS items_group_id_idx ON items(group_id);

CREATE TABLE IF NOT EXISTS item_prices (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Regular',
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS item_prices_item_id_idx ON item_prices(item_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  cafe_id BIGINT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_cafe_username_idx ON admin_users(cafe_id, username);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_sessions_token_hash_idx ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  cafe_id BIGINT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  service_rating INTEGER CHECK (service_rating IS NULL OR (service_rating >= 1 AND service_rating <= 5)),
  food_rating INTEGER CHECK (food_rating IS NULL OR (food_rating >= 1 AND food_rating <= 5)),
  review_type TEXT NOT NULL DEFAULT 'both',
  comment TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_cafe_id_idx ON reviews(cafe_id);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at DESC);
