<template>
  <form class="message-input" @submit.prevent="send">
    <textarea
      v-model="body"
      rows="1"
      :disabled="disabled"
      :placeholder="disabled ? disabledMessage : `Message ${roomName}`"
      @keydown.enter.exact.prevent="send"
      @blur="emitTyping(false)"
    ></textarea>
    <button type="submit" :disabled="disabled || !body.trim()" aria-label="Send message">
      <i class="fa-solid fa-paper-plane"></i>
    </button>
  </form>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  disabledMessage: { type: String, default: 'Messaging is unavailable.' },
  roomName: { type: String, default: '' },
})
const emit = defineEmits(['send', 'typing-change'])
const body = ref('')
let typingTimeout

function send() {
  const text = body.value.trim()
  if (!text || props.disabled) return
  emit('send', text)
  body.value = ''
  emitTyping(false)
}

watch(body, (value) => {
  const isTyping = Boolean(value.trim())
  emitTyping(isTyping)
  if (!isTyping) return
  clearTimeout(typingTimeout)
  typingTimeout = window.setTimeout(() => emitTyping(false), 1600)
})

watch(() => props.disabled, (disabled) => {
  if (disabled) emitTyping(false)
})

function emitTyping(isTyping) {
  emit('typing-change', isTyping)
}

onBeforeUnmount(() => {
  clearTimeout(typingTimeout)
  emitTyping(false)
})
</script>

<style scoped>
.message-input { flex-shrink: 0; display: flex; align-items: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--reddit-border-soft); }
.message-input textarea { flex: 1; max-height: 120px; min-height: 46px; padding: 13px 17px; border: 1px solid transparent; border-radius: 24px; background: var(--reddit-surface-inset); color: var(--reddit-text); font-size: 14px; resize: none; }
.message-input textarea:focus { border-color: var(--reddit-blue); outline: none; }
.message-input button { width: 46px; height: 46px; border-radius: 50%; background: var(--reddit-orange); color: white; }
.message-input button:disabled { background: var(--reddit-surface-hover); color: var(--reddit-text-muted); }
</style>
