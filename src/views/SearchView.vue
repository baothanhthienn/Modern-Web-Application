<template>
  <div class="search-page">

    <!-- Search Hero -->
    <div class="search-hero">
      <h1 class="search-hero-title">Search</h1>
      <div class="search-bar-wrapper">
        <span class="search-icon">🔍</span>
        <input
          v-model="query"
          class="search-input"
          placeholder="Search posts, communities, people..."
          @input="onQueryInput"
          @keydown.enter="doSearch"
          @keydown.escape="showSuggestions = false"
          autofocus
        />
        <button v-if="query" class="clear-btn" @click="clearSearch">✕</button>
        <button class="search-btn" @click="doSearch">Search</button>
      </div>

      <!-- Autocomplete Suggestions -->
      <transition name="fade">
        <ul v-if="showSuggestions && suggestions.length" class="suggestions">
          <li
            v-for="s in suggestions"
            :key="s"
            class="suggestion-item"
            @mousedown.prevent="selectSuggestion(s)"
          >
            <span class="suggestion-icon">🔍</span> {{ s }}
          </li>
        </ul>
      </transition>
    </div>

    <!-- Filters & Content (only shown after search) -->
    <div v-if="hasSearched" class="search-body">

      <!-- Tab Filters -->
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.icon }} {{ tab.label }}
          <span class="tab-count">{{ getTabCount(tab.value) }}</span>
        </button>
      </div>

      <div class="search-layout">
        <!-- Results -->
        <div class="results-col">

          <!-- Sort + Filter Row -->
          <div class="results-controls">
            <span class="results-count">
              <strong>{{ filteredResults.length }}</strong> results for "<em>{{ submittedQuery }}</em>"
            </span>
            <div class="sort-group">
              <label class="sort-label">Sort:</label>
              <select v-model="sortBy" class="sort-select">
                <option value="relevance">Relevance</option>
                <option value="new">Newest</option>
                <option value="top">Top Voted</option>
                <option value="comments">Most Comments</option>
              </select>
            </div>
          </div>

          <!-- Time filter (only for posts) -->
          <div v-if="activeTab === 'posts'" class="time-filters">
            <span class="filter-label-text">Time:</span>
            <button
              v-for="tf in timeFilters"
              :key="tf.value"
              class="time-btn"
              :class="{ active: timeFilter === tf.value }"
              @click="timeFilter = tf.value"
            >{{ tf.label }}</button>
          </div>

          <!-- No Results -->
          <div v-if="filteredResults.length === 0" class="no-results">
            <div class="no-results-emoji">🕵️</div>
            <h3>No results found</h3>
            <p>Try different keywords or check your spelling.</p>
          </div>

          <!-- Post Results -->
          <template v-if="activeTab === 'posts'">
            <article
              v-for="post in paginatedResults"
              :key="post.id"
              class="result-card"
              @click="trackPostView(post)"
            >
              <div class="result-vote">
                <button class="rvote-btn up" :class="{ active: post.userVote === 1 }" @click="vote(post, 1)">▲</button>
                <span class="rvote-count">{{ formatScore(post.score) }}</span>
                <button class="rvote-btn down" :class="{ active: post.userVote === -1 }" @click="vote(post, -1)">▼</button>
              </div>
              <div class="result-body">
                <div class="result-meta">
                  <span class="result-community">r/{{ post.community }}</span>
                  <span class="result-dot">·</span>
                  <span class="result-author">u/{{ post.author }}</span>
                  <span class="result-dot">·</span>
                  <span class="result-time">{{ post.time }}</span>
                </div>
                <h3 class="result-title" v-html="highlight(post.title)"></h3>
                <p v-if="post.body" class="result-excerpt" v-html="highlight(truncate(post.body))"></p>
                <div class="result-tags">
                  <span v-for="tag in post.tags" :key="tag" class="result-tag">{{ tag }}</span>
                </div>
                <div class="result-actions">
                  <span class="result-stat">💬 {{ post.comments }} comments</span>
                  <button class="action-sm-btn">🔗 Share</button>
                  <button class="action-sm-btn" @click="post.saved = !post.saved">
                    {{ post.saved ? '🔖 Saved' : '📋 Save' }}
                  </button>
                </div>
              </div>
            </article>
          </template>

          <!-- Community Results -->
          <template v-if="activeTab === 'communities'">
            <div v-for="c in paginatedResults" :key="c.name" class="community-result-card">
              <div class="cr-avatar" :style="{ background: c.color }">{{ c.icon }}</div>
              <div class="cr-info">
                <div class="cr-name">r/{{ c.name }}</div>
                <div class="cr-desc">{{ c.description }}</div>
                <div class="cr-stats">
                  <span>👥 {{ c.members }} members</span>
                  <span>·</span>
                  <span>🟢 {{ c.online }} online</span>
                </div>
              </div>
              <button class="join-btn-lg">Join</button>
            </div>
          </template>

          <!-- People Results -->
          <template v-if="activeTab === 'people'">
            <div v-for="u in paginatedResults" :key="u.username" class="people-result-card">
              <div class="user-avatar" :style="{ background: u.color }">{{ u.avatar }}</div>
              <div class="user-info">
                <div class="user-name">u/{{ u.username }}</div>
                <div class="user-karma">⬆ {{ u.karma }} karma · joined {{ u.joined }}</div>
                <div class="user-bio">{{ u.bio }}</div>
              </div>
              <button class="follow-btn">Follow</button>
            </div>
          </template>

          <!-- Pagination -->
          <div v-if="totalResultPages > 1" class="result-pagination">
            <button class="rpage-btn" :disabled="resultPage === 1" @click="resultPage--">← Prev</button>
            <div class="rpage-dots">
              <button
                v-for="p in totalResultPages"
                :key="p"
                class="rpage-dot"
                :class="{ active: resultPage === p }"
                @click="resultPage = p"
              >{{ p }}</button>
            </div>
            <button class="rpage-btn" :disabled="resultPage === totalResultPages" @click="resultPage++">Next →</button>
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="search-sidebar">
          <div class="ss-card">
            <h3 class="ss-title">🔎 Search Tips</h3>
            <ul class="ss-tips">
              <li>Use <code>r/community</code> to search within a subreddit</li>
              <li>Use <code>u/username</code> to find a user</li>
              <li>Put quotes around <code>"exact phrases"</code></li>
              <li>Filter by time to find recent posts</li>
            </ul>
          </div>

          <div class="ss-card">
            <h3 class="ss-title">📌 Related Communities</h3>
            <div
              v-for="c in relatedCommunities"
              :key="c.name"
              class="related-community"
            >
              <div class="rc-dot" :style="{ background: c.color }"></div>
              <span class="rc-name">r/{{ c.name }}</span>
              <button class="rc-join">Join</button>
            </div>
          </div>

          <div class="ss-card trending-card">
            <h3 class="ss-title">🔥 Trending Searches</h3>
            <div class="trending-list">
              <button
                v-for="t in trendingSearches"
                :key="t"
                class="trending-tag"
                @click="selectSuggestion(t)"
              >{{ t }}</button>
            </div>
          </div>
        </aside>
      </div>
    </div>

   
    <div v-else class="empty-state">
      <div class="empty-illustration">🌐</div>
      <h2>Find anything on Sphere</h2>
      <p>Search posts, communities, and people</p>
      <div class="popular-searches">
        <span class="popular-label">Popular:</span>
        <button
          v-for="term in popularSearches"
          :key="term"
          class="popular-tag"
          @click="selectSuggestion(term)"
        >{{ term }}</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRecommendations } from '../composables/useRecommendations'


const query = ref('')
const submittedQuery = ref('')
const hasSearched = ref(false)
const activeTab = ref('posts')
const sortBy = ref('relevance')
const timeFilter = ref('all')
const resultPage = ref(1)
const resultsPerPage = 5
const showSuggestions = ref(false)

const tabs = [
  { label: 'Posts', value: 'posts', icon: '📝' },
  { label: 'Communities', value: 'communities', icon: '👥' },
  { label: 'People', value: 'people', icon: '🧑' },
]

const timeFilters = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
]

const popularSearches = ['vue.js', 'web design', 'javascript', 'gaming', 'AI tools', 'programming']
const trendingSearches = ['#Vue3', '#CSS2025', '#IndieGame', '#AIart', '#OpenSource']

// --- Data ---
const allPosts = ref([
  { id: 1, community: 'vuejs', author: 'devmaster99', time: '2h ago', title: 'Vue 3.5 performance improvements are incredible', body: 'Just migrated our production app and saw massive gains in the reactivity system.', score: 4821, comments: 312, userVote: 0, saved: false, tags: ['Vue 3', 'Performance'] },
  { id: 2, community: 'webdev', author: 'css_wizard', time: '4h ago', title: 'Building a fully responsive layout using CSS Grid', body: 'After 3 weeks of experimentation I nailed pixel-perfect layouts with modern CSS.', score: 2340, comments: 187, userVote: 0, saved: false, tags: ['CSS', 'Grid'] },
  { id: 3, community: 'programming', author: 'algo_nerd', time: '5h ago', title: 'Why most developers misunderstand Big O notation', body: null, score: 7892, comments: 543, userVote: 0, saved: false, tags: ['Algorithms', 'CS'] },
  { id: 4, community: 'design', author: 'pixel_pusher', time: '6h ago', title: '2025 UI trends that are actually worth adopting', body: 'I analyzed 500 popular apps and compiled patterns that genuinely improve UX.', score: 1560, comments: 98, userVote: 0, saved: false, tags: ['UI/UX', 'Trends'] },
  { id: 5, community: 'gaming', author: 'xp_farmer', time: '8h ago', title: 'After 1000 hours I finally beat Elden Ring without taking damage', body: null, score: 31204, comments: 2104, userVote: 0, saved: false, tags: ['Achievement'] },
  { id: 6, community: 'vuejs', author: 'composables_fan', time: '10h ago', title: 'Pinia vs Vuex in 2025: a definitive guide', body: 'Comprehensive comparison based on real-world projects and developer feedback.', score: 983, comments: 75, userVote: 0, saved: false, tags: ['Pinia', 'State'] },
  { id: 7, community: 'webdev', author: 'perf_guru', time: '12h ago', title: 'I cut our bundle size by 60% — here is the breakdown', body: 'Tree-shaking, dynamic imports, and Vite tricks brought us from 2.4MB to 960KB.', score: 5421, comments: 389, userVote: 0, saved: false, tags: ['Performance', 'Vite'] },
  { id: 8, community: 'javascript', author: 'es_master', time: '1d ago', title: 'ES2025 features you should know about right now', body: 'The latest ECMAScript spec includes some genuinely useful additions to the language.', score: 6700, comments: 420, userVote: 0, saved: false, tags: ['JavaScript', 'ES2025'] },
])

const {
  scorePost,
  trackPostView,
  trackPostLike,
  trackSearch,
} = useRecommendations(allPosts)

const allCommunities = ref([
  { name: 'vuejs', icon: '💚', color: '#42b883', description: 'The official Vue.js community for all things Vue.', members: '124K', online: '1.2K' },
  { name: 'webdev', icon: '🌐', color: '#e44d26', description: 'Web development news, tutorials, and discussions.', members: '892K', online: '8.4K' },
  { name: 'programming', icon: '💻', color: '#3498db', description: 'General programming discussion, tips, and resources.', members: '5.2M', online: '42K' },
  { name: 'design', icon: '🎨', color: '#9b59b6', description: 'UI/UX design, graphic design, and creative tools.', members: '310K', online: '2.8K' },
  { name: 'javascript', icon: '⚡', color: '#f0db4f', description: 'Everything JavaScript: tips, tools, frameworks.', members: '1.8M', online: '15K' },
])

const allPeople = ref([
  { username: 'devmaster99', avatar: '🧑‍💻', color: '#42b883', karma: '48.2K', joined: '3 years ago', bio: 'Vue.js contributor and open-source enthusiast.' },
  { username: 'css_wizard', avatar: '🧙', color: '#9b59b6', karma: '22.1K', joined: '5 years ago', bio: 'I speak fluent CSS and sometimes English.' },
  { username: 'algo_nerd', avatar: '🤓', color: '#3498db', karma: '91.4K', joined: '7 years ago', bio: 'Computer science educator and algorithm aficionado.' },
  { username: 'pixel_pusher', avatar: '🎨', color: '#e74c3c', karma: '15.6K', joined: '2 years ago', bio: 'Designer by day, coder by night.' },
])

const relatedCommunities = [
  { name: 'vuejs', color: '#42b883' },
  { name: 'webdev', color: '#e44d26' },
  { name: 'javascript', color: '#f0db4f' },
]

// --- Autocomplete ---
const allTerms = computed(() => [
  ...allPosts.value.map(p => p.title),
  ...allCommunities.value.map(c => `r/${c.name}`),
  ...allPeople.value.map(u => `u/${u.username}`),
])

const suggestions = computed(() => {
  if (!query.value.trim()) return []
  const q = query.value.toLowerCase()
  return allTerms.value.filter(t => t.toLowerCase().includes(q)).slice(0, 6)
})

function onQueryInput() {
  showSuggestions.value = true
}

function selectSuggestion(s) {
  query.value = s
  showSuggestions.value = false
  doSearch()
}

function clearSearch() {
  query.value = ''
  hasSearched.value = false
  showSuggestions.value = false
}

// --- Search logic ---
function doSearch() {
  if (!query.value.trim()) return
  submittedQuery.value = query.value.trim()
  trackSearch(submittedQuery.value)
  hasSearched.value = true
  resultPage.value = 1
  showSuggestions.value = false
}

const filteredPosts = computed(() => {
  const q = submittedQuery.value.toLowerCase()
  return allPosts.value.filter(p =>
    p.title.toLowerCase().includes(q) ||
    (p.body && p.body.toLowerCase().includes(q)) ||
    p.community.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  )
})

const filteredCommunities = computed(() => {
  const q = submittedQuery.value.toLowerCase()
  return allCommunities.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  )
})

const filteredPeople = computed(() => {
  const q = submittedQuery.value.toLowerCase()
  return allPeople.value.filter(u =>
    u.username.toLowerCase().includes(q) || u.bio.toLowerCase().includes(q)
  )
})

const filteredResults = computed(() => {
  let items = []
  if (activeTab.value === 'posts') items = filteredPosts.value
  else if (activeTab.value === 'communities') items = filteredCommunities.value
  else if (activeTab.value === 'people') items = filteredPeople.value

  if (activeTab.value === 'posts') {
    if (sortBy.value === 'relevance') items = [...items].sort((a, b) => scorePost(b) - scorePost(a))
    else if (sortBy.value === 'top') items = [...items].sort((a, b) => b.score - a.score)
    else if (sortBy.value === 'new') items = [...items].sort((a, b) => b.id - a.id)
    else if (sortBy.value === 'comments') items = [...items].sort((a, b) => b.comments - a.comments)
  }
  return items
})

const totalResultPages = computed(() => Math.max(1, Math.ceil(filteredResults.value.length / resultsPerPage)))

const paginatedResults = computed(() => {
  const start = (resultPage.value - 1) * resultsPerPage
  return filteredResults.value.slice(start, start + resultsPerPage)
})

function getTabCount(tab) {
  if (!hasSearched.value) return ''
  if (tab === 'posts') return filteredPosts.value.length
  if (tab === 'communities') return filteredCommunities.value.length
  if (tab === 'people') return filteredPeople.value.length
}

// Reset page on tab change
watch(activeTab, () => { resultPage.value = 1 })

// --- Helpers ---
function highlight(text) {
  if (!text || !submittedQuery.value) return text
  const re = new RegExp(`(${submittedQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(re, '<mark>$1</mark>')
}

function truncate(text, len = 150) {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '…' : text
}

function formatScore(score) {
  if (score >= 1000) return (score / 1000).toFixed(1) + 'k'
  return score
}

function vote(post, dir) {
  if (post.userVote === dir) {
    post.score -= dir
    post.userVote = 0
    trackPostLike(post, -1)
  } else {
    post.score += dir - post.userVote
    post.userVote = dir
    trackPostLike(post, dir)
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');

* { box-sizing: border-box; }

.search-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
  font-family: 'IBM Plex Sans', sans-serif;
  min-height: 80vh;
}

/* ── Hero ── */
.search-hero {
  max-width: 720px;
  margin: 0 auto 32px;
  position: relative;
}
.search-hero-title {
  font-size: 2rem;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0 0 16px;
  letter-spacing: -0.02em;
}
.search-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 14px;
  padding: 6px 10px 6px 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-bar-wrapper:focus-within {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
}
.search-icon { font-size: 1.1rem; color: #999; flex-shrink: 0; }
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 1rem;
  color: #1a1a1a;
  outline: none;
}
.search-input::placeholder { color: #aaa; }
.clear-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #aaa;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  line-height: 1;
}
.clear-btn:hover { background: #f0f0f0; color: #666; }
.search-btn {
  padding: 9px 20px;
  background: #38bdf8;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}
.search-btn:hover { background: #0284c7; }

/* ── Suggestions ── */
.suggestions {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  list-style: none;
  padding: 6px;
  margin: 0;
  z-index: 100;
}
.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
  transition: background 0.1s;
}
.suggestion-item:hover { background: #e0f2fe; color: #0284c7; }
.suggestion-icon { font-size: 0.85rem; color: #aaa; }

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-illustration { font-size: 5rem; margin-bottom: 16px; }
.empty-state h2 { font-size: 1.5rem; font-weight: 700; color: #1a1a1a; margin: 0 0 8px; }
.empty-state p { color: #777; font-size: 1rem; margin: 0 0 24px; }
.popular-searches { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
.popular-label { font-size: 0.875rem; font-weight: 600; color: #888; }
.popular-tag {
  padding: 7px 16px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  color: #444;
  transition: all 0.15s;
}
.popular-tag:hover { border-color: #38bdf8; color: #0284c7; background: #e0f2fe; }

/* ── Tabs ── */
.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 20px;
}
.tab-btn {
  padding: 10px 18px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #777;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}
.tab-btn:hover { color: #0284c7; }
.tab-btn.active { color: #0284c7; border-bottom-color: #38bdf8; }
.tab-count {
  background: #f0f0f0;
  color: #666;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 12px;
}
.tab-btn.active .tab-count { background: #e0f2fe; color: #0284c7; }

/* ── Search Layout ── */
.search-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.results-col { flex: 1; min-width: 0; }

/* ── Controls ── */
.results-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.results-count { font-size: 0.875rem; color: #666; }
.results-count strong { color: #1a1a1a; }
.results-count em { color: #0284c7; font-style: normal; }
.sort-group { display: flex; align-items: center; gap: 8px; }
.sort-label { font-size: 0.8rem; font-weight: 600; color: #888; }
.sort-select {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 6px 12px;
  font-family: inherit;
  font-size: 0.85rem;
  color: #333;
  background: #fff;
  cursor: pointer;
}
.sort-select:focus { outline: none; border-color: #38bdf8; }

.time-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-label-text { font-size: 0.8rem; font-weight: 600; color: #888; }
.time-btn {
  padding: 5px 14px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: #fff;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}
.time-btn:hover, .time-btn.active { border-color: #38bdf8; color: #0284c7; background: #e0f2fe; }

/* ── Result Card ── */
.result-card {
  display: flex;
  gap: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.result-card:hover { border-color: #38bdf8; box-shadow: 0 2px 12px rgba(56, 189, 248, 0.14); }

.result-vote {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 8px;
  background: #fafafa;
  min-width: 46px;
}
.rvote-btn {
  background: none; border: none; cursor: pointer;
  font-size: 0.8rem; color: #bbb; padding: 3px 7px;
  border-radius: 4px; transition: all 0.15s;
}
.rvote-btn.up:hover, .rvote-btn.up.active { color: #0284c7; background: rgba(56, 189, 248, 0.14); }
.rvote-btn.down:hover, .rvote-btn.down.active { color: #7193ff; background: rgba(113,147,255,0.08); }
.rvote-count { font-size: 0.78rem; font-weight: 700; color: #333; }

.result-body { flex: 1; padding: 12px 14px; min-width: 0; }
.result-meta { display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.78rem; color: #888; margin-bottom: 5px; }
.result-community { font-weight: 700; color: #1a1a1a; }
.result-dot { color: #ccc; }

.result-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 5px;
  line-height: 1.4;
}
.result-title :deep(mark) { background: #fff3c4; color: #1a1a1a; border-radius: 2px; padding: 0 1px; }

.result-excerpt { font-size: 0.85rem; color: #666; line-height: 1.55; margin: 0 0 8px; }
.result-excerpt :deep(mark) { background: #fff3c4; color: #1a1a1a; border-radius: 2px; padding: 0 1px; }

.result-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.result-tag {
  background: #f0f4ff; color: #4a6cf7;
  font-size: 0.72rem; font-weight: 600;
  padding: 2px 9px; border-radius: 12px;
}
.result-actions { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.result-stat { font-size: 0.78rem; color: #888; margin-right: 4px; }
.action-sm-btn {
  background: none; border: none; cursor: pointer;
  padding: 4px 10px; border-radius: 6px;
  font-family: inherit; font-size: 0.78rem;
  font-weight: 600; color: #888; transition: all 0.15s;
}
.action-sm-btn:hover { background: #f0f0f0; color: #333; }

/* ── Community Results ── */
.community-result-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
  transition: border-color 0.15s;
}
.community-result-card:hover { border-color: #38bdf8; }
.cr-avatar {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; flex-shrink: 0;
}
.cr-info { flex: 1; min-width: 0; }
.cr-name { font-weight: 700; font-size: 0.95rem; color: #1a1a1a; }
.cr-desc { font-size: 0.82rem; color: #666; margin: 2px 0 4px; }
.cr-stats { font-size: 0.78rem; color: #999; display: flex; gap: 6px; }
.join-btn-lg {
  padding: 8px 20px;
  border: 2px solid #38bdf8;
  border-radius: 20px;
  background: transparent;
  color: #0284c7;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.join-btn-lg:hover { background: #0284c7; color: #fff; }

/* ── People Results ── */
.people-result-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
  transition: border-color 0.15s;
}
.people-result-card:hover { border-color: #38bdf8; }
.user-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; flex-shrink: 0;
}
.user-info { flex: 1; }
.user-name { font-weight: 700; font-size: 0.95rem; color: #1a1a1a; }
.user-karma { font-size: 0.78rem; color: #999; margin: 2px 0 3px; }
.user-bio { font-size: 0.82rem; color: #666; }
.follow-btn {
  padding: 8px 20px;
  border: 2px solid #4a6cf7;
  border-radius: 20px;
  background: transparent;
  color: #4a6cf7;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.follow-btn:hover { background: #4a6cf7; color: #fff; }

/* ── No Results ── */
.no-results {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}
.no-results-emoji { font-size: 3.5rem; margin-bottom: 12px; }
.no-results h3 { font-size: 1.2rem; font-weight: 700; color: #333; margin: 0 0 6px; }
.no-results p { font-size: 0.9rem; margin: 0; }

/* ── Pagination ── */
.result-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
.rpage-btn {
  padding: 8px 18px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  color: #444;
  transition: all 0.15s;
}
.rpage-btn:not(:disabled):hover { border-color: #38bdf8; color: #0284c7; }
.rpage-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.rpage-dots { display: flex; gap: 4px; }
.rpage-dot {
  width: 32px; height: 32px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  color: #666;
  transition: all 0.15s;
}
.rpage-dot.active { background: #38bdf8; border-color: #38bdf8; color: #fff; }
.rpage-dot:not(.active):hover { border-color: #38bdf8; color: #0284c7; }

/* ── Search Sidebar ── */
.search-sidebar { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 72px; }
.ss-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; }
.ss-title { font-size: 0.82rem; font-weight: 700; color: #444; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.ss-tips { margin: 0; padding: 0 0 0 16px; display: flex; flex-direction: column; gap: 6px; }
.ss-tips li { font-size: 0.82rem; color: #666; line-height: 1.5; }
.ss-tips code { background: #f0f0f0; padding: 1px 5px; border-radius: 4px; font-size: 0.8rem; color: #0284c7; }

.related-community {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
.related-community:last-child { border-bottom: none; }
.rc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.rc-name { flex: 1; font-size: 0.85rem; font-weight: 600; color: #333; }
.rc-join {
  font-size: 0.78rem; font-weight: 700; color: #0284c7;
  background: none; border: none; cursor: pointer; padding: 2px 8px;
  border-radius: 12px; border: 1px solid #38bdf8;
  transition: all 0.15s;
}
.rc-join:hover { background: #0284c7; color: #fff; }

.trending-list { display: flex; flex-wrap: wrap; gap: 6px; }
.trending-tag {
  padding: 5px 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 14px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}
.trending-tag:hover { background: #e0f2fe; color: #0284c7; }

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 900px) {
  .search-sidebar { display: none; }
}
@media (max-width: 600px) {
  .search-page { padding: 16px 10px; }
  .search-hero-title { font-size: 1.5rem; }
  .results-controls { flex-direction: column; align-items: flex-start; }
}

</style>
