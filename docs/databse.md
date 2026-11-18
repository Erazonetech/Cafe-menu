# Database architecture and schema

> The filename follows the requested `databse.md` name. PostgreSQL is the runtime database. `data/menu.json` is retained only as a first-run seed fixture.

## Current database architecture

The application uses PostgreSQL through the `pg` connection pool. The connection is configured with:

```text
DATABASE_URL=postgresql://user:password@host:5432/database
```

At startup, the server creates the required tables from [db/schema.sql](../db/schema.sql) and seeds the database from `data/menu.json` only when menu ID `1` does not exist. During normal operation, the Express server is the only component that reads or writes menu data:

- `GET /` reads PostgreSQL for server rendering.
- `GET /api/menu-config` reads PostgreSQL for API consumers.
- `PUT /api/menu-config` validates and transactionally replaces the menu in PostgreSQL.
- The admin browser never writes the database directly.

Uploaded images are stored separately:

```text
uploads/<generated-file-name>.<extension>
```

Menu records reference uploads using a web path such as `/uploads/uuid.webp`.

## Application configuration shape

The API and renderer preserve the existing configuration shape even though the storage is normalized in PostgreSQL.

The root document has two fields:

```json
{
  "banner": "",
  "menu": []
}
```

### Root fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `banner` | string | Yes | Public URL/path for the banner image, or an empty string to use the brand fallback |
| `menu` | array | Yes | Ordered list of menu categories |

### Category record

```json
{
  "category": {
    "en": "Burgers",
    "am": "በርገር"
  },
  "emoji": "🍔",
  "items": []
}
```

| Field | Type | Required | Description |
|---|---|---:|---|
| `category.en` | string | Yes | English category label |
| `category.am` | string | Yes | Amharic category label |
| `emoji` | string | Yes | Fallback visual shown when an item has no image |
| `items` | array | Yes | Ordered items in the category |

### Menu item record

```json
{
  "name": {
    "en": "Classic Cheeseburger",
    "am": "ክላሲክ ቺዝ በርገር"
  },
  "price": "600.00",
  "description": {
    "en": "A juicy beef patty...",
    "am": "ጣፋጭ የበሬ ስጋ..."
  },
  "allergies": ["🌾", "🥛", "🥜"],
  "image": "/uploads/example.webp"
}
```

| Field | Type | Required | Description |
|---|---|---:|---|
| `name.en` | string | Yes | English item name |
| `name.am` | string | Yes | Amharic item name |
| `price` | string | Yes | Price text, normally without the `ETB` prefix |
| `description.en` | string | Yes | English item description |
| `description.am` | string | Yes | Amharic item description |
| `allergies` | array of strings | Yes | Allergy indicators or labels |
| `image` | string | No | Public image path; omitted when the category emoji should be used |

## PostgreSQL schema

The schema is managed by [db/schema.sql](../db/schema.sql).

### `menus`

Stores the singleton menu document and banner URL. The current application uses `id = 1`.

### `categories`

Stores ordered bilingual menu categories. `menu_id` references `menus(id)` and `position` preserves the order shown to customers.

### `menu_items`

Stores ordered bilingual menu items and their numeric prices. `category_id` references `categories(id)`.

### `menu_item_allergies`

Stores ordered allergy values for each menu item. Rows are deleted automatically when their menu item is deleted.

All category and item relationships use foreign keys with cascading deletes. Prices use `NUMERIC(12, 2)` and positions use non-negative integers.

### `admin_users`

Stores admin usernames and scrypt password hashes. Plaintext passwords are never stored. The first admin account is created from `ADMIN_USERNAME` and `ADMIN_PASSWORD` when the table is empty.

### `admin_sessions`

Stores SHA-256 hashes of randomly generated session tokens and their expiration timestamps. The raw token is sent only in an HTTP-only `admin_session` cookie. Expired sessions are rejected during authentication.

## Persistence behavior

`PUT /api/menu-config` accepts the complete application configuration and replaces the normalized category, item, and allergy rows inside a PostgreSQL transaction. If any insert fails, the transaction rolls back.

The application uses a connection pool, so multiple Node.js requests can share database connections. This also makes the storage suitable for multiple application instances when they point to the same PostgreSQL database.

The current write contract is full replacement rather than a partial patch. The admin browser sends the complete in-memory configuration after an edit.

## Authentication persistence

The admin host requires a valid session for page access and mutation APIs. Authentication flow:

1. The server creates the first admin user from environment variables during initialization.
2. The admin submits credentials to `POST /login`.
3. The server verifies the scrypt password hash.
4. The server stores a hashed random session token in `admin_sessions`.
5. The browser receives the raw token in an HTTP-only, `SameSite=Lax` cookie.
6. Admin page and mutation requests validate the session and expiration.
7. `POST /logout` deletes the session and expires the cookie.

Set a password of at least 12 characters. Rotate credentials through a dedicated account-management workflow before production; changing bootstrap environment variables does not automatically change an existing user's password.

## API contract

`PUT /api/menu-config` checks that:

- The body exists.
- `menu` is an array.
- `banner` is a string.

`POST /api/uploads` accepts a JSON body containing an image data URL:

```json
{
  "data": "data:image/webp;base64,..."
}
```

It returns:

```json
{
  "url": "/uploads/generated-name.webp"
}
```

## Backups and operations

Back up the PostgreSQL database with `pg_dump` and preserve the `uploads/` directory separately. `data/menu.json` is only a seed fixture and is not updated after administrative writes.

## Documentation maintenance

Update this file whenever the persistence implementation, schema, API payload shape, upload storage, or seed process changes. A schema change is not complete until this document and the relevant validation or migration notes are updated.
