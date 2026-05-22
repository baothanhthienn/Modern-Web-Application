<template>
  <AppShell>
    <div class="notifications-page">
      <div class="notifications-container">

        <div class="page-header">
          <h1 class="page-title">Notifications</h1>
          <div class="header-actions">
            <button class="btn-mark-all" @click="markAllRead">
              <i class="fa-solid fa-check-double"></i> Mark all as read
            </button>
            <select v-model="filterType" class="filter-select">
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="mentions">Mentions</option>
              <option value="upvotes">Upvotes</option>
              <option value="comments">Comments</option>
            </select>
          </div>
        </div>

        <!-- Notification list -->
        <div class="notif-list">
          <div
            v-for="notif in filteredNotifications"
            :key="notif.id"
            class="notif-item"
            :class="{ 'notif-item--unread': !notif.read }"
            @click="markRead(notif)"
          >
            <!-- Icon -->
            <div class="notif-icon" :class="`notif-icon--${notif.type}`">
              <i :class="notifIcon(notif.type)"></i>
            </div>

            <!-- Content -->
            <div class="notif-content">
              <div class="notif-text">
                <strong>{{ notif.from }}</strong>
                {{ notif.action }}
                <router-link :to="notif.link" class="notif-link" @click.stop>
                  {{ notif.subject }}
                </router-link>
              </div>
              <div class="notif-meta">
                <span>r/{{ notif.community }}</span>
                <span>·</span>
                <span>{{ formatTime(notif.timestamp) }}</span>
              </div>
            </div>

            <!-- Unread dot -->
            <div v-if="!notif.read" class="notif-unread-dot"></div>
          </div>

          <!-- Empty state -->
          <div v-if="filteredNotifications.length === 0" class="empty-notif">
            <i class="fa-regular fa-bell-slash"></i>
            <p>No notifications here</p>
          </div>
        </div>

      </div>
    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppShell from '../components/AppShell.vue'

const filterType = ref('all')

const notifications = ref([
  { id: 1, type: 'upvote',  from: 'alice_dev',   action: 'upvoted your post',    subject: '"New breakthrough in quantum..."', community: 'technology',  link: '/post/1', read: false, timestamp: Date.now() - 300000 },
  { id: 2, type: 'comment', from: 'bob_coder',    action: 'commented on',         subject: '"What took you embarrassingly..."', community: 'programming', link: '/post/2', read: false, timestamp: Date.now() - 900000 },
  { id: 3, type: 'mention', from: 'charlie_99',   action: 'mentioned you in',     subject: 'r/technology',                 community: 'technology',  link: '/chat/technology', read: false, timestamp: Date.now() - 1800000 },
  { id: 4, type: 'reaction',from: 'dev_life',     action: 'reacted 🔥 to your message in', subject: 'r/programming Live Chat', community: 'programming', link: '/chat/programming', read: true, timestamp: Date.now() - 3600000 },
  { id: 5, type: 'upvote',  from: 'gamer_pro',    action: 'upvoted your comment', subject: 'Global renewable energy...',   community: 'worldnews',   link: '/post/3', read: true,  timestamp: Date.now() - 7200000 },
  { id: 6, type: 'dm',      from: 'alice_dev',    action: 'sent you a message',   subject: '"Hey, did you see the new..."', community: 'inbox',       link: '/inbox',  read: false, timestamp: Date.now() - 120000 },
])

const filteredNotifications = computed(() => {
  if (filterType.value === 'all') return notifications.value
  if (filterType.value === 'unread') return notifications.value.filter(n => !n.read)
  return notifications.value.filter(n => n.type === filterType.value.slice(0, -1))
})

function notifIcon(type) {
  const map = {
    upvote:   'fa-solid fa-arrow-up',
    comment:  'fa-regular fa-message',
    mention:  'fa-solid fa-at',
    reaction: 'fa-regular fa-face-smile',
    dm:       'fa-solid fa-envelope',
    award:    'fa-solid fa-trophy',
  }
  return map[type] || 'fa-solid fa-bell'
}

function markRead(notif) { notif.read = true }
function markAllRead()   { notifications.value.forEach(n => n.read = true) }

function formatTime(ts) {
  const diff = Date.now() - ts
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}
</script>

<style scoped>
.notifications-page { padding: 20px; }
.notifications-container { max-width: 740px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.page-title { font-size: 20px; font-weight: 700; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.btn-mark-all { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid #EDEFF1; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; background: white; font-family: inherit; transition: background 0.1s; }
.btn-mark-all:hover { background: #F6F7F8; }
.filter-select { padding: 6px 10px; border: 1px solid #EDEFF1; border-radius: 20px; font-size: 13px; font-family: inherit; outline: none; background: white; cursor: pointer; }
.notif-list { background: white; border: 1px solid #EDEFF1; border-radius: 4px; overflow: hidden; }
.notif-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border-bottom: 1px solid #F6F7F8; cursor: pointer; transition: background 0.1s; position: relative; }
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: #F6F7F8; }
.notif-item--unread { background: #FFF8F7; }
.notif-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; color: white; }
.notif-icon--upvote   { background: #FF4500; }
.notif-icon--comment  { background: #0079D3; }
.notif-icon--mention  { background: #A855F7; }
.notif-icon--reaction { background: #F59E0B; }
.notif-icon--dm       { background: #22C55E; }
.notif-icon--award    { background: #EAB308; }
.notif-content { flex: 1; min-width: 0; }
.notif-text { font-size: 14px; line-height: 1.5; }
.notif-link { color: #0079D3; text-decoration: none; }
.notif-link:hover { text-decoration: underline; }
.notif-meta { font-size: 12px; color: #878A8C; margin-top: 3px; display: flex; gap: 6px; }
.notif-unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #FF4500; flex-shrink: 0; margin-top: 6px; }
.empty-notif { padding: 60px 20px; text-align: center; color: #878A8C; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-notif i { font-size: 40px; }
</style>