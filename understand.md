# Understanding This Codebase

This document explains the application in beginner-friendly language while
staying close to what the current code actually does.

## 1. What This Application Is

This repository is a **Vue 3 frontend** for a Reddit-style social application.
It provides screens for:

- Registration and login.
- A home feed of posts.
- Post creation, voting, and saving.
- Search for posts, communities, and people.
- Public profiles, follows, and username changes.
- Community chat.
- Direct messages between mutual followers.
- Notifications.
- A local team/contributor showcase page.

The repository is **not the complete backend application**. The frontend calls
an Express API described in `API.md`. That backend is expected to run on
Railway or locally and persist data in PostgreSQL.

The easiest mental model is:

```text
Vue components display the interface
        |
        | REST requests for stored data and actions
        v
Express API + PostgreSQL

Vue chat/inbox/notification components
        |
        | Socket.IO events for immediate live updates
        v
Express/Socket.IO server
```

One exception exists: `/team` and its special team profile/post content use
local JavaScript data in `src/data/teamProfiles.js`. Those showcase items do
not need the backend.

## 2. Technology Stack

| Technology | Purpose |
| --- | --- |
| Vue 3 | Reactive UI component framework. |
| Vue Router | Switches pages based on URL routes. |
| Vite | Development server and production build tool. |
| Bootstrap CSS | Utility/layout classes such as rows and flex classes. |
| Custom CSS | Reddit-inspired colors, spacing, and component styling. |
| Font Awesome | Icons used throughout the UI. |
| Socket.IO Client | Realtime messages, typing, seen state, reactions, and notification updates. |
| Express API, documented externally | Authentication and stored application data. |
| PostgreSQL, documented externally | Backend persistence; there is no database code in this frontend repository. |

## 3. How To Run It

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

Available scripts from `package.json`:

| Script | Meaning |
| --- | --- |
| `npm run dev` | Run the Vite development server. |
| `npm run build` | Produce a production frontend build. |
| `npm run preview` | Preview the production build locally. |

### API configuration

Both `src/services/api.js` and `src/services/auth.js` use:

```js
import.meta.env.VITE_API_BASE_URL || '/api'
```

In local Vite development, `vite.config.js` proxies:

```text
/api       -> https://modern-web-application-backend-production.up.railway.app
/socket.io -> https://modern-web-application-backend-production.up.railway.app
```

So the default `/api` works during `npm run dev` by forwarding browser
requests to Railway while keeping browser requests same-origin.

To point at another backend, set an environment value such as:

```text
VITE_API_BASE_URL=http://localhost:3000/api
```

Important detail: the source code defaults to `/api`; a deployed static
frontend must either set `VITE_API_BASE_URL` during build or be hosted behind
a server that routes `/api` and `/socket.io` correctly.

## 4. Repository Map

```text
index.html                         Browser HTML host and external fonts/icons
package.json                       Dependencies and npm commands
vite.config.js                     Vue plugin and development API/socket proxy
README.md                          Short setup summary
API.md                             Full expected Express backend contract

AUTH_EXPRESS_RAILWAY_HANDOFF.md    Historical PHP-to-Express migration notes
FOLLOW_NOTIFICATION_BACKEND.md    Backend request for mutual follow notices
INBOX_CONVERSATIONS_API.md         Backend request/history for inbox listing
REALTIME_CHAT_BACKEND_HANDOFF.md   Socket.IO debugging and required behavior
profile_api.md                     Profile integration notes

src/
  main.js                          Creates and mounts the Vue application
  App.vue                          Displays the currently routed view
  style.css                        Global design tokens and basic reset styles

  router/
    index.js                       URL route definitions

  services/
    api.js                         REST requests for app data/actions
    auth.js                        Login/session/logout and shared auth state
    realtime.js                    Shared Socket.IO client and reactions
    format.js                      Formatting helpers for display

  data/
    teamProfiles.js                Local-only team profiles and generated posts

  components/
    AppShell.vue                   Shared header/sidebar/toast layout
    PostCard.vue                   Shared post renderer and post actions
    chat/
      MessageList.vue              Shared message display/reaction UI
      MessageInput.vue             Shared message composer/typing emitter

  views/
    HomeView.vue                   Feed and create-post screen
    PostView.vue                   Single post screen
    SearchView.vue                 Search screen
    ProfileView.vue                Profile/activity screen
    NotificationsView.vue          Notification list screen
    ChatView.vue                   Community realtime chat screen
    InboxView.vue                  Direct realtime chat screen
    LoginView.vue                  Login form
    RegisterView.vue               Registration form
    TeamView.vue                   Local contributor showcase
```

## 5. Vue Basics Used In This App

Almost every view is a Vue Single File Component:

```vue
<template>
  <!-- HTML-like UI -->
</template>

<script setup>
// JavaScript state and behavior
</script>

<style scoped>
/* CSS limited to this component */
</style>
```

The important Vue tools are:

| Vue feature | Meaning in this application |
| --- | --- |
| `ref(value)` | Stores a reactive value such as `loading`, `posts`, or `messages`. Update/read it in JavaScript using `.value`. |
| `reactive(object)` | Stores a reactive object, such as the create-post form draft. |
| `computed(() => ...)` | Calculates UI state from other state, such as `canSend` or filtered rooms. |
| `onMounted(...)` | Runs setup when the page/component appears, commonly loading data or attaching sockets. |
| `onBeforeUnmount(...)` | Removes socket listeners and room subscriptions when leaving a view. |
| `watch(...)` | Runs again when a route/query/state value changes. |
| Props | Parent component gives data to a reusable child. |
| Emits | Child component tells the parent that an action happened. |

An example of props/emits is chat:

```text
ChatView owns messages and socket behavior
  -> sends messages as props to MessageList
MessageList user clicks a reaction
  -> emits "reaction" to ChatView
ChatView sends the reaction Socket.IO event
```

## 6. Application Boot And Routing

### `index.html`

This is the one browser HTML file. It:

- Creates `<div id="app"></div>`, where Vue mounts.
- Loads Reddit Sans and Reddit Mono from Google Fonts.
- Loads Font Awesome icons.
- Loads `/src/main.js` in development.

### `src/main.js`

This is the application entry point:

```js
createApp(App).use(router).mount('#app')
```

It also imports Bootstrap and `src/style.css`.

### `src/App.vue`

`App.vue` contains only:

```vue
<router-view />
```

It is a placeholder where the route's view component appears.

### `src/router/index.js`

The application uses `createWebHashHistory()`. Routes appear after `#` in a
deployed URL, for example `/#/chat/artificial`. Hash routing helps a static
frontend work without server-side route fallback configuration.

| Route | View | Purpose |
| --- | --- | --- |
| `/` | `HomeView` | Feed, sorts, community rail, create post. |
| `/chat/:roomId?` | `ChatView` | Optional selected community chat room. |
| `/inbox` | `InboxView` | Direct-message conversations; supports `?with=username`. |
| `/login` | `LoginView` | Log in. |
| `/register` | `RegisterView` | Create account. |
| `/profile/:username` | `ProfileView` | Backend user profile or local team profile fallback. |
| `/post/:id` | `PostView` | Backend post or local team post fallback. |
| `/search` | `SearchView` | Search; supports `?q=search text`. |
| `/team` | `TeamView` | Contributor roster using local data. |
| `/notifications` | `NotificationsView` | Account notifications. |

View imports are lazy loaded, meaning a page's JavaScript is loaded when that
route is visited rather than all up front.

## 7. Shared Page Layout: `AppShell.vue`

Nearly every application page renders its content inside `<AppShell>`.
`LoginView` and `RegisterView` are exceptions because they have full-screen
authentication layouts.

`AppShell` supplies:

- A fixed top navbar.
- A fixed left sidebar on desktop.
- A `<slot />` where the view's own content is displayed.
- Global direct-message toast popups.
- Session restoration and common sidebar/notification loading.

### Navbar behavior

The navbar includes:

- Logo linking home.
- Search field: Enter navigates to `/search?q=<typed query>`.
- Chat link.
- Notification link with an unread dot.
- Create link: authenticated users navigate to `/?compose=true`; guests
  navigate to `/register`.
- Login button for guests.
- Username link and logout button for authenticated users.

### Sidebar behavior

The sidebar includes:

- Home.
- Popular, which is the home route with `?sort=top`.
- Latest, which is the home route with `?sort=new`.
- Team.
- Community Chats.
- Inbox.
- A dynamically loaded list of communities that links each community to its
  chat route.

### Session startup

When `AppShell` mounts it:

1. Loads public communities with `getCommunities()`.
2. Calls `restoreAuthSession()` to ask the server whether the session cookie
   is valid.
3. If authenticated, loads notifications and subscribes to realtime
   notification/inbox events.
4. If restoration fails, clears local authentication display state.

Because `AppShell` is included inside routed view components rather than
wrapped around `<router-view>` once in `App.vue`, it may mount again when
navigating between shell pages. The Socket.IO service itself keeps a singleton
socket, while each component removes its own event listeners on unmount.

### Realtime shell behavior

When authenticated, the shell listens for:

| Socket event | Shell result |
| --- | --- |
| `notification:new` | Turns on the notification unread dot. |
| `direct:conversation` | For an unread incoming direct message while outside `/inbox`, displays a toast for five seconds. |

The toast opens `/inbox?with=<username>` when clicked. It stores seen message
IDs in memory to avoid displaying the same toast repeatedly and shows up to
three at once.

## 8. Shared Service Layer

The views generally do not use `fetch()` or `io()` directly. They call small
functions in `src/services`.

### `src/services/api.js`: REST application data

`apiRequest(path, options)` is the base REST helper. It:

1. Builds a URL from `API_BASE_URL` plus the supplied path.
2. Always includes browser credentials so the session cookie can travel.
3. Parses JSON.
4. Requires a backend response with a boolean `success` property.
5. Throws `ApiError` with a user-displayable message and HTTP status on
   failures.

`queryString()` creates encoded optional URL queries. `jsonRequest()` creates
JSON write requests.

Exports and their users:

| Function | Request | Used for |
| --- | --- | --- |
| `getPosts()` | `GET /posts` | Home feed. |
| `createPost()` | `POST /posts` | Home composer. |
| `getPost()` | `GET /posts/:id` | Single post and full profile post hydration. |
| `votePost()` | `PUT /posts/:id/vote` | PostCard voting. |
| `savePost()` / `unsavePost()` | `PUT` / `DELETE /posts/:id/saved` | PostCard saved state. |
| `searchContent()` | `GET /search` | Search screen. |
| `getCommunities()` | `GET /communities` | Shell, home, search, community chat. |
| `joinCommunity()` / `leaveCommunity()` | `POST` / `DELETE /communities/:name/join` | Community membership. |
| `getProfile()` | `GET /profiles/:username` | Profile and direct-message header. |
| `getProfileActivity()` | `GET /profiles/:username/activity` | Profile posts/comments. |
| `getSavedItems()` | `GET /me/saved` | Own profile Saved tab. |
| `followProfile()` / `unfollowProfile()` | `POST` / `DELETE /profiles/:username/follow` | Profile and inbox follow actions. |
| `getNotifications()` | `GET /notifications` | Shell dot and notification page. |
| `getCommunityMessages()` | `GET /chats/communities/:name/messages` | Initial community history. |
| `getDirectMessages()` | `GET /chats/users/:username/messages` | Initial direct history. |
| `getDirectConversations()` | `GET /chats/conversations` | Inbox thread list. |
| `updateUsername()` | `PATCH /me/username` | Own-profile username dialog. |

### `src/services/auth.js`: login state

Authentication has two parts:

1. **Real server authentication:** an `HttpOnly` cookie issued by the backend.
   Vue cannot and should not read this cookie.
2. **Convenient UI display state:** the returned user object is cached in
   `localStorage` under `reddit_user` and a shared Vue `ref`.

Exports:

| Function | Role |
| --- | --- |
| `login(credentials)` | Sends username/email and password to `/auth/login`. |
| `register(details)` | Sends new account details to `/auth/register`. |
| `saveAuthSession({ user })` | Validates a username, stores display state locally, updates shared reactive user. |
| `getStoredUser()` | Reads cached display state safely. |
| `clearStoredAuth()` | Removes cached display state and resets reactive user. |
| `useAuthUser()` | Gives components the shared authenticated-user `ref`. |
| `restoreAuthSession()` | Confirms the cookie with `/auth/session`; authoritative after refresh. |
| `logout()` | Calls `/auth/logout` then always clears local UI state. |

The cached user is not proof of login. A stale local entry is removed if the
server session restoration fails.

### `src/services/realtime.js`: realtime connection

This module creates one shared Socket.IO connection to `API_ORIGIN`, with
cookies included. `getChatSocket()` lazily creates and connects it.

`emitSocketEvent(socketClient, event, payload)` wraps acknowledged Socket.IO
emits in a Promise and rejects if no acknowledgement arrives within eight
seconds.

It also defines the five supported reaction choices:

```text
like, love, laugh, surprised, sad
```

`closeChatSocket()` exists to disconnect the singleton, although the current
views remove listeners/leave rooms rather than calling it.

### `src/services/format.js`: display formatting

| Function | Output example |
| --- | --- |
| `formatCount(1250)` | `1.3k` |
| `formatRelativeTime(timestamp)` | `5 min. ago` or `May 25, 2026` |
| `formatDate(timestamp)` | `May 25, 2026` |
| `avatarLetter('programming')` | `P` |

## 9. Reusable UI Components

### `PostCard.vue`

`PostCard` renders a post anywhere the app needs one: feed, search, profile,
or single-post page.

It displays:

- Community and author link.
- Relative creation time.
- Flair, title, text, image, or link if supplied.
- Vote controls.
- Comment count button.
- Save button.
- Link to community chat.

For normal API posts:

- Clicking the card navigates to `/post/:id`.
- Voting calls `votePost()`, then emits `updated` with the returned post.
- Saving/unsaving calls the API, then emits `updated`.
- The parent replaces its matching post in local state.

For `localOnly` team posts:

- It shows a `Local post` chip.
- Vote, save, and community-chat actions are hidden.
- It can still open its local post detail route and author profile.

### `MessageInput.vue`

This component is intentionally unaware of community versus direct chat. It
receives:

- Whether input is disabled.
- The disabled placeholder reason.
- The displayed room/person name.

It emits:

- `send` with trimmed text when Enter or send is pressed.
- `typing-change` while text is being typed.

Typing turns off after 1.6 seconds of no new typing, on blur, on disable, or
when the component is unmounted.

### `MessageList.vue`

This component displays:

- Incoming versus current-user message bubbles.
- Message time.
- Reaction chips and the reaction selection palette.
- Seen status for the current user's sent messages.
- Typing indicators.

It auto-scrolls to the bottom when the number of messages changes.
Reaction clicks emit an action to the owning view; it does not contact the
server itself.

## 10. Feature Screens And User Flows

### `HomeView.vue`: feed and posting

On mount the home page loads:

- Posts through `getPosts({ sort })`.
- Communities through `getCommunities()`.

Feed sorts are `best`, `hot`, `new`, `top`, and `rising`. The selected sort is
represented in the URL query except for default `best`.

Pagination uses `nextCursor`:

```text
Initial request -> replace posts
Load more request with cursor -> append posts
```

Authenticated users see a create-post trigger. The navbar can also open the
same modal using `/?compose=true`. Submitting the form sends:

```js
{
  community: '',
  title: '',
  image: '',
  description: ''
}
```

to `createPost()`, closes/reset the form, then reloads the feed.

The right rail shows communities with join/leave controls. Community join
state controls access to community chat on the chat page.

### `PostView.vue`: one post

For a normal ID, the view calls `getPost(route.params.id)` and renders the
returned object through `PostCard`.

For a team showcase post ID:

1. It first attempts the normal backend post request.
2. If that request fails and an entry exists in `teamPostsById`, it uses the
   local post.

The discussion section currently says comments are unavailable because the
documented backend does not yet include a comment-writing/read discussion
feature for this view.

### `SearchView.vue`: discovery

The navbar sends users here with a `q` query parameter. The view watches that
route query and runs the search.

For each submitted query it concurrently loads:

- `searchContent(text)` for API post/title and username results.
- `getCommunities()` and then filters community names client-side.

It renders three tabs:

- Posts, reusing `PostCard`.
- Communities, with join/leave actions.
- People, linking to public profiles.

### `ProfileView.vue`: identity and activity

For ordinary users the view:

1. Calls `getProfile(username)`.
2. Stores both `profile` display data and `viewer` permission state.
3. Loads the initially selected `posts` activity tab.

`viewer` determines the available actions:

| State | Action shown |
| --- | --- |
| `viewer.canMessage` | Chat link to `/inbox?with=<username>`. |
| Authenticated and not self | Follow/Following button. |
| `viewer.isSelf` | Change username button and Saved tab. |

Tabs currently displayed by this implementation are:

- `Posts`
- `Comments`
- `Saved`, only for the owner

Although the API documents an `overview` activity type, this current view
defaults to `posts` and does not display an Overview tab.

For API activity posts, the view normalizes incomplete item shapes and tries
to load each full post with `getPost()` so `PostCard` receives consistent
fields. The posts tab displays one post at a time with Previous/Next paging;
when needed, Next loads another cursor page.

For a username change, the page calls `updateUsername()`, updates the shared
cached auth user, and replaces the current profile route with the new
username.

#### Team profile fallback

If `getProfile()` fails specifically with `Profile not found.` and the
username exists in `teamProfilesByUsername`, the page renders the local team
profile instead.

Local team profiles:

- Display one generated local spotlight post.
- Do not support backend follow/chat behavior.
- Have no comment or saved activity.

### `TeamView.vue`: local team showcase

`/team` imports `teamMembers` from `src/data/teamProfiles.js` and displays:

- A hero with summary statistics.
- Cards for each contributor.
- Student IDs, bios, and page ownership.
- Links to each member's profile route.

`teamProfiles.js` contains five static profiles and builds:

- `teamMembers`: contributor cards.
- `teamProfilesByUsername`: profile fallback records.
- `teamPosts`: local posts with generated SVG data-URL images.
- `teamPostsByUsername`: posts for local profile display.
- `teamPostsById`: local post detail fallback.

This local content is presentation data, not server content, and posts carry
`localOnly: true` to prevent invalid API write actions.

### `LoginView.vue` and `RegisterView.vue`: authentication

These views are full-page forms without `AppShell`.

Login:

- Accepts username or email and password.
- Validates required fields and a minimum password length locally.
- Calls `login()`, then `saveAuthSession()`, then navigates to home.

Registration:

- Accepts email, username, password, and confirmation.
- Validates the same principal account constraints described by the API:
  username format, valid email, and a password containing uppercase,
  lowercase, and a number.
- Shows a visual password strength indicator.
- Calls `register()`, saves auth display state, then navigates home.

Backend validation remains authoritative even though the browser validates
before making a request.

### `NotificationsView.vue`: account events

The notification page first loads stored notifications with
`getNotifications()`, supports All/Unread visual filtering, and listens for
live `notification:new` events.

It supports these current notification types:

| Type | Icon/route behavior |
| --- | --- |
| `post_created` | Opens the related `/post/:postId`. |
| `new_follower` | Opens the related person's `/profile/:username`. |
| `mutual_follow` | Opens `/inbox?with=<username>` so the newly available chat can start. |

It obtains a username from `targetUsername`, or falls back to `actor` /
`actorUsername`.

### `ChatView.vue`: community chat

This page is for conversations inside communities.

Initial flow:

1. Connect to the shared socket.
2. Register handlers for socket connection, messages, typing, reads, and
   reactions.
3. REST-load communities.
4. If the route is `/chat/:roomId`, select that community.
5. If the current user has joined the community, REST-load its message history.
6. Emit `community:join`.
7. Enable sending only after the server acknowledges successful room join.

Why both REST and sockets?

```text
REST getCommunityMessages() = existing saved history when room opens
Socket events                = new changes appearing immediately afterwards
```

Community actions:

| User action | Communication |
| --- | --- |
| Join/leave community membership | REST `joinCommunity()` / `leaveCommunity()`. |
| Enter/leave visible live room | Socket `community:join` / `community:leave`. |
| Send message | Socket `community:message:send`. |
| Start/stop typing | Socket `community:typing`. |
| Mark viewed messages | Socket `community:read`. |
| Set/remove reaction | Socket `community:reaction:set` / `community:reaction:remove`. |

Messages acknowledged after sending are appended immediately. Incoming
broadcast copies are deduplicated by message ID. If the socket reconnects,
`handleConnect()` joins the selected room again, because Socket.IO room
membership does not survive a disconnect.

The user must have joined the community to read or send community chat.

### `InboxView.vue`: direct messages

Direct messages are available only between users who mutually follow each
other.

Initial flow:

1. Connect/register direct-message socket listeners.
2. REST-load mutual-follow conversation summaries from
   `getDirectConversations()`.
3. If the route contains `?with=username`, automatically open that
   conversation.
4. When selected, load direct history and the other person's profile in
   parallel.
5. Emit `direct:join`.
6. Enable sending after successful acknowledgement.
7. Mark visible messages read.

Conversation rows show display name/avatar, latest message preview, and
unread count. Realtime `direct:conversation` payloads add/update a row and
move it to the top.

Direct actions:

| User action | Communication |
| --- | --- |
| Load conversation list | REST `GET /chats/conversations`. |
| Load message history | REST `GET /chats/users/:username/messages`. |
| Follow person from blocked chat | REST `followProfile()`. |
| Join/leave live direct room | Socket `direct:join` / `direct:leave`. |
| Send message | Socket `direct:message:send`. |
| Typing | Socket `direct:typing`. |
| Read/seen status | Socket `direct:read`. |
| Set/remove reaction | Socket `direct:reaction:set` / `direct:reaction:remove`. |

If the conversation-list endpoint returns `404`, the UI displays that inbox
sync is not available yet. This is compatibility behavior for a backend that
has not implemented `GET /api/chats/conversations`.

## 11. REST Data Contract Used By The Frontend

The definitive expected API contract is in `API.md`. Every REST response is
expected to include:

```json
{ "success": true }
```

or:

```json
{ "success": false, "error": "User-facing error message." }
```

Primary endpoints expected by source code:

| Area | Endpoint |
| --- | --- |
| Authentication | `POST /api/auth/register` |
| Authentication | `POST /api/auth/login` |
| Authentication | `GET /api/auth/session` |
| Authentication | `POST /api/auth/logout` |
| Feed/posts | `GET /api/posts?sort=...&limit=...&cursor=...` |
| Feed/posts | `POST /api/posts` |
| Feed/posts | `GET /api/posts/:postId` |
| Feed/posts | `PUT /api/posts/:postId/vote` |
| Feed/posts | `PUT`, `DELETE /api/posts/:postId/saved` |
| Search | `GET /api/search?q=...` |
| Community | `GET /api/communities` |
| Community | `POST`, `DELETE /api/communities/:name/join` |
| Profile | `GET /api/profiles/:username` |
| Profile | `GET /api/profiles/:username/activity` |
| Profile | `GET /api/me/saved` |
| Profile | `POST`, `DELETE /api/profiles/:username/follow` |
| Profile | `PATCH /api/me/username` |
| Chat history | `GET /api/chats/communities/:name/messages` |
| Inbox history | `GET /api/chats/users/:username/messages` |
| Inbox list | `GET /api/chats/conversations` |
| Notifications | `GET /api/notifications` |

`API.md` additionally documents REST routes for read state and reactions, but
the current chat/inbox Vue views implement those live interactions through
Socket.IO events rather than calling the REST alternatives.

## 12. Socket.IO Event Contract Used By The Frontend

### Shared connection

The socket uses the same origin derived from `API_BASE_URL` and includes the
authentication cookie:

```js
io(API_ORIGIN, {
  autoConnect: false,
  withCredentials: true,
})
```

An unauthenticated socket is expected to fail with
`Authentication required.`.

### Community events

| Direction | Event | Main payload/result |
| --- | --- | --- |
| Client to server | `community:join` | `{ community }`, acknowledged before send is enabled. |
| Client to server | `community:leave` | `{ community }`. |
| Client to server | `community:message:send` | `{ community, body }`, ack returns message. |
| Server to clients | `community:message` | `{ community, message }`. |
| Both directions | `community:typing` | Community, username, and typing state. |
| Both directions | `community:read` | Community and read message IDs. |
| Client to server | `community:reaction:set` / `:remove` | Community, message ID, optional reaction. |
| Server to clients | `community:reaction` | New reaction counts/viewer state. |

### Direct-message events

| Direction | Event | Main payload/result |
| --- | --- | --- |
| Client to server | `direct:join` | `{ username }`, acknowledged before send is enabled. |
| Client to server | `direct:leave` | `{ username }`. |
| Client to server | `direct:message:send` | `{ username, body }`, ack returns message. |
| Server to clients | `direct:message` | `{ with, message }`. |
| Both directions | `direct:typing` | Conversation user and typing state. |
| Both directions | `direct:read` | Conversation and read message IDs. |
| Client to server | `direct:reaction:set` / `:remove` | User, message ID, optional reaction. |
| Server to clients | `direct:reaction` | New reaction counts/viewer state. |
| Server to client | `direct:conversation` | Conversation summary for inbox/toast updates. |

### Notification event

| Direction | Event | Main payload |
| --- | --- | --- |
| Server to client | `notification:new` | `{ notification }` |

## 13. Authentication And Permission Rules

The UI depends on backend authorization:

| Action | Permission expected by backend |
| --- | --- |
| Read public feed/search/profile | Available publicly, with optional viewer-specific state. |
| Create/vote/save post | Logged-in session. |
| View Saved profile tab | Logged-in owner only. |
| Follow/unfollow user | Logged-in session. |
| Change username | Logged-in owner. |
| Read/send community messages | Logged in and joined that community. |
| Read/send direct messages | Logged in and mutual follow exists. |
| Notifications/inbox listing | Logged-in session. |

The frontend may hide controls, but the backend must enforce the rule because
browser code can be bypassed.

## 14. Styling And Responsive Layout

`src/style.css` defines global Reddit-like design tokens, for example:

```css
--reddit-orange
--reddit-blue
--reddit-surface-inset
--reddit-text-secondary
--reddit-border-soft
--font-main
--font-mono
```

Each component then uses scoped CSS for its own layout and appearance.

Important responsive behavior:

- The shell's sidebar hides on narrower screens.
- Home hides its right rail on smaller widths.
- Chat and inbox show their list side only on narrow mobile widths; the
  conversation panel is hidden in the current CSS at widths below `760px`.

## 15. Backend Documentation Files: What They Mean Now

| Document | How to interpret it |
| --- | --- |
| `API.md` | Main desired/current Express API contract used by frontend code. |
| `README.md` | Short setup and data-boundary introduction. |
| `profile_api.md` | Profile integration notes; partially older because the current profile UI now has local team fallback and posts-first paging. |
| `REALTIME_CHAT_BACKEND_HANDOFF.md` | Explains prior socket delivery/reconnect fixes and the realtime contract. |
| `INBOX_CONVERSATIONS_API.md` | Originally requested the conversations endpoint; current source already calls it and handles `404` as not yet available. |
| `FOLLOW_NOTIFICATION_BACKEND.md` | Handoff for backend mutual-follow notifications. `API.md` describes that contract as available/expected. |
| `AUTH_EXPRESS_RAILWAY_HANDOFF.md` | Historical migration brief from PHP/MariaDB endpoints to Express/Railway. The current frontend already calls clean Express paths; no PHP source exists in this checkout. |

## 16. Important Current Limitations And Differences

These details prevent confusion while developing:

1. **Backend source is absent here.** `API.md` describes the server expected by
   this frontend, but only frontend implementation is in this repository.

2. **Comments are not functional.** Post detail displays a discussion
   placeholder; the backend documentation also states comment-writing is not
   yet provided.

3. **Team content is intentionally local.** `/team` profiles/posts are static
   showcase data and should not be treated as persisted users/posts.

4. **Profile UI differs from older notes.** The current profile page defaults
   to a `Posts` tab, not `Overview`, and includes one-at-a-time post paging.

5. **Current Inbox has no user search form.** `INBOX_CONVERSATIONS_API.md`
   mentions retained username search, but the checked-out `InboxView.vue`
   relies on conversation rows or an incoming `/inbox?with=username` route.

6. **Notification fallback aliases are not implemented in current source.**
   `FOLLOW_NOTIFICATION_BACKEND.md` says aliases such as `follow_matched` and
   `chat_unlocked` are supported, but `NotificationsView.vue` explicitly
   routes `new_follower` and `mutual_follow`. The backend should use the
   canonical `mutual_follow` type documented in `API.md`.

7. **No frontend automated tests or lint command are configured.**
   `package.json` contains development/build/preview scripts only.

## 17. Practical Reading Order For A New Developer

Read in this order to build understanding without being overwhelmed:

1. `src/router/index.js` to see all pages.
2. `src/main.js`, `src/App.vue`, and `src/components/AppShell.vue` to see app
   startup and layout.
3. `src/services/api.js`, `auth.js`, `realtime.js`, and `format.js` to learn
   where data comes from.
4. `src/views/HomeView.vue` and `src/components/PostCard.vue` for the simplest
   complete data/action cycle.
5. `src/views/ProfileView.vue` and `src/data/teamProfiles.js` for profile and
   local fallback behavior.
6. `src/components/chat/MessageInput.vue`, `MessageList.vue`, then
   `src/views/ChatView.vue` and `InboxView.vue` for realtime flow.
7. `src/views/NotificationsView.vue` and `TeamView.vue`.
8. `API.md` when modifying a request, payload, permission rule, or realtime
   event.

## 18. Example End-To-End Stories

### User logs in

```text
LoginView validates form
 -> auth.login() sends POST /api/auth/login with credentials included
 -> backend sets HttpOnly session cookie and returns user
 -> saveAuthSession() caches display user and updates shared ref
 -> route changes to HomeView
 -> AppShell restores/confirms server session and subscribes live events
```

### User creates and votes on a post

```text
Navbar Create link opens HomeView compose modal
 -> HomeView sends POST /api/posts
 -> feed reloads with the created post
 -> user clicks upvote on PostCard
 -> PostCard sends PUT /api/posts/:id/vote
 -> returned updated post is emitted to HomeView
 -> HomeView replaces that item and Vue redraws vote count/state
```

### User chats in a community

```text
User joins community through REST
 -> ChatView loads stored messages through REST
 -> ChatView emits community:join over Socket.IO
 -> after acknowledgement, MessageInput enables
 -> send emits community:message:send
 -> acknowledged/broadcast message is appended once
 -> typing/read/reaction events update visible message state live
```

### Two users unlock direct chat

```text
Two users follow each other
 -> backend creates mutual_follow notifications and a conversation entry
 -> notification:new can update notification UI
 -> direct:conversation can add the thread / show outside-inbox toast
 -> clicking notification or toast opens /inbox?with=<other user>
 -> InboxView loads history and joins direct socket room
 -> the users can send realtime direct messages
```

## 19. Summary

This app is organized around route-level views and a small reusable component
layer:

- **Views** own page state and orchestrate API/socket behavior.
- **Components** render repeated UI and emit user intentions upward.
- **REST services** handle stored server data.
- **Auth service** keeps the shared displayed user synchronized with the
  cookie-backed server session.
- **Realtime service** supplies one acknowledged Socket.IO connection for
  messages, typing, read state, reactions, notification badges, and inbox
  updates.
- **Static team data** provides a local-only showcase alongside backend-driven
  application data.

When extending the app, start at the relevant view, reuse an existing service
or add a narrowly scoped service function, keep authorization on the backend,
and update `API.md` whenever the frontend/server contract changes.
