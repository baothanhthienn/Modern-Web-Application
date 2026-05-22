<template>
  <AppShell>
    <div class="home-layout">

      <div class="feed-column">

        <!-- Create Post Input Bar -->
        <div class="create-post-bar">
          <router-link to="/profile" class="create-post-avatar"></router-link>
          <router-link to="/post/create" class="create-post-input">
            Create Post
          </router-link>
          <button class="create-post-icon-btn" title="Image/Video">
            <i class="fa-regular fa-image"></i>
          </button>
          <button class="create-post-icon-btn" title="Link">
            <i class="fa-solid fa-link"></i>
          </button>
        </div>

        <!-- Sort Bar -->
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
          <button class="sort-btn sort-btn--more">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
        </div>

        <!-- ── POST CARDS ── -->
        <article
          v-for="post in posts"
          :key="post.id"
          class="post-card"
          @click="$router.push(`/post/${post.id}`)"
        >
          <!-- Vote column -->
          <div class="vote-col">
            <button
              class="vote-btn"
              :class="{ 'vote-btn--up': post.userVote === 1 }"
              @click.stop="vote(post, 1)"
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
            >
              <i class="fa-solid fa-arrow-down"></i>
            </button>
          </div>

          <!-- Content column -->
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
              <button class="action-btn" @click.stop="$router.push(`/post/${post.id}`)">
                <i class="fa-regular fa-message"></i>
                {{ formatCount(post.comments) }} Comments
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
                Clicking it takes you to the live chat for this post's community.
              -->
              <button
                class="action-btn action-btn--reaction"
                @click.stop="$router.push(`/chat/${post.community}`)"
                title="Join live chat for this community"
              >
                🔥 {{ post.reactions }} Live
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

        <!-- Reddit Premium -->
        <div class="sidebar-card">
          <div class="premium-header">
            <i class="fa-solid fa-shield-halved premium-icon"></i>
            <div>
              <div class="premium-title">Reddit Premium</div>
              <div class="premium-sub">The best Reddit experience, with monthly Coins</div>
            </div>
          </div>
          <button class="btn-premium">Try Now</button>
        </div>

        <!--
          LIVE CHAT CARD
          Promotes your Chat feature right in the sidebar.
        -->
        <div class="sidebar-card sidebar-card--chat">
          <div class="chat-card-header">
            <span class="chat-live-indicator">
              <span class="live-dot"></span> LIVE
            </span>
            <strong>Community Chat</strong>
          </div>
          <p class="chat-card-desc">
            Join live chat rooms, react to messages with emoji, and see who's typing in real time.
          </p>
          <div class="chat-rooms-preview">
            <div
              v-for="room in chatRooms"
              :key="room.id"
              class="chat-room-row"
              @click="$router.push(`/chat/${room.id}`)"
            >
              <div class="room-dot" :style="{ background: room.color }"></div>
              <span class="room-name">{{ room.name }}</span>
              <span class="room-count">{{ room.online }} online</span>
            </div>
          </div>
          <router-link to="/chat" class="btn-join-chat">
            <i class="fa-solid fa-comments"></i> Open Chat
          </router-link>
        </div>

        <!-- Trending Communities -->
        <div class="sidebar-card">
          <div class="sidebar-card-title">Trending Communities</div>
          <div class="trending-list">
            <div
              v-for="(community, index) in trending"
              :key="community.name"
              class="trending-item"
            >
              <i class="fa-solid fa-arrow-trend-up trend-icon"></i>
              <div class="community-dot" :style="{ background: community.color }"></div>
              <div class="trending-info">
                <router-link :to="`/r/${community.name}`" class="trending-name">
                  r/{{ community.name }}
                </router-link>
                <div class="trending-members">{{ community.members }} members</div>
              </div>
              <button class="btn-join" @click.stop>Join</button>
            </div>
          </div>
          <router-link to="/search" class="sidebar-view-more">View All ›</router-link>
        </div>

        <!-- Direct Messages quick-access -->
        <div class="sidebar-card sidebar-card--inbox">
          <div class="sidebar-card-title">
            <i class="fa-solid fa-inbox"></i> Recent Messages
            <router-link to="/inbox" class="inbox-link">View All</router-link>
          </div>
          <div class="inbox-previews">
            <div
              v-for="msg in recentMessages"
              :key="msg.id"
              class="inbox-preview-row"
              @click="$router.push('/inbox')"
            >
              <div class="inbox-avatar" :style="{ background: msg.color }">
                {{ msg.from[0].toUpperCase() }}
              </div>
              <div class="inbox-preview-content">
                <div class="inbox-from">{{ msg.from }}</div>
                <div class="inbox-preview-text">{{ msg.preview }}</div>
              </div>
              <span v-if="msg.unread" class="inbox-unread-dot"></span>
            </div>
          </div>
          <router-link to="/inbox" class="btn-go-inbox">
            <i class="fa-solid fa-envelope"></i> Open Inbox
          </router-link>
        </div>

        <!-- Footer links -->
        <div class="sidebar-footer-links">
          <router-link to="/about">Help</router-link>
          <router-link to="/about">About</router-link>
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

// ── Recent DMs for sidebar inbox preview ──
const recentMessages = ref([
  { id: 1, from: 'alice_dev',   preview: 'Hey, did you see the new post?', unread: true,  color: '#6366F1' },
  { id: 2, from: 'bob_coder',   preview: 'Thanks for the help earlier!',   unread: true,  color: '#F59E0B' },
  { id: 3, from: 'charlie_99',  preview: 'Lol same honestly 😂',           unread: false, color: '#10B981' },
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
</style>