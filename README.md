# Modern Web Application

Vue 3 and Vite frontend for a Reddit-style application. Content, profiles,
notifications, communities, and realtime chat are provided by the Express API
described in `API.md`.

## Local Development

Start the Express backend on `http://localhost:3000`, then run the frontend:

```bash
npm install
npm run dev
```

In development, the frontend defaults to:

```text
http://localhost:3000/api
```

To use another API host, copy `.env.example` to `.env.local` and update:

```text
VITE_API_BASE_URL=http://localhost:3000/api
```

## Backend API

The frontend uses clean Express routes only, including:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/session
POST /api/auth/logout
GET  /api/posts
GET  /api/profiles/:username
GET  /api/search
GET  /api/communities
GET  /api/notifications
GET  /api/chats/communities/:name/messages
GET  /api/chats/users/:username/messages
```

Every request includes browser credentials so the backend `HttpOnly` session
cookie can be created and restored. The frontend stores only the returned user
display state in `localStorage`; it does not access or store the session token.
Realtime community and direct messages use Socket.IO on the same API origin.

See [API.md](./API.md) for payloads, cookie behavior, error responses, and
Railway configuration.

## Backend Verification

With the local backend running, open:

```text
http://localhost:3000/api/health
```

A functioning backend responds with JSON:

```json
{ "success": true, "database": "connected" }
```

Before login, requesting the session endpoint should return an unauthenticated
JSON response:

```text
http://localhost:3000/api/auth/session
```

## Production Build

Configure the deployed API URL before building:

```text
VITE_API_BASE_URL=https://<railway-api-domain>/api
```

Then build the static frontend:

```bash
npm run build
```

The Express/Railway backend must allow credentialed CORS requests from the
deployed frontend origin and configure its session cookie for the production
origin arrangement.

## Data Boundaries

The UI renders only backend-provided account and content data. Registration,
login, session restoration, feeds, post actions, profiles, communities,
notifications, and message history use the Express backend and PostgreSQL.
Community and direct-message sends use the Socket.IO events documented in
`API.md`.
