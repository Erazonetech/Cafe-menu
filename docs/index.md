# Bambis Cafe Menu

Bambis Cafe Menu is a bilingual, full-stack cafe menu application built with Node.js and Express. It provides two server-rendered web experiences from one application:

- The customer menu at `<domain>`.
- The menu administration dashboard at `admin.<domain>`.

The application supports English and Amharic content, menu categories, item prices and descriptions, item images, a configurable banner image, and persistent server-side menu updates.

## Documentation map

- [Getting started](./getting-started.md) — Run the application locally and deploy it behind a domain and reverse proxy.
- [Architecture overview](./architecture/overview.md) — Short description of the major components and request flow.
- [Detailed architecture](./architecture.md) — Server, rendering, browser enhancement, routing, and deployment design.
- [Database architecture and schema](./databse.md) — Current JSON persistence model, schema, writes, and migration considerations.

## Product surfaces

### Customer application

The customer application is served from the base hostname. The server reads PostgreSQL, renders the current menu into the initial HTML response, and serves the customer CSS and JavaScript from root-relative routes.

The browser then progressively enhances the page with:

- English/Amharic switching.
- Category filtering.
- Category drawer behavior on smaller screens.
- Add-to-order feedback.

### Admin application

The admin application is served from the `admin.` subdomain. It requires username/password authentication and uses the same server-side menu configuration as the customer application. It provides controls for:

- Adding and deleting categories.
- Adding, editing, and deleting menu items.
- Editing English and Amharic names and descriptions.
- Editing prices and item images.
- Uploading a banner image.

Admin changes are sent to the authenticated Express API and written to PostgreSQL. New customer requests then render the updated configuration.

## Current persistence model

The current implementation uses PostgreSQL as the server-side database:

```text
PostgreSQL (`DATABASE_URL`)
```

The normalized schema is created from `db/schema.sql`. The existing `data/menu.json` file is retained as a first-run seed fixture and is not used for runtime reads or writes.

## Architecture documentation maintenance

Documentation is part of the architecture change process. Every decisive architecture edit must update the affected documentation in the same change, especially:

- Hostname routing or deployment behavior: update [getting started](./getting-started.md) and [architecture](./architecture.md).
- Server rendering or browser behavior: update [architecture overview](./architecture/overview.md) and [architecture](./architecture.md).
- Menu persistence or schema changes: update [database architecture and schema](./databse.md).
- New or removed application surfaces: update this index and the architecture overview.
