# Architecture overview

## System shape

```text
Customer browser  ── Host: example.com ─────┐
                                             │
Admin browser     ── Host: admin.example.com ├─> Express server
                                             │      ├─> Server-rendered HTML + admin auth
                                             │      ├─> /styles.css and /app.js
                                             │      ├─> /api/menu-config
                                             │      ├─> /api/uploads
                                             │      └─> PostgreSQL + uploads/
```

One Node.js process serves both application surfaces. Hostname selection happens on the server:

- Any hostname other than `admin.<domain>` is treated as the customer application.
- `admin.<domain>` is treated as the admin application.

## Main components

### Express server

[server.js](../../server.js) owns:

- Hostname-based application selection.
- Loading and writing the menu configuration.
- Server-side HTML composition.
- Static design asset and upload serving.
- Menu configuration API routes.
- Image upload handling.

### Customer template and enhancement

[customer-end/index.html](../../customer-end/index.html) is the customer page shell. The server injects menu item markup into its menu list before sending the response. [customer-end/app.js](../../customer-end/app.js) enhances the page after load.

### Admin template and enhancement

[admin-end/index.html](../../admin-end/index.html) is the admin page shell. The server injects category and item cards into its category list. [admin-end/app.js](../../admin-end/app.js) handles editing, upload requests, and persistence interactions.

### Persistent data

PostgreSQL is the current source of truth for menu content. [data/menu.json](../../data/menu.json) is retained only as a first-run seed fixture. The `uploads/` directory contains uploaded image files referenced by menu records.

## Request flow

1. A browser requests `/` with a hostname.
2. Express determines whether the host is customer or admin.
3. Express reads the HTML template and `data/menu.json`.
4. The server queries PostgreSQL and renders the relevant menu or admin records into the template.
5. The response includes the serialized configuration for browser enhancement.
6. The browser loads host-selected `/styles.css` and `/app.js`.
7. Interactions update the DOM locally or call the API.
8. Admin API writes update PostgreSQL; later customer requests see the committed data.

For more detail, see [Detailed architecture](../architecture.md).
