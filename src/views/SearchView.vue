<template>
  <AppShell>
    <div class="search-page">
      <form class="search-hero" @submit.prevent="runSearch">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="query" type="search" minlength="2" maxlength="100" placeholder="Search posts and people" />
        <button type="submit" :disabled="query.trim().length < 2">Search</button>
      </form>

      <template v-if="searched">
        <header class="results-head">
          <h1>Search results for <strong>{{ submittedQuery }}</strong></h1>
          <nav aria-label="Search categories">
            <button v-for="tab in tabs" :key="tab.value" :class="{ selected: activeTab === tab.value }" @click="activeTab = tab.value">
              {{ tab.label }} <span>{{ count(tab.value) }}</span>
            </button>
          </nav>
        </header>

        <div v-if="loading" class="state">Searching...</div>
        <div v-else-if="error" class="state state--error">{{ error }}</div>

        <section v-else-if="activeTab === 'posts'" class="results-column">
          <PostCard v-for="post in posts" :key="post.id" :post="post" @updated="replacePost" />
          <div v-if="!posts.length" class="state">No matching post titles found.</div>
        </section>

        <section v-else-if="activeTab === 'people'" class="people-list">
          <router-link v-for="user in users" :key="user.username" :to="`/profile/${user.username}`" class="person">
            <span>{{ avatarLetter(user.username) }}</span>
            <div><strong>u/{{ user.username }}</strong><p>View public profile and activity</p></div>
            <i class="fa-solid fa-arrow-right"></i>
          </router-link>
          <div v-if="!users.length" class="state">No matching users found.</div>
        </section>

        <section v-else class="community-results">
          <article v-for="community in matchingCommunities" :key="community.name" class="community">
            <span class="community-avatar" :style="{ background: community.color || 'var(--reddit-blue)' }">{{ avatarLetter(community.name) }}</span>
            <div>
              <strong>r/{{ community.name }}</strong>
              <p>{{ formatCount(community.memberCount) }} members</p>
            </div>
            <button :class="{ joined: community.joined }" @click="toggleJoin(community)">
              {{ community.joined ? 'Joined' : 'Join' }}
            </button>
          </article>
          <div v-if="!matchingCommunities.length" class="state">No matching communities found.</div>
        </section>
      </template>

      <div v-else class="initial-state">
        <i class="fa-regular fa-compass"></i>
        <h1>Search Reddit</h1>
        <p>Find public posts, communities, and redditors from server content.</p>
      </div>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import PostCard from '../components/PostCard.vue'
import { getCommunities, joinCommunity, leaveCommunity, searchContent } from '../services/api.js'
import { avatarLetter, formatCount } from '../services/format.js'
import { trackSearchKeyword } from '../services/recommendations.js'

const route = useRoute()
const router = useRouter()
const query = ref('')
const submittedQuery = ref('')
const searched = ref(false)
const loading = ref(false)
const error = ref('')
const activeTab = ref('posts')
const posts = ref([])
const users = ref([])
const communities = ref([])
const tabs = [
  { label: 'Posts', value: 'posts' },
  { label: 'Communities', value: 'communities' },
  { label: 'People', value: 'people' },
]
const matchingCommunities = computed(() => {
  const text = submittedQuery.value.toLowerCase()
  return communities.value.filter((community) => community.name.toLowerCase().includes(text))
})

function count(tab) {
  if (tab === 'posts') return posts.value.length
  if (tab === 'people') return users.value.length
  return matchingCommunities.value.length
}

async function runSearch() {
  const text = query.value.trim()
  if (text.length < 2) return
  trackSearchKeyword(text)
  router.replace({ path: '/search', query: { q: text } })
  submittedQuery.value = text
  searched.value = true
  loading.value = true
  error.value = ''
  try {
    const [results, communityData] = await Promise.all([searchContent(text), getCommunities()])
    posts.value = results.posts
    users.value = results.users
    communities.value = communityData.communities
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

function replacePost(updated) {
  const index = posts.value.findIndex((post) => post.id === updated.id)
  if (index >= 0) posts.value[index] = updated
}

async function toggleJoin(community) {
  error.value = ''
  try {
    await (community.joined ? leaveCommunity(community.name) : joinCommunity(community.name))
    community.joined = !community.joined
  } catch (actionError) {
    error.value = actionError.message
  }
}

function applyRouteQuery() {
  const value = typeof route.query.q === 'string' ? route.query.q : ''
  if (value.length >= 2 && value !== submittedQuery.value) {
    query.value = value
    runSearch()
  }
}

watch(() => route.query.q, applyRouteQuery)
onMounted(applyRouteQuery)
</script>

<style scoped>
.search-page { width: min(920px, 100%); margin: 0 auto; padding: 22px 24px 56px; }
.search-hero { height: 54px; display: flex; align-items: center; gap: 12px; padding: 0 8px 0 18px; border: 1px solid var(--reddit-border); border-radius: 28px; background: var(--reddit-surface-inset); }
.search-hero i { color: var(--reddit-text-secondary); }
.search-hero input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: var(--reddit-text); font-size: 16px; }
.search-hero button { height: 40px; padding: 0 22px; border-radius: 21px; background: var(--reddit-orange); color: white; font-weight: 700; }
.search-hero button:disabled { opacity: .5; }
.results-head { margin: 24px 0 8px; border-bottom: 1px solid var(--reddit-border-soft); }
.results-head h1 { margin-bottom: 18px; font-size: 20px; font-weight: 500; }
.results-head nav { display: flex; gap: 6px; }
.results-head nav button { height: 48px; padding: 0 18px; color: var(--reddit-text-secondary); font-size: 14px; font-weight: 600; position: relative; }
.results-head nav .selected { color: var(--reddit-text); }
.results-head nav .selected::after { content: ''; position: absolute; bottom: 0; left: 14px; right: 14px; height: 3px; background: var(--reddit-blue); border-radius: 3px 3px 0 0; }
.results-head span { margin-left: 6px; color: var(--reddit-text-muted); font-family: var(--font-mono); font-size: 12px; }
.results-column { max-width: 680px; }
.state { min-height: 140px; display: grid; place-content: center; color: var(--reddit-text-secondary); font-size: 14px; }
.state--error { color: #b42318; }
.people-list, .community-results { max-width: 680px; padding-top: 10px; }
.person, .community { display: flex; align-items: center; gap: 14px; min-height: 76px; padding: 12px 14px; border-bottom: 1px solid var(--reddit-border-soft); text-decoration: none; border-radius: 14px; }
.person:hover, .community:hover { background: var(--reddit-surface-inset); }
.person span, .community-avatar { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: var(--reddit-blue); color: white; font-size: 18px; font-weight: 700; }
.person div, .community div { flex: 1; }
.person strong, .community strong { font-size: 14px; }
.person p, .community p { color: var(--reddit-text-secondary); font-size: 13px; margin-top: 3px; }
.person i { color: var(--reddit-text-muted); }
.community button { height: 36px; padding: 0 17px; border-radius: 18px; border: 1px solid var(--reddit-blue); color: var(--reddit-blue); font-weight: 700; }
.community button.joined { border-color: var(--reddit-border-emphasis); color: var(--reddit-text); }
.initial-state { min-height: 440px; display: grid; justify-items: center; align-content: center; gap: 10px; color: var(--reddit-text-secondary); text-align: center; }
.initial-state i { font-size: 42px; color: var(--reddit-text-muted); }
.initial-state h1 { color: var(--reddit-text); font-size: 23px; margin-top: 8px; }
@media (max-width: 700px) { .search-page { padding: 12px 10px; } .results-head nav { overflow-x: auto; } }
</style>
