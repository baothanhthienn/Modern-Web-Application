<template>
  <!--
    ReactionPicker.vue
    ============================================================
    FEATURE 2 — Browser-local Emoji Reactions

    This component has TWO modes:
      1. Reaction display bar — shows existing emoji reactions
         beneath each message as badge counts (always visible
         when there are reactions)
      2. Emoji picker popup — appears when the user hovers/clicks
         the "Add reaction" button, letting them choose an emoji

    Props:
      reactions  (Object) — current reactions map:
                            { '👍': ['alice','bob'], '❤️': ['charlie'] }
      messageId  (String|Number) — used when emitting reactions
      currentUser (String) — the logged-in username (to highlight
                             emojis the user has already reacted with)

    Emits:
      react (emoji) — parent updates the locally stored message
  -->
  <div class="reaction-container">

    <!-- ── Existing reactions display bar ── -->
    <div class="reaction-bar" v-if="hasReactions">
      <div
        v-for="(users, emoji) in reactions"
        :key="emoji"
        class="reaction-badge"
        :class="{ 'reaction-badge--mine': users.includes(currentUser) }"
        @click="$emit('react', emoji)"
        :title="tooltipText(users)"
      >
        <!-- The emoji character -->
        <span class="reaction-emoji">{{ emoji }}</span>
        <!-- Count of users who reacted with this emoji -->
        <span class="reaction-count">{{ users.length }}</span>

        <!--
          Tooltip — shows on hover, lists usernames who reacted.
          This fulfils the requirement: "Hovering a reaction badge
          surfaces a tooltip listing every username who reacted."
        -->
        <div class="reaction-tooltip">
          <div class="tooltip-emoji">{{ emoji }}</div>
          <div class="tooltip-names">
            <span v-for="(user, i) in users" :key="user">
              {{ user }}{{ i < users.length - 1 ? ', ' : '' }}
            </span>
          </div>
          <div class="tooltip-action">
            {{ users.includes(currentUser) ? 'Click to remove' : 'Click to react' }}
          </div>
        </div>
      </div>

      <!-- Small "+" button to open the picker -->
      <button
        class="reaction-add-btn"
        @click="togglePicker"
        title="Add reaction"
      >
        <i class="fa-solid fa-face-smile"></i>
      </button>
    </div>

    <!-- ── Emoji picker popup ── -->
    <!--
      v-if="showPicker" — only mounts when needed (performance).
      Clicking an emoji emits 'react' to the parent for local persistence.
    -->
    <div v-if="showPicker" class="emoji-picker" ref="pickerRef">
      <div class="picker-header">React with emoji</div>
      <div class="emoji-grid">
        <button
          v-for="emoji in emojiList"
          :key="emoji"
          class="emoji-btn"
          :class="{ 'emoji-btn--active': isReacted(emoji) }"
          @click="selectEmoji(emoji)"
          :title="emoji"
        >
          {{ emoji }}
        </button>
      </div>
    </div>

    <!-- If no reactions yet, show the smiley face button inline -->
    <button
      v-if="!hasReactions"
      class="reaction-trigger"
      @click="togglePicker"
      title="Add reaction"
    >
      <i class="fa-regular fa-face-smile"></i>
    </button>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// ── Props ──
const props = defineProps({
  reactions: {
    type: Object,
    default: () => ({})
    // e.g. { '👍': ['alice', 'bob'], '❤️': ['charlie'] }
  },
  messageId: {
    type: [String, Number],
    required: true
  },
  currentUser: {
    type: String,
    default: 'me'
  }
})

// ── Emits ──
const emit = defineEmits(['react'])

// ── State ──
const showPicker = ref(false)
const pickerRef = ref(null)

// The curated emoji set mentioned in the advanced feature doc
const emojiList = ['👍', '❤️', '😂', '😮', '🔥', '😢', '👎', '🎉', '🤔', '💯']

// ── Computed ──

// hasReactions: true when ANY emoji has at least 1 reaction
const hasReactions = computed(() =>
  Object.values(props.reactions).some(users => users.length > 0)
)

// Check if the current user has already reacted with a specific emoji
function isReacted(emoji) {
  return props.reactions[emoji]?.includes(props.currentUser) ?? false
}

// Build a tooltip string: "alice, bob, charlie reacted"
function tooltipText(users) {
  if (users.length === 0) return ''
  if (users.length <= 3) return users.join(', ')
  return `${users.slice(0, 3).join(', ')} and ${users.length - 3} more`
}

// ── Methods ──

function togglePicker() {
  showPicker.value = !showPicker.value
}

function selectEmoji(emoji) {
  emit('react', emoji)
  // Close the picker after selecting
  showPicker.value = false
}

// Close picker when clicking outside of it
function handleClickOutside(e) {
  if (pickerRef.value && !pickerRef.value.contains(e.target)) {
    showPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>
