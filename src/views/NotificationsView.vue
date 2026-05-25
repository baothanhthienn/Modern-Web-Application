<template>
  <AppShell>
    <div class="notifications-page container-fluid">
      <div class="notifications-container">
        <header class="page-header d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <h1>Notifications</h1>
            <p>Account updates delivered by the server.</p>
          </div>
          <div class="filters d-flex gap-2" aria-label="Notification filters">
            <button :class="{ selected: filter === 'all' }" @click="filter = 'all'">All</button>
            <button :class="{ selected: filter === 'unread' }" @click="filter = 'unread'">Unread</button>
          </div>
        </header>

        <section class="notification-card">
          <div v-if="loading" class="state">Loading notifications...</div>
          <div v-else-if="error" class="state state--error">{{ error }}</div>
          <template v-else-if="filteredNotifications.length">
            <router-link
              v-for="notification in filteredNotifications"
              :key="notification.id"
              :to="notification.postId ? `/post/${notification.postId}` : '/'"
              class="notification"
              :class="{ unread: !notification.read }"
            >
              <span class="icon"><i :class="iconFor(notification.type)"></i></span>
              <div class="notification-copy">
                <strong>{{ notification.message }}</strong>
                <p>
                  <span v-if="notification.actor">u/{{ notification.actor }}</span>
                  <span v-if="notification.postId">Post #{{ notification.postId }}</span>
                  <span>{{ formatRelativeTime(notification.createdAt) }}</span>
                </p>
              </div>
              <span v-if="!notification.read" class="unread-dot" aria-label="Unread"></span>
            </router-link>
            <button v-if="nextCursor" class="load-more" @click="loadNotifications(nextCursor)">Load more</button>
          </template>
          <div v-else class="state">
            <i class="fa-regular fa-bell-slash"></i>
            <p>No {{ filter === 'unread' ? 'unread ' : '' }}notifications.</p>
          </div>
        </section>
      </div>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppShell from '../components/AppShell.vue'
import { getNotifications } from '../services/api.js'
import { formatRelativeTime } from '../services/format.js'

const notifications = ref([])
const nextCursor = ref(null)
const filter = ref('all')
const loading = ref(true)
const error = ref('')
const filteredNotifications = computed(() => filter.value === 'unread'
  ? notifications.value.filter((notification) => !notification.read)
  : notifications.value)

function iconFor(type) {
  return {
    post_created: 'fa-solid fa-pen-to-square',
  }[type] || 'fa-regular fa-bell'
}

async function loadNotifications(cursor) {
  error.value = ''
  try {
    const data = await getNotifications({ cursor })
    notifications.value = cursor
      ? [...notifications.value, ...data.notifications]
      : data.notifications
    nextCursor.value = data.nextCursor
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

onMounted(() => loadNotifications())
</script>

<style scoped>
.notifications-page { padding: 22px 16px 56px; }
.notifications-container { max-width: 760px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; letter-spacing: -.025em; }
.page-header p { margin-top: 4px; color: var(--reddit-text-secondary); font-size: 13px; }
.filters button { height: 38px; padding: 0 17px; border-radius: 20px; color: var(--reddit-text-secondary); font-size: 13px; font-weight: 700; }
.filters button:hover, .filters .selected { background: var(--reddit-surface-inset); color: var(--reddit-text); }
.notification-card { overflow: hidden; border: 1px solid var(--reddit-border-soft); border-radius: 16px; }
.notification { min-height: 76px; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-bottom: 1px solid var(--reddit-border-soft); color: var(--reddit-text); text-decoration: none; }
.notification:hover { background: var(--reddit-surface-inset); }
.notification.unread { background: rgba(255, 69, 0, .035); }
.icon { width: 42px; height: 42px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; background: rgba(255, 69, 0, .12); color: var(--reddit-orange); }
.notification-copy { flex: 1; }
.notification-copy strong { font-size: 14px; font-weight: 600; }
.notification-copy p { margin-top: 5px; display: flex; gap: 10px; color: var(--reddit-text-meta); font-size: 12px; }
.unread-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--reddit-orange); }
.state { min-height: 220px; display: grid; align-content: center; justify-items: center; gap: 12px; color: var(--reddit-text-secondary); font-size: 14px; }
.state i { color: var(--reddit-text-muted); font-size: 32px; }
.state--error { color: #b42318; }
.load-more { display: block; margin: 16px auto; height: 40px; padding: 0 20px; border: 1px solid var(--reddit-border-emphasis); border-radius: 21px; font-weight: 700; }
</style>
