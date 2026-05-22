<template>
  <!--
    MessageInput.vue
    ============================================================
    The message composition area at the bottom of ChatView.

    Responsibilities:
      1. Two-way binding of the message text via v-model
      2. Emit 'typing' event on every keystroke (for Feature 1)
         — the parent (ChatView) calls useSocket().emitTyping()
      3. Send the message on Enter key or button click
      4. Disable send when input is empty or socket is offline

    Props:
      disabled   (Boolean) — disables input when socket is disconnected
      roomName   (String)  — used in placeholder text

    Emits:
      send(text)   — parent should call useSocket().sendMessage()
      typing()     — parent should call useSocket().emitTyping()
      stopTyping() — parent should call useSocket().stopTyping()
  -->
  <div class="message-input-area">

    <!-- Connection warning banner -->
    <div v-if="disabled" class="offline-banner">
      <i class="fa-solid fa-wifi-slash"></i>
      Reconnecting to chat...
    </div>

    <div class="input-row">

      <!-- Current user avatar -->
      <div class="input-avatar">
        <i class="fa-solid fa-user"></i>
      </div>

      <!-- Text input -->
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

        <!-- Emoji quick-insert buttons inside the input -->
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

      <!-- Send button -->
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

    <!-- Helper text -->
    <div class="input-hint">
      Press <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for new line
    </div>

  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

// ── Props ──
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
    // Set to true when the socket is disconnected
  },
  roomName: {
    type: String,
    default: ''
  }
})

// ── Emits ──
const emit = defineEmits(['send', 'typing', 'stopTyping'])

// ── State ──
const text = ref('')
const textareaRef = ref(null)

// Quick emoji buttons shown inside the input bar
const quickEmojis = ['👍', '❤️', '😂', '😮', '🔥']

// ── Methods ──

/**
 * handleInput — called on every keystroke in the textarea.
 * 1. Auto-resize the textarea to fit content
 * 2. Emit 'typing' so ChatView can call useSocket().emitTyping()
 *    The actual 300ms debounce lives inside useSocket.js.
 */
function handleInput() {
  autoResize()
  if (text.value.trim()) {
    emit('typing')
  } else {
    emit('stopTyping')
  }
}

/**
 * handleSend — called on Enter key or send button click.
 * Only sends if the text is non-empty and socket is connected.
 * Emits 'send' with the trimmed text string.
 * Also emits 'stopTyping' because sending clears the typing indicator.
 */
async function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) return

  emit('send', trimmed)
  emit('stopTyping')

  text.value = ''

  // Reset textarea height after clearing
  await nextTick()
  autoResize()
  textareaRef.value?.focus()
}

/**
 * handleNewline — Shift+Enter inserts a real newline.
 * We don't need to do anything special because the textarea
 * handles it natively; we just need to auto-resize.
 */
function handleNewline() {
  nextTick(autoResize)
}

/**
 * Auto-resize the textarea height to fit its content.
 * Reset height first so it can shrink when text is deleted.
 */
function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

/**
 * Insert a quick emoji at the cursor position.
 */
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
/* ---- Container ---- */
.message-input-area {
  border-top: 1px solid #E5E7EB;
  background: white;
  padding: 10px 16px 6px;
  flex-shrink: 0;
}

/* ---- Offline banner ---- */
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

/* ---- Input row ---- */
.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

/* Current user avatar */
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

/* ---- Input wrapper ---- */
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

/* ---- Textarea ---- */
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

/* ---- Quick emoji strip ---- */
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

/* ---- Send button ---- */
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
/* Active state when text is entered */
.send-btn--active {
  background: #FF4500;
  color: white;
  cursor: pointer;
}
.send-btn--active:hover {
  background: #E03D00;
  transform: scale(1.05);
}

/* ---- Hint text ---- */
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