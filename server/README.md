# Chat Database Setup

## Schema usage

`server/schema.sql` defines chat tables and the authentication tables:

- `users` stores unique usernames/emails and `scrypt` password hashes.
- `auth_sessions` stores hashed, expiring session tokens delivered to browsers as `HttpOnly` cookies.
- `chat_messages` and `chat_reactions` store community chat activity.

The backend queries those tables, but it does not run the schema on every startup.

After configuring `server/.env`, initialize the database from the project root:

```bash
npm run db:init
```

The script uses the database named by `DB_NAME` and can be rerun because the tables use `CREATE TABLE IF NOT EXISTS`.

For a new development database only, add the sample chat messages and reactions:

```bash
npm run db:seed
```

The seed file uses fixed message IDs for its sample reactions, so do not apply it to a database that already contains real chat data.

## Authentication endpoints

The Vue login and registration screens call:

```txt
POST /api/auth/register
POST /api/auth/login
GET /api/auth/session
DELETE /api/auth/session
```

Registration takes `email`, `username`, and `password`. Login takes `identifier`
(either the username or email) and `password`. Successful authentication sets a
30-day `HttpOnly` session cookie; plaintext passwords and raw session tokens are
not stored in the database.

## Feenix phpMyAdmin

You can use this link to inspect the database or run `server/schema.sql` manually:

```txt
https://feenix-mariadb-web.swin.edu.au/
```

That link is phpMyAdmin, not the MySQL host for the Node backend.

## Backend connection

`server/server.js` needs the real MySQL host, not the phpMyAdmin URL.

Create `server/.env` and fill in the real database host/password supplied by Swinburne:

```env
DB_HOST=your_mysql_host_not_phpmyadmin_url
DB_PORT=3306
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_NAME=s105292789_db
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0
```

If direct MySQL access is blocked from your laptop, the Node backend and `npm run db:init` must run on a Swinburne/Mercury host that can reach the Feenix MariaDB server.

## Production application server

Build the Vue frontend, then run Express in production mode:

```bash
npm run build
npm start
```

`npm run build` writes frontend assets to `dist/`. `npm start` runs the Express
server, which serves those assets, supports Vue Router page refreshes, and
handles `/api` and Socket.IO requests from the same origin.

During development, `npm run dev:all` still runs Vite and Express separately;
Vite proxies `/api` and Socket.IO traffic to the backend.
