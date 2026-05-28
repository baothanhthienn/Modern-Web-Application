<template>
  <AppShell>
    <div class="home">
      <main class="stream">
        <section v-if="currentUser" class="composer">
          <button class="compose-trigger" @click="openComposer">
            <i class="fa-solid fa-plus"></i>
            Create a post
          </button>
        </section>

        <nav class="sort-row" aria-label="Sort feed">
          <button
            v-for="sort in sorts"
            :key="sort.value"
            :class="{ selected: activeSort === sort.value }"
            @click="selectSort(sort.value)"
          >
            <i :class="sort.icon"></i>{{ sort.label }}
          </button>
        </nav>

        <section v-if="recommendations.length && !recDismissed" class="rec-section" aria-label="Recommended posts">
          <h3 class="rec-heading">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Recommended for you
            <button class="rec-dismiss" aria-label="Hide recommendations" @click="dismissRecs">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </h3>
          <div class="rec-stream">
            <div v-for="rec in recommendations" :key="rec.id" class="rec-wrap">
              <p class="rec-reason">{{ getExplanation(rec) }}</p>
              <PostCard :post="rec" @updated="replacePost" />
            </div>
          </div>
        </section>

        <button v-if="recommendations.length && recDismissed" class="rec-restore" @click="restoreRecs">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Show recommendations
        </button>

        <div v-if="loading" class="status"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading posts</div>
        <div v-else-if="error" class="status status--error">
          <p>{{ error }}</p>
          <button @click="loadPosts()">Try again</button>
        </div>
        <section v-else-if="posts.length" class="post-stream" aria-label="Posts">
          <PostCard v-for="post in posts" :key="post.id" :post="post" @updated="replacePost" />
          <button v-if="nextCursor" class="load-more" @click="loadPosts(nextCursor)">Load more posts</button>
        </section>
        <div v-else class="status">No posts have been published.</div>
      </main>

      <aside class="rail">
        <section class="rail-card">
          <h2>Communities</h2>
          <div v-if="communitiesLoading" class="mini-status">Loading communities...</div>
          <div v-else-if="communityError" class="mini-status">{{ communityError }}</div>
          <div v-else class="community-list">
            <div v-for="community in communities" :key="community.name" class="community">
              <span class="community-dot" :style="{ background: community.color || 'var(--reddit-blue)' }"></span>
              <div class="community-copy">
                <strong>r/{{ community.name }}</strong>
                <span>{{ formatCount(community.memberCount) }} members</span>
              </div>
              <button class="join" :class="{ joined: community.joined }" @click="toggleJoin(community)">
                {{ community.joined ? 'Joined' : 'Join' }}
              </button>
            </div>
          </div>
        </section>

        <section class="rail-card rail-card--quiet">
          <h2>Community chat</h2>
          <p>Chat access is available after joining a community.</p>
          <router-link class="rail-link" to="/chat">Open chats</router-link>
        </section>
      </aside>
    </div>

    <PostComposerModal
      :open="composerOpen"
      heading="Create a post"
      submit-label="Post"
      loading-label="Posting..."
      :submitting="publishing"
      :error="composeError"
      :communities="communities"
      :initial-draft="draft"
      @close="composerOpen = false"
      @submit="publishPost"
    />
  </AppShell>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import PostComposerModal from '../components/PostComposerModal.vue'
import PostCard from '../components/PostCard.vue'
import { createPost, getCommunities, getPosts, joinCommunity, leaveCommunity } from '../services/api.js'
import { formatCount } from '../services/format.js'
import { useAuthUser } from '../services/auth.js'
import { scoreAndRankPosts, hasEnoughHistory, getExplanation, loadHistory } from '../services/recommendations.js'

const currentUser = useAuthUser()
const route = useRoute()
const router = useRouter()
const sorts = [
  { value: 'best', label: 'Best', icon: 'fa-solid fa-rocket' },
  { value: 'hot', label: 'Hot', icon: 'fa-solid fa-fire' },
  { value: 'new', label: 'New', icon: 'fa-solid fa-clock' },
  { value: 'top', label: 'Top', icon: 'fa-solid fa-arrow-trend-up' },
  { value: 'rising', label: 'Rising', icon: 'fa-solid fa-chart-line' },
]
const allowedSorts = new Set(sorts.map((sort) => sort.value))
const activeSort = ref(allowedSorts.has(route.query.sort) ? route.query.sort : 'best')
const posts = ref([])
const recommendations = ref([])
const cachedHistory = ref(null)
const recDismissed = ref(localStorage.getItem('reddit_rec_dismissed') === '1')
const nextCursor = ref(null)
const loading = ref(true)
const error = ref('')
const communities = ref([])
const communitiesLoading = ref(true)
const communityError = ref('')
const composerOpen = ref(false)
const publishing = ref(false)
const composeError = ref('')
const draft = reactive({ community: '', title: '', image: '', description: '' })

function dismissRecs() {
  recDismissed.value = true
  localStorage.setItem('reddit_rec_dismissed', '1')
}

function restoreRecs() {
  recDismissed.value = false
  localStorage.removeItem('reddit_rec_dismissed')
}

function resetDraft() {
  Object.assign(draft, { community: '', title: '', image: '', description: '' })
}

function openComposer() {
  composeError.value = ''
  resetDraft()
  composerOpen.value = true
}

async function loadPosts(cursor) {
  error.value = ''
  if (!cursor) loading.value = true
  try {
    if (!cursor) {
      const [data, history] = await Promise.all([getPosts({ sort: activeSort.value }), loadHistory()])
      posts.value = data.posts
      nextCursor.value = data.nextCursor
      cachedHistory.value = history
      recommendations.value = hasEnoughHistory(history) ? scoreAndRankPosts(posts.value, history) : []
    } else {
      const data = await getPosts({ sort: activeSort.value, cursor })
      posts.value = [...posts.value, ...data.posts]
      nextCursor.value = data.nextCursor
      const history = cachedHistory.value
      recommendations.value = hasEnoughHistory(history) ? scoreAndRankPosts(posts.value, history) : []
    }
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

async function loadCommunities() {
  try {
    const data = await getCommunities()
    communities.value = data.communities
  } catch (loadError) {
    communityError.value = loadError.message
  } finally {
    communitiesLoading.value = false
  }
}

function selectSort(sort) {
  activeSort.value = sort
  router.replace(sort === 'best' ? { path: '/' } : { path: '/', query: { sort } })
  loadPosts()
}

function replacePost(updated) {
  const index = posts.value.findIndex((post) => post.id === updated.id)
  if (index >= 0) posts.value[index] = updated
}

async function toggleJoin(community) {
  communityError.value = ''
  try {
    await (community.joined ? leaveCommunity(community.name) : joinCommunity(community.name))
    community.joined = !community.joined
  } catch (actionError) {
    communityError.value = actionError.message
  }
}

async function publishPost(nextDraft) {
  composeError.value = ''
  publishing.value = true
  try {
    await createPost(nextDraft)
    composerOpen.value = false
    resetDraft()
    await loadPosts()
  } catch (actionError) {
    composeError.value = actionError.message
  } finally {
    publishing.value = false
  }
}

onMounted(() => {
  loadPosts()
  loadCommunities()
  if (route.query.compose === 'true' && currentUser.value) openComposer()
})

watch(() => route.query.compose, (value) => {
  if (value === 'true' && currentUser.value) {
    openComposer()
    router.replace({ path: '/' })
  }
})

watch(() => route.query.sort, (sort) => {
  const nextSort = allowedSorts.has(sort) ? sort : 'best'
  if (nextSort !== activeSort.value) {
    activeSort.value = nextSort
    loadPosts()
  }
})

watch(currentUser, (user) => {
  if (user && route.query.compose === 'true') {
    openComposer()
    router.replace({ path: '/' })
  }
})
</script>

<style scoped>
.home { display: flex; align-items: flex-start; gap: 24px; width: min(1024px, 100%); margin: 0 auto; padding: 18px 24px 48px; }
.stream { flex: 1; min-width: 0; max-width: 680px; }
.composer { margin-bottom: 12px; padding: 8px; border: 1px solid var(--reddit-border-soft); border-radius: 16px; }
.compose-trigger { width: 100%; height: 44px; padding: 0 16px; border-radius: 24px; background: var(--reddit-surface-inset); color: var(--reddit-text-secondary); display: flex; align-items: center; gap: 12px; font-size: 14px; }
.compose-trigger:hover { background: var(--reddit-surface-hover); }
.sort-row { height: 52px; display: flex; align-items: center; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid var(--reddit-border-soft); }
.sort-row button { height: 38px; padding: 0 14px; border-radius: 20px; color: var(--reddit-text-secondary); display: inline-flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 600; }
.sort-row button:hover, .sort-row .selected { background: var(--reddit-surface-inset); color: var(--reddit-text); }
.sort-row .selected { font-weight: 700; }
.post-stream { border-radius: 16px; }
.status { min-height: 220px; display: grid; place-content: center; gap: 12px; color: var(--reddit-text-secondary); text-align: center; font-size: 14px; }
.status i { color: var(--reddit-orange); }
.status button, .load-more { margin: 8px auto; height: 40px; padding: 0 20px; border: 1px solid var(--reddit-border-emphasis); border-radius: 22px; font-weight: 600; }
.status--error { color: #b42318; }
.load-more { display: block; }
.rail { width: 296px; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 72px; }
.rail-card { padding: 16px; border-radius: 16px; background: var(--reddit-surface-inset); }
.rail-card h2 { margin-bottom: 14px; font-size: 15px; font-weight: 700; }
.community-list { display: flex; flex-direction: column; gap: 12px; }
.community { display: flex; align-items: center; gap: 9px; }
.community-dot { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; }
.community-copy { flex: 1; min-width: 0; }
.community-copy strong, .community-copy span { display: block; font-size: 13px; }
.community-copy span, .rail-card p, .mini-status { color: var(--reddit-text-secondary); font-size: 12px; }
.join { height: 32px; padding: 0 13px; border: 1px solid var(--reddit-border-emphasis); border-radius: 18px; font-size: 12px; font-weight: 700; }
.join:not(.joined) { background: var(--reddit-blue); border-color: var(--reddit-blue); color: #fff; }
.rail-card p { margin-bottom: 14px; line-height: 1.5; }
.rail-link { color: var(--reddit-blue); font-size: 13px; font-weight: 600; text-decoration: none; }
@media (max-width: 850px) { .home { padding: 10px 8px; } .rail { display: none; } .sort-row { overflow-x: auto; } }
.rec-section { margin-bottom: 20px; border-radius: 16px; border: 1px solid var(--reddit-border-soft); overflow: hidden; }
.rec-heading { padding: 12px 16px 8px; font-size: 13px; font-weight: 700; color: var(--reddit-text-secondary); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--reddit-border-soft); }
.rec-heading i { color: var(--reddit-orange); }
.rec-dismiss { margin-left: auto; width: 28px; height: 28px; border-radius: 50%; color: var(--reddit-text-muted); display: grid; place-items: center; font-size: 13px; }
.rec-dismiss:hover { background: var(--reddit-surface-hover); color: var(--reddit-text); }
.rec-restore { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; margin-bottom: 12px; border-radius: 18px; border: 1px solid var(--reddit-border-soft); background: var(--reddit-surface-inset); color: var(--reddit-text-secondary); font-size: 13px; font-weight: 600; }
.rec-restore i { color: var(--reddit-orange); }
.rec-restore:hover { background: var(--reddit-surface-hover); color: var(--reddit-text); }
.rec-wrap { border-top: 1px solid var(--reddit-border-soft); }
.rec-wrap:first-child { border-top: none; }
.rec-reason { padding: 8px 16px 0; font-size: 11px; color: var(--reddit-text-muted); font-style: italic; }
</style>
