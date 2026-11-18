# Detailed architecture

## Runtime

The application is an ECMAScript module Node.js service. Express is the HTTP framework. The process starts in [server.js](../server.js), creates the upload directory if necessary, registers middleware and routes, and listens on `PORT` or port `3000`.

The application can run as one or more Node.js instances backed by a shared PostgreSQL database. It does not use a separate frontend build system or a server-side templating package; the existing HTML files act as templates and are composed through controlled string replacement.

## Host-based application selection

The server uses the incoming hostname and the optional `DOMAIN` environment variable:

```text
example.com        -> customer mode
admin.example.com  -> admin mode
```

When `DOMAIN` is not set, the server derives a usable local/base domain from the request hostname. This supports local names such as `cafe.localhost` and `admin.cafe.localhost`.

The route `/` is the canonical entry point for both applications. The legacy `/admin` route redirects to `/` so the admin application is not exposed as a second path-based frontend.

The server also maps root asset requests according to host mode:

- Customer host `/styles.css` -> `customer-end/styles.css`
- Admin host `/styles.css` -> `admin-end/styles.css`
- Customer host `/app.js` -> `customer-end/app.js`
- Admin host `/app.js` -> `admin-end/app.js`

Shared assets remain available under `/design-assets` and `/uploads`.

## Server-side rendering

For each page request, the server:

1. Reads the correct HTML shell.
2. Queries the current PostgreSQL configuration.
3. Escapes dynamic values before placing them into HTML.
4. Renders customer menu item cards or admin category/item cards.
5. Injects `window.__MENU_CONFIG__` into the document.
6. Sets `window.__SERVER_RENDERED__` to `true`.
7. Rewrites the customer banner source when a configured banner exists.
8. Sends the final HTML response.

The customer and admin scripts remain useful after this initial response. They provide progressive enhancement rather than being the only source of visible content.

## Browser enhancement

The customer browser code provides:

- Language selection persisted in browser storage.
- Translation of interface labels.
- Re-rendering of menu records in the selected language.
- Category tabs and drawer navigation.
- Order feedback/toasts.

The admin browser code provides:

- Category creation and deletion.
- Item editor modal.
- Item creation, updates, and deletion.
- Banner and item image upload flows.
- API persistence through `PUT /api/menu-config` and `POST /api/uploads`.

Because the initial HTML is already rendered by the server, a browser with JavaScript disabled can still receive the main content, although interactive filtering and editing are unavailable.

## HTTP surface

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Render customer or admin HTML based on hostname |
| `GET` | `/styles.css` | Serve CSS for the current host mode |
| `GET` | `/app.js` | Serve browser enhancement code for the current host mode |
| `GET` | `/api/menu-config` | Return the current menu configuration as JSON |
| `PUT` | `/api/menu-config` | Replace the menu configuration after basic validation |
| `POST` | `/api/uploads` | Decode and persist a supported image data URL |
| `GET` | `/design-assets/*` | Serve design-time static images |
| `GET` | `/uploads/*` | Serve persisted uploaded images |
| `POST` | `/login` | Verify admin credentials and create an expiring session |
| `POST` | `/logout` | Delete the current admin session |

## Persistence and consistency

Configuration writes replace the normalized category, item, and allergy rows inside a PostgreSQL transaction. The connection pool supports multiple application instances sharing the same database.

The customer page reads the configuration on every server-rendered request. Therefore, a new customer request reflects a committed admin write without requiring a build or frontend deployment.

## Security boundaries

The server escapes dynamic values during server rendering and limits JSON body parsing to 12 MB. Uploads accept only JPEG, JPG, PNG, and WebP data URL formats and use generated filenames.

Before production exposure, the architecture should add:

- Strong schema validation for every menu field.
- Image byte/type validation and file-size limits independent of request size.
- CSRF protection or an equivalent authenticated API strategy.
- Rate limiting and structured error logging.
- HTTPS and secure reverse-proxy configuration.

## Architectural evolution

The design intentionally separates the page contract from storage details. The PostgreSQL adapter keeps host routing, server-rendered templates, and the API response shape stable while providing transactional normalized storage.

## Admin authentication

The customer hostname is public. Requests to the admin hostname are checked against the `admin_session` HTTP-only cookie before the admin page is rendered. The same session guard protects `PUT /api/menu-config` and `POST /api/uploads`.

Passwords are hashed with Node.js `crypto.scrypt` and a random salt. Sessions use random bearer tokens, but only SHA-256 token hashes are persisted in PostgreSQL. Sessions expire after eight hours and use `SameSite=Lax`; HTTPS deployments should set the secure cookie flag through the request's secure transport/proxy configuration.

The first admin account is bootstrapped from `ADMIN_USERNAME` and `ADMIN_PASSWORD`. There is intentionally no default credential in the repository. Account administration, password reset, and MFA are outside the current scope.

Any decisive changes to routing, rendering, persistence, security, or deployment must update this document and the relevant pages in the [documentation index](./index.md).
