<template>
  <div class="message-input-area">

    <div v-if="disabled" class="offline-banner">
      <i class="fa-solid fa-wifi-slash"></i>
      Reconnecting to chat...
    </div>

    <div class="input-row">

      <div class="input-avatar">
        <i class="fa-solid fa-user"></i>
      </div>

      <div class="input-wrapper">
        <textarea
          ref="textareaRef"
          v-model="text"
          class="msg-textarea"
          :placeholder="`Message ${roomName || 'the room'}...`"
          :disabled="disabled"
          rows="1"
          @input="handleInput"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.enter.shift.exact="handleNewline"
        ></textarea>

        <div class="input-emoji-strip">
          <button
            v-for="emoji in quickEmojis"
            :key="emoji"
            class="quick-emoji"
            type="button"
            @click="insertEmoji(emoji)"
            :title="`Insert ${emoji}`"
          >{{ emoji }}</button>
        </div>
      </div>

      <button
        class="send-btn"
        :class="{ 'send-btn--active': text.trim().length > 0 && !disabled }"
        :disabled="!text.trim() || disabled"
        @click="handleSend"
        title="Send message (Enter)"
      >
        <i class="fa-solid fa-paper-plane"></i>
      </button>

    </div>

    <div class="input-hint">
      Press <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for new line
    </div>

  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
   
  },
  roomName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['send', 'typing', 'stopTyping'])

const text = ref('')
const textareaRef = ref(null)

const quickEmojis = ['👍', '❤️', '😂', '😮', '🔥']

function handleInput() {
  autoResize()
  if (text.value.trim()) {
    emit('typing')
  } else {
    emit('stopTyping')
  }
}

async function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) return

  emit('send', trimmed)
  emit('stopTyping')

  text.value = ''


  await nextTick()
  autoResize()
  textareaRef.value?.focus()
}

function handleNewline() {
  nextTick(autoResize)
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function insertEmoji(emoji) {
  const el = textareaRef.value
  if (!el) {
    text.value += emoji
    return
  }
  const start = el.selectionStart
  const end = el.selectionEnd
  text.value = text.value.slice(0, start) + emoji + text.value.slice(end)
  nextTick(() => {
    el.setSelectionRange(start + emoji.length, start + emoji.length)
    el.focus()
    autoResize()
  })
  emit('typing')
}
</script>

