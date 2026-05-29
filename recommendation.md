# Post Recommendation Feature

## Overview

The recommendation feature surfaces up to five posts on the home page that are personally relevant to the current user based on their browsing history. It tracks three types of signals — posts viewed, posts upvoted, and search keywords — and scores every post in the current feed against that history. Recommendations work for both guests (using localStorage only) and logged-in users (synced with the backend).

---

## Files Involved

| File | Role |
|---|---|
| `src/services/recommendations.js` | All tracking, scoring, and history logic |
| `src/views/HomeView.vue` | Loads history, runs scoring, renders the recommended section |
| `src/components/PostCard.vue` | Calls `trackViewedPost` and `trackUpvotedPost` on user actions |
| `src/views/SearchView.vue` | Calls `trackSearchKeyword` when a search is submitted |

---

## Signal Types

Three user actions generate recommendation signals:

### 1. Viewing a post
Tracked in `PostCard.vue` inside `openPost()`, which fires when the user clicks anywhere on a post card:

```js
function openPost() {
  trackViewedPost(props.post)
  router.push(`/post/${props.post.id}`)
}
```

Stores: `{ id, community, flair, title, timestamp }`. Capped at **50 entries**, newest first.

### 2. Upvoting a post
Tracked in `PostCard.vue` inside `setVote()`, only when the vote direction is `1` (upvote):

```js
const vote = props.post.userVote === direction ? 0 : direction
const { post } = await votePost(props.post.id, vote)
if (vote === 1) trackUpvotedPost(props.post)
```

Stores the same shape as viewed posts. Capped at **50 entries**, newest first.

### 3. Searching
Tracked in `SearchView.vue` inside `runSearch()`, called every time the user submits a search form:

```js
trackSearchKeyword(text)
```

Stores: `{ keyword, timestamp }`. Keywords are normalised to lowercase and trimmed. Capped at **20 entries**, newest first.

---

## Data Storage — Dual Layer

Each tracking function writes to two places simultaneously.

### localStorage (always)

Every event is immediately written to `localStorage` under the key `reddit_recommendations` as a JSON object:

```json
{
  "viewedPosts": [...],
  "upvotedPosts": [...],
  "searchedKeywords": [...]
}
```

This works for guests and provides instant access without a network call.

**Deduplication**: before prepending a new entry, the existing list is filtered to remove any prior entry for the same post ID (or keyword). This creates a "move to front" behaviour — the same item always appears at the most recent position rather than duplicating.

```js
history.viewedPosts = [entry, ...history.viewedPosts.filter((p) => p.id !== post.id)].slice(0, 50)
```

### Backend (logged-in users only)

When a session exists, tracking functions also fire a `POST /api/recommendations/events` request in the background. The `.catch(() => {})` means a network failure silently falls back to the already-written localStorage data — the UI is never affected.

```js
if (currentUser.value) {
  apiRequest('/recommendations/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'view', postId: post.id, ... }),
  }).catch(() => {})
}
```

The backend performs the same deduplication (upsert) and enforces the same caps (50/50/20) at read time.

---

## Loading History on App Start

`loadHistory()` is called in `HomeView.vue` every time the feed loads. Its behaviour differs by auth state:

```js
export async function loadHistory() {
  const currentUser = useAuthUser()
  if (currentUser.value) {
    try {
      const data = await apiRequest('/recommendations/history')
      // sync backend data into localStorage
      saveHistory(history)
      return history
    } catch {
      // server unreachable — fall through
    }
  }
  return loadHistorySync()  // read from localStorage
}
```

| State | Source |
|---|---|
| Logged in, server reachable | `GET /api/recommendations/history` — backend is authoritative |
| Logged in, server unreachable | localStorage fallback |
| Guest | localStorage only |

When a logged-in user's backend history is fetched successfully it is written back to localStorage. This keeps the local cache up to date and means the scoring function always has data to work with even if the next page load is offline.

---

## Minimum Threshold

Recommendations are not shown unless there is enough data to be meaningful. `hasEnoughHistory()` enforces a minimum:

```js
export function hasEnoughHistory(history) {
  return viewedPosts.length >= 3 || upvotedPosts.length >= 1 || searchedKeywords.length >= 1
}
```

A brand-new user with no history sees no recommendation section at all. The threshold is intentionally low — one upvote or one search is enough to start showing suggestions.

---

## Scoring Algorithm

`scoreAndRankPosts(posts, history)` runs entirely in the browser. It assigns a numeric score to every post in the current feed and returns the top 5 with a positive score.

### Step 1 — Build weight maps from history

```js
viewedPosts.forEach((p, i) => {
  const recency = 1 - (i / viewedPosts.length) * 0.5   // newer = higher weight
  communityWeights[p.community] += recency
  if (p.flair) flairWeights[p.flair] += recency
  viewedIds.add(p.id)
  if (i < 3) recentTitles.push(p.title)
})

upvotedPosts.forEach((p) => {
  communityWeights[p.community] += 2    // upvotes count double vs views
  if (p.flair) flairWeights[p.flair] += 2
})
```

Upvoting is a stronger signal than viewing, so upvoted posts contribute a fixed `+2` to their community weight regardless of position. Viewed posts contribute a recency-decayed value between `0.5` and `1.0` — the most recently viewed post contributes `1.0`, the oldest contributes `0.5`.

### Step 2 — Score each post

Each post in the current feed is scored on four criteria:

| Criterion | Points | Logic |
|---|---|---|
| Community match | `communityWeight × 3` | The post is in a community the user has visited or upvoted in |
| Keyword match in title | `+5` | The post title contains any of the user's searched keywords |
| Flair match | `flairWeight × 2` | The post flair matches a flair the user has engaged with |
| Base engagement | `log1p(votes + comments×2) × 0.3` | Slightly boosts popular posts so recommendations are not entirely obscure |
| Already viewed | `−20` | Strong penalty to avoid re-recommending posts the user already opened |

### Step 3 — Build reason strings

While scoring, the algorithm builds a human-readable explanation for why each post is recommended. The first matching criterion produces the reason:

```js
if (communityWeights[post.community]) {
  reasons.push(`your interest in r/${post.community}`)
}
for (const { keyword } of searchedKeywords) {
  if (post.title.toLowerCase().includes(keyword)) {
    reasons.push(`your search for "${keyword}"`)
    break
  }
}
```

If the top-scored reason is a community match and the most recently viewed post was in that same community, the reason is upgraded to reference the specific post title:

```js
reasons[0] = `you viewed "${truncated}"`
```

### Step 4 — Filter, sort, cap

```js
return scored
  .filter((p) => p._recScore > 0)       // drop posts with no relevant signal
  .sort((a, b) => b._recScore - a._recScore)
  .slice(0, 5)                           // show at most 5 recommendations
```

Posts that match none of the user's signals (score ≤ 0) are excluded entirely.

---

## Display in HomeView

`HomeView.vue` runs history loading and post fetching in parallel on every feed load:

```js
const [data, history] = await Promise.all([
  getPosts({ sort: activeSort.value }),
  loadHistory()
])
posts.value = data.posts
cachedHistory.value = history
recommendations.value = hasEnoughHistory(history)
  ? scoreAndRankPosts(posts.value, history)
  : []
```

The `cachedHistory` ref holds the loaded history so that when the user loads more posts (pagination), the scoring can be re-run against the extended post list without fetching history again:

```js
const history = cachedHistory.value
recommendations.value = hasEnoughHistory(history)
  ? scoreAndRankPosts(posts.value, history)
  : []
```

### Rendered section

The recommendation section appears above the main feed when there are results and has not been dismissed:

```html
<section v-if="recommendations.length && !recDismissed" class="rec-section">
  <h3 class="rec-heading">
    <i class="fa-solid fa-wand-magic-sparkles"></i> Recommended for you
    <button class="rec-dismiss" @click="dismissRecs">...</button>
  </h3>
  <div class="rec-stream">
    <div v-for="rec in recommendations" :key="rec.id" class="rec-wrap">
      <p class="rec-reason">{{ getExplanation(rec) }}</p>
      <PostCard :post="rec" @updated="replacePost" />
    </div>
  </div>
</section>
```

`getExplanation(post)` returns the first reason string formatted as `"Because of you viewed \"Post title…\""` or `"Because of your interest in r/technology"`.

### Dismiss / restore

The user can dismiss the recommendations section. The dismissed state is stored in `localStorage` under `reddit_rec_dismissed`:

```js
function dismissRecs() {
  recDismissed.value = true
  localStorage.setItem('reddit_rec_dismissed', '1')
}
```

A small "Show recommendations" button appears in place of the section when dismissed. Clicking it clears the flag and the section reappears.

---

## Backend API Endpoints Used

### `POST /api/recommendations/events`

Records a single signal. Requires a valid session — ignored for guests at the API level (the service simply skips the call).

View or upvote event body:
```json
{ "type": "view", "postId": 1, "community": "technology", "flair": "Discussion", "title": "Post title", "timestamp": 1748476800000 }
```

Search event body:
```json
{ "type": "search", "keyword": "vue", "timestamp": 1748476800000 }
```

The backend upserts by `(user_id, type, post_id)` or `(user_id, type, keyword)` — repeated events refresh the timestamp rather than creating duplicate rows.

### `GET /api/recommendations/history`

Returns the authenticated user's stored signals, already capped and sorted:

```json
{
  "viewedPosts":      [{ "id": 1, "community": "technology", "flair": "Discussion", "title": "...", "timestamp": ... }],
  "upvotedPosts":     [{ "id": 2, "community": "programming", "flair": null,        "title": "...", "timestamp": ... }],
  "searchedKeywords": [{ "keyword": "vue", "timestamp": ... }]
}
```

Caps enforced by the backend at read time: `viewedPosts` max 50, `upvotedPosts` max 50, `searchedKeywords` max 20 — all newest first. This response shape is the authoritative source that `loadHistory()` writes into localStorage.

---

## Data Flow Summary

```
User clicks a post
  → PostCard.openPost()
  → trackViewedPost(post)
      → write to localStorage immediately
      → POST /api/recommendations/events  (fire-and-forget, logged-in only)
  → navigate to /post/:id

User opens home feed
  → HomeView.loadPosts()
  → Promise.all([getPosts(), loadHistory()])
      loadHistory():
        logged in → GET /api/recommendations/history → sync to localStorage
        guest     → read localStorage
  → hasEnoughHistory(history) ?
      yes → scoreAndRankPosts(posts, history) → up to 5 scored posts
      no  → empty array, section not shown
  → render "Recommended for you" section with reason labels
```
