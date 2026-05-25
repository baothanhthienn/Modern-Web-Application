<template>
  <article class="thread" @click="openPost">
    <div class="thread-head">
      <span class="community-mark" :style="{ background: post.communityColor || 'var(--reddit-blue)' }"></span>
      <span class="community-name">r/{{ post.community }}</span>
      <span class="thread-divider">-</span>
      <router-link :to="`/profile/${post.author}`" class="author" @click.stop>u/{{ post.author }}</router-link>
      <span class="thread-time">{{ formatRelativeTime(post.createdAt) }}</span>
      <span v-if="post.flair" class="flair" :style="{ background: post.flairColor || 'var(--reddit-surface-hover)' }">{{ post.flair }}</span>
    </div>

    <h2>{{ post.title }}</h2>
    <p v-if="post.text" class="thread-copy">{{ post.text }}</p>
    <img v-if="post.image" class="thread-image" :src="post.image" :alt="post.title" loading="lazy" />
    <a v-if="post.link" :href="post.link" target="_blank" rel="noopener" class="thread-link" @click.stop>
      {{ post.linkDomain || post.link }}
    </a>

    <div class="thread-actions">
      <div class="vote-control" :class="{ voted: post.userVote }">
        <button :class="{ selected: post.userVote === 1 }" aria-label="Upvote" @click.stop="setVote(1)">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <span>{{ formatCount(post.votes) }}</span>
        <button :class="{ selectedDown: post.userVote === -1 }" aria-label="Downvote" @click.stop="setVote(-1)">
          <i class="fa-solid fa-arrow-down"></i>
        </button>
      </div>
      <button class="chip" @click.stop="openPost"><i class="fa-regular fa-message"></i>{{ formatCount(post.comments) }}</button>
      <button class="chip" @click.stop="toggleSaved">
        <i :class="post.saved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'"></i>
        {{ post.saved ? 'Saved' : 'Save' }}
      </button>
      <router-link class="chip" :to="`/chat/${post.community}`" @click.stop>
        <i class="fa-regular fa-comment-dots"></i> Chat
      </router-link>
    </div>
    <p v-if="actionError" class="thread-error">{{ actionError }}</p>
  </article>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { savePost, unsavePost, votePost } from '../services/api.js'
import { formatCount, formatRelativeTime } from '../services/format.js'

const props = defineProps({ post: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const router = useRouter()
const actionError = ref('')

function openPost() {
  router.push(`/post/${props.post.id}`)
}

async function setVote(direction) {
  actionError.value = ''
  try {
    const vote = props.post.userVote === direction ? 0 : direction
    const { post } = await votePost(props.post.id, vote)
    emit('updated', post)
  } catch (error) {
    actionError.value = error.message
  }
}

async function toggleSaved() {
  actionError.value = ''
  try {
    const { post } = props.post.saved
      ? await unsavePost(props.post.id)
      : await savePost(props.post.id)
    emit('updated', post)
  } catch (error) {
    actionError.value = error.message
  }
}
</script>

<style scoped>
.thread {
  padding: 12px 16px 14px;
  border-radius: 16px;
  cursor: pointer;
  transition: background 120ms ease;
}
.thread + .thread { border-top: 1px solid var(--reddit-border-soft); }
.thread:hover { background: var(--reddit-surface-inset); }
.thread-head { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-bottom: 8px; font-size: 12px; color: var(--reddit-text-meta); }
.community-mark { width: 24px; height: 24px; border-radius: 50%; }
.community-name { color: var(--reddit-text); font-weight: 700; }
.thread-divider { color: var(--reddit-text-muted); }
.author { text-decoration: none; }
.author:hover { text-decoration: underline; }
.thread-time::before { content: '-'; padding: 0 7px; }
.flair { padding: 3px 8px; border-radius: 12px; color: var(--reddit-text); font-size: 11px; font-weight: 600; }
h2 { margin-bottom: 8px; color: var(--reddit-text); font-size: 18px; line-height: 1.38; font-weight: 600; letter-spacing: -0.012em; }
.thread-copy { display: -webkit-box; overflow: hidden; margin-bottom: 10px; color: var(--reddit-text-secondary); font-size: 14px; line-height: 1.5; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }
.thread-image { display: block; width: 100%; max-height: 520px; margin: 10px 0; border-radius: 12px; object-fit: contain; background: var(--reddit-surface-inset); }
.thread-link { display: inline-block; margin-bottom: 10px; color: var(--reddit-blue); font-size: 13px; }
.thread-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.vote-control, .chip { height: 34px; display: inline-flex; align-items: center; border-radius: 18px; background: var(--reddit-surface-hover); color: var(--reddit-text-secondary); font-size: 13px; font-weight: 600; text-decoration: none; }
.vote-control button { width: 34px; height: 34px; color: inherit; border-radius: 18px; }
.vote-control span { font-family: var(--font-mono); color: var(--reddit-text); }
.vote-control button:hover, .chip:hover { background: #e7ebed; }
.vote-control .selected { color: var(--reddit-orange); }
.vote-control .selectedDown { color: var(--reddit-blue); }
.chip { gap: 7px; padding: 0 14px; }
.thread-error { margin-top: 9px; color: #b42318; font-size: 12px; }
</style>
