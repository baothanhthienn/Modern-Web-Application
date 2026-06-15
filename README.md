<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/en/thumb/5/58/Reddit_logo_new.svg/220px-Reddit_logo_new.svg.png" alt="Logo" width="80" />

  <h1>Modern Web Application</h1>

  <p>
    A full-featured Reddit-style social platform built with Vue 3 and Vite,
    backed by an Express + PostgreSQL API with real-time Socket.IO chat.
  </p>

  <p>
    <a href="https://vuejs.org/"><img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white" /></a>
    <a href="https://vitejs.dev/"><img alt="Vite" src="https://img.shields.io/badge/Vite-6.x-646cff?logo=vite&logoColor=white" /></a>
    <a href="https://getbootstrap.com/"><img alt="Bootstrap" src="https://img.shields.io/badge/Bootstrap-5.x-7952b3?logo=bootstrap&logoColor=white" /></a>
    <a href="https://socket.io/"><img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io&logoColor=white" /></a>
    <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/License-MIT-green" /></a>
  </p>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [API Reference](#api-reference)
- [Real-time Events](#real-time-events)
- [Production Build](#production-build)
- [Backend Verification](#backend-verification)
- [Team](#team)
- [License](#license)

---

## Overview

This project is a modern, Reddit-style web application developed as a university assignment for **COS 30043 – Modern Web Application**. The frontend is built with **Vue 3** and **Vite**, consuming a shared **Express + PostgreSQL** REST API deployed on Railway. Real-time community chat and direct messaging are powered by **Socket.IO**.

---

## Features

- **Authentication** — Register, log in, restore sessions via HttpOnly cookies, and log out securely.
- **Post Feed** — Browse posts sorted by Best, Hot, New, Top, or Rising; infinite scroll with cursor-based pagination.
- **Post Composer** — Create, edit, and delete posts with title, image, link, and community selection.
- **Voting & Saving** — Upvote/downvote posts; save and unsave content to a personal library.
- **Communities** — Browse all communities, join or leave with a single click.
- **Real-time Community Chat** — Live Socket.IO chat inside every community room; typing indicators, emoji reactions, and read receipts.
- **Direct Messaging Inbox** — Private 1-to-1 conversations between mutual followers.
- **User Profiles** — Public profiles with karma, follower count, cake day, post history, and comment activity; tabbed navigation between overview, posts, comments, and saved content.
- **Avatar Upload** — Crop and upload a profile picture via Cloudinary (unsigned upload preset).
- **Follow System** — Follow or unfollow other users; mutual follows unlock direct messaging.
- **Notifications** — Server-delivered account updates; filter by All or Unread.
- **Search** — Full-text search across posts and communities.
- **Recommendation Engine** — Client-side scoring surfaces personalised posts based on viewed, upvoted, and searched content; synced to the backend for authenticated users.
- **Team Page** — Showcases each contributor's ownership area as static profile cards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Vue 3 (Composition API, `<script setup>`) |
| Build tool | Vite 6 |
| Routing | Vue Router 5 (hash history, lazy-loaded views) |
| Styling | Bootstrap 5 + custom CSS variables |
| Real-time | Socket.IO client 4 |
| Image editing | vue-advanced-cropper |
| Image hosting | Cloudinary (unsigned preset) |
| Backend API | Express.js on Railway |
| Database | PostgreSQL |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or newer
- **npm** 9 or newer

### Installation

```bash
git clone https://github.com/baothanhthienn/Modern-Web-Application.git
cd Modern-Web-Application
npm install
```

### Running Locally

The development server proxies `/api` and `/socket.io` to the deployed Railway backend, so no local backend is required:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To run against a **local backend** instead, create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL for the Express API (defaults to the Railway deployment) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned Cloudinary upload preset name |

---

## Project Structure

```
Modern-Web-Application/
├── src/
│   ├── components/
│   │   ├── AppShell.vue           # Top navbar + left sidebar layout wrapper
│   │   ├── AvatarUploadModal.vue  # Crop & upload profile picture
│   │   ├── PostCard.vue           # Reusable post card (vote, save, open)
│   │   ├── PostComposerModal.vue  # Create / edit post modal
│   │   └── chat/
│   │       ├── MessageInput.vue   # Chat input with typing-event debounce
│   │       └── MessageList.vue    # Scrollable message thread with reactions
│   ├── data/
│   │   └── teamProfiles.js        # Static team member data & placeholder SVGs
│   ├── router/
│   │   └── index.js               # Vue Router route definitions (lazy-loaded)
│   ├── services/
│   │   ├── api.js                 # All REST API calls + ApiError class
│   │   ├── auth.js                # Login, register, session restore, reactive user ref
│   │   ├── format.js              # Date, count, and avatar-initial helpers
│   │   ├── realtime.js            # Socket.IO singleton + typed emit helper
│   │   └── recommendations.js     # Client-side scoring engine + backend sync
│   ├── views/
│   │   ├── HomeView.vue           # Post feed, sort tabs, communities rail
│   │   ├── PostView.vue           # Single post with comments
│   │   ├── ProfileView.vue        # User profile with tabbed activity
│   │   ├── ChatView.vue           # Real-time community chat
│   │   ├── InboxView.vue          # Direct message conversations
│   │   ├── NotificationsView.vue  # Notification list with read state
│   │   ├── SearchView.vue         # Full-text search results
│   │   ├── LoginView.vue          # Sign-in form
│   │   ├── RegisterView.vue       # Account creation form
│   │   └── TeamView.vue           # Project team showcase
│   ├── App.vue
│   ├── main.js
│   └── style.css                  # Global CSS variables and base styles
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## Pages & Routes

| Route | View | Description |
|---|---|---|
| `/` | HomeView | Post feed with sort controls and communities sidebar |
| `/post/:id` | PostView | Single post detail with comments |
| `/profile/:username` | ProfileView | Public user profile with activity tabs |
| `/chat/:roomId?` | ChatView | Live community chat rooms |
| `/inbox` | InboxView | Direct messages between mutual followers |
| `/notifications` | NotificationsView | Account notification stream |
| `/search` | SearchView | Search posts and communities |
| `/login` | LoginView | Sign-in |
| `/register` | RegisterView | Create account |
| `/team` | TeamView | Project team member showcase |

All routes use **hash history** (`#/`) for compatibility with static hosting.

---

## API Reference

Every request sends `credentials: 'include'` so the backend HttpOnly session cookie is automatically attached. The frontend stores only display state (username, display name) in `localStorage` — the session token never leaves the cookie.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Log in and set session cookie |
| `GET` | `/api/auth/session` | Restore an existing session |
| `POST` | `/api/auth/logout` | Destroy session and clear cookie |

### Posts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/posts` | List posts (`sort`, `limit`, `cursor`) |
| `POST` | `/api/posts` | Create a post |
| `GET` | `/api/posts/:id` | Get a single post |
| `PATCH` | `/api/posts/:id` | Edit a post |
| `DELETE` | `/api/posts/:id` | Delete a post |
| `PUT` | `/api/posts/:id/vote` | Cast or retract a vote |
| `PUT` | `/api/posts/:id/saved` | Save a post |
| `DELETE` | `/api/posts/:id/saved` | Unsave a post |

### Profiles

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/profiles/:username` | Get a user's public profile |
| `GET` | `/api/profiles/:username/activity` | Get a user's posts/comments (`type`, `limit`, `cursor`) |
| `POST` | `/api/profiles/:username/follow` | Follow a user |
| `DELETE` | `/api/profiles/:username/follow` | Unfollow a user |

### Me

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/me/saved` | List saved posts |
| `PATCH` | `/api/me/username` | Change username |
| `GET` | `/api/me/avatar` | Get avatar info |
| `PATCH` | `/api/me/avatar` | Update avatar (URL + crop metadata) |

### Communities

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/communities` | List all communities |
| `POST` | `/api/communities/:name/join` | Join a community |
| `DELETE` | `/api/communities/:name/join` | Leave a community |

### Miscellaneous

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/search` | Search posts and communities |
| `GET` | `/api/notifications` | List notifications |
| `GET` | `/api/chats/communities/:name/messages` | Community message history |
| `GET` | `/api/chats/users/:username/messages` | Direct message history |
| `GET` | `/api/chats/conversations` | List direct conversations |
| `GET` | `/api/recommendations/history` | Fetch recommendation history |
| `POST` | `/api/recommendations/events` | Track a view, upvote, or search event |

---

## Real-time Events

Community chat uses **Socket.IO** on the same API origin. All events require an authenticated session.

| Event (emit) | Payload | Description |
|---|---|---|
| `community:join` | `{ community }` | Join a room and receive live messages |
| `community:leave` | `{ community }` | Leave a room |
| `community:message:send` | `{ community, body }` | Send a message |
| `community:typing` | `{ community, isTyping }` | Broadcast typing indicator |
| `community:read` | `{ community }` | Mark room messages as read |
| `community:reaction:set` | `{ community, messageId, reaction }` | Add an emoji reaction |
| `community:reaction:remove` | `{ community, messageId }` | Remove a reaction |

| Event (receive) | Description |
|---|---|
| `community:message` | New message broadcast |
| `community:typing` | Typing state from another user |
| `community:read` | Read receipts from another user |
| `community:reaction` | Reaction update for a message |

---

## Production Build

The deployed API URL is pre-configured. To override it before building:

```bash
VITE_API_BASE_URL=https://modern-web-application-backend-production.up.railway.app/api npm run build
```

Build the static frontend:

```bash
npm run build
```

The output is written to `dist/`. The `base` path in `vite.config.js` is set to `/cos30043/s105292789/project/dist` for the Swinburne university server. Adjust this if deploying elsewhere.

---

## Backend Verification

Check that the deployed Railway backend is healthy:

```
GET https://modern-web-application-backend-production.up.railway.app/api/health
```

Expected response:

```json
{ "success": true, "database": "connected" }
```

Verify an unauthenticated session returns the correct shape:

```
GET https://modern-web-application-backend-production.up.railway.app/api/auth/session
```

---

## Team

This project was built collaboratively by me for COS 30043 at Swinburne University of Technology.

| Name | Student ID | 
| Nguyen Gia Bao Pham | 105292789 | 

---

## License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.
