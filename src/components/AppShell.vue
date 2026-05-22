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

      <!-- Right nav actions -->
      <div class="navbar-actions">

        <!-- Notifications button → links to /notifications -->
        <router-link to="/notifications" class="nav-icon-btn" title="Notifications">
          <i class="fa-solid fa-bell"></i>
          <span class="badge-dot" v-if="hasNotifications"></span>
        </router-link>

        <!-- 
          INBOX BUTTON → links to /inbox
          This is one of the two key pages you're building.
          The badge shows unread message count.
        -->
        <router-link to="/inbox" class="nav-icon-btn" title="Messages / Inbox">
          <i class="fa-solid fa-envelope"></i>
          <span class="badge-count" v-if="unreadCount > 0">{{ unreadCount }}</span>
        </router-link>

        <!--
          CHAT BUTTON → links to /chat
          Opens the real-time chat room list.
          This is your other key page.
        -->
        <router-link to="/chat" class="nav-icon-btn chat-btn" title="Live Chat">
          <i class="fa-solid fa-comments"></i>
          <span class="chat-live-dot"></span>
        </router-link>

        <!-- Avatar / Profile -->
        <router-link to="/profile" class="nav-avatar" title="Profile">
          <div class="avatar-circle">
            <i class="fa-solid fa-user"></i>
          </div>
        </router-link>

        <!-- Login / Register for guests -->
        <div class="nav-auth-btns">
          <router-link to="/login" class="btn-login">Log In</router-link>
          <router-link to="/register" class="btn-register">Sign Up</router-link>
        </div>
      </div>
    </nav>

    <!-- =============================================
         LEFT SIDEBAR — fixed side nav
         ============================================= -->
    <aside class="sidebar-left">
      <div class="sidebar-nav">

        <router-link to="/" class="sidebar-item" active-class="sidebar-item--active">
          <div class="nav-item-inner">
            <i class="fa-solid fa-house"></i>
            <span>Home</span>
          </div>
        </router-link>

        <router-link to="/search?sort=popular" class="sidebar-item" active-class="sidebar-item--active">
          <div class="nav-item-inner">
            <i class="fa-solid fa-fire"></i>
            <span>Popular</span>
          </div>
        </router-link>

        <router-link to="/search" class="sidebar-item" active-class="sidebar-item--active">
          <div class="nav-item-inner">
            <i class="fa-solid fa-compass"></i>
            <span>Topics</span>
          </div>
        </router-link>

        <!-- ── FEATURE SHORTCUTS ── -->
        <div class="sidebar-divider"></div>
        <div class="sidebar-section-label">Live Features</div>

        <!--
          CHAT shortcut — links to the Chat page.
          Shows a green "LIVE" indicator to signal real-time.
        -->
        <router-link to="/chat" class="sidebar-item" active-class="sidebar-item--active">
          <div class="nav-item-inner sidebar-item-chat">
            <i class="fa-solid fa-comments"></i>
            <span>Live Chat</span>
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
            <span class="unread-badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
          </div>
        </router-link>

        <div class="sidebar-divider"></div>
        <div class="sidebar-section-label">Subscribed Communities</div>

        <router-link
          v-for="community in communities"
          :key="community.name"
          :to="`/r/${community.name}`"
          class="sidebar-item sidebar-item--community"
          active-class="sidebar-item--active"
        >
          <div class="nav-item-inner">
            <div class="community-dot" :style="{ background: community.color }"></div>
            <span>r/{{ community.name }}</span>
          </div>
        </router-link>
      </div>

      <!-- Bottom CTA -->
      <div class="sidebar-footer">
        <button class="btn-create-community" @click="$router.push('/r/new')">
          <i class="fa-solid fa-plus"></i> Create Community
        </button>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Search
const searchQuery = ref('')
function goSearch() {
  if (searchQuery.value.trim()) {
    router.push({ name: 'search', query: { q: searchQuery.value } })
    searchQuery.value = ''
  }
}

// Mock notification/inbox state — replace with real API calls later
const hasNotifications = ref(true)
const unreadCount = ref(3)   // 3 unread DMs — drives the inbox badge

// Communities list for the sidebar
const communities = ref([
  { name: 'programming', color: '#3B82F6' },
  { name: 'science',     color: '#22C55E' },
  { name: 'technology',  color: '#A855F7' },
  { name: 'worldnews',   color: '#EF4444' },
  { name: 'gaming',      color: '#F59E0B' },
])
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

/* Chat button — green live indicator */
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

/* LIVE Chat special styling */
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
</style>