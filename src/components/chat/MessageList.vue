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
          <small>{{ formatMessageTime(message.createdAt) }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { avatarLetter } from '../../services/format.js'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  currentUser: { type: String, default: '' },
})
const listRef = ref(null)

watch(() => props.messages.length, async () => {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
})

function formatMessageTime(value) {
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
</script>

<style scoped>
.message-list { flex: 1; overflow-y: auto; padding: 20px; }
.message-empty { height: 100%; display: grid; align-content: center; justify-items: center; gap: 10px; color: var(--reddit-text-secondary); }
.message-empty i { font-size: 32px; color: var(--reddit-text-muted); }
.messages-inner { display: flex; flex-direction: column; gap: 16px; }
.message { display: flex; align-items: flex-end; gap: 9px; max-width: 78%; }
.message.own { align-self: flex-end; flex-direction: row-reverse; }
.message-avatar { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: var(--reddit-blue); color: white; font-weight: 700; }
.message-stack { max-width: 100%; }
.message-author { margin: 0 0 4px 4px; color: var(--reddit-text-secondary); font-size: 12px; font-weight: 600; }
.message p { padding: 10px 14px; border-radius: 18px 18px 18px 4px; background: var(--reddit-surface-inset); color: var(--reddit-text); font-size: 14px; line-height: 1.4; overflow-wrap: anywhere; }
.message.own p { border-radius: 18px 18px 4px 18px; background: var(--reddit-blue); color: white; }
.message small { display: block; margin-top: 4px; color: var(--reddit-text-muted); font-size: 11px; }
.message.own small { text-align: right; }
</style>
