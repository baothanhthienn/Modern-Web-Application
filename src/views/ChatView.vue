<template>
  <!--
    ChatView.vue
    ============================================================
    The main real-time chat page.

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
      │  │              │  │ TypingIndicator  ││ │
      │  │              │  ├──────────────────┤│ │
      │  │              │  │  MessageInput    ││ │
      │  │              │  └──────────────────┘│ │
      │  └──────────────┴──────────────────────┘ │
      └─────────────────────────────────────────┘

    FEATURES IMPLEMENTED:
      Feature 1A — Typing Indicators (via useSocket + TypingIndicator)
      Feature 1B — Message Read Receipts (status: sent→delivered→seen)
      Feature 2  — Emoji Reactions (via useSocket + ReactionPicker)
  -->
  <AppShell>
    <div class="chat-page">

      <!-- ── Room list panel (left) ── -->
      <aside class="room-list-panel">
        <div class="room-list-header">
          <i class="fa-solid fa-comments"></i>
          <span>Live Chat Rooms</span>
          <!-- Connection status indicator -->
          <span class="conn-badge" :class="isConnected ? 'conn-badge--online' : 'conn-badge--offline'">
            {{ isConnected ? 'Connected' : 'Demo' }}
          </span>
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
                <span class="online-dot"></span>{{ room.online }}
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
                <div class="chat-room-name">r/{{ activeRoom.name }} — Live Chat</div>
                <div class="chat-room-sub">
                  <span class="online-dot online-dot--sm"></span>
                  {{ activeRoom.online }} online now
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

          <!-- Message list — Feature 1B (receipts) + Feature 2 (reactions) -->
          <MessageList
            :messages="messages"
            :currentUser="currentUser"
            @react="handleReaction"
          />

          <!--
            Typing indicator — Feature 1A
            Shown between MessageList and MessageInput.
            typingUsers is updated live via Socket.io.
          -->
          <TypingIndicator :users="typingUsers" />

          <!--
            Message input — triggers typing events + sends messages
          -->
          <MessageInput
            :disabled="false"
            :roomName="activeRoom.name"
            @send="handleSend"
            @typing="handleTyping"
            @stopTyping="handleStopTyping"
          />

        </template>
      </section>

    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import MessageList from '../components/chat/MessageList.vue'
import MessageInput from '../components/chat/MessageInput.vue'
import TypingIndicator from '../components/chat/TypingIndicator.vue'
import { useSocket } from '../composables/useSocket.js'

// ── Route param — /chat/:roomId? allows linking directly to a room ──
const route = useRoute()

// ── Socket composable — all real-time logic lives here ──
const {
  isConnected,
  typingUsers,
  onlineUsers,
  joinRoom,
  leaveRoom,
  sendMessage,
  onNewMessage,
  emitTyping,
  stopTyping,
  markRoomSeen,
  onReceiptUpdate,
  emitReaction,
  onReactionUpdate,
} = useSocket()

// ── Current logged-in user (replace with real auth store later) ──
const currentUser = ref('bao_dev')

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
async function selectRoom(room) {
  // Leave the previous room if any
  if (activeRoomId.value) {
    leaveRoom(activeRoomId.value, currentUser.value)
  }

  activeRoomId.value = room.id

  // Clear unread badge for this room
  room.unread = 0

  await loadRoomMessages(room.id)

  // Join the socket room — server will add us to this room's broadcast group
  joinRoom(room.id, currentUser.value)

  // Mark all messages as seen — triggers receipt-update for senders
  markRoomSeen(room.id, currentUser.value)
}

// Loads chat history from MySQL and falls back to demo messages.
async function loadRoomMessages(roomId) {
  try {
    const res = await fetch(`http://localhost:3000/api/messages/${encodeURIComponent(roomId)}`)
    const data = await res.json()
    if (data.success) {
      messages.value = data.messages
      return
    }
  } catch {
    // keep using demo data when the backend is not running
  }

  const mockData = {
    technology: [
      { id: 1, username: 'alice_dev',  text: 'Has anyone tried the new M4 MacBook Pro?',              timestamp: Date.now() - 600000, status: 'seen',      reactions: { '🔥': ['alice_dev', 'charlie'], '👍': ['bao_dev'] } },
      { id: 2, username: 'bao_dev',    text: 'Yes! The performance leap is insane. Xcode builds in half the time 🚀', timestamp: Date.now() - 540000, status: 'seen', reactions: { '❤️': ['alice_dev'] } },
      { id: 3, username: 'charlie_99', text: 'Still on Intel... saving up for an upgrade',           timestamp: Date.now() - 480000, status: 'seen',      reactions: {} },
      { id: 4, username: 'alice_dev',  text: 'Worth every cent honestly. The battery life alone is incredible', timestamp: Date.now() - 420000, status: 'seen', reactions: { '👍': ['charlie_99', 'bao_dev'] } },
      { id: 5, username: 'bao_dev',    text: 'Anyone else notice the keyboard feels different on the new models?', timestamp: Date.now() - 60000, status: 'delivered', reactions: {} },
    ],
    programming: [
      { id: 1, username: 'dev_life',   text: 'Python vs TypeScript for a new backend — thoughts?',   timestamp: Date.now() - 300000, status: 'seen',      reactions: { '🤔': ['bob_coder', 'bao_dev'] } },
      { id: 2, username: 'bao_dev',    text: 'TypeScript all the way. Type safety saves so much debugging time', timestamp: Date.now() - 240000, status: 'seen', reactions: { '👍': ['dev_life'] } },
      { id: 3, username: 'bob_coder',  text: 'Python for ML pipelines though, nothing beats it',     timestamp: Date.now() - 180000, status: 'seen',      reactions: { '💯': ['bao_dev'] } },
    ],
  }
  messages.value = mockData[roomId] || []
}

// ── Socket event handlers ──

// New message arrives from server
onNewMessage((message) => {
  // If this message is for the active room, add it to the list
  if (message.roomId === activeRoomId.value) {
    const tempIndex = messages.value.findIndex(m => m.id === message.tempId)
    if (tempIndex >= 0) {
      messages.value[tempIndex] = message
    } else if (!messages.value.some(m => m.id === message.id)) {
      messages.value.push(message)
    }
    // Update the room's last message preview
    const room = rooms.value.find(r => r.id === message.roomId)
    if (room) room.lastMessage = message.text
  } else {
    // Increment unread badge for background rooms
    const room = rooms.value.find(r => r.id === message.roomId)
    if (room) room.unread++
  }
})

// Read receipt update — server tells us our message was seen
// Feature 1B: advance the status badge on our own messages
onReceiptUpdate(({ messageId, tempId, status }) => {
  const msg = messages.value.find(m => m.id === messageId || m.id === tempId)
  if (msg) msg.status = status
})

// Reaction update — Feature 2: someone reacted to a message
// Server broadcasts the updated reactions object
onReactionUpdate(({ messageId, reactions }) => {
  const msg = messages.value.find(m => m.id === messageId)
  if (msg) msg.reactions = reactions
})

// ── User actions ──

/**
 * handleSend — called when MessageInput emits 'send'
 * 1. Optimistic UI: add to local messages immediately so the
 *    sender sees their message without waiting for the server
 * 2. Emit to server via socket
 * 3. Server saves to DB + broadcasts back to all room members
 */
function handleSend(text) {
  const tempId = 'temp-' + Date.now()
  const tempMessage = {
    id: tempId,
    username: currentUser.value,
    text,
    timestamp: Date.now(),
    status: 'sent',
    reactions: {},
    roomId: activeRoomId.value,
  }
  // Optimistic add
  messages.value.push(tempMessage)

  // Update room preview
  if (activeRoom.value) activeRoom.value.lastMessage = text

  // Emit to server (server replaces tempId with real DB id)
  sendMessage(activeRoomId.value, text, currentUser.value, tempId)
}

/**
 * handleTyping — called when MessageInput emits 'typing'
 * Calls useSocket().emitTyping() which handles the 300ms debounce
 */
function handleTyping() {
  if (activeRoomId.value) {
    emitTyping(activeRoomId.value, currentUser.value)
  }
}

function handleStopTyping() {
  if (activeRoomId.value) {
    stopTyping(activeRoomId.value, currentUser.value)
  }
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

  // Emit to server — server persists + broadcasts to room
  emitReaction(messageId, emoji, currentUser.value, activeRoomId.value)
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

// ── Cleanup on leave ──
onUnmounted(() => {
  if (activeRoomId.value) leaveRoom(activeRoomId.value, currentUser.value)
})
</script>
