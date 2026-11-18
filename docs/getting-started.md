# Getting started

## Requirements

- Node.js 20 or newer is recommended.
- npm.
- PostgreSQL 14 or newer, or a reachable managed PostgreSQL instance.
- A browser.
- A hostname configuration if testing subdomain routing outside localhost.

## Install dependencies

From the repository root:

```bash
npm install
```

Copy the environment template and replace the example admin password:

```bash
cp .env.example .env
```

The application automatically loads `.env` on startup. If environment variables are already defined in your execution environment (or set by your deployment platform), existing environment variables take precedence.

## Configure PostgreSQL

Create a database and provide its connection string:

```bash
createdb bambis_cafe
export DATABASE_URL='postgresql://localhost:5432/bambis_cafe'
export ADMIN_USERNAME='admin'
export ADMIN_PASSWORD='use-a-unique-password-of-at-least-12-characters'
```

The complete list of supported environment fields is in [.env.example](../.env.example). Never commit `.env` or real credentials.

The server creates the schema automatically on startup. On the first startup, it imports the initial menu from `data/menu.json` and creates the first admin account from the admin environment variables. Later startups use PostgreSQL and do not overwrite existing menu data or the existing admin password.

## Run with Docker & Docker Compose

For a fully containerized environment including both the application and PostgreSQL database:

1. Build and start the stack in detached mode:

```bash
docker compose up -d --build
```

2. Check container status:

```bash
docker compose ps
```

3. View live application logs:

```bash
docker compose logs -f app
```

4. Stop the stack:

```bash
docker compose down
```

The Docker stack automatically provisions:
- An isolated application container running Node 22 with non-root security.
- A PostgreSQL 16 database with automated health checks and persistent volume (`postgres_data`).
- Persistent volume storage for uploaded media assets (`uploads_data`).
- Automatic startup schema migration and first-run admin account initialization.

## Run locally

Start the production-style server:

```bash
npm start
```

The default port is `3000`. The server prints the local address when it starts.

For automatic server restarts during development:

```bash
npm run dev
```

## Open both applications locally

The host name determines which application is rendered:

```text
http://cafe.localhost:3000/          Customer menu
http://admin.cafe.localhost:3000/    Admin dashboard
```

Open the admin URL and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The customer hostname remains public, while the admin page and menu mutation APIs require an authenticated session.

Modern browsers resolve `*.localhost` to `127.0.0.1`. If that behavior is unavailable in the local environment, use explicit host entries in the operating system hosts file and point both names to `127.0.0.1`.

The server also accepts a base domain through `DOMAIN`:

```bash
DOMAIN=cafe.localhost npm start
```

`DOMAIN` is useful when the application is behind a proxy or when the public base hostname is known. The application uses the request `Host` header to distinguish the `admin.` subdomain from the customer hostname.

## Local data and uploads

- Menu data is stored in PostgreSQL.
- `data/menu.json` is used only as the first-run seed fixture.
- Uploaded images are stored in `uploads/`.
- Uploaded files are served from `/uploads/...`.
- Design-time static images are served from `/design-assets/...`.

The server creates the `uploads/` directory when it starts. Keep both `data/menu.json` and `uploads/` backed up if the application is used with real menu content.

## Verify the server

Check the customer response:

```bash
curl -H 'Host: cafe.localhost:3000' http://127.0.0.1:3000/
```

Check the admin response:

```bash
curl -H 'Host: admin.cafe.localhost:3000' http://127.0.0.1:3000/
```

The responses should contain the server-rendered page and the `window.__SERVER_RENDERED__` marker.

## Deployment

The application can run as a Node.js process behind a reverse proxy such as Nginx, Caddy, or a managed platform's HTTP router.

### Required public DNS records

Create records for both hosts:

```text
example.com          -> deployment server
admin.example.com    -> deployment server
```

Both hosts must forward to the same Node.js process. The application selects the customer or admin page from the host name.

### Start the production process

Set the public base domain and port:

```bash
DOMAIN=example.com PORT=3000 npm start
```

Terminate TLS at the reverse proxy and proxy both hostnames to the Node.js port. Preserve the original `Host` header so Express can select the correct application. Configure the proxy to serve HTTPS and redirect HTTP to HTTPS.

### Deployment checklist

- Set `DOMAIN` to the public base domain.
- Set a non-conflicting `PORT`.
- Provision PostgreSQL and set `DATABASE_URL`.
- Set `ADMIN_USERNAME` and a unique `ADMIN_PASSWORD` of at least 12 characters.
- Back up PostgreSQL with `pg_dump`.
- Persist the `uploads/` directory.
- Route both the base domain and `admin.` subdomain to the same process.
- Preserve the `Host` header at the proxy.
- Keep admin credentials in the deployment secret manager, not in source control.
- Add request limits, image validation, backups, and monitoring for production use.

## Current limitations

- The admin surface uses username/password authentication but has no password reset or MFA flow.
- Uploaded files remain on the application filesystem and must be persisted separately.
- Database migrations are currently applied from `db/schema.sql` at startup.
