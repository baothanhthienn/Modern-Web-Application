<template>
  <div ref="listRef" class="message-list">
    <div v-if="!messages.length" class="message-empty">
      <i class="fa-regular fa-comment-dots"></i>
      <p>No messages yet.</p>
    </div>
    <div v-else class="messages-inner">
      <div v-for="message in messages" :key="message.id" class="message" :class="{ own: message.sender === currentUser }">
        <span v-if="message.sender !== currentUser" class="message-avatar">{{ avatarLetter(message.sender) }}</span>
        <div class="message-stack">
          <div v-if="message.sender !== currentUser" class="message-author">u/{{ message.sender }}</div>
          <p>{{ message.body }}</p>
          <div v-if="message.reactions?.length" class="message-reactions">
            <button
              v-for="reaction in message.reactions"
              :key="reaction.reaction"
              type="button"
              class="reaction-chip"
              :class="{ selected: message.viewerReaction === reaction.reaction }"
              @click="toggleReaction(message, reaction.reaction)"
            >
              <span>{{ reactionIcon(reaction.reaction) }}</span>
              <b>{{ reaction.count }}</b>
            </button>
          </div>
          <div class="message-meta">
            <small>{{ formatMessageTime(message.createdAt) }}</small>
            <button type="button" class="reaction-trigger" @click="togglePalette(message.id)">
              <i class="fa-regular fa-face-smile"></i>
            </button>
          </div>
          <div v-if="openPaletteId === message.id" class="reaction-palette">
            <button
              v-for="option in CHAT_REACTIONS"
              :key="option.id"
              type="button"
              :aria-label="option.label"
              :class="{ selected: message.viewerReaction === option.id }"
              @click="toggleReaction(message, option.id)"
            >
              {{ option.icon }}
            </button>
          </div>
          <small v-if="message.sender === currentUser && message.seen" class="seen-state">
            {{ message.seenAt ? `Seen ${formatMessageTime(message.seenAt)}` : `Seen by ${message.seenByCount}` }}
          </small>
        </div>
      </div>
    </div>
    <div v-if="typingUsers.length" class="typing-row d-flex align-items-center">
      <span class="typing-dots"><i></i><i></i><i></i></span>
      <span>{{ typingLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { avatarLetter } from '../../services/format.js'
import { CHAT_REACTIONS, reactionIcon } from '../../services/realtime.js'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  currentUser: { type: String, default: '' },
  typingUsers: { type: Array, default: () => [] },
})
const emit = defineEmits(['reaction'])
const listRef = ref(null)
const openPaletteId = ref(null)

watch(() => props.messages.length, async () => {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
})

function formatMessageTime(value) {
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const typingLabel = computed(() => {
  if (props.typingUsers.length === 1) return `u/${props.typingUsers[0]} is typing`
  return `${props.typingUsers.length} people are typing`
})

function togglePalette(messageId) {
  openPaletteId.value = openPaletteId.value === messageId ? null : messageId
}

function toggleReaction(message, reaction) {
  emit('reaction', {
    messageId: message.id,
    reaction: message.viewerReaction === reaction ? null : reaction,
  })
  openPaletteId.value = null
}

onBeforeUnmount(() => {
  openPaletteId.value = null
})
</script>

<style scoped>
.message-list { flex: 1; overflow-y: auto; padding: 20px; }
.message-empty { height: 100%; display: grid; align-content: center; justify-items: center; gap: 10px; color: var(--reddit-text-secondary); }
.message-empty i { font-size: 32px; color: var(--reddit-text-muted); }
.messages-inner { display: flex; flex-direction: column; gap: 16px; }
.message { display: flex; align-items: flex-end; gap: 9px; max-width: 78%; }
.message.own { align-self: flex-end; flex-direction: row-reverse; }
.message-avatar { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: var(--reddit-blue); color: white; font-weight: 700; }
.message-stack { position: relative; max-width: 100%; }
.message-author { margin: 0 0 4px 4px; color: var(--reddit-text-secondary); font-size: 12px; font-weight: 600; }
.message p { padding: 10px 14px; border-radius: 18px 18px 18px 4px; background: var(--reddit-surface-inset); color: var(--reddit-text); font-size: 14px; line-height: 1.4; overflow-wrap: anywhere; }
.message.own p { border-radius: 18px 18px 4px 18px; background: var(--reddit-blue); color: white; }
.message small { display: block; color: var(--reddit-text-muted); font-size: 11px; }
.message.own small { text-align: right; }
.message-meta { display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; }
.message-reactions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.reaction-chip { min-height: 28px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--reddit-border-soft); border-radius: 999px; background: var(--reddit-white); color: var(--reddit-text); font-size: 12px; }
.reaction-chip.selected { border-color: rgba(255, 69, 0, .26); background: rgba(255, 69, 0, .08); }
.reaction-chip b { font-size: 11px; font-weight: 700; }
.reaction-trigger { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; color: var(--reddit-text-meta); }
.reaction-trigger:hover { background: var(--reddit-surface-hover); color: var(--reddit-text); }
.reaction-palette { position: absolute; left: 0; bottom: 100%; z-index: 4; display: flex; gap: 6px; margin-bottom: 10px; padding: 8px; border: 1px solid var(--reddit-border-soft); border-radius: 999px; background: var(--reddit-white); box-shadow: 0 12px 28px rgba(15, 26, 28, .1); }
.message.own .reaction-palette { right: 0; left: auto; }
.reaction-palette button { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; font-size: 18px; }
.reaction-palette button:hover, .reaction-palette .selected { background: var(--reddit-surface-inset); }
.seen-state { margin-top: 4px; }
.typing-row { gap: 10px; margin-top: 14px; padding: 0 12px; color: var(--reddit-text-secondary); font-size: 12px; }
.typing-dots { display: inline-flex; gap: 4px; }
.typing-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--reddit-text-muted); animation: pulse 1s ease-in-out infinite; }
.typing-dots i:nth-child(2) { animation-delay: .15s; }
.typing-dots i:nth-child(3) { animation-delay: .3s; }
@keyframes pulse { 0%, 100% { opacity: .35; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
</style>
