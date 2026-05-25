# Modern Web Application

Vue 3 and Vite frontend for a Reddit-style application. Content, profiles,
notifications, communities, and realtime chat are provided by the Express API
described in `API.md`.

## Local Development

The frontend now uses the deployed Railway API by default:

```text
https://modern-web-application-backend-production.up.railway.app/api
```

Run the frontend:

```bash
npm install
npm run dev
```

To use a local backend instead, create `.env.local`:

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

For the deployed backend, open:

```text
https://modern-web-application-backend-production.up.railway.app/api/health
```

A functioning backend responds with JSON:

```json
{ "success": true, "database": "connected" }
```

Before login, requesting the session endpoint should return an unauthenticated
JSON response:

```text
https://modern-web-application-backend-production.up.railway.app/api/auth/session
```

## Production Build

The deployed API URL is configured as the default. It can also be overridden before building:

```text
VITE_API_BASE_URL=https://modern-web-application-backend-production.up.railway.app/api
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
