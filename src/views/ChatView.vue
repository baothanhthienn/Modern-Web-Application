<template>
  <!--
    ChatView.vue
    ============================================================
    The local community conversation page.

    LAYOUT:
      ┌─────────────────────────────────────────┐
      │  AppShell (Navbar + Left Sidebar)        │
      │  ┌──────────────┬──────────────────────┐ │
      │  │  Room List   │  Active Chat Panel   │ │
      │  │  (left)      │  ┌──────────────────┐│ │
      │  │              │  │  Room Header     ││ │
      │  │  • tech      │  ├──────────────────┤│ │
      │  │  • prog      │  │  MessageList     ││ │
      │  │  • science   │  │  (scrollable)    ││ │
      │  │              │  ├──────────────────┤│ │
      │  │              │  │  MessageInput    ││ │
      │  │              │  └──────────────────┘│ │
      │  └──────────────┴──────────────────────┘ │
      └─────────────────────────────────────────┘

    FEATURES IMPLEMENTED:
      Messages and reactions are stored locally in this browser for static hosting.
  -->
  <AppShell>
    <div class="chat-page">

      <!-- ── Room list panel (left) ── -->
      <aside class="room-list-panel">
        <div class="room-list-header">
          <i class="fa-solid fa-comments"></i>
          <span>Community Rooms</span>
          <span class="conn-badge conn-badge--offline">Local</span>
        </div>

        <!-- Search rooms -->
        <div class="room-search-wrap">
          <i class="fa-solid fa-magnifying-glass room-search-icon"></i>
          <input
            v-model="roomSearch"
            type="text"
            placeholder="Search rooms..."
            class="room-search-input"
          />
        </div>

        <!-- Room items -->
        <div class="room-items">
          <div
            v-for="room in filteredRooms"
            :key="room.id"
            class="room-item"
            :class="{ 'room-item--active': activeRoomId === room.id }"
            @click="selectRoom(room)"
          >
            <div class="room-icon" :style="{ background: room.color }">
              {{ room.name[0].toUpperCase() }}
            </div>
            <div class="room-info">
              <div class="room-name">r/{{ room.name }}</div>
              <div class="room-last-msg">{{ room.lastMessage || 'No messages yet' }}</div>
            </div>
            <div class="room-meta">
              <span class="room-online">
                  <span class="online-dot"></span>{{ room.online }} members
              </span>
              <span v-if="room.unread > 0" class="room-unread">{{ room.unread }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- ── Active chat panel (right) ── -->
      <section class="chat-panel">

        <!-- No room selected state -->
        <div v-if="!activeRoom" class="no-room-state">
          <i class="fa-solid fa-comments no-room-icon"></i>
          <h3>Select a room to start chatting</h3>
          <p>Choose a community chat room from the list on the left.</p>
        </div>

        <!-- Active room -->
        <template v-else>

          <!-- Room header -->
          <header class="chat-header">
            <div class="chat-header-left">
              <div class="chat-room-icon" :style="{ background: activeRoom.color }">
                {{ activeRoom.name[0].toUpperCase() }}
              </div>
              <div>
                <div class="chat-room-name">r/{{ activeRoom.name }} - Local Chat</div>
                <div class="chat-room-sub">
                  <span class="online-dot online-dot--sm"></span>
                  {{ activeRoom.online }} community members
                </div>
              </div>
            </div>

            <!-- Online members strip -->
            <div class="online-members">
              <div
                v-for="user in onlineUsers.slice(0, 5)"
                :key="user"
                class="online-member-avatar"
                :style="{ background: avatarColor(user) }"
                :title="user"
              >
                {{ user[0].toUpperCase() }}
              </div>
              <span v-if="onlineUsers.length > 5" class="online-more">
                +{{ onlineUsers.length - 5 }}
              </span>
            </div>
          </header>

          <MessageList
            :messages="messages"
            :currentUser="currentUser"
            @react="handleReaction"
          />

          <MessageInput
            :disabled="false"
            :roomName="activeRoom.name"
            @send="handleSend"
          />

        </template>
      </section>

    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import MessageList from '../components/chat/MessageList.vue'
import MessageInput from '../components/chat/MessageInput.vue'
import { useLocalMessages } from '../composables/useLocalMessages.js'
import { getStoredUser } from '../services/auth.js'

// ── Route param — /chat/:roomId? allows linking directly to a room ──
const route = useRoute()

const {
  onlineUsers,
  loadMessages,
  saveMessages,
  addMessage,
} = useLocalMessages()

// Use the authenticated account when present; keep demo identity for guest preview mode.
const currentUser = ref(getStoredUser()?.username || 'bao_dev')

// ── Messages for the active room ──
const messages = ref([])

// ── Rooms list ──
const rooms = ref([
  { id: 'technology',   name: 'technology',   color: '#A855F7', online: 142, unread: 3, lastMessage: 'Anyone tried the new M4?' },
  { id: 'programming',  name: 'programming',  color: '#3B82F6', online: 89,  unread: 0, lastMessage: 'Python vs TypeScript debate again...' },
  { id: 'science',      name: 'science',      color: '#22C55E', online: 56,  unread: 1, lastMessage: 'New paper on CRISPR is wild' },
  { id: 'worldnews',    name: 'worldnews',    color: '#EF4444', online: 201, unread: 0, lastMessage: 'Breaking: climate summit update' },
  { id: 'gaming',       name: 'gaming',       color: '#F59E0B', online: 318, unread: 7, lastMessage: 'Has anyone played Silksong yet??' },
])

const roomSearch = ref('')
const activeRoomId = ref(null)

// Filtered rooms based on search query
const filteredRooms = computed(() => {
  const q = roomSearch.value.toLowerCase()
  if (!q) return rooms.value
  return rooms.value.filter(r => r.name.toLowerCase().includes(q))
})

// The currently active room object
const activeRoom = computed(() =>
  rooms.value.find(r => r.id === activeRoomId.value) || null
)

// ── Select a room ──
function selectRoom(room) {
  activeRoomId.value = room.id

  // Clear unread badge for this room
  room.unread = 0

  messages.value = loadMessages(room.id)
}

// ── User actions ──

function handleSend(text) {
  messages.value.push(addMessage(activeRoomId.value, text, currentUser.value))

  // Update room preview
  if (activeRoom.value) activeRoom.value.lastMessage = text
}

/**
 * handleReaction — called when MessageList emits 'react'
 * Feature 2: toggle emoji reaction on a message
 */
function handleReaction(messageId, emoji) {
  // Optimistic update: toggle locally immediately
  const msg = messages.value.find(m => m.id === messageId)
  if (msg) {
    if (!msg.reactions) msg.reactions = {}
    const users = msg.reactions[emoji] || []
    if (users.includes(currentUser.value)) {
      // Un-react
      msg.reactions[emoji] = users.filter(u => u !== currentUser.value)
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji]
      }
    } else {
      // React
      msg.reactions[emoji] = [...users, currentUser.value]
    }
  }

  saveMessages(activeRoomId.value, messages.value)
}

// ── Avatar color helper ──
function avatarColor(username) {
  const colors = ['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#A855F7', '#3B82F6']
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ── Auto-join room from URL param ──
onMounted(() => {
  const roomId = route.params.roomId
  if (roomId) {
    const room = rooms.value.find(r => r.id === roomId)
    if (room) selectRoom(room)
  }
})

</script>
