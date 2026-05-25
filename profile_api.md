# Profile Frontend Integration

The backend profile contract has been incorporated into [`API.md`](./API.md).
The Vue profile view at `src/views/ProfileView.vue` now consumes that contract
directly and does not render fixture profile data.

## Used Endpoints

```text
GET    /api/profiles/:username
GET    /api/profiles/:username/activity?type=overview|posts|comments&limit=20&cursor=<cursor>
GET    /api/me/saved?limit=20&cursor=<cursor>
POST   /api/profiles/:username/follow
DELETE /api/profiles/:username/follow
PATCH  /api/me/username
```

The Chat action links to `/inbox?with=:username`, where the frontend requests:

```text
GET /api/chats/users/:username/messages
```

and sends new direct messages through the Socket.IO events documented in
`API.md`.

## Public Data Boundary

The public view displays only fields returned by `GET /api/profiles/:username`:

- Public name, username, bio, avatar, and banner.
- Post karma, comment karma, follower count, and cake day.
- Public communities.
- Public post/comment activity.

The page must never obtain or display registration email, session data, or
other private account fields. Saved items are requested only for the owner
when `viewer.isSelf` is true.

## Frontend Behavior

- Include `credentials: 'include'` with all profile requests.
- Use `viewer.isAuthenticated`, `viewer.isSelf`, `viewer.isFollowing`, and
  `viewer.canMessage` returned by the API for action visibility.
- Request only `overview`, `posts`, and `comments` through the public activity
  endpoint.
- Request Saved through `/api/me/saved`; display backend authorization errors.
- Apply the returned ISO `cakeDay` value as a localized date in the view.
- Render empty activity and unavailable comment states rather than introducing
  placeholder content.

## Local Checks

With the backend running on port `3000` and a registered username:

```bash
curl -i -sS http://localhost:3000/api/profiles/<username>
curl -i -sS 'http://localhost:3000/api/profiles/<username>/activity?type=overview&limit=20'
curl -i -sS --cookie 'reddit_session=<session-cookie>' http://localhost:3000/api/me/saved
```

Responses must be JSON, and public profile responses must not contain an
`email` field.
