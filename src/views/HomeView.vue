<template>
  <AppShell>
    <div class="home">
      <main class="stream">
        <section v-if="currentUser" class="composer">
          <button class="compose-trigger" @click="composerOpen = true">
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

    <div v-if="composerOpen" class="modal-backdrop" @click.self="composerOpen = false">
      <form class="post-modal" @submit.prevent="publishPost">
        <header>
          <h2>Create a post</h2>
          <button type="button" aria-label="Close" @click="composerOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <label>
          Community
          <select v-model="draft.community" required>
            <option value="" disabled>Choose a community</option>
            <option v-for="community in communities" :key="community.name" :value="community.name">r/{{ community.name }}</option>
          </select>
        </label>
        <label>
          Title
          <input v-model.trim="draft.title" maxlength="300" required placeholder="Title" />
        </label>
        <label>
          Image URL
          <input v-model.trim="draft.image" type="url" placeholder="https://..." />
        </label>
        <label>
          Body
          <textarea v-model.trim="draft.description" rows="5" placeholder="What do you want to share?"></textarea>
        </label>
        <p v-if="composeError" class="compose-error">{{ composeError }}</p>
        <footer>
          <button type="button" class="cancel" @click="composerOpen = false">Cancel</button>
          <button type="submit" class="publish" :disabled="publishing">{{ publishing ? 'Posting...' : 'Post' }}</button>
        </footer>
      </form>
    </div>
  </AppShell>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import PostCard from '../components/PostCard.vue'
import { createPost, getCommunities, getPosts, joinCommunity, leaveCommunity } from '../services/api.js'
import { formatCount } from '../services/format.js'
import { useAuthUser } from '../services/auth.js'

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

async function loadPosts(cursor) {
  error.value = ''
  if (!cursor) loading.value = true
  try {
    const data = await getPosts({ sort: activeSort.value, cursor })
    posts.value = cursor ? [...posts.value, ...data.posts] : data.posts
    nextCursor.value = data.nextCursor
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

async function publishPost() {
  composeError.value = ''
  publishing.value = true
  try {
    await createPost(draft)
    composerOpen.value = false
    Object.assign(draft, { community: '', title: '', image: '', description: '' })
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
  if (route.query.compose === 'true' && currentUser.value) composerOpen.value = true
})

watch(() => route.query.compose, (value) => {
  if (value === 'true' && currentUser.value) {
    composerOpen.value = true
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
    composerOpen.value = true
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
.modal-backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; background: rgba(15, 26, 28, .52); padding: 20px; }
.post-modal { width: min(560px, 100%); padding: 20px; border-radius: 18px; background: var(--reddit-white); display: flex; flex-direction: column; gap: 14px; }
.post-modal header, .post-modal footer { display: flex; align-items: center; justify-content: space-between; }
.post-modal header h2 { font-size: 19px; }
.post-modal header button { width: 36px; height: 36px; border-radius: 50%; }
.post-modal label { display: flex; flex-direction: column; gap: 7px; color: var(--reddit-text-secondary); font-size: 13px; font-weight: 600; }
.post-modal input, .post-modal select, .post-modal textarea { width: 100%; padding: 11px 13px; border: 1px solid var(--reddit-border); border-radius: 10px; background: var(--reddit-surface-inset); font-size: 14px; resize: vertical; }
.post-modal input:focus, .post-modal textarea:focus, .post-modal select:focus { border-color: var(--reddit-blue); outline: none; }
.compose-error { color: #b42318; font-size: 13px; }
.post-modal footer { justify-content: flex-end; gap: 10px; padding-top: 4px; }
.post-modal footer button { height: 40px; padding: 0 20px; border-radius: 21px; font-weight: 700; }
.cancel { border: 1px solid var(--reddit-border-emphasis); }
.publish { background: var(--reddit-orange); color: #fff; }
@media (max-width: 850px) { .home { padding: 10px 8px; } .rail { display: none; } .sort-row { overflow-x: auto; } }
</style>
