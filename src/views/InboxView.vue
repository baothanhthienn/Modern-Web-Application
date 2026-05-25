<template>
  <!--
    InboxView.vue
    ============================================================
    The Direct Messages Inbox page.

    LAYOUT:
      ┌──────────────────────────────────────────────────────┐
      │  AppShell (Navbar + Left Sidebar)                     │
      │  ┌──────────────────┬──────────────────────────────┐  │
      │  │  Conversation    │  Active Conversation Panel   │  │
      │  │  List (left)     │  ┌──────────────────────────┐│  │
      │  │                  │  │  Header (user info)      ││  │
      │  │  [alice_dev]  ●  │  ├──────────────────────────┤│  │
      │  │  [bob_coder]     │  │  MessageList             ││  │
      │  │  [charlie_99]    │  │  (same component as chat)││  │
      │  │                  │  ├──────────────────────────┤│  │
      │  │                  │  │  TypingIndicator         ││  │
      │  │                  │  ├──────────────────────────┤│  │
      │  │                  │  │  MessageInput            ││  │
      │  │                  │  └──────────────────────────┘│  │
      │  └──────────────────┴──────────────────────────────┘  │
      └──────────────────────────────────────────────────────┘

    The Inbox reuses the same MessageList, MessageInput,
    TypingIndicator, and ReactionPicker components as ChatView.
    The only difference is that DM rooms use user-based IDs
    (e.g. "dm:bao_dev:alice_dev") instead of community IDs.
  -->
  <AppShell>
    <div class="inbox-page">

      <!-- ── Conversation list panel (left) ── -->
      <aside class="conversation-panel">

        <div class="inbox-header">
          <div class="inbox-title">
            <i class="fa-solid fa-inbox"></i>
            <span>Inbox</span>
            <span v-if="totalUnread > 0" class="total-unread-badge">{{ totalUnread }}</span>
          </div>
          <!-- New message button -->
          <button class="btn-new-dm" @click="showNewDMModal = true" title="New message">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        </div>

        <!-- Filter tabs -->
        <div class="inbox-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="inbox-tab"
            :class="{ 'inbox-tab--active': activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <!-- Search conversations -->
        <div class="conversation-search-wrap">
          <i class="fa-solid fa-magnifying-glass conv-search-icon"></i>
          <input
            v-model="convSearch"
            type="text"
            placeholder="Search messages..."
            class="conv-search-input"
          />
        </div>

        <!-- Conversation list -->
        <div class="conversation-list">
          <div
            v-for="conv in filteredConversations"
            :key="conv.id"
            class="conversation-item"
            :class="{
              'conversation-item--active': activeConvId === conv.id,
              'conversation-item--unread': conv.unread > 0,
            }"
            @click="selectConversation(conv)"
          >
            <!-- Avatar with online indicator -->
            <div class="conv-avatar-wrap">
              <div class="conv-avatar" :style="{ background: avatarColor(conv.with) }">
                {{ conv.with[0].toUpperCase() }}
              </div>
              <span v-if="conv.online" class="conv-online-dot"></span>
            </div>

            <div class="conv-info">
              <div class="conv-top">
                <span class="conv-username">{{ conv.with }}</span>
                <span class="conv-time">{{ formatTime(conv.lastTimestamp) }}</span>
              </div>
              <div class="conv-preview">
                <!-- Show if it was our own message -->
                <span v-if="conv.lastSender === currentUser" class="conv-you">You: </span>
                {{ conv.lastMessage }}
              </div>
            </div>

            <!-- Unread badge -->
            <span v-if="conv.unread > 0" class="conv-unread-badge">{{ conv.unread }}</span>
          </div>

          <!-- Empty state for filtered list -->
          <div v-if="filteredConversations.length === 0" class="no-conv-state">
            <i class="fa-regular fa-comment-dots"></i>
            <p>No conversations found</p>
          </div>
        </div>
      </aside>

      <!-- ── Active conversation panel (right) ── -->
      <section class="dm-panel">

        <!-- No conversation selected -->
        <div v-if="!activeConv" class="no-conv-selected">
          <i class="fa-regular fa-envelope no-conv-icon"></i>
          <h3>Your Messages</h3>
          <p>Select a conversation or start a new one.</p>
          <button class="btn-start-dm" @click="showNewDMModal = true">
            <i class="fa-solid fa-pen-to-square"></i> New Message
          </button>
        </div>

        <!-- Active conversation -->
        <template v-else>

          <!-- DM header -->
          <header class="dm-header">
            <div class="dm-header-left">
              <div class="dm-avatar" :style="{ background: avatarColor(activeConv.with) }">
                {{ activeConv.with[0].toUpperCase() }}
              </div>
              <div>
                <div class="dm-username">{{ activeConv.with }}</div>
                <div class="dm-status">
                  <template v-if="activeConv.online">
                    <span class="online-dot-sm"></span> Online now
                  </template>
                  <template v-else>
                    Last seen {{ formatTime(activeConv.lastSeen) }}
                  </template>
                </div>
              </div>
            </div>

            <!-- Header actions -->
            <div class="dm-header-actions">
              <button class="dm-action-btn" title="View profile" @click="$router.push(`/profile/${activeConv.with}`)">
                <i class="fa-solid fa-user"></i>
              </button>
              <button class="dm-action-btn" title="More options">
                <i class="fa-solid fa-ellipsis"></i>
              </button>
            </div>
          </header>

          <!--
            MessageList — same component as ChatView.
            Reusing it here demonstrates component-based architecture.
            Feature 1B (read receipts) and Feature 2 (reactions) work
            identically in DMs.
          -->
          <MessageList
            :messages="dmMessages"
            :currentUser="currentUser"
            @react="handleReaction"
          />

          <!-- Feature 1A — Typing indicator for DMs -->
          <TypingIndicator :users="typingUsers" />

          <!-- Message input -->
          <MessageInput
            :disabled="false"
            :roomName="activeConv.with"
            @send="handleSend"
            @typing="handleTyping"
            @stopTyping="handleStopTyping"
          />

        </template>
      </section>

      <!-- ── New DM modal ── -->
      <div v-if="showNewDMModal" class="modal-overlay" @click.self="showNewDMModal = false">
        <div class="new-dm-modal">
          <div class="modal-header">
            <h3>New Message</h3>
            <button class="modal-close" @click="showNewDMModal = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="modal-body">
            <label class="modal-label">To:</label>
            <input
              v-model="newDMUsername"
              type="text"
              class="modal-input"
              placeholder="Enter a username..."
              @keyup.enter="startNewDM"
            />
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showNewDMModal = false">Cancel</button>
            <button
              class="btn-start"
              :disabled="!newDMUsername.trim()"
              @click="startNewDM"
            >
              Start Conversation
            </button>
          </div>
        </div>
      </div>

    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import AppShell from '../components/AppShell.vue'
import MessageList from '../components/chat/MessageList.vue'
import MessageInput from '../components/chat/MessageInput.vue'
import TypingIndicator from '../components/chat/TypingIndicator.vue'
import { useSocket } from '../composables/useSocket.js'
import { getStoredUser } from '../services/auth.js'

// ── Socket composable ──
const {
  typingUsers,
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

// Use the authenticated account when present; keep demo identity for guest preview mode.
const currentUser = ref(getStoredUser()?.username || 'bao_dev')

// ── State ──
const activeConvId    = ref(null)
const dmMessages      = ref([])
const showNewDMModal  = ref(false)
const newDMUsername   = ref('')
const convSearch      = ref('')
const activeTab       = ref('all')

// ── Conversations mock data ──
// In production: fetch from GET /api/conversations
const conversations = ref([
  {
    id: 'dm:bao_dev:alice_dev',
    with: 'alice_dev',
    online: true,
    lastMessage: 'Hey, did you see the new post about M4?',
    lastSender: 'alice_dev',
    lastTimestamp: Date.now() - 120000,
    lastSeen: Date.now() - 3600000,
    unread: 2,
  },
  {
    id: 'dm:bao_dev:bob_coder',
    with: 'bob_coder',
    online: false,
    lastMessage: 'Thanks for the help earlier!',
    lastSender: 'bob_coder',
    lastTimestamp: Date.now() - 3600000,
    lastSeen: Date.now() - 7200000,
    unread: 1,
  },
  {
    id: 'dm:bao_dev:charlie_99',
    with: 'charlie_99',
    online: true,
    lastMessage: 'Lol same honestly 😂',
    lastSender: 'charlie_99',
    lastTimestamp: Date.now() - 86400000,
    lastSeen: Date.now() - 90000000,
    unread: 0,
  },
  {
    id: 'dm:bao_dev:dev_life',
    with: 'dev_life',
    online: false,
    lastMessage: 'You: Python or TypeScript for the new project?',
    lastSender: 'bao_dev',
    lastTimestamp: Date.now() - 172800000,
    lastSeen: Date.now() - 180000000,
    unread: 0,
  },
])

// ── Tabs ──
const tabs = computed(() => [
  { value: 'all',    label: 'All',    count: totalUnread.value },
  { value: 'unread', label: 'Unread', count: conversations.value.filter(c => c.unread > 0).length },
])

// ── Total unread count ──
const totalUnread = computed(() =>
  conversations.value.reduce((sum, c) => sum + c.unread, 0)
)

// ── Filtered conversations ──
const filteredConversations = computed(() => {
  let list = conversations.value
  if (activeTab.value === 'unread') {
    list = list.filter(c => c.unread > 0)
  }
  if (convSearch.value.trim()) {
    const q = convSearch.value.toLowerCase()
    list = list.filter(c =>
      c.with.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    )
  }
  // Sort by most recent first
  return [...list].sort((a, b) => b.lastTimestamp - a.lastTimestamp)
})

// ── Active conversation ──
const activeConv = computed(() =>
  conversations.value.find(c => c.id === activeConvId.value) || null
)

// Loads DM history from MySQL and falls back to demo messages.
async function loadDMMessages(convId) {
  try {
    const res = await fetch(`http://localhost:3000/api/messages/${encodeURIComponent(convId)}`)
    const data = await res.json()
    if (data.success) {
      dmMessages.value = data.messages
      return
    }
  } catch {
    // keep using demo data when the backend is not running
  }

  const mockData = {
    'dm:bao_dev:alice_dev': [
      { id: 1, username: 'alice_dev', text: 'Hey! Did you see the new quantum computing article?', timestamp: Date.now() - 600000, status: 'seen', reactions: {} },
      { id: 2, username: 'bao_dev',   text: 'Yes! It\'s incredible. 100x speed improvements is insane', timestamp: Date.now() - 540000, status: 'seen', reactions: { '🔥': ['alice_dev'] } },
      { id: 3, username: 'alice_dev', text: 'I know right! Makes you wonder how much longer classical computing has', timestamp: Date.now() - 480000, status: 'seen', reactions: {} },
      { id: 4, username: 'alice_dev', text: 'Hey, did you see the new post about M4?', timestamp: Date.now() - 120000, status: 'delivered', reactions: {} },
    ],
    'dm:bao_dev:bob_coder': [
      { id: 1, username: 'bao_dev',   text: 'Hey Bob, do you know how to fix the pagination bug?', timestamp: Date.now() - 7200000, status: 'seen', reactions: {} },
      { id: 2, username: 'bob_coder', text: 'Yeah! You need to reset currentPage when the search changes', timestamp: Date.now() - 7000000, status: 'seen', reactions: { '👍': ['bao_dev'] } },
      { id: 3, username: 'bao_dev',   text: 'Perfect, that worked! Thanks so much', timestamp: Date.now() - 6900000, status: 'seen', reactions: {} },
      { id: 4, username: 'bob_coder', text: 'Thanks for the help earlier!', timestamp: Date.now() - 3600000, status: 'delivered', reactions: {} },
    ],
  }
  dmMessages.value = mockData[convId] || []
}

// ── Select a conversation ──
async function selectConversation(conv) {
  if (activeConvId.value) leaveRoom(activeConvId.value, currentUser.value)

  activeConvId.value = conv.id

  // Clear unread badge
  conv.unread = 0

  // Load messages for this conversation
  await loadDMMessages(conv.id)

  // Join socket room for this DM thread
  joinRoom(conv.id, currentUser.value)

  // Mark as seen — triggers receipt-update for the other person
  markRoomSeen(conv.id, currentUser.value)
}

// ── Socket event handlers ──
onNewMessage((message) => {
  if (message.roomId === activeConvId.value) {
    const tempIndex = dmMessages.value.findIndex(m => m.id === message.tempId)
    if (tempIndex >= 0) {
      dmMessages.value[tempIndex] = message
    } else if (!dmMessages.value.some(m => m.id === message.id)) {
      dmMessages.value.push(message)
    }
    // Update conversation preview
    const conv = conversations.value.find(c => c.id === message.roomId)
    if (conv) {
      conv.lastMessage   = message.text
      conv.lastTimestamp = message.timestamp
      conv.lastSender    = message.username
    }
  } else {
    // Increment unread for background conversation
    const conv = conversations.value.find(c => c.id === message.roomId)
    if (conv) {
      conv.unread++
      conv.lastMessage   = message.text
      conv.lastTimestamp = message.timestamp
      conv.lastSender    = message.username
    }
  }
})

onReceiptUpdate(({ messageId, tempId, status }) => {
  const msg = dmMessages.value.find(m => m.id === messageId || m.id === tempId)
  if (msg) msg.status = status
})

onReactionUpdate(({ messageId, reactions }) => {
  const msg = dmMessages.value.find(m => m.id === messageId)
  if (msg) msg.reactions = reactions
})

// ── User actions ──
function handleSend(text) {
  const tempId = 'temp-' + Date.now()
  const tempMsg = {
    id: tempId,
    username: currentUser.value,
    text,
    timestamp: Date.now(),
    status: 'sent',
    reactions: {},
    roomId: activeConvId.value,
  }
  dmMessages.value.push(tempMsg)

  // Update conversation preview
  if (activeConv.value) {
    activeConv.value.lastMessage   = text
    activeConv.value.lastTimestamp = Date.now()
    activeConv.value.lastSender    = currentUser.value
  }

  sendMessage(activeConvId.value, text, currentUser.value, tempId)
}

function handleTyping() {
  if (activeConvId.value) emitTyping(activeConvId.value, currentUser.value)
}

function handleStopTyping() {
  if (activeConvId.value) stopTyping(activeConvId.value, currentUser.value)
}

function handleReaction(messageId, emoji) {
  const msg = dmMessages.value.find(m => m.id === messageId)
  if (msg) {
    if (!msg.reactions) msg.reactions = {}
    const users = msg.reactions[emoji] || []
    if (users.includes(currentUser.value)) {
      msg.reactions[emoji] = users.filter(u => u !== currentUser.value)
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji]
    } else {
      msg.reactions[emoji] = [...users, currentUser.value]
    }
  }
  emitReaction(messageId, emoji, currentUser.value, activeConvId.value)
}

// ── Start a new DM ──
function startNewDM() {
  const username = newDMUsername.value.trim()
  if (!username) return

  const dmId = `dm:${currentUser.value}:${username}`
  const existing = conversations.value.find(c => c.id === dmId)

  if (existing) {
    selectConversation(existing)
  } else {
    // Create new conversation entry
    const newConv = {
      id: dmId,
      with: username,
      online: false,
      lastMessage: '',
      lastSender: '',
      lastTimestamp: Date.now(),
      lastSeen: null,
      unread: 0,
    }
    conversations.value.unshift(newConv)
    selectConversation(newConv)
  }

  showNewDMModal.value = false
  newDMUsername.value = ''
}

// ── Helpers ──
function formatTime(ts) {
  if (!ts) return ''
  const date = new Date(ts)
  const now  = new Date()
  const diff = now - date
  if (diff < 60000)      return 'just now'
  if (diff < 3600000)    return Math.floor(diff / 60000) + 'm'
  if (diff < 86400000)   return Math.floor(diff / 3600000) + 'h'
  if (diff < 604800000)  return Math.floor(diff / 86400000) + 'd'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function avatarColor(username) {
  const colors = ['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#A855F7', '#3B82F6', '#EC4899']
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

onUnmounted(() => {
  if (activeConvId.value) leaveRoom(activeConvId.value, currentUser.value)
})
</script>
