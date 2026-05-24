<template>
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

