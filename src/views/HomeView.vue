<template>
  <AppShell>
    <div class="home-layout">

      <div class="feed-column">

        <div class="sort-bar">
          <button
            v-for="sort in sortOptions"
            :key="sort.value"
            class="sort-btn"
            :class="{ 'sort-btn--active': activeSort === sort.value }"
            @click="activeSort = sort.value"
          >
            <i :class="sort.icon"></i> {{ sort.label }}
          </button>
          <span class="sort-divider"></span>
          <button class="sort-btn sort-dropdown">Everywhere <i class="fa-solid fa-chevron-down"></i></button>
          <button class="sort-view-btn" title="Change post view">
            <i class="fa-solid fa-table-cells-large"></i>
            <i class="fa-solid fa-chevron-down"></i>
          </button>
        </div>

        <!-- ── POST CARDS ── -->
        <article
          v-for="post in posts"
          :key="post.id"
          class="post-card"
          @click="$router.push(`/post/${post.id}`)"
        >
          <div class="post-content">
            <!-- Meta header -->
            <div class="post-meta">
              <div class="community-dot" :style="{ background: post.communityColor }"></div>
              <router-link :to="`/r/${post.community}`" class="post-community" @click.stop>
                r/{{ post.community }}
              </router-link>
              <span class="meta-sep">•</span>
              <span class="post-by">
                Posted by
                <router-link :to="`/profile/${post.author}`" class="post-author" @click.stop>
                  u/{{ post.author }}
                </router-link>
              </span>
              <span class="post-time">{{ post.time }}</span>

              <!-- Flair -->
              <span v-if="post.flair" class="post-flair" :style="{ background: post.flairColor }">
                {{ post.flair }}
              </span>
            </div>

            <!-- Title -->
            <h2 class="post-title">{{ post.title }}</h2>

            <!-- Image (if any) -->
            <div v-if="post.image" class="post-image-wrap">
              <img :src="post.image" :alt="post.title" class="post-image" loading="lazy" />
            </div>

            <!-- Text preview (if no image) -->
            <div v-if="post.text && !post.image" class="post-text-preview">
              {{ post.text }}
              <div class="post-text-fade"></div>
            </div>

            <!-- Link post -->
            <a v-if="post.link" :href="post.link" class="post-link" @click.stop target="_blank">
              {{ post.linkDomain }} <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>

            <!-- Footer actions -->
            <div class="post-actions">
              <div class="vote-pill">
                <button
                  class="vote-btn"
                  :class="{ 'vote-btn--up': post.userVote === 1 }"
                  @click.stop="vote(post, 1)"
                  aria-label="Upvote"
                >
                  <i class="fa-solid fa-arrow-up"></i>
                </button>
                <span class="vote-count" :class="{ 'vote-count--up': post.userVote === 1, 'vote-count--down': post.userVote === -1 }">
                  {{ formatCount(post.votes) }}
                </span>
                <button
                  class="vote-btn"
                  :class="{ 'vote-btn--down': post.userVote === -1 }"
                  @click.stop="vote(post, -1)"
                  aria-label="Downvote"
                >
                  <i class="fa-solid fa-arrow-down"></i>
                </button>
              </div>
              <button class="action-btn" @click.stop="$router.push(`/post/${post.id}`)">
                <i class="fa-regular fa-message"></i>
                {{ formatCount(post.comments) }}
              </button>
              <button class="action-btn" @click.stop>
                <i class="fa-solid fa-share"></i> Share
              </button>
              <button class="action-btn" @click.stop="post.saved = !post.saved">
                <i :class="post.saved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'"></i>
                {{ post.saved ? 'Saved' : 'Save' }}
              </button>

              <!--
                CHAT REACTION shortcut
                Shows an emoji 🔥 reaction count to hint at the Chat feature.
                Clicking it opens the locally saved conversation for this community.
              -->
              <button
                class="action-btn action-btn--reaction"
                @click.stop="$router.push(`/chat/${post.community}`)"
                title="Open the local chat for this community"
              >
                🔥 {{ post.reactions }} Chat
              </button>

              <button class="action-btn action-btn--more">
                <i class="fa-solid fa-ellipsis"></i>
              </button>
            </div>
          </div>
        </article>

        <!-- Loading spinner -->
        <div class="feed-loading">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
        </div>
      </div>

      <!-- =============================================
           RIGHT SIDEBAR
           ============================================= -->
      <aside class="right-sidebar">

        <div class="sidebar-card">
          <div class="sidebar-card-title">Popular Communities</div>
          <div class="trending-list">
            <div
              v-for="(community, index) in trending"
              :key="community.name"
              class="trending-item"
            >
              <i class="fa-solid fa-arrow-trend-up trend-icon"></i>
              <div class="community-dot" :style="{ background: community.color }"></div>
              <div class="trending-info">
                <router-link :to="{ path: '/', query: { r: community.name } }" class="trending-name">
                  r/{{ community.name }}
                </router-link>
                <div class="trending-members">{{ community.members }} members</div>
              </div>
              <button class="btn-join" @click.stop>Join</button>
            </div>
          </div>
          <button class="sidebar-view-more">See more</button>
        </div>

        <div class="sidebar-card sidebar-card--chat">
          <div class="chat-card-header">
            <strong>Community chats</strong>
            <span class="chat-live-indicator"><span class="live-dot"></span> LOCAL</span>
          </div>
          <p class="chat-card-desc">Conversations saved on this device.</p>
          <div class="chat-rooms-preview">
            <div v-for="room in chatRooms" :key="room.id" class="chat-room-row" @click="$router.push(`/chat/${room.id}`)">
              <div class="room-dot" :style="{ background: room.color }"></div>
              <span class="room-name">{{ room.name }}</span>
              <span class="room-count">{{ room.online }} members</span>
            </div>
          </div>
          <router-link to="/chat" class="btn-join-chat">
            View chats
          </router-link>
        </div>

        <!-- Footer links -->
        <div class="sidebar-footer-links">
          <span>Reddit Rules</span>
          <span>Privacy Policy</span>
          <span>User Agreement</span>
          <span>Reddit Inc © 2026</span>
        </div>

      </aside>
    </div>
  </AppShell>
</template>

<script setup>
import { ref } from 'vue'
import AppShell from '../components/AppShell.vue'

// ── Sort options ──
const activeSort = ref('best')
const sortOptions = [
  { value: 'best',  label: 'Best',  icon: 'fa-solid fa-rocket' },
  { value: 'hot',   label: 'Hot',   icon: 'fa-solid fa-fire' },
  { value: 'new',   label: 'New',   icon: 'fa-solid fa-certificate' },
  { value: 'top',   label: 'Top',   icon: 'fa-solid fa-arrow-up-right-dots' },
  { value: 'rising',label: 'Rising',icon: 'fa-solid fa-chart-line' },
]

// ── Vote handler ──
function vote(post, direction) {
  if (post.userVote === direction) {
    post.votes -= direction
    post.userVote = 0
  } else {
    post.votes += direction - (post.userVote || 0)
    post.userVote = direction
  }
}

// ── Format numbers ──
function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

// ── Posts mock data ──
const posts = ref([
  {
    id: 1,
    community: 'technology',
    communityColor: '#A855F7',
    author: 'tech_guru',
    time: '5 hours ago',
    flair: 'Breakthrough',
    flairColor: '#2563EB',
    title: 'New breakthrough in quantum computing announced today, promising 100x speed improvements',
    image: 'https://images.pexels.com/photos/1089438/pexels-photo-1089438.jpeg?auto=compress&cs=tinysrgb&w=800',
    text: null,
    link: null,
    votes: 24500,
    comments: 1200,
    reactions: 48,
    userVote: 0,
    saved: false,
  },
  {
    id: 2,
    community: 'programming',
    communityColor: '#3B82F6',
    author: 'dev_life',
    time: '8 hours ago',
    flair: null,
    flairColor: null,
    title: "What's a programming concept that took you embarrassingly long to understand?",
    image: null,
    text: "For me, it was definitely pointers in C. I remember sitting in my college dorm staring at the screen for hours, drawing little boxes and arrows on paper, and it just wouldn't click. It wasn't until I started building a linked list from scratch that the lightbulb finally went off. What was yours?",
    link: null,
    votes: 8432,
    comments: 3400,
    reactions: 23,
    userVote: 1,
    saved: false,
  },
  {
    id: 3,
    community: 'worldnews',
    communityColor: '#EF4444',
    author: 'news_bot',
    time: '12 hours ago',
    flair: 'Climate',
    flairColor: '#16A34A',
    title: 'Global renewable energy capacity additions hit record high in 2024, report says',
    image: 'https://images.pexels.com/photos/414928/pexels-photo-414928.jpeg?auto=compress&cs=tinysrgb&w=800',
    text: null,
    link: 'https://reuters.com',
    linkDomain: 'reuters.com',
    votes: 12100,
    comments: 856,
    reactions: 15,
    userVote: 0,
    saved: false,
  },
  {
    id: 4,
    community: 'science',
    communityColor: '#22C55E',
    author: 'scientist_99',
    time: '1 day ago',
    flair: null,
    flairColor: null,
    title: 'Researchers discover a new antibiotic compound that can kill drug-resistant bacteria',
    image: null,
    text: 'A team of scientists from MIT have identified a new class of antibiotic molecules using machine learning. The compounds show effectiveness against MRSA and other resistant strains in early tests.',
    link: null,
    votes: 31200,
    comments: 2100,
    reactions: 61,
    userVote: 0,
    saved: true,
  },
])

// ── Chat rooms for sidebar ──
const chatRooms = ref([
  { id: 'technology', name: 'r/technology', color: '#A855F7', online: 142 },
  { id: 'programming', name: 'r/programming', color: '#3B82F6', online: 89 },
  { id: 'science', name: 'r/science', color: '#22C55E', online: 56 },
])

// ── Trending communities ──
const trending = ref([
  { name: 'artificial',     color: '#6366F1', members: '2.4M' },
  { name: 'personalfinance', color: '#10B981', members: '18.1M' },
  { name: 'MachineLearning', color: '#F59E0B', members: '3.1M' },
  { name: 'datascience',    color: '#EC4899', members: '1.9M' },
])

</script>

<style scoped>
/* =============================================
   HOME LAYOUT
   ============================================= */
.home-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* =============================================
   FEED COLUMN
   ============================================= */
.feed-column {
  flex: 1;
  max-width: 640px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- Create Post bar ---- */
.create-post-bar {
  background: var(--reddit-white);
  border: 1px solid var(--reddit-border);
  border-radius: 4px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.create-post-avatar {
  width: 38px; height: 38px;
  border-radius: 4px;
  background: linear-gradient(135deg, #FF6314, #FF4500);
  flex-shrink: 0;
  display: block;
  border: 1px solid var(--reddit-border);
}
.create-post-input {
  flex: 1;
  background: #F6F7F8;
  border: 1px solid var(--reddit-border);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--reddit-text-meta);
  text-decoration: none;
  display: block;
  transition: border-color 0.1s, background 0.1s;
}
.create-post-input:hover {
  background: white;
  border-color: var(--reddit-blue);
}
.create-post-icon-btn {
  width: 36px; height: 36px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--reddit-text-meta);
  transition: background 0.1s;
}
.create-post-icon-btn:hover { background: #F6F7F8; color: var(--reddit-text); }

/* ---- Sort bar ---- */
.sort-bar {
  background: var(--reddit-white);
  border: 1px solid var(--reddit-border);
  border-radius: 4px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.sort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  color: var(--reddit-text-meta);
  transition: background 0.1s, color 0.1s;
  font-family: var(--font-main);
}
.sort-btn:hover { background: #F6F7F8; color: var(--reddit-text); }
.sort-btn--active { background: #F6F7F8; color: var(--reddit-blue); }
.sort-btn--more { margin-left: auto; }

/* ---- Post card ---- */
.post-card {
  background: var(--reddit-white);
  border: 1px solid var(--reddit-border);
  border-radius: 4px;
  display: flex;
  cursor: pointer;
  transition: border-color 0.1s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.post-card:hover { border-color: #818384; }

/* Vote column */
.vote-col {
  width: 40px;
  background: #F8F9FA;
  border-radius: 4px 0 0 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  gap: 2px;
  flex-shrink: 0;
}
.vote-btn {
  width: 24px; height: 24px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--reddit-text-meta);
  transition: color 0.1s, background 0.1s;
}
.vote-btn:hover { background: #EDEFF1; color: var(--reddit-orange); }
.vote-btn--up { color: var(--reddit-orange); }
.vote-btn--down { color: #7193FF; }
.vote-count { font-size: 12px; font-weight: 700; color: var(--reddit-text); }
.vote-count--up { color: var(--reddit-orange); }
.vote-count--down { color: #7193FF; }

/* Post content */
.post-content {
  flex: 1;
  padding: 8px 8px 4px;
  min-width: 0;
}
.post-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--reddit-text-meta);
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.community-dot {
  width: 20px; height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
}
.post-community {
  font-weight: 700;
  color: var(--reddit-text);
  text-decoration: none;
}
.post-community:hover { text-decoration: underline; }
.meta-sep { color: var(--reddit-border); }
.post-by { color: var(--reddit-text-meta); }
.post-author { text-decoration: none; color: var(--reddit-text-meta); }
.post-author:hover { text-decoration: underline; }
.post-time { color: var(--reddit-text-meta); }
.post-flair {
  font-size: 11px;
  font-weight: 600;
  color: white;
  padding: 1px 6px;
  border-radius: 2px;
}
.post-title {
  font-size: 18px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--reddit-text);
  margin-bottom: 8px;
}
.post-image-wrap {
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
  border: 1px solid var(--reddit-border);
  background: #F6F7F8;
  max-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-image {
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: contain;
  display: block;
}
.post-text-preview {
  font-size: 14px;
  color: var(--reddit-text);
  line-height: 1.6;
  margin-bottom: 6px;
  max-height: 100px;
  overflow: hidden;
  position: relative;
}
.post-text-fade {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 32px;
  background: linear-gradient(to bottom, transparent, white);
}
.post-link {
  font-size: 12px;
  color: var(--reddit-blue);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  text-decoration: none;
}
.post-link:hover { text-decoration: underline; }

/* Post actions */
.post-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 2px;
  font-size: 12px;
  font-weight: 700;
  color: var(--reddit-text-meta);
  transition: background 0.1s, color 0.1s;
  font-family: var(--font-main);
  white-space: nowrap;
}
.action-btn:hover { background: #F6F7F8; color: var(--reddit-text); }
.action-btn--reaction {
  color: #16A34A;
  font-size: 13px;
}
.action-btn--reaction:hover { background: #F0FDF4; }
.action-btn--more { margin-left: auto; }

/* Loading spinner */
.feed-loading {
  text-align: center;
  padding: 24px;
  font-size: 22px;
  color: var(--reddit-orange);
}

/* =============================================
   RIGHT SIDEBAR
   ============================================= */
.right-sidebar {
  width: 312px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 68px;
}

.sidebar-card {
  background: var(--reddit-white);
  border: 1px solid var(--reddit-border);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.sidebar-card-title {
  font-size: 14px;
  font-weight: 700;
  padding: 10px 12px;
  border-bottom: 1px solid var(--reddit-border);
  display: flex;
  align-items: center;
  gap: 8px;
  background: #F8F9FA;
}

/* Premium card */
.premium-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
}
.premium-icon { font-size: 28px; color: var(--reddit-orange); flex-shrink: 0; }
.premium-title { font-size: 14px; font-weight: 700; }
.premium-sub { font-size: 12px; color: var(--reddit-text-meta); margin-top: 2px; }
.btn-premium {
  display: block;
  margin: 0 12px 12px;
  padding: 8px;
  background: var(--reddit-orange);
  color: white;
  font-weight: 700;
  font-size: 14px;
  border-radius: 20px;
  text-align: center;
  width: calc(100% - 24px);
  font-family: var(--font-main);
  transition: background 0.1s;
}
.btn-premium:hover { background: var(--reddit-orange-hover); }

/* ── Chat sidebar card ── */
.sidebar-card--chat { border-color: #22C55E; }
.chat-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 6px;
  font-size: 15px;
}
.chat-live-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #16A34A;
  background: #DCFCE7;
  padding: 2px 7px;
  border-radius: 10px;
}
.live-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #22C55E;
  display: inline-block;
  animation: pulse-green 1.5s infinite;
}
@keyframes pulse-green {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.chat-card-desc {
  font-size: 12px;
  color: var(--reddit-text-meta);
  padding: 0 12px 8px;
  line-height: 1.5;
}
.chat-rooms-preview {
  border-top: 1px solid var(--reddit-border);
  border-bottom: 1px solid var(--reddit-border);
}
.chat-room-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
}
.chat-room-row:hover { background: #F0FDF4; }
.room-dot { width: 10px; height: 10px; border-radius: 50%; }
.room-name { font-size: 13px; font-weight: 600; flex: 1; }
.room-count { font-size: 11px; color: var(--reddit-text-meta); }
.btn-join-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 12px;
  padding: 8px;
  background: #16A34A;
  color: white;
  font-weight: 700;
  font-size: 14px;
  border-radius: 20px;
  text-decoration: none;
  transition: background 0.1s;
  font-family: var(--font-main);
}
.btn-join-chat:hover { background: #15803D; }

/* Trending */
.trending-list { padding: 8px 0; }
.trending-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}
.trend-icon { font-size: 13px; color: var(--reddit-blue); width: 16px; text-align: center; }
.trending-info { flex: 1; min-width: 0; }
.trending-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--reddit-text);
  text-decoration: none;
  display: block;
}
.trending-name:hover { text-decoration: underline; }
.trending-members { font-size: 11px; color: var(--reddit-text-meta); }
.btn-join {
  padding: 4px 14px;
  background: var(--reddit-blue);
  color: white;
  font-size: 13px;
  font-weight: 700;
  border-radius: 20px;
  flex-shrink: 0;
  font-family: var(--font-main);
  transition: background 0.1s;
}
.btn-join:hover { background: #0060A8; }
.sidebar-view-more {
  display: block;
  text-align: center;
  padding: 8px;
  font-size: 13px;
  color: var(--reddit-blue);
  font-weight: 600;
  border-top: 1px solid var(--reddit-border);
  text-decoration: none;
}
.sidebar-view-more:hover { background: #F6F7F8; }

/* ── Inbox card ── */
.sidebar-card--inbox .sidebar-card-title { justify-content: space-between; }
.inbox-link {
  font-size: 12px;
  color: var(--reddit-blue);
  text-decoration: none;
  margin-left: auto;
}
.inbox-link:hover { text-decoration: underline; }
.inbox-previews { padding: 4px 0; }
.inbox-preview-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
}
.inbox-preview-row:hover { background: #F6F7F8; }
.inbox-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.inbox-preview-content { flex: 1; min-width: 0; }
.inbox-from { font-size: 13px; font-weight: 700; }
.inbox-preview-text {
  font-size: 12px;
  color: var(--reddit-text-meta);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.inbox-unread-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--reddit-orange);
  flex-shrink: 0;
}
.btn-go-inbox {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 8px 12px 12px;
  padding: 8px;
  background: var(--reddit-blue);
  color: white;
  font-weight: 700;
  font-size: 14px;
  border-radius: 20px;
  text-decoration: none;
  transition: background 0.1s;
  font-family: var(--font-main);
}
.btn-go-inbox:hover { background: #0060A8; }

/* Footer links */
.sidebar-footer-links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--reddit-text-meta);
  padding: 4px 0;
}
.sidebar-footer-links a {
  color: var(--reddit-text-meta);
  text-decoration: none;
}
.sidebar-footer-links a:hover { text-decoration: underline; }

/* =============================================
   RESPONSIVE
   ============================================= */
@media (max-width: 1080px) {
  .right-sidebar { display: none; }
}
@media (max-width: 640px) {
  .home-layout { padding: 12px; }
  .post-title { font-size: 15px; }
}

/* Reddit's current feed keeps the conversation primary and the chrome quiet. */
.home-layout {
  width: min(1120px, 100%);
  max-width: none;
  padding: 20px 24px 48px;
  gap: 44px;
  justify-content: center;
}
.feed-column {
  width: min(100%, 756px);
  max-width: 756px;
  gap: 0;
}
.sort-bar {
  height: 48px;
  margin-bottom: 8px;
  padding: 0 8px;
  gap: 2px;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.sort-btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 18px;
  color: var(--reddit-text-secondary);
  font-size: 13px;
  font-weight: 600;
}
.sort-btn i { font-size: 13px; }
.sort-btn:hover { background: var(--reddit-surface-inset); }
.sort-btn--active {
  background: var(--reddit-surface-inset);
  color: var(--reddit-text);
}
.sort-divider {
  width: 1px;
  height: 20px;
  margin: 0 8px;
  background: var(--reddit-border);
}
.sort-dropdown { font-weight: 500; }
.sort-view-btn {
  height: 36px;
  min-width: 48px;
  margin-left: auto;
  border-radius: 18px;
  color: var(--reddit-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.sort-view-btn:hover { background: var(--reddit-surface-inset); }
.sort-view-btn .fa-chevron-down,
.sort-dropdown .fa-chevron-down { font-size: 9px; }
.post-card {
  display: block;
  padding: 4px 0;
  border: 0;
  border-top: 1px solid var(--reddit-border-soft);
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}
.post-card:hover {
  border-color: var(--reddit-border-soft);
  background: var(--reddit-surface-inset);
  border-radius: 16px;
}
.post-content {
  padding: 12px 16px 10px;
}
.post-meta {
  margin-bottom: 8px;
  gap: 6px;
  color: var(--reddit-text-meta);
  font-size: 12px;
}
.post-meta .community-dot {
  width: 24px;
  height: 24px;
}
.post-community { color: var(--reddit-text); }
.post-title {
  margin: 0 0 10px;
  color: var(--reddit-text);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.35;
}
.post-text-preview {
  margin-bottom: 10px;
  color: var(--reddit-text-secondary);
  font-size: 14px;
  line-height: 1.48;
  max-height: 88px;
}
.post-text-fade {
  background: linear-gradient(to bottom, transparent, var(--reddit-white));
}
.post-card:hover .post-text-fade {
  background: linear-gradient(to bottom, transparent, var(--reddit-surface-inset));
}
.post-image-wrap {
  margin-bottom: 10px;
  border-color: var(--reddit-border-soft);
  border-radius: 16px;
  background: var(--reddit-surface-inset);
}
.post-image { max-height: 520px; object-fit: cover; }
.post-actions { gap: 8px; margin-top: 8px; }
.vote-pill,
.action-btn {
  height: 32px;
  border-radius: 18px;
  background: var(--reddit-surface-inset);
  color: var(--reddit-text-secondary);
}
.vote-pill {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
}
.vote-btn {
  width: 34px;
  height: 32px;
  font-size: 14px;
  color: var(--reddit-text-secondary);
}
.vote-btn:hover { background: rgba(255, 69, 0, 0.12); }
.vote-count {
  min-width: 31px;
  color: var(--reddit-text);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: center;
}
.action-btn {
  padding: 0 13px;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
}
.action-btn:hover { background: #e8ebed; }
.action-btn--reaction { color: var(--reddit-text-secondary); font-size: 12px; }
.action-btn--reaction:hover { background: #e8ebed; }
.action-btn--more { margin-left: 0; width: 36px; padding: 0; justify-content: center; }
.feed-loading { color: var(--reddit-text-muted); font-size: 18px; padding: 28px; }
.right-sidebar {
  width: 304px;
  gap: 16px;
  top: 76px;
}
.sidebar-card {
  border: 0;
  border-radius: 16px;
  background: var(--reddit-surface-inset);
  box-shadow: none;
}
.sidebar-card-title {
  padding: 16px 16px 8px;
  border: 0;
  background: transparent;
  color: var(--reddit-text-secondary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.trending-list { padding: 4px 8px; }
.trending-item {
  min-height: 56px;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
}
.trending-item:hover { background: rgba(15, 26, 28, 0.05); }
.trend-icon { display: none; }
.trending-item .community-dot { width: 36px; height: 36px; }
.trending-name { font-size: 14px; font-weight: 600; }
.trending-members { color: var(--reddit-text-meta); font-size: 12px; }
.btn-join {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--reddit-border-emphasis);
  color: var(--reddit-text);
  font-weight: 600;
}
.btn-join:hover { background: rgba(15, 26, 28, 0.06); }
.sidebar-view-more {
  width: calc(100% - 24px);
  margin: 4px 12px 12px;
  padding: 10px;
  border: 0;
  border-radius: 20px;
  color: var(--reddit-text);
  text-align: left;
  font-weight: 600;
}
.sidebar-view-more:hover { background: rgba(15, 26, 28, 0.06); }
.sidebar-card--chat { border: 0; }
.chat-card-header {
  justify-content: space-between;
  padding: 16px 16px 4px;
}
.chat-card-desc {
  padding: 0 16px 10px;
  color: var(--reddit-text-meta);
}
.chat-rooms-preview {
  border-color: var(--reddit-border-soft);
  padding: 4px 8px;
}
.chat-room-row {
  border-radius: 10px;
  padding: 9px 8px;
}
.chat-room-row:hover { background: rgba(15, 26, 28, 0.05); }
.btn-join-chat {
  margin: 10px 12px 12px;
  background: transparent;
  border: 1px solid var(--reddit-border-emphasis);
  color: var(--reddit-text);
  font-weight: 600;
}
.btn-join-chat:hover { background: rgba(15, 26, 28, 0.06); }
.sidebar-footer-links {
  gap: 12px;
  padding: 4px 12px;
  color: var(--reddit-text-meta);
}
@media (max-width: 1220px) {
  .home-layout { gap: 24px; }
}
@media (max-width: 820px) {
  .home-layout { padding: 8px 0 40px; }
  .sort-bar { overflow-x: auto; }
  .sort-btn { flex-shrink: 0; }
  .post-content { padding: 12px 16px; }
}
</style>
