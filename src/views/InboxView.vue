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
            :disabled="!isConnected"
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
import { ref, computed } from 'vue'
import AppShell from '../components/AppShell.vue'
import MessageList from '../components/chat/MessageList.vue'
import MessageInput from '../components/chat/MessageInput.vue'
import TypingIndicator from '../components/chat/TypingIndicator.vue'
import { useSocket } from '../composables/useSocket.js'

// ── Socket composable ──
const {
  isConnected,
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

// ── Current user ──
const currentUser = ref('bao_dev')

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

// ── Mock DM messages per conversation ──
function loadDMMessages(convId) {
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
function selectConversation(conv) {
  if (activeConvId.value) leaveRoom(activeConvId.value)

  activeConvId.value = conv.id

  // Clear unread badge
  conv.unread = 0

  // Load messages for this conversation
  loadDMMessages(conv.id)

  // Join socket room for this DM thread
  joinRoom(conv.id)

  // Mark as seen — triggers receipt-update for the other person
  markRoomSeen(conv.id, currentUser.value)
}

// ── Socket event handlers ──
onNewMessage((message) => {
  if (message.roomId === activeConvId.value) {
    dmMessages.value.push(message)
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

onReceiptUpdate(({ messageId, status }) => {
  const msg = dmMessages.value.find(m => m.id === messageId)
  if (msg) msg.status = status
})

onReactionUpdate(({ messageId, reactions }) => {
  const msg = dmMessages.value.find(m => m.id === messageId)
  if (msg) msg.reactions = reactions
})

// ── User actions ──
function handleSend(text) {
  const tempMsg = {
    id: 'temp-' + Date.now(),
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

  sendMessage(activeConvId.value, text, currentUser.value)
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
  emitReaction(messageId, emoji, currentUser.value)
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
</script>

<style scoped>
/* =============================================
   INBOX PAGE LAYOUT
   ============================================= */
.inbox-page {
  display: flex;
  height: calc(100vh - 48px);
  overflow: hidden;
  position: relative;
}

/* =============================================
   CONVERSATION LIST PANEL
   ============================================= */
.conversation-panel {
  width: 320px;
  flex-shrink: 0;
  background: white;
  border-right: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.inbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #F3F4F6;
  background: #FAFAFA;
}
.inbox-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
}
.total-unread-badge {
  background: #FF4500;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}
.btn-new-dm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #F3F4F6;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: background 0.1s;
}
.btn-new-dm:hover { background: #E5E7EB; }

/* Tabs */
.inbox-tabs {
  display: flex;
  border-bottom: 1px solid #F3F4F6;
  padding: 0 12px;
}
.inbox-tab {
  flex: 1;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: color 0.1s, border-color 0.1s;
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  font-family: inherit;
}
.inbox-tab--active {
  color: #FF4500;
  border-bottom-color: #FF4500;
}
.tab-count {
  background: #FF4500;
  color: white;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 8px;
}

/* Search */
.conversation-search-wrap {
  position: relative;
  padding: 8px 12px;
  border-bottom: 1px solid #F3F4F6;
}
.conv-search-icon {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #9CA3AF;
}
.conv-search-input {
  width: 100%;
  padding: 6px 10px 6px 28px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}
.conv-search-input:focus { border-color: #FF4500; }

/* Conversation list */
.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.1s;
  border-left: 3px solid transparent;
  position: relative;
}
.conversation-item:hover { background: #F9FAFB; }
.conversation-item--active {
  background: #FFF4F0;
  border-left-color: #FF4500;
}
.conversation-item--unread .conv-username { font-weight: 800; }
.conversation-item--unread .conv-preview  { color: #111827; font-weight: 500; }

/* Avatar */
.conv-avatar-wrap { position: relative; flex-shrink: 0; }
.conv-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
}
.conv-online-dot {
  position: absolute;
  bottom: 1px; right: 1px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #22C55E;
  border: 2px solid white;
}

/* Conversation info */
.conv-info { flex: 1; min-width: 0; }
.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
}
.conv-username { font-size: 14px; font-weight: 600; color: #111827; }
.conv-time     { font-size: 11px; color: #9CA3AF; flex-shrink: 0; }
.conv-preview  {
  font-size: 13px;
  color: #6B7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.conv-you { color: #9CA3AF; }

.conv-unread-badge {
  background: #FF4500;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

/* No conversations state */
.no-conv-state {
  padding: 40px 20px;
  text-align: center;
  color: #9CA3AF;
}
.no-conv-state i { font-size: 32px; margin-bottom: 8px; }
.no-conv-state p { font-size: 13px; }

/* =============================================
   DM PANEL (right)
   ============================================= */
.dm-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

/* No selection state */
.no-conv-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  gap: 12px;
  padding: 40px;
}
.no-conv-icon { font-size: 56px; color: #E5E7EB; }
.no-conv-selected h3 { font-size: 18px; color: #6B7280; }
.no-conv-selected p  { font-size: 14px; }
.btn-start-dm {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #FF4500;
  color: white;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  border: none;
  font-family: inherit;
  margin-top: 8px;
  transition: background 0.1s;
}
.btn-start-dm:hover { background: #E03D00; }

/* DM Header */
.dm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #F3F4F6;
  background: white;
  flex-shrink: 0;
}
.dm-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dm-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
}
.dm-username { font-size: 16px; font-weight: 700; }
.dm-status {
  font-size: 12px;
  color: #6B7280;
  display: flex;
  align-items: center;
  gap: 4px;
}
.online-dot-sm {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #22C55E;
  display: inline-block;
}

.dm-header-actions { display: flex; gap: 4px; }
.dm-action-btn {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #6B7280;
  cursor: pointer;
  border: none;
  background: transparent;
  transition: background 0.1s;
}
.dm-action-btn:hover { background: #F3F4F6; color: #374151; }

/* =============================================
   NEW DM MODAL
   ============================================= */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.new-dm-modal {
  background: white;
  border-radius: 12px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #F3F4F6;
}
.modal-header h3 { font-size: 16px; font-weight: 700; }
.modal-close {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #6B7280;
  cursor: pointer;
  border: none;
  background: transparent;
  transition: background 0.1s;
}
.modal-close:hover { background: #F3F4F6; }
.modal-body { padding: 16px 20px; }
.modal-label { font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block; }
.modal-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}
.modal-input:focus { border-color: #FF4500; }
.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #F3F4F6;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-cancel {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  background: #F3F4F6;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s;
}
.btn-cancel:hover { background: #E5E7EB; }
.btn-start {
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  color: white;
  background: #FF4500;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s;
}
.btn-start:hover { background: #E03D00; }
.btn-start:disabled { background: #D1D5DB; cursor: not-allowed; }

/* =============================================
   RESPONSIVE
   ============================================= */
@media (max-width: 768px) {
  .conversation-panel { width: 72px; }
  .conv-info, .conv-unread-badge,
  .inbox-tabs, .conversation-search-wrap { display: none; }
  .conversation-item { justify-content: center; padding: 10px; }
}
</style>