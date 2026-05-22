<template>
  <!--
    TypingIndicator.vue
    ============================================================
    Displays an animated "User is typing..." indicator beneath
    the message list when one or more users are composing a message.

    FEATURE 1 — Typing Indicators
    This component receives the `typingUsers` array from the parent
    (ChatView) which is populated in real-time via Socket.io.

    Props:
      users (Array<string>) — list of usernames currently typing
        Passed down from ChatView which gets it from useSocket().

    How the text is built:
      0 users  → nothing rendered (v-if hides the whole component)
      1 user   → "alice is typing..."
      2 users  → "alice and bob are typing..."
      3+ users → "alice, bob and 2 others are typing..."
  -->
  <transition name="typing-slide">
    <div v-if="users.length > 0" class="typing-indicator">
      <!-- Animated dots -->
      <div class="typing-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <!-- Text -->
      <span class="typing-text">{{ typingText }}</span>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

// Props received from ChatView
const props = defineProps({
  users: {
    type: Array,
    default: () => [],
    // Array of username strings, e.g. ['alice', 'bob']
  }
})

/**
 * computed: typingText
 * Builds a human-readable string from the users array.
 * Uses different phrasing depending on how many are typing.
 */
const typingText = computed(() => {
  const u = props.users
  if (u.length === 0) return ''
  if (u.length === 1) return `${u[0]} is typing...`
  if (u.length === 2) return `${u[0]} and ${u[1]} are typing...`
  // 3+ users: show first two names + count of the rest
  const rest = u.length - 2
  return `${u[0]}, ${u[1]} and ${rest} other${rest > 1 ? 's' : ''} are typing...`
})
</script>

<style scoped>
/* ---- Container ---- */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  min-height: 28px;
}

/* ---- Animated bounce dots ---- */
.typing-dots {
  display: flex;
  align-items: center;
  gap: 3px;
  /* Background pill — matches Discord/Slack style */
  background: #E5E7EB;
  border-radius: 12px;
  padding: 5px 9px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6B7280;
  /* Each dot animates with a staggered delay */
  animation: dot-bounce 1.2s ease-in-out infinite;
}
.dot:nth-child(1) { animation-delay: 0ms; }
.dot:nth-child(2) { animation-delay: 160ms; }
.dot:nth-child(3) { animation-delay: 320ms; }

@keyframes dot-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    background: #6B7280;
  }
  30% {
    transform: translateY(-5px);
    background: #374151;
  }
}

/* ---- Text ---- */
.typing-text {
  font-size: 12px;
  color: #6B7280;
  font-style: italic;
}

/* ---- Slide-up enter/leave transition ---- */
/* Vue's <transition> applies these classes automatically.
   When users.length goes 0→1, the indicator slides up.
   When it goes back to 0, it slides down and fades. */
.typing-slide-enter-active {
  transition: all 0.2s ease-out;
}
.typing-slide-leave-active {
  transition: all 0.15s ease-in;
}
.typing-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.typing-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>