<template>
  <AppShell>
    <div v-if="loadingProfile" class="profile-state">Loading profile...</div>
    <div v-else-if="profileError" class="profile-state profile-state--error">{{ profileError }}</div>
    <div v-else-if="profile" class="profile-page">
      <header class="identity-header">
        <div class="banner" :style="{ background: profile.bannerColor || 'var(--reddit-surface-hover)' }"></div>
        <div class="identity">
          <img v-if="profile.avatarUrl" :src="profile.avatarUrl" class="avatar avatar--image" :alt="`u/${profile.username}`" />
          <span v-else class="avatar">{{ avatarLetter(profile.username) }}</span>
          <div class="identity-copy">
            <h1>{{ profile.displayName || profile.username }}</h1>
            <p>u/{{ profile.username }}</p>
          </div>
          <div class="identity-actions">
            <router-link v-if="viewer.canMessage" class="outline" :to="{ path: '/inbox', query: { with: profile.username } }">
              <i class="fa-regular fa-comment-dots"></i> Chat
            </router-link>
            <button v-if="viewer.isAuthenticated && !viewer.isSelf" class="primary" @click="toggleFollow">
              {{ viewer.isFollowing ? 'Following' : 'Follow' }}
            </button>
            <button v-if="viewer.isSelf" class="outline" @click="editing = true">Change username</button>
          </div>
        </div>
        <nav class="tabs">
          <button v-for="tab in visibleTabs" :key="tab.value" :class="{ selected: activeTab === tab.value }" @click="selectTab(tab.value)">
            {{ tab.label }}
          </button>
        </nav>
      </header>

      <div class="columns">
        <main class="activity">
          <div v-if="loadingActivity" class="profile-state">Loading activity...</div>
          <div v-else-if="activityError" class="profile-state profile-state--error">{{ activityError }}</div>
          <template v-else-if="items.length">
            <PostCard
              v-for="item in postItems"
              :key="item.id"
              :post="item"
              @updated="replaceItem"
            />
            <article v-for="comment in commentItems" :key="comment.id" class="comment">
              <p>Commented in r/{{ comment.community?.name || comment.community }}</p>
              <h2>{{ comment.parentTitle }}</h2>
              <div>{{ comment.body }}</div>
              <small>{{ formatRelativeTime(comment.createdAt) }} - {{ formatCount(comment.score) }} karma</small>
            </article>
            <button v-if="nextCursor" class="more" @click="loadActivity(nextCursor)">Load more</button>
          </template>
          <div v-else class="empty">
            <i class="fa-regular fa-folder-open"></i>
            <h2>No {{ activeTab }} to show</h2>
            <p>{{ activeTab === 'saved' ? 'Saved posts are visible only to their owner.' : 'No public contributions are available here yet.' }}</p>
          </div>
        </main>

        <aside class="rail">
          <section>
            <h2>About</h2>
            <p class="bio">{{ profile.bio || 'This redditor has not added a public bio.' }}</p>
            <dl>
              <div><dt>Post karma</dt><dd>{{ formatCount(profile.postKarma) }}</dd></div>
              <div><dt>Comment karma</dt><dd>{{ formatCount(profile.commentKarma) }}</dd></div>
              <div><dt>Cake day</dt><dd>{{ formatDate(profile.cakeDay) }}</dd></div>
              <div><dt>Followers</dt><dd>{{ formatCount(profile.followers) }}</dd></div>
            </dl>
          </section>
          <section>
            <h2>Communities</h2>
            <div v-if="profile.communities.length" class="communities">
              <div v-for="community in profile.communities" :key="community.name">
                <span>{{ avatarLetter(community.name) }}</span>
                <div><strong>r/{{ community.name }}</strong><small>{{ formatCount(community.memberCount) }} members</small></div>
              </div>
            </div>
            <p v-else class="quiet">No public communities shown.</p>
          </section>
        </aside>
      </div>
      <p v-if="actionError" class="action-error">{{ actionError }}</p>
    </div>

    <div v-if="editing" class="backdrop" @click.self="editing = false">
      <form class="username-dialog" @submit.prevent="rename">
        <h2>Change username</h2>
        <p>Your posts and profile will use the updated username.</p>
        <input v-model.trim="newUsername" maxlength="20" minlength="3" pattern="[A-Za-z0-9_]{3,20}" required />
        <p v-if="renameError" class="dialog-error">{{ renameError }}</p>
        <div>
          <button type="button" class="outline" @click="editing = false">Cancel</button>
          <button class="primary" :disabled="renaming">{{ renaming ? 'Saving...' : 'Save' }}</button>
        </div>
      </form>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import PostCard from '../components/PostCard.vue'
import { followProfile, getPost, getProfile, getProfileActivity, getSavedItems, unfollowProfile, updateUsername } from '../services/api.js'
import { avatarLetter, formatCount, formatDate, formatRelativeTime } from '../services/format.js'
import { saveAuthSession, useAuthUser } from '../services/auth.js'

const route = useRoute()
const router = useRouter()
const authUser = useAuthUser()
const profile = ref(null)
const viewer = ref({})
const activeTab = ref('posts')
const items = ref([])
const nextCursor = ref(null)
const loadingProfile = ref(true)
const loadingActivity = ref(false)
const profileError = ref('')
const activityError = ref('')
const actionError = ref('')
const editing = ref(false)
const newUsername = ref('')
const renaming = ref(false)
const renameError = ref('')
const tabs = [
  { value: 'posts', label: 'Posts' },
  { value: 'comments', label: 'Comments' },
  { value: 'saved', label: 'Saved' },
]
const visibleTabs = computed(() => viewer.value.isSelf ? tabs : tabs.filter((tab) => tab.value !== 'saved'))
const postItems = computed(() => items.value.filter((item) => !item.type || item.type === 'post'))
const commentItems = computed(() => items.value.filter((item) => item.type === 'comment'))

function activityPostId(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const match = value.match(/^post_(\d+)$/)
    if (match) return Number(match[1])
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return null
}

function normalizeActivityPost(item, username) {
  const community = typeof item.community === 'string'
    ? item.community
    : item.community?.name || ''

  return {
    ...item,
    id: activityPostId(item.id) ?? item.id,
    type: 'post',
    community,
    communityColor: item.communityColor || null,
    author: typeof item.author === 'string' ? item.author : username,
    createdAt: item.createdAt,
    title: item.title,
    text: item.text ?? item.body ?? '',
    image: item.image ?? null,
    link: item.link ?? null,
    linkDomain: item.linkDomain ?? null,
    votes: Number(item.votes ?? item.score ?? 0),
    comments: Number(item.comments ?? item.commentCount ?? 0),
    reactions: Number(item.reactions ?? 0),
    userVote: Number(item.userVote ?? 0),
    saved: Boolean(item.saved),
  }
}

async function hydrateActivityItems(activityItems, username) {
  return Promise.all(activityItems.map(async (item) => {
    if (item.type === 'comment') return item

    const postId = activityPostId(item.id)
    if (!postId) return normalizeActivityPost(item, username)

    try {
      const { post } = await getPost(postId)
      return post
    } catch {
      return normalizeActivityPost(item, username)
    }
  }))
}

async function loadProfile() {
  loadingProfile.value = true
  profileError.value = ''
  activeTab.value = 'posts'
  try {
    const data = await getProfile(route.params.username)
    profile.value = data.profile
    viewer.value = data.viewer
    newUsername.value = data.profile.username
    await loadActivity()
  } catch (error) {
    profileError.value = error.message
  } finally {
    loadingProfile.value = false
  }
}

async function loadActivity(cursor) {
  loadingActivity.value = true
  activityError.value = ''
  try {
    const data = activeTab.value === 'saved'
      ? await getSavedItems({ cursor })
      : await getProfileActivity(profile.value.username, { type: activeTab.value, cursor })
    const nextItems = await hydrateActivityItems(data.items, profile.value.username)
    items.value = cursor ? [...items.value, ...nextItems] : nextItems
    nextCursor.value = data.nextCursor
  } catch (error) {
    activityError.value = error.message
  } finally {
    loadingActivity.value = false
  }
}

function selectTab(tab) {
  activeTab.value = tab
  loadActivity()
}

function replaceItem(updated) {
  const index = items.value.findIndex((item) => item.id === updated.id)
  if (index >= 0) items.value[index] = updated
}

async function toggleFollow() {
  actionError.value = ''
  try {
    await (viewer.value.isFollowing ? unfollowProfile(profile.value.username) : followProfile(profile.value.username))
    viewer.value.isFollowing = !viewer.value.isFollowing
    profile.value.followers += viewer.value.isFollowing ? 1 : -1
  } catch (error) {
    actionError.value = error.message
  }
}

async function rename() {
  renaming.value = true
  renameError.value = ''
  try {
    const { user } = await updateUsername(newUsername.value)
    saveAuthSession({ user: { ...authUser.value, ...user } })
    editing.value = false
    router.replace(`/profile/${user.username}`)
  } catch (error) {
    renameError.value = error.message
  } finally {
    renaming.value = false
  }
}

watch(() => route.params.username, loadProfile, { immediate: true })
</script>

<style scoped>
.profile-state { min-height: 280px; display: grid; place-content: center; color: var(--reddit-text-secondary); font-size: 14px; }
.profile-state--error, .action-error, .dialog-error { color: #b42318; }
.profile-page { width: min(1080px, 100%); margin: 0 auto; padding: 18px 24px 56px; }
.identity-header { border-bottom: 1px solid var(--reddit-border-soft); }
.banner { height: 112px; border-radius: 16px 16px 0 0; }
.identity { min-height: 106px; display: flex; align-items: center; gap: 18px; padding: 0 10px 0 20px; }
.avatar { width: 88px; height: 88px; margin-top: -44px; display: grid; place-items: center; flex-shrink: 0; border: 5px solid white; border-radius: 50%; background: var(--reddit-blue); color: white; font-size: 34px; font-weight: 700; }
.avatar--image { object-fit: cover; }
.identity-copy h1 { font-size: 24px; font-weight: 700; letter-spacing: -.03em; }
.identity-copy p { color: var(--reddit-text-secondary); font-size: 13px; }
.identity-actions { margin-left: auto; display: flex; gap: 8px; }
.outline, .primary, .more { height: 40px; padding: 0 19px; display: inline-flex; align-items: center; gap: 8px; border-radius: 21px; font-size: 14px; font-weight: 700; text-decoration: none; }
.outline { border: 1px solid var(--reddit-border-emphasis); }
.outline:hover { background: var(--reddit-surface-inset); }
.primary { background: var(--reddit-blue); color: white; }
.tabs { height: 54px; display: flex; gap: 4px; }
.tabs button { height: 54px; padding: 0 18px; position: relative; color: var(--reddit-text-secondary); font-size: 13px; font-weight: 600; }
.tabs .selected { color: var(--reddit-text); font-weight: 700; }
.tabs .selected::after { content: ''; height: 3px; position: absolute; bottom: 0; left: 16px; right: 16px; border-radius: 3px; background: var(--reddit-blue); }
.columns { display: grid; grid-template-columns: minmax(0, 700px) 296px; justify-content: center; gap: 24px; padding-top: 16px; }
.activity .profile-state { min-height: 220px; }
.comment { margin: 0 16px; padding: 16px 0; border-bottom: 1px solid var(--reddit-border-soft); }
.comment p, .comment small { color: var(--reddit-text-meta); font-size: 12px; }
.comment h2 { margin: 8px 0; font-size: 15px; }
.comment div { margin: 10px 0; padding: 12px; border-left: 2px solid var(--reddit-border); color: var(--reddit-text-secondary); font-size: 14px; }
.more { margin: 16px; border: 1px solid var(--reddit-border-emphasis); }
.empty { padding: 80px 20px; text-align: center; color: var(--reddit-text-secondary); }
.empty i { font-size: 32px; color: var(--reddit-text-muted); margin-bottom: 12px; }
.empty h2 { color: var(--reddit-text); font-size: 18px; margin-bottom: 7px; }
.empty p { font-size: 14px; }
.rail { display: flex; flex-direction: column; gap: 14px; }
.rail section { padding: 18px 16px; border-radius: 16px; background: var(--reddit-surface-inset); }
.rail h2 { margin-bottom: 14px; font-size: 15px; }
.bio, .quiet { margin-bottom: 18px; color: var(--reddit-text-secondary); font-size: 13px; line-height: 1.5; }
dl { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 10px; }
dt { color: var(--reddit-text-meta); font-size: 12px; font-weight: 400; }
dd { margin: 5px 0 0; font-family: var(--font-mono); font-size: 13px; font-weight: 600; }
.communities { display: flex; flex-direction: column; gap: 12px; }
.communities > div { display: flex; align-items: center; gap: 10px; }
.communities span { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: var(--reddit-blue); color: white; font-weight: 700; }
.communities strong, .communities small { display: block; font-size: 13px; }
.communities small { color: var(--reddit-text-meta); font-size: 12px; }
.action-error { margin: 12px auto; text-align: center; font-size: 13px; }
.backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-content: center; background: rgba(15, 26, 28, .5); padding: 20px; }
.username-dialog { width: min(430px, 100vw - 40px); padding: 22px; border-radius: 18px; background: white; }
.username-dialog h2 { font-size: 19px; }
.username-dialog p { margin: 9px 0 16px; color: var(--reddit-text-secondary); font-size: 13px; }
.username-dialog input { width: 100%; height: 44px; padding: 0 13px; border: 1px solid var(--reddit-border); border-radius: 9px; background: var(--reddit-surface-inset); }
.username-dialog div { display: flex; justify-content: flex-end; gap: 9px; margin-top: 18px; }
@media (max-width: 860px) { .profile-page { padding: 8px 0 36px; } .banner { border-radius: 0; } .identity { padding: 0 16px 14px; flex-wrap: wrap; } .identity-actions { width: 100%; margin-left: 0; } .tabs { overflow-x: auto; } .columns { display: flex; flex-direction: column-reverse; gap: 8px; } .rail { padding: 0 16px; } }
</style>
