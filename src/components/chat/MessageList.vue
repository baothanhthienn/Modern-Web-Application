<template>
  <!--
    MessageList.vue
    ============================================================
    Renders the scrollable list of chat messages.

    Each message displays:
      - Avatar + username + timestamp
      - Message text
      - Read receipt badge (Feature 1B): ✓ Sent → ✓✓ Delivered → ✓✓ Seen (blue)
      - ReactionPicker (Feature 2): emoji reactions beneath each message

    Props:
      messages     (Array)  — array of message objects from ChatView
      currentUser  (String) — logged-in username (for aligning own messages right)

    Emits:
      react(messageId, emoji) — user clicked an emoji on a message
  -->
  <div class="message-list" ref="listRef">

    <!-- Empty state -->
    <div v-if="messages.length === 0" class="empty-state">
      <i class="fa-regular fa-comment-dots empty-icon"></i>
      <p>No messages yet. Say hello! 👋</p>
    </div>

    <!-- Message items -->
    <transition-group name="msg" tag="div" class="messages-inner">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-wrapper"
        :class="{
          'message-wrapper--own':  message.username === currentUser,
          'message-wrapper--other': message.username !== currentUser,
        }"
      >
        <!--
          Avatar — shown for other users' messages (left side).
          Own messages align right, no avatar.
        -->
        <div
          v-if="message.username !== currentUser"
          class="msg-avatar"
          :style="{ background: avatarColor(message.username) }"
          :title="message.username"
        >
          {{ message.username[0].toUpperCase() }}
        </div>

        <!-- Message bubble + metadata -->
        <div class="message-body">

          <!-- Sender name + timestamp (other users only) -->
          <div v-if="message.username !== currentUser" class="msg-header">
            <span class="msg-username">{{ message.username }}</span>
            <span class="msg-time">{{ formatTime(message.timestamp) }}</span>
          </div>

          <!-- Bubble -->
          <div
            class="msg-bubble"
            :class="{
              'msg-bubble--own':   message.username === currentUser,
              'msg-bubble--other': message.username !== currentUser,
            }"
          >
            {{ message.text }}
          </div>

          <!-- Own message: timestamp + read receipt -->
          <div v-if="message.username === currentUser" class="msg-footer-own">
            <span class="msg-time-own">{{ formatTime(message.timestamp) }}</span>

            <!--
              READ RECEIPT BADGE — Feature 1B
              Status advances: sent → delivered → seen
              New local messages retain their sent state because there is no remote recipient.
              Each status has a different icon and colour.
            -->
            <span class="receipt-badge" :class="`receipt-badge--${message.status}`" :title="receiptTitle(message.status)">
              <!-- sent: single grey tick -->
              <template v-if="message.status === 'sent'">
                <i class="fa-solid fa-check"></i>
              </template>
              <!-- delivered: double grey tick -->
              <template v-else-if="message.status === 'delivered'">
                <i class="fa-solid fa-check-double"></i>
              </template>
              <!-- seen: double blue tick -->
              <template v-else-if="message.status === 'seen'">
                <i class="fa-solid fa-check-double receipt-seen"></i>
              </template>
            </span>
          </div>

          <!--
            REACTION PICKER — Feature 2
            ReactionPicker component handles both displaying existing
            reactions and the emoji picker popup.
            We pass the message's reactions object and listen for
            the 'react' event to emit up to ChatView.
          -->
          <ReactionPicker
            :reactions="message.reactions || {}"
            :messageId="message.id"
            :currentUser="currentUser"
            @react="(emoji) => $emit('react', message.id, emoji)"
          />

        </div>
      </div>
    </transition-group>

  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import ReactionPicker from './ReactionPicker.vue'

// ── Props ──
const props = defineProps({
  messages: {
    type: Array,
    default: () => []
    // Each message: { id, username, text, timestamp, status, reactions }
  },
  currentUser: {
    type: String,
    default: 'me'
  }
})

// ── Emits ──
const emit = defineEmits(['react'])

// ── Ref to the scroll container ──
const listRef = ref(null)

// Auto-scroll to bottom whenever a new message arrives.
// nextTick() waits for Vue to finish rendering the new message
// before we scroll, so we always scroll to the actual bottom.
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  }
)

// ── Helpers ──

/**
 * Format a timestamp for display.
 * Recent messages show time (e.g. "3:42 PM").
 * Older messages show date (e.g. "May 20").
 */
function formatTime(ts) {
  if (!ts) return ''
  const date = new Date(ts)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/**
 * Deterministic color from username string.
 * Gives each user a consistent avatar color without a DB lookup.
 */
function avatarColor(username) {
  const colors = [
    '#6366F1', '#F59E0B', '#10B981', '#EF4444',
    '#A855F7', '#3B82F6', '#EC4899', '#14B8A6',
  ]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Human-readable tooltip for the receipt badge.
 */
function receiptTitle(status) {
  return { sent: 'Sent', delivered: 'Delivered', seen: 'Seen' }[status] || ''
}
</script>
