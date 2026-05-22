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

<style scoped>
.message-input-area {
  border-top: 1px solid #E5E7EB;
  background: white;
  padding: 10px 16px 6px;
  flex-shrink: 0;
}

.offline-banner {
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: #92400E;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.input-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6314, #FF4500);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  flex-shrink: 0;
  margin-bottom: 2px;
}

.input-wrapper {
  flex: 1;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  padding: 8px 12px 4px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input-wrapper:focus-within {
  border-color: #FF4500;
  box-shadow: 0 0 0 2px rgba(255, 69, 0, 0.1);
  background: white;
}

.msg-textarea {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
  font-family: 'IBM Plex Sans', sans-serif;
  color: #111827;
  resize: none;
  outline: none;
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  display: block;
}
.msg-textarea::placeholder { color: #9CA3AF; }
.msg-textarea:disabled { opacity: 0.6; cursor: not-allowed; }


.input-emoji-strip {
  display: flex;
  gap: 2px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #F3F4F6;
}
.quick-emoji {
  font-size: 16px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.1s, transform 0.1s;
  background: transparent;
  border: none;
}
.quick-emoji:hover {
  background: #F3F4F6;
  transform: scale(1.2);
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #E5E7EB;
  color: #9CA3AF;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 2px;
  transition: background 0.15s, color 0.15s, transform 0.1s;
  border: none;
  cursor: not-allowed;
}

.send-btn--active {
  background: #FF4500;
  color: white;
  cursor: pointer;
}
.send-btn--active:hover {
  background: #E03D00;
  transform: scale(1.05);
}

.input-hint {
  font-size: 11px;
  color: #D1D5DB;
  text-align: right;
  margin-top: 4px;
  padding-right: 4px;
}
kbd {
  background: #F3F4F6;
  border: 1px solid #D1D5DB;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 10px;
  font-family: monospace;
}
</style>