<template>
  <!--
    ReactionPicker.vue
    ============================================================
    FEATURE 2 — Emoji Reactions with Live Updates

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
      react (emoji) — parent (MessageList) calls useSocket().emitReaction()
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
      Clicking an emoji emits 'react' to the parent, which calls
      useSocket().emitReaction() to broadcast via Socket.io.
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
// The parent (MessageList) listens for 'react' and calls
// useSocket().emitReaction(messageId, emoji, username)
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
  // Emit to parent — parent will call useSocket().emitReaction()
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

<style scoped>
/* ---- Container ---- */
.reaction-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

/* ---- Reaction display bar ---- */
.reaction-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

/* Individual reaction badge */
.reaction-badge {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 10px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s, transform 0.1s;
  user-select: none;
}
.reaction-badge:hover {
  background: #E5E7EB;
  transform: scale(1.08);
}
/* Highlight if the current user has reacted */
.reaction-badge--mine {
  background: #EFF6FF;
  border-color: #93C5FD;
}
.reaction-badge--mine:hover {
  background: #DBEAFE;
}

.reaction-emoji { font-size: 15px; line-height: 1; }
.reaction-count { font-size: 12px; font-weight: 700; color: #374151; }

/* ---- Tooltip ---- */
.reaction-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1F2937;
  color: white;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 200;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  min-width: 100px;
  text-align: center;
}
/* Arrow */
.reaction-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #1F2937;
}
.tooltip-emoji { font-size: 20px; margin-bottom: 4px; }
.tooltip-names { color: #D1D5DB; margin-bottom: 3px; font-size: 11px; }
.tooltip-action { font-size: 10px; color: #9CA3AF; font-style: italic; }

/* Show tooltip on hover */
.reaction-badge:hover .reaction-tooltip { opacity: 1; }

/* ---- Add reaction buttons ---- */
.reaction-add-btn,
.reaction-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background: transparent;
  border: 1px dashed #D1D5DB;
  color: #9CA3AF;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}
.reaction-add-btn:hover,
.reaction-trigger:hover {
  background: #F3F4F6;
  color: #374151;
  border-color: #9CA3AF;
}

/* ---- Emoji picker popup ---- */
.emoji-picker {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 10px;
  z-index: 300;
  min-width: 200px;
}
.picker-header {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #F3F4F6;
}
.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.emoji-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.1s, transform 0.1s;
  background: transparent;
  border: 1px solid transparent;
}
.emoji-btn:hover {
  background: #F3F4F6;
  transform: scale(1.2);
}
/* Highlight emojis the user has already used */
.emoji-btn--active {
  background: #EFF6FF;
  border-color: #93C5FD;
}
</style>