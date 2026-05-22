<template>
  <div class="home-page">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-inner">
        <div class="feed-filter">
          <button
            v-for="filter in filters"
            :key="filter.value"
            class="filter-btn"
            :class="{ active: activeFilter === filter.value }"
            @click="activeFilter = filter.value"
          >
            <span class="filter-icon">{{ filter.icon }}</span>
            {{ filter.label }}
          </button>
        </div>

        <div class="sidebar-card">
          <h3 class="sidebar-card-title">🔥 Trending Communities</h3>
          <ul class="community-list">
            <li v-for="community in trendingCommunities" :key="community.name" class="community-item">
              <div class="community-avatar" :style="{ background: community.color }">
                {{ community.icon }}
              </div>
              <div class="community-info">
                <span class="community-name">r/{{ community.name }}</span>
                <span class="community-members">{{ community.members }} members</span>
              </div>
              <button class="join-btn">Join</button>
            </li>
          </ul>
        </div>

        <div class="sidebar-card">
          <h3 class="sidebar-card-title">Your Interests</h3>
          <div v-if="topInterests.length" class="interest-list">
            <span
              v-for="interest in topInterests"
              :key="interest.term"
              class="interest-pill"
            >
              {{ interest.term }}
            </span>
          </div>
          <p v-else class="sidebar-card-desc">
            View, like, and search posts to train your feed.
          </p>
        </div>

        <div class="sidebar-card create-card">
          <h3 class="sidebar-card-title">Start a Community</h3>
          <p class="sidebar-card-desc">Build a place for people who share your interests.</p>
          <button class="create-btn">Create Community</button>
        </div>

      </div>
    </aside>

    <!-- Main Feed -->
    <main class="feed">
      <!-- Create Post Bar -->
      <div class="create-post-bar">
        <div class="avatar-placeholder">👤</div>
        <input class="create-post-input" placeholder="What's on your mind?" readonly @click="showCreateModal = true" />
      </div>

      <!-- Sort Bar -->
      <div class="sort-bar">
        <button
          v-for="sort in sortOptions"
          :key="sort.value"
          class="sort-btn"
          :class="{ active: activeSort === sort.value }"
          @click="setSort(sort.value)"
        >
          {{ sort.icon }} {{ sort.label }}
        </button>
      </div>

      <!-- Personalized Recommendations -->
      <section v-if="activeFilter === 'recommended' && recommendations.length" class="recommendation-section">
        <div class="recommendation-header">
          <div>
            <p class="recommendation-kicker">Personalized Feed</p>
            <h2>Recommended for you</h2>
          </div>
          <span class="recommendation-badge">Ranked by your activity</span>
        </div>
        <div class="recommendation-grid">
          <article
            v-for="post in recommendations"
            :key="`recommendation-${post.id}`"
            class="recommendation-card"
            @click="trackPostView(post)"
          >
            <div class="recommendation-score">{{ post.recommendationScore }}</div>
            <div class="recommendation-content">
              <p class="recommendation-reason">{{ post.recommendationReason }}</p>
              <h3>{{ post.title }}</h3>
              <div class="recommendation-meta">
                <span>r/{{ post.community }}</span>
                <span>{{ formatScore(post.score) }} points</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Posts -->
      <transition-group name="post-list" tag="div">
        <article
          v-for="post in sortedPosts"
          :key="post.id"
          class="post-card"
          @click="trackPostView(post)"
        >
          <!-- Post Content -->
          <div class="post-content">
            <div class="post-meta">
              <span class="post-community">r/{{ post.community }}</span>
              <span class="post-dot">·</span>
              <span class="post-author">Posted by u/{{ post.author }}</span>
              <span class="post-dot">·</span>
              <span class="post-time">{{ post.time }}</span>
            </div>
            <h2 class="post-title">{{ post.title }}</h2>
            <p v-if="post.body" class="post-body">{{ post.body }}</p>
            <img v-if="post.image" :src="post.image" :alt="post.title" class="post-image" />
            <div class="post-tags">
              <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
            </div>
            <div class="post-actions">
              <button class="action-btn">
                💬 {{ post.comments }} Comments
              </button>
              <button
                class="action-btn"
                :class="{ active: post.userVote === 1 }"
                @click.stop="vote(post, 1)"
              >
                {{ post.userVote === 1 ? '♥ Liked' : '♡ Like' }}
              </button>
              <button class="action-btn" @click="post.saved = !post.saved">
                {{ post.saved ? '🔖' : '📋' }} {{ post.saved ? 'Saved' : 'Save' }}
              </button>
              <button class="action-btn">🔗 Share</button>
            </div>
          </div>

          <!-- Thumbnail -->
          <div v-if="post.thumbnail" class="post-thumbnail">
            <img :src="post.thumbnail" :alt="post.title" />
          </div>
        </article>
      </transition-group>

      <!-- Pagination -->
      <div class="pagination">
        <template v-for="page in totalPages" :key="page">
          <button
            class="page-number"
            :class="{ active: currentPage === page }"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
        </template>
      </div>
    </main>

    <!-- Create Post Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Create a Post</h2>
          <button class="modal-close" @click="showCreateModal = false">✕</button>
        </div>
        <div class="modal-body">
          <input v-model="newPost.community" class="modal-input" placeholder="Choose a community" />
          <input v-model="newPost.title" class="modal-input" placeholder="Title *" maxlength="300" />
          <div class="char-count">{{ newPost.title.length }}/300</div>
          <textarea v-model="newPost.body" class="modal-textarea" placeholder="Text (optional)" rows="5"></textarea>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showCreateModal = false">Cancel</button>
          <button class="submit-btn" :disabled="!newPost.title.trim()" @click="submitPost">Post</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRecommendations } from '../composables/useRecommendations'

// --- State ---
const activeFilter = ref('home')
const activeSort = ref('hot')
const currentPage = ref(1)
const postsPerPage = 5
const showCreateModal = ref(false)
const newPost = ref({ title: '', body: '', community: '' })

const filters = [
  { label: 'Home', value: 'home', icon: '🏠' },
  { label: 'Recommended', value: 'recommended', icon: '✨' },
]

const sortOptions = [
  { label: 'Hot', value: 'hot', icon: '🔥' },
  { label: 'For You', value: 'recommended', icon: '✨' },
  { label: 'New', value: 'new', icon: '✨' },
  { label: 'Top', value: 'top', icon: '🏆' },
  { label: 'Rising', value: 'rising', icon: '📈' },
]

const trendingCommunities = [
  { name: 'vuejs', icon: '💚', color: '#42b883', members: '124K' },
  { name: 'webdev', icon: '🌐', color: '#e44d26', members: '892K' },
  { name: 'programming', icon: '💻', color: '#3498db', members: '5.2M' },
  { name: 'design', icon: '🎨', color: '#9b59b6', members: '310K' },
  { name: 'gaming', icon: '🎮', color: '#e74c3c', members: '2.1M' },
]

const posts = ref([
  {
    id: 1, community: 'vuejs', author: 'devmaster99', time: '2 hours ago',
    title: 'Vue 3.5 just dropped and the performance improvements are incredible 🚀',
    body: 'Just migrated our production app and the reactivity system overhaul made a noticeable difference. Anyone else seeing significant gains?',
    score: 4821, comments: 312, userVote: 0, saved: false,
    tags: ['Vue 3', 'Performance', 'Update'],
    thumbnail: 'https://vuejs.org/logo.svg', image: null,
  },
  {
    id: 2, community: 'webdev', author: 'css_wizard', time: '4 hours ago',
    title: 'I built a fully responsive Reddit clone using only CSS Grid and no JavaScript layout tricks',
    body: 'After 3 weeks of pain, I finally have a pixel-perfect layout. Here\'s what I learned about modern CSS.',
    score: 2340, comments: 187, userVote: 0, saved: false,
    tags: ['CSS', 'Grid', 'Tutorial'],
    thumbnail: null, image: null,
  },
  {
    id: 3, community: 'programming', author: 'algo_nerd', time: '5 hours ago',
    title: 'Why most developers misunderstand Big O notation (and why it matters)',
    body: null,
    score: 7892, comments: 543, userVote: 0, saved: false,
    tags: ['Algorithms', 'CS'],
    thumbnail: null, image: null,
  },
  {
    id: 4, community: 'design', author: 'pixel_pusher', time: '6 hours ago',
    title: '2025 UI trends that are actually worth adopting (and ones to avoid)',
    body: 'I analyzed 500 popular apps released this year and compiled the patterns that genuinely improve UX.',
    score: 1560, comments: 98, userVote: 0, saved: false,
    tags: ['UI/UX', 'Trends', '2025'],
    thumbnail: null, image: null,
  },
  {
    id: 5, community: 'gaming', author: 'xp_farmer', time: '8 hours ago',
    title: 'After 1000 hours I finally beat Elden Ring without taking damage 😤',
    body: null,
    score: 31204, comments: 2104, userVote: 0, saved: false,
    tags: ['Achievement', 'Challenge'],
    thumbnail: null, image: null,
  },
  {
    id: 6, community: 'vuejs', author: 'composables_fan', time: '10 hours ago',
    title: 'Pinia vs Vuex in 2025: a definitive guide for state management',
    body: 'With the ecosystem maturing, I wanted to write a comprehensive comparison based on real-world usage.',
    score: 983, comments: 75, userVote: 0, saved: false,
    tags: ['Pinia', 'Vuex', 'State'],
    thumbnail: null, image: null,
  },
  {
    id: 7, community: 'webdev', author: 'perf_guru', time: '12 hours ago',
    title: 'I cut our app\'s bundle size by 60% — here\'s the step-by-step breakdown',
    body: 'Using tree-shaking, dynamic imports, and a few Vite tricks, we went from 2.4MB to 960KB.',
    score: 5421, comments: 389, userVote: 0, saved: false,
    tags: ['Performance', 'Vite', 'Optimization'],
    thumbnail: null, image: null,
  },
])

const {
  recommendations,
  topInterests,
  scorePost,
  trackPostView,
  trackPostLike,
} = useRecommendations(posts)

// --- Computed ---
const sortedPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  let sorted = [...posts.value]
  if (activeFilter.value === 'recommended') sorted.sort((a, b) => scorePost(b) - scorePost(a))
  if (activeSort.value === 'hot') sorted.sort((a, b) => b.score - a.score)
  else if (activeSort.value === 'recommended') sorted.sort((a, b) => scorePost(b) - scorePost(a))
  else if (activeSort.value === 'new') sorted.sort((a, b) => b.id - a.id)
  else if (activeSort.value === 'top') sorted.sort((a, b) => b.score - a.score)
  else if (activeSort.value === 'rising') sorted.sort((a, b) => b.comments - a.comments)
  return sorted.slice(start, start + postsPerPage)
})

const totalPages = computed(() => Math.ceil(posts.value.length / postsPerPage))

// --- Methods ---
function setSort(val) {
  activeSort.value = val
  currentPage.value = 1
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

function formatScore(score) {
  if (score >= 1000) return (score / 1000).toFixed(1) + 'k'
  return score
}

function submitPost() {
  if (!newPost.value.title.trim()) return
  posts.value.unshift({
    id: Date.now(),
    community: newPost.value.community.replace('r/', '') || 'general',
    author: 'you',
    time: 'just now',
    title: newPost.value.title,
    body: newPost.value.body || null,
    score: 1, comments: 0, userVote: 1, saved: false,
    tags: [], thumbnail: null, image: null,
  })
  newPost.value = { title: '', body: '', community: '' }
  showCreateModal.value = false
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');

* { box-sizing: border-box; }

.home-page {
  display: flex;
  gap: 24px;
  max-width: 1200px;
  margin: 24px auto;
  padding: 0 16px;
  font-family: 'IBM Plex Sans', sans-serif;
  align-items: flex-start;
}

/* ── Sidebar ── */
.sidebar { width: 280px; flex-shrink: 0; position: sticky; top: 72px; }
.sidebar-inner { display: flex; flex-direction: column; gap: 12px; }

.feed-filter {
  background: var(--bs-body-bg, #fff);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.filter-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border: none; border-radius: 8px;
  background: transparent; cursor: pointer;
  font-family: inherit; font-size: 0.9rem; font-weight: 500;
  color: #444; text-align: left; transition: background 0.15s;
}
.filter-btn:hover { background: #f0f0f0; }
.filter-btn.active { background: #38bdf8; color: #fff; }
.filter-icon { font-size: 1rem; }

.sidebar-card {
  background: #fff; border: 1px solid #e0e0e0;
  border-radius: 12px; padding: 16px;
}
.sidebar-card-title { font-size: 0.85rem; font-weight: 700; color: #222; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.sidebar-card-desc { font-size: 0.85rem; color: #666; margin: 0 0 12px; }
.interest-list { display: flex; flex-wrap: wrap; gap: 6px; }
.interest-pill {
  background: #f0f4ff;
  color: #3656d4;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 12px;
}

.community-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.community-item { display: flex; align-items: center; gap: 10px; }
.community-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; flex-shrink: 0;
}
.community-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.community-name { font-size: 0.85rem; font-weight: 600; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.community-members { font-size: 0.75rem; color: #888; }
.join-btn {
  padding: 4px 12px; border: 2px solid #38bdf8; border-radius: 20px;
  background: transparent; color: #0284c7; font-size: 0.8rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0;
}
.join-btn:hover { background: #0284c7; color: #fff; }

.create-card { background: linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%); border-color: transparent; }
.create-card .sidebar-card-title { color: #fff; }
.create-card .sidebar-card-desc { color: rgba(255,255,255,0.85); }
.create-btn {
  width: 100%; padding: 10px; border: 2px solid #fff;
  border-radius: 8px; background: transparent; color: #fff;
  font-family: inherit; font-weight: 700; font-size: 0.9rem;
  cursor: pointer; transition: all 0.15s;
}
.create-btn:hover { background: #fff; color: #0284c7; }

/* ── Feed ── */
.feed { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }

.create-post-bar {
  display: flex; align-items: center; gap: 10px;
  background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 10px 14px;
}
.avatar-placeholder { font-size: 1.4rem; flex-shrink: 0; }
.create-post-input {
  flex: 1; border: 1px solid #e0e0e0; border-radius: 8px;
  padding: 8px 14px; font-family: inherit; font-size: 0.9rem;
  color: #aaa; cursor: pointer; transition: border-color 0.15s;
}
.create-post-input:hover { border-color: #38bdf8; }
.sort-bar {
  display: flex; gap: 4px;
  background: #fff; border: 1px solid #e0e0e0;
  border-radius: 12px; padding: 8px 12px;
}
.sort-btn {
  padding: 7px 16px; border: none; border-radius: 8px;
  background: transparent; cursor: pointer; font-family: inherit;
  font-size: 0.875rem; font-weight: 600; color: #666; transition: all 0.15s;
}
.sort-btn:hover { background: #f0f0f0; color: #222; }
.sort-btn.active { background: #38bdf8; color: #fff; }

/* ── Recommendations ── */
.recommendation-section {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
}
.recommendation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.recommendation-kicker {
  margin: 0 0 2px;
  color: #0284c7;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.recommendation-header h2 {
  margin: 0;
  color: #1a1a1a;
  font-size: 1.05rem;
}
.recommendation-badge {
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 999px;
  color: #0284c7;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 5px 10px;
}
.recommendation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.recommendation-card {
  display: flex;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #ececec;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}
.recommendation-card:hover {
  border-color: #38bdf8;
  transform: translateY(-1px);
}
.recommendation-score {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: #38bdf8;
  border-radius: 10px;
  color: #fff;
  flex-shrink: 0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.78rem;
  font-weight: 800;
}
.recommendation-content { min-width: 0; }
.recommendation-reason {
  margin: 0 0 4px;
  color: #777;
  font-size: 0.74rem;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recommendation-content h3 {
  margin: 0 0 7px;
  color: #1a1a1a;
  font-size: 0.9rem;
  line-height: 1.35;
}
.recommendation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #888;
  font-size: 0.75rem;
  font-weight: 600;
}

/* ── Post Card ── */
.post-card {
  display: flex; gap: 0;
  background: #fff; border: 1px solid #e0e0e0;
  border-radius: 12px; overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.post-card:hover { border-color: #38bdf8; box-shadow: 0 2px 16px rgba(56, 189, 248, 0.14); }
.post-content { flex: 1; padding: 12px 14px; min-width: 0; }
.post-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 0.78rem; color: #888; margin-bottom: 6px; }
.post-community { font-weight: 700; color: #1a1a1a; }
.post-dot { color: #ccc; }
.post-title { font-size: 1.05rem; font-weight: 600; color: #1a1a1a; margin: 0 0 6px; line-height: 1.4; }
.post-body { font-size: 0.875rem; color: #555; line-height: 1.6; margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.post-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }

.post-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.post-tag { background: #f0f4ff; color: #4a6cf7; font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 12px; }

.post-actions { display: flex; flex-wrap: wrap; gap: 4px; }
.action-btn {
  background: none; border: none; cursor: pointer;
  padding: 6px 10px; border-radius: 8px; font-family: inherit;
  font-size: 0.8rem; font-weight: 600; color: #888;
  transition: all 0.15s;
}
.action-btn:hover { background: #f0f0f0; color: #333; }
.action-btn.active { color: #0284c7; background: #e0f2fe; }

.post-thumbnail {
  width: 90px; flex-shrink: 0; overflow: hidden;
  display: flex; align-items: center; justify-content: center; background: #f5f5f5;
}
.post-thumbnail img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }

/* ── Pagination ── */
.pagination { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; }
.page-number {
  min-width: 36px;
  border: 1px solid #d7d7d7;
  border-radius: 8px;
  background: #fff;
  color: #444;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 7px 11px;
  transition: all 0.15s;
}
.page-number:hover,
.page-number.active {
  border-color: #38bdf8;
  color: #0284c7;
  background: #e0f2fe;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: #fff; border-radius: 16px; width: 540px; max-width: 95vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid #eee;
}
.modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
.modal-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666; padding: 4px 8px; border-radius: 6px; }
.modal-close:hover { background: #f0f0f0; }
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.modal-input, .modal-textarea {
  width: 100%; border: 1px solid #ddd; border-radius: 8px;
  padding: 10px 14px; font-family: inherit; font-size: 0.9rem;
  transition: border-color 0.15s; resize: vertical;
}
.modal-input:focus, .modal-textarea:focus { outline: none; border-color: #38bdf8; }
.char-count { font-size: 0.75rem; color: #aaa; text-align: right; margin-top: -6px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 20px; border-top: 1px solid #eee;
}
.cancel-btn {
  padding: 9px 20px; border: 2px solid #ddd; border-radius: 8px;
  background: none; font-family: inherit; font-weight: 600; cursor: pointer; color: #666;
}
.cancel-btn:hover { border-color: #999; }
.submit-btn {
  padding: 9px 24px; border: none; border-radius: 8px;
  background: #38bdf8; color: #fff; font-family: inherit;
  font-weight: 700; cursor: pointer; transition: background 0.15s;
}
.submit-btn:hover:not(:disabled) { background: #0284c7; }
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Transitions ── */
.post-list-enter-active { transition: all 0.3s ease; }
.post-list-enter-from { opacity: 0; transform: translateY(-10px); }

/* ── Responsive ── */
@media (max-width: 900px) {
  .sidebar { display: none; }
}
@media (max-width: 600px) {
  .home-page { padding: 0 8px; margin: 12px auto; }
  .post-thumbnail { display: none; }
  .sort-bar { overflow-x: auto; }
  .recommendation-header { align-items: flex-start; flex-direction: column; }
  .recommendation-grid { grid-template-columns: 1fr; }
}

</style>
