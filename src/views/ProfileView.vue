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
            <button v-if="!isLocalProfile && viewer.isAuthenticated && !viewer.isSelf" class="primary" @click="toggleFollow">
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
            <div v-if="showPostManagement" class="post-tools">
              <div class="post-tools__label">
                <span class="post-tools__dot"></span>
                <strong>Post tools</strong>
              </div>
              <div class="post-tools__actions">
                <button class="post-tool-button" @click="openEditPost">
                  <i class="fa-regular fa-pen-to-square"></i>
                  Edit
                </button>
                <button class="post-tool-button post-tool-button--danger" :disabled="deletingPost" @click="removeCurrentPost">
                  <i class="fa-regular fa-trash-can"></i>
                  {{ deletingPost ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
            <PostCard
              v-for="item in visiblePostItems"
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
            <div v-if="activeTab === 'posts' && postItems.length" class="pager">
              <div class="pager-shell">
                <button class="pager-control" :disabled="currentPostIndex === 0" @click="goToPreviousPost">
                  <i class="fa-solid fa-chevron-left"></i>
                  <span>Previous</span>
                </button>
                <div class="pager-center">
                  <span class="pager-badge">Posts</span>
                  <span class="pager-status">{{ currentPostIndex + 1 }} / {{ totalPostsLabel }}</span>
                </div>
                <button class="pager-control pager-control--next" :disabled="!canGoNext" @click="goToNextPost">
                  <span>{{ loadingNextPost ? 'Loading...' : nextPostLabel }}</span>
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
            <button v-else-if="nextCursor" class="more" @click="loadActivity(nextCursor)">Load more</button>
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

    <PostComposerModal
      :open="editPostOpen"
      heading="Edit post"
      submit-label="Save changes"
      loading-label="Saving..."
      :submitting="savingPost"
      :error="editPostError"
      :communities="editableCommunities"
      :initial-draft="editPostDraft"
      @close="editPostOpen = false"
      @submit="submitEditPost"
    />
  </AppShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import PostComposerModal from '../components/PostComposerModal.vue'
import PostCard from '../components/PostCard.vue'
import { teamPostsByUsername, teamProfilesByUsername } from '../data/teamProfiles.js'
import { deletePost, followProfile, getCommunities, getPost, getProfile, getProfileActivity, getSavedItems, unfollowProfile, updatePost, updateUsername } from '../services/api.js'
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
const isLocalProfile = ref(false)
const currentPostIndex = ref(0)
const loadingNextPost = ref(false)
const loadingProfile = ref(true)
const loadingActivity = ref(false)
const profileError = ref('')
const activityError = ref('')
const actionError = ref('')
const editing = ref(false)
const newUsername = ref('')
const renaming = ref(false)
const renameError = ref('')
const editPostOpen = ref(false)
const editPostError = ref('')
const savingPost = ref(false)
const deletingPost = ref(false)
const editableCommunities = ref([])
const editPostDraft = ref({ community: '', title: '', image: '', description: '' })
const tabs = [
  { value: 'posts', label: 'Posts' },
  { value: 'comments', label: 'Comments' },
  { value: 'saved', label: 'Saved' },
]
const localProfile = computed(() => teamProfilesByUsername[String(route.params.username || '')] || null)
const visibleTabs = computed(() => viewer.value.isSelf ? tabs : tabs.filter((tab) => tab.value !== 'saved'))
const postItems = computed(() => items.value.filter((item) => !item.type || item.type === 'post'))
const commentItems = computed(() => items.value.filter((item) => item.type === 'comment'))
const activeManagedPost = computed(() => activeTab.value === 'posts' ? visiblePostItems.value[0] || null : null)
const canManageActivePost = computed(() => {
  const sessionUsername = String(authUser.value?.username || '').trim().toLowerCase()
  const postAuthor = String(activeManagedPost.value?.author || '').trim().toLowerCase()
  return Boolean(sessionUsername && postAuthor && sessionUsername === postAuthor)
})
const showPostManagement = computed(() => Boolean(
  canManageActivePost.value
  && !isLocalProfile.value
  && activeManagedPost.value
  && !activeManagedPost.value.localOnly,
))
const visiblePostItems = computed(() => {
  if (activeTab.value !== 'posts') return postItems.value
  const currentPost = postItems.value[currentPostIndex.value]
  return currentPost ? [currentPost] : []
})
const totalPostsLabel = computed(() => nextCursor.value ? `${postItems.value.length}+` : String(postItems.value.length))
const canGoNext = computed(() => loadingNextPost.value || currentPostIndex.value < postItems.value.length - 1 || Boolean(nextCursor.value))
const nextPostLabel = computed(() => {
  if (currentPostIndex.value < postItems.value.length - 1) return 'Next'
  return nextCursor.value ? 'Next' : 'End'
})

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
  activityError.value = ''
  actionError.value = ''
  activeTab.value = 'posts'
  currentPostIndex.value = 0
  editPostOpen.value = false
  try {
    const data = await getProfile(route.params.username)
    isLocalProfile.value = false
    profile.value = data.profile
    viewer.value = data.viewer
    newUsername.value = data.profile.username
    await loadActivity()
  } catch (error) {
    if (error.message === 'Profile not found.' && localProfile.value) {
      isLocalProfile.value = true
      profile.value = localProfile.value
      viewer.value = {
        isAuthenticated: Boolean(authUser.value),
        isSelf: authUser.value?.username === localProfile.value.username,
        isFollowing: false,
        canMessage: false,
      }
      newUsername.value = localProfile.value.username
      await loadActivity()
      profileError.value = ''
      return
    }
    isLocalProfile.value = false
    profile.value = null
    profileError.value = error.message
  } finally {
    loadingProfile.value = false
  }
}

async function loadActivity(cursor) {
  if (isLocalProfile.value) {
    items.value = activeTab.value === 'posts'
      ? (teamPostsByUsername[profile.value.username] || [])
      : []
    currentPostIndex.value = 0
    nextCursor.value = null
    loadingActivity.value = false
    activityError.value = ''
    return
  }
  loadingActivity.value = true
  activityError.value = ''
  try {
    const data = activeTab.value === 'saved'
      ? await getSavedItems({ cursor })
      : await getProfileActivity(profile.value.username, { type: activeTab.value, cursor })
    const nextItems = await hydrateActivityItems(data.items, profile.value.username)
    items.value = cursor ? [...items.value, ...nextItems] : nextItems
    if (!cursor) currentPostIndex.value = 0
    nextCursor.value = data.nextCursor
  } catch (error) {
    activityError.value = error.message
  } finally {
    loadingActivity.value = false
  }
}

function selectTab(tab) {
  activeTab.value = tab
  currentPostIndex.value = 0
  loadActivity()
}

function goToPreviousPost() {
  if (currentPostIndex.value > 0) currentPostIndex.value -= 1
}

async function goToNextPost() {
  if (currentPostIndex.value < postItems.value.length - 1) {
    currentPostIndex.value += 1
    return
  }

  if (!nextCursor.value || loadingNextPost.value) return

  loadingNextPost.value = true
  const previousLength = postItems.value.length
  try {
    await loadActivity(nextCursor.value)
    if (postItems.value.length > previousLength) currentPostIndex.value = previousLength
  } finally {
    loadingNextPost.value = false
  }
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

async function ensureEditableCommunities() {
  if (editableCommunities.value.length) return
  const data = await getCommunities()
  editableCommunities.value = data.communities
}

async function openEditPost() {
  if (!activeManagedPost.value) return
  editPostError.value = ''
  await ensureEditableCommunities().catch((error) => {
    editPostError.value = error.message
  })
  editPostDraft.value = {
    community: activeManagedPost.value.community || '',
    title: activeManagedPost.value.title || '',
    image: activeManagedPost.value.image || '',
    description: activeManagedPost.value.text || '',
  }
  editPostOpen.value = true
}

async function submitEditPost(nextDraft) {
  if (!activeManagedPost.value) return
  savingPost.value = true
  editPostError.value = ''
  try {
    const payload = {
      community: nextDraft.community,
      title: nextDraft.title,
      image: nextDraft.image || null,
      description: nextDraft.description || null,
    }
    const { post } = await updatePost(activeManagedPost.value.id, payload)
    replaceItem(post)
    editPostOpen.value = false
  } catch (error) {
    editPostError.value = error.message
  } finally {
    savingPost.value = false
  }
}

async function removeCurrentPost() {
  if (!activeManagedPost.value || deletingPost.value) return
  deletingPost.value = true
  actionError.value = ''
  try {
    await deletePost(activeManagedPost.value.id)
    const removedId = activeManagedPost.value.id
    items.value = items.value.filter((item) => String(item.id) !== String(removedId))
    if (currentPostIndex.value >= postItems.value.length && currentPostIndex.value > 0) currentPostIndex.value -= 1
    if (!postItems.value.length && nextCursor.value) await loadActivity(nextCursor.value)
  } catch (error) {
    actionError.value = error.message
  } finally {
    deletingPost.value = false
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
.post-tools {
  margin: 0 16px 10px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  border: 1px solid var(--reddit-border-soft);
  border-radius: 16px;
  background: var(--reddit-white);
}
.post-tools__label,
.post-tools__actions,
.post-tool-button { display: flex; align-items: center; }
.post-tools__label { gap: 8px; color: var(--reddit-text); font-size: 13px; }
.post-tools__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--reddit-blue); }
.post-tools__actions { gap: 8px; }
.post-tool-button {
  height: 36px;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--reddit-border-emphasis);
  border-radius: 999px;
  background: var(--reddit-white);
  color: var(--reddit-text);
  font-size: 13px;
  font-weight: 700;
}
.post-tool-button:hover { background: var(--reddit-surface-inset); }
.post-tool-button:disabled { opacity: .5; cursor: default; }
.post-tool-button--danger { color: #b42318; border-color: rgba(180, 35, 24, 0.18); }
.comment { margin: 0 16px; padding: 16px 0; border-bottom: 1px solid var(--reddit-border-soft); }
.comment p, .comment small { color: var(--reddit-text-meta); font-size: 12px; }
.comment h2 { margin: 8px 0; font-size: 15px; }
.comment div { margin: 10px 0; padding: 12px; border-left: 2px solid var(--reddit-border); color: var(--reddit-text-secondary); font-size: 14px; }
.more { margin: 16px; border: 1px solid var(--reddit-border-emphasis); }
.more:disabled { opacity: .5; cursor: default; }
.pager { margin: 18px 16px 6px; }
.pager-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--reddit-border-soft);
  border-radius: 18px;
  background: var(--reddit-white);
}
.pager-control {
  min-width: 0;
  height: 42px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-self: start;
  border-radius: 999px;
  border: 1px solid var(--reddit-border-emphasis);
  background: var(--reddit-white);
  color: var(--reddit-text);
  font-size: 13px;
  font-weight: 700;
}
.pager-control--next { justify-self: end; }
.pager-control:not(:disabled):hover {
  background: var(--reddit-surface-inset);
}
.pager-control:disabled {
  opacity: .45;
  cursor: default;
}
.pager-center {
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 5px;
}
.pager-badge {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--reddit-border-soft);
  background: var(--reddit-surface-inset);
  color: var(--reddit-text-secondary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pager-status {
  color: var(--reddit-text-meta);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
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
@media (max-width: 860px) { .profile-page { padding: 8px 0 36px; } .banner { border-radius: 0; } .identity { padding: 0 16px 14px; flex-wrap: wrap; } .identity-actions { width: 100%; margin-left: 0; } .tabs { overflow-x: auto; } .columns { display: flex; flex-direction: column-reverse; gap: 8px; } .rail { padding: 0 16px; } .pager-shell { grid-template-columns: 1fr; } .pager-control, .pager-control--next { width: 100%; justify-content: center; } .post-tools { margin-inline: 8px; } .post-tools__actions { width: 100%; } .post-tool-button { flex: 1; justify-content: center; } }
</style>
