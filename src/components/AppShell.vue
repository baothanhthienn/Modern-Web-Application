<template>
  <div class="app-shell">

    <!-- =============================================
         NAVBAR — fixed top bar
         ============================================= -->
    <nav class="navbar-top">

      <!-- Logo -->
      <router-link to="/" class="navbar-logo">
        <svg class="logo-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#FF4500"/>
          <path d="M26.5 16a2.5 2.5 0 00-4.2-1.8 12.3 12.3 0 00-6.6-2l1.1-5.2 3.6.8a1.8 1.8 0 103.5-.3 1.8 1.8 0 00-1.7 1.2l-4-.9a.4.4 0 00-.5.3l-1.3 5.8a12.4 12.4 0 00-6.7 2 2.5 2.5 0 10-2.8 4 4.8 4.8 0 000 .6c0 3.9 4.5 7 10 7s10-3.1 10-7a4.8 4.8 0 000-.6 2.5 2.5 0 001.6-2.3zm-15 1.5a1.5 1.5 0 111.5 1.5 1.5 1.5 0 01-1.5-1.5zm8.4 4a5.2 5.2 0 01-3.9 1.2 5.2 5.2 0 01-3.9-1.2.4.4 0 01.6-.6 4.4 4.4 0 003.3.9 4.4 4.4 0 003.3-.9.4.4 0 11.6.6zm-.2-2.5a1.5 1.5 0 111.5-1.5 1.5 1.5 0 01-1.5 1.5z" fill="white"/>
        </svg>
        <span class="logo-text">reddit</span>
      </router-link>

      <!-- Search bar -->
      <div class="navbar-search">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input
          type="text"
          placeholder="Search Reddit"
          class="search-input"
          @keyup.enter="goSearch"
          v-model="searchQuery"
        />
      </div>

      <div class="navbar-actions">
        <router-link to="/chat" class="nav-action-label" title="Open chat">
          <i class="fa-regular fa-comment-dots"></i>
          <span class="action-label">Chat</span>
        </router-link>
        <router-link to="/notifications" class="nav-icon-btn" title="Notifications">
          <i class="fa-regular fa-bell"></i>
          <span class="badge-dot" v-if="hasNotifications"></span>
        </router-link>

        <router-link :to="currentUser ? { path: '/', query: { compose: 'true' } } : '/register'" class="create-post-btn">
          <i class="fa-solid fa-plus"></i>
          <span>Create</span>
        </router-link>

        <div v-if="!currentUser" class="nav-auth-btns">
          <router-link to="/login" class="btn-register">Log In</router-link>
        </div>
        <div v-else class="signed-in-menu">
          <router-link :to="`/profile/${currentUser.username}`" class="signed-in-name">u/{{ currentUser.username }}</router-link>
          <button class="btn-logout" @click="signOut">Log out</button>
        </div>
        <button v-if="!currentUser" class="profile-menu-btn" title="Open account menu">
          <i class="fa-regular fa-user"></i>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
      </div>
    </nav>

    <!-- =============================================
         LEFT SIDEBAR — fixed side nav
         ============================================= -->
    <aside class="sidebar-left">
      <div class="sidebar-nav">

        <router-link to="/" class="sidebar-item" :class="{ 'sidebar-item--active': isHomeSelected }">
          <div class="nav-item-inner">
            <i class="fa-solid fa-house"></i>
            <span>Home</span>
          </div>
        </router-link>

        <router-link :to="{ path: '/', query: { sort: 'top' } }" class="sidebar-item" :class="{ 'sidebar-item--active': route.query.sort === 'top' }">
          <div class="nav-item-inner">
            <i class="fa-solid fa-fire"></i>
            <span>Popular</span>
          </div>
        </router-link>

        <router-link :to="{ path: '/', query: { sort: 'new' } }" class="sidebar-item" :class="{ 'sidebar-item--active': route.query.sort === 'new' }">
          <div class="nav-item-inner">
            <i class="fa-solid fa-compass"></i>
            <span>Latest</span>
          </div>
        </router-link>

        <div class="sidebar-divider"></div>
        <div class="sidebar-section-label">Custom Feeds</div>

        <router-link to="/chat" class="sidebar-item" active-class="sidebar-item--active">
          <div class="nav-item-inner sidebar-item-chat">
            <i class="fa-solid fa-comments"></i>
            <span>Community Chats</span>
            <span class="live-badge">LIVE</span>
          </div>
        </router-link>

        <!--
          INBOX shortcut — links to the Inbox / DM page.
        -->
        <router-link to="/inbox" class="sidebar-item" active-class="sidebar-item--active">
          <div class="nav-item-inner">
            <i class="fa-solid fa-inbox"></i>
            <span>Inbox</span>
          </div>
        </router-link>

        <div class="sidebar-divider"></div>
        <div class="sidebar-section-label">Communities</div>

        <router-link
          v-for="community in communities"
          :key="community.name"
          :to="`/chat/${community.name}`"
          class="sidebar-item sidebar-item--community"
          :class="{ 'sidebar-item--active': route.path === `/chat/${community.name}` }"
        >
          <div class="nav-item-inner">
            <div class="community-dot" :style="{ background: community.color }"></div>
            <span>r/{{ community.name }}</span>
          </div>
        </router-link>
      </div>

    </aside>

    <!-- =============================================
         PAGE CONTENT — injected by child views
         ============================================= -->
    <main class="page-content">
      <slot />
    </main>

  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearStoredAuth, logout, restoreAuthSession, useAuthUser } from '../services/auth.js'
import { getCommunities, getNotifications } from '../services/api.js'
import { getChatSocket } from '../services/realtime.js'

const router = useRouter()
const route = useRoute()
const isHomeSelected = computed(() => route.path === '/' && !route.query.sort)
const currentUser = useAuthUser()

async function signOut() {
  await logout().catch(() => {})
  unsubscribeNotifications()
  hasNotifications.value = false
  currentUser.value = null
  router.push('/')
}

onMounted(async () => {
  loadCommunities()
  try {
    currentUser.value = await restoreAuthSession()
    loadNotifications()
    subscribeNotifications()
  } catch {
    clearStoredAuth()
    unsubscribeNotifications()
    hasNotifications.value = false
    currentUser.value = null
  }
})

// Search
const searchQuery = ref('')
function goSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } })
    searchQuery.value = ''
  }
}

const hasNotifications = ref(false)
const communities = ref([])
let socket

async function loadCommunities() {
  try {
    const data = await getCommunities()
    communities.value = data.communities
  } catch {
    communities.value = []
  }
}

async function loadNotifications() {
  try {
    const data = await getNotifications({ limit: 20 })
    hasNotifications.value = data.notifications.some((notification) => !notification.read)
  } catch {
    hasNotifications.value = false
  }
}

function receiveNotification(payload) {
  if (!payload?.notification) return
  if (!payload.notification.read) hasNotifications.value = true
}

function subscribeNotifications() {
  socket = getChatSocket()
  socket.on('notification:new', receiveNotification)
}

function unsubscribeNotifications() {
  socket?.off('notification:new', receiveNotification)
}

onBeforeUnmount(() => {
  unsubscribeNotifications()
})
</script>

<style scoped>
/* ---- Shell layout ---- */
.app-shell {
  min-height: 100vh;
  background: var(--reddit-bg);
}

/* =============================================
   NAVBAR
   ============================================= */
.navbar-top {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 48px;
  background: var(--reddit-white);
  border-bottom: 1px solid var(--reddit-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  z-index: 100;
}

.navbar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}
.logo-svg { width: 32px; height: 32px; }
.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--reddit-text);
  letter-spacing: -0.5px;
}

.navbar-search {
  flex: 1;
  max-width: 480px;
  position: relative;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--reddit-text-meta);
  font-size: 13px;
}
.search-input {
  width: 100%;
  padding: 6px 16px 6px 36px;
  border: 1px solid var(--reddit-border);
  border-radius: 20px;
  background: #F6F7F8;
  font-size: 14px;
  font-family: var(--font-main);
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}
.search-input:focus {
  border-color: var(--reddit-blue);
  background: var(--reddit-white);
  box-shadow: 0 0 0 2px rgba(0,121,211,0.15);
}

.navbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Nav icon buttons (bell, envelope, chat) */
.nav-icon-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  color: var(--reddit-text-meta);
  font-size: 18px;
  text-decoration: none;
  transition: background 0.1s, color 0.1s;
}
.nav-icon-btn:hover { background: #F6F7F8; color: var(--reddit-text); }
.nav-icon-btn.router-link-active { color: var(--reddit-orange); }

/* Notification dot */
.badge-dot {
  position: absolute;
  top: 6px; right: 6px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--reddit-orange);
  border: 2px solid white;
}

/* Unread count badge */
.badge-count {
  position: absolute;
  top: 2px; right: 2px;
  min-width: 16px; height: 16px;
  border-radius: 8px;
  background: var(--reddit-orange);
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 2px solid white;
}

/* Chat button status indicator */
.chat-btn { color: #16A34A; }
.chat-btn:hover { color: #15803D; }
.chat-live-dot {
  position: absolute;
  top: 6px; right: 6px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #22C55E;
  border: 2px solid white;
  animation: pulse-green 2s infinite;
}
@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  50%       { box-shadow: 0 0 0 4px rgba(34,197,94,0); }
}

/* Avatar */
.nav-avatar { text-decoration: none; }
.avatar-circle {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6314, #FF4500);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  transition: opacity 0.15s;
}
.avatar-circle:hover { opacity: 0.85; }

/* Login/Register buttons */
.nav-auth-btns {
  display: flex;
  gap: 8px;
  margin-left: 8px;
}
.btn-login {
  padding: 4px 16px;
  border: 1px solid var(--reddit-blue);
  border-radius: 20px;
  color: var(--reddit-blue);
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  transition: background 0.1s;
}
.btn-login:hover { background: rgba(0,121,211,0.05); }
.btn-register {
  padding: 4px 16px;
  background: var(--reddit-orange);
  border: 1px solid var(--reddit-orange);
  border-radius: 20px;
  color: white;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  transition: background 0.1s;
}
.btn-register:hover { background: var(--reddit-orange-hover); }

/* =============================================
   LEFT SIDEBAR
   ============================================= */
.sidebar-left {
  position: fixed;
  top: 48px;
  left: 0;
  bottom: 0;
  width: 256px;
  background: var(--reddit-white);
  border-right: 1px solid var(--reddit-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  z-index: 90;
}

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
}

.sidebar-item {
  display: block;
  text-decoration: none;
  padding: 0 8px;
}
.sidebar-item--community { padding: 0 8px; }

.nav-item-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1B;
  transition: background 0.1s;
}
.nav-item-inner i { font-size: 16px; color: var(--reddit-text-meta); width: 18px; text-align: center; }

.sidebar-item:hover .nav-item-inner { background: #F6F7F8; }
.sidebar-item--active .nav-item-inner {
  background: #FFF4F0;
  color: var(--reddit-orange);
}
.sidebar-item--active .nav-item-inner i { color: var(--reddit-orange); }

/* Live chat badge */
.sidebar-item-chat { position: relative; }
.live-badge {
  margin-left: auto;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: white;
  background: #22C55E;
  padding: 1px 5px;
  border-radius: 3px;
}

/* Unread badge in sidebar */
.unread-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--reddit-orange);
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.sidebar-divider {
  height: 1px;
  background: var(--reddit-border);
  margin: 8px 16px;
}

.sidebar-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--reddit-text-meta);
  padding: 4px 20px 6px;
}

.community-dot {
  width: 20px; height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Sidebar footer */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--reddit-border);
}
.btn-create-community {
  width: 100%;
  padding: 8px;
  background: var(--reddit-orange);
  color: white;
  font-weight: 700;
  font-size: 14px;
  border-radius: 20px;
  transition: background 0.1s;
  font-family: var(--font-main);
}
.btn-create-community:hover { background: var(--reddit-orange-hover); }

/* =============================================
   MAIN CONTENT AREA
   ============================================= */
.page-content {
  margin-left: 256px;
  padding-top: 48px;
  min-height: 100vh;
}

/* =============================================
   RESPONSIVE
   ============================================= */
@media (max-width: 960px) {
  .sidebar-left { display: none; }
  .page-content { margin-left: 0; }
}
@media (max-width: 640px) {
  .logo-text { display: none; }
  .nav-auth-btns { display: none; }
  .navbar-search { max-width: 200px; }
}

/* Current Reddit shell: quiet separators, inset search, compact actions. */
.app-shell { background: var(--reddit-bg); }
.navbar-top {
  height: 56px;
  padding: 0 16px;
  gap: 20px;
  border-bottom-color: var(--reddit-border-soft);
}
.logo-svg { width: 34px; height: 34px; }
.logo-text {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.045em;
}
.navbar-search {
  max-width: 560px;
  margin: 0 auto;
}
.search-icon { left: 16px; font-size: 16px; }
.search-input {
  height: 40px;
  padding: 0 20px 0 44px;
  border: 1px solid transparent;
  border-radius: 24px;
  background: var(--reddit-surface-inset);
  color: var(--reddit-text);
  font-size: 14px;
}
.search-input:hover { background: #eef1f2; }
.search-input:focus {
  border-color: var(--reddit-blue);
  box-shadow: 0 0 0 3px var(--reddit-focus);
}
.navbar-actions { gap: 4px; }
.nav-icon-btn,
.nav-action-label,
.create-post-btn,
.profile-menu-btn {
  height: 40px;
  border-radius: 22px;
  color: var(--reddit-text);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease;
}
.nav-icon-btn { width: 40px; font-size: 18px; }
.nav-action-label,
.create-post-btn {
  padding: 0 14px;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}
.nav-action-label:hover,
.create-post-btn:hover,
.profile-menu-btn:hover,
.nav-icon-btn:hover { background: var(--reddit-surface-inset); color: var(--reddit-text); }
.badge-dot {
  top: 8px;
  right: 9px;
  border-color: var(--reddit-white);
}
.btn-register {
  display: inline-flex;
  height: 40px;
  align-items: center;
  padding: 0 22px;
  border: 0;
  font-size: 14px;
}
.profile-menu-btn {
  width: 48px;
  gap: 7px;
  font-size: 15px;
}
.profile-menu-btn .fa-chevron-down {
  font-size: 9px;
  color: var(--reddit-text-secondary);
}
.signed-in-menu {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
}
.signed-in-name {
  max-width: 136px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--reddit-text-secondary);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.signed-in-name:hover { text-decoration: underline; }
.btn-logout {
  height: 36px;
  padding: 0 14px;
  border-radius: 20px;
  border: 1px solid var(--reddit-border-emphasis);
  color: var(--reddit-text);
  font-size: 13px;
  font-weight: 600;
}
.btn-logout:hover { background: var(--reddit-surface-inset); }
.sidebar-left {
  top: 56px;
  width: 272px;
  background: var(--reddit-bg);
  border-right-color: var(--reddit-border-soft);
  padding: 8px;
}
.sidebar-nav { padding: 0; }
.sidebar-item { padding: 0; }
.nav-item-inner {
  height: 44px;
  padding: 0 16px;
  border-radius: 22px;
  font-size: 14px;
  color: var(--reddit-text);
}
.nav-item-inner i { color: var(--reddit-text); }
.sidebar-item:hover .nav-item-inner { background: var(--reddit-surface-inset); }
.sidebar-item--active .nav-item-inner {
  background: var(--reddit-surface-inset);
  color: var(--reddit-text);
  font-weight: 700;
}
.sidebar-item--active .nav-item-inner i { color: var(--reddit-text); }
.sidebar-divider {
  background: var(--reddit-border-soft);
  margin: 12px 8px;
}
.sidebar-section-label {
  padding: 4px 16px 8px;
  color: var(--reddit-text-secondary);
  font-size: 11px;
  font-weight: 600;
}
.community-dot { width: 24px; height: 24px; }
.live-badge {
  border-radius: 16px;
  background: rgba(70, 167, 88, 0.14);
  color: #26743a;
  padding: 2px 7px;
}
.unread-badge {
  background: var(--reddit-orange);
  font-size: 11px;
}
.sidebar-footer {
  padding: 12px 8px 4px;
  border-top-color: var(--reddit-border-soft);
}
.btn-create-community {
  height: 40px;
  background: transparent;
  border: 1px solid var(--reddit-border-emphasis);
  color: var(--reddit-text);
  font-weight: 600;
}
.btn-create-community:hover { background: var(--reddit-surface-inset); }
.page-content {
  margin-left: 272px;
  padding-top: 56px;
}
@media (max-width: 1100px) {
  .sidebar-left { display: none; }
  .page-content { margin-left: 0; }
}
@media (max-width: 700px) {
  .navbar-top { gap: 8px; padding: 0 8px; }
  .navbar-search { min-width: 0; }
  .action-label, .create-post-btn span { display: none; }
  .nav-action-label, .create-post-btn { width: 40px; padding: 0; }
  .signed-in-name { display: none; }
}
</style>
