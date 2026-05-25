# Modern Web Application

This project is a Vue 3 and Vite application prepared for Mercury hosting.
Database-backed registration and login run through small PHP endpoints supported
by Mercury; the application does not require Node or Express in production.

## Local Development

```bash
npm install
npm run dev
```

`npm run dev` is useful for frontend work only. To test registration or login
through PHP locally, build first and serve `dist/` with PHP:

```bash
npm run build
npm run preview:php
```

The PHP endpoints require a reachable MariaDB database and valid configuration.

## Database Authentication Setup

1. Open `public/api/config.php` and set the FeeNIX MariaDB database, username,
   and password before building for Mercury. The normal individual username is
   `s` followed by your student number; use the database name shown in
   phpMyAdmin for your account.
2. Run the SQL in `public/api/schema.sql` through FeeNIX phpMyAdmin to create
   the `users` table.
3. Build and upload the generated `dist/` contents, including `dist/api/`.

The Vue login and registration forms send HTTP requests to:

```text
api/auth/register.php
api/auth/login.php
api/auth/session.php
api/auth/logout.php
```

Those PHP scripts connect to MariaDB using PDO and hold the authenticated
session in PHP session storage. Database credentials are never included in the
JavaScript bundle.

## Authentication Diagnostics

While troubleshooting, leave `'debug' => true` in `public/api/config.php`,
rebuild, upload `dist/api/`, and open this URL on Mercury:

```text
https://mercury.swin.edu.au/<subject>/s<student-id>/api/health.php
```

A working connection responds with JSON containing:

```json
{ "success": true, "database": "connected" }
```

If the connection fails, the response includes the PDO error detail during
debugging. Authentication requests also write messages using PHP `error_log()`;
view these messages through the Mercury Apache error-log page. In your browser,
the Vue authentication service logs request success or failure in Developer
Tools Console.

After diagnosis, set `'debug' => false` and build/upload again so SQL connection
details are not displayed to visitors.

## Mercury Deployment

Build the site:

```bash
npm run build
```

Upload the contents of `dist/` to the Mercury web directory. The application
uses hash-based routing, so navigation works on a static web host without
server-side URL rewriting. Vite is configured with relative asset paths so it
also works when the site is hosted below a course or student subdirectory.

## Data Model

Registration, login, and session restoration use Mercury PHP and MariaDB.
Conversation messages, emoji reactions, notification changes, and
recommendation activity remain browser-local demo features implemented with
`localStorage`. There is no Express server, Socket.IO service, or real-time
multi-user chat.

Do not commit a real MariaDB password to a public repository. Configure
`public/api/config.php` only for your Mercury deployment copy.
