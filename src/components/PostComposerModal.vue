<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <form class="post-modal" @submit.prevent="submitForm">
      <header>
        <h2>{{ heading }}</h2>
        <button type="button" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <label>
        Community
        <select v-model="draft.community" required>
          <option value="" disabled>Choose a community</option>
          <option v-for="community in communities" :key="community.name" :value="community.name">r/{{ community.name }}</option>
        </select>
      </label>
      <label>
        Title
        <input v-model.trim="draft.title" maxlength="300" required placeholder="Title" />
      </label>
      <label>
        Image URL
        <input v-model.trim="draft.image" type="url" placeholder="https://..." />
      </label>
      <label>
        Body
        <textarea v-model.trim="draft.description" rows="5" placeholder="What do you want to share?"></textarea>
      </label>
      <p v-if="error" class="compose-error">{{ error }}</p>
      <footer>
        <button type="button" class="cancel" @click="$emit('close')">Cancel</button>
        <button type="submit" class="publish" :disabled="submitting">{{ submitting ? loadingLabel : submitLabel }}</button>
      </footer>
    </form>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  heading: { type: String, default: 'Create a post' },
  submitLabel: { type: String, default: 'Post' },
  loadingLabel: { type: String, default: 'Saving...' },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: '' },
  communities: { type: Array, default: () => [] },
  initialDraft: {
    type: Object,
    default: () => ({ community: '', title: '', image: '', description: '' }),
  },
})

const emit = defineEmits(['close', 'submit'])

const draft = reactive({ community: '', title: '', image: '', description: '' })

function syncDraft() {
  Object.assign(draft, {
    community: props.initialDraft?.community || '',
    title: props.initialDraft?.title || '',
    image: props.initialDraft?.image || '',
    description: props.initialDraft?.description || '',
  })
}

function submitForm() {
  emit('submit', { ...draft })
}

watch(() => [props.open, props.initialDraft], syncDraft, { immediate: true, deep: true })
</script>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; background: rgba(15, 26, 28, .52); padding: 20px; }
.post-modal { width: min(560px, 100%); padding: 20px; border-radius: 18px; background: var(--reddit-white); display: flex; flex-direction: column; gap: 14px; }
.post-modal header, .post-modal footer { display: flex; align-items: center; justify-content: space-between; }
.post-modal header h2 { font-size: 19px; }
.post-modal header button { width: 36px; height: 36px; border-radius: 50%; }
.post-modal label { display: flex; flex-direction: column; gap: 7px; color: var(--reddit-text-secondary); font-size: 13px; font-weight: 600; }
.post-modal input, .post-modal select, .post-modal textarea { width: 100%; padding: 11px 13px; border: 1px solid var(--reddit-border); border-radius: 10px; background: var(--reddit-surface-inset); font-size: 14px; resize: vertical; }
.post-modal input:focus, .post-modal textarea:focus, .post-modal select:focus { border-color: var(--reddit-blue); outline: none; }
.compose-error { color: #b42318; font-size: 13px; }
.post-modal footer { justify-content: flex-end; gap: 10px; padding-top: 4px; }
.post-modal footer button { height: 40px; padding: 0 20px; border-radius: 21px; font-weight: 700; }
.cancel { border: 1px solid var(--reddit-border-emphasis); }
.publish { background: var(--reddit-orange); color: #fff; }
</style>
