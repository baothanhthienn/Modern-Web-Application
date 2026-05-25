# Chat Database Setup

## Schema usage

`server/schema.sql` defines the chat tables. The backend queries those tables, but it does not run the schema on every startup.

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
