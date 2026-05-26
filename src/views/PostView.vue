<template>
  <AppShell>
    <div class="post-page row g-4 justify-content-center">
      <main class="col-12 col-lg-8 post-column">
        <div v-if="loading" class="state">Loading post...</div>
        <div v-else-if="error" class="state state--error">{{ error }}</div>
        <template v-else-if="post">
          <PostCard :post="post" @updated="post = $event" />
          <section class="discussion">
            <header>
              <h2>Discussion</h2>
              <span>{{ formatCount(post.comments) }} comments</span>
            </header>
            <div class="discussion-empty">
              <i class="fa-regular fa-message"></i>
              <p>Comment content is not available from the current API.</p>
            </div>
          </section>
        </template>
      </main>
      <aside v-if="post" class="col-12 col-lg-4 post-rail">
        <section>
          <h2>About r/{{ post.community }}</h2>
          <router-link v-if="!post.localOnly" :to="`/chat/${post.community}`" class="rail-action">Open community chat</router-link>
          <p v-else class="rail-note">This is a local showcase post for the team profile.</p>
        </section>
        <section>
          <h2>Author</h2>
          <router-link :to="`/profile/${post.author}`" class="author-link">
            <span>{{ avatarLetter(post.author) }}</span>
            u/{{ post.author }}
          </router-link>
        </section>
      </aside>
    </div>
  </AppShell>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import PostCard from '../components/PostCard.vue'
import { teamPostsById } from '../data/teamProfiles.js'
import { getPost } from '../services/api.js'
import { avatarLetter, formatCount } from '../services/format.js'

const route = useRoute()
const post = ref(null)
const loading = ref(true)
const error = ref('')

async function loadPost() {
  loading.value = true
  error.value = ''
  try {
    const data = await getPost(route.params.id)
    post.value = data.post
  } catch (loadError) {
    const localPost = teamPostsById[String(route.params.id)]
    if (localPost) {
      post.value = localPost
      error.value = ''
    } else {
      error.value = loadError.message
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadPost)
watch(() => route.params.id, loadPost)
</script>

<style scoped>
.post-page { width: min(1040px, 100%); margin: 0 auto; padding: 18px 24px 56px; }
.post-column { max-width: 700px; }
.post-column :deep(.thread) { background: var(--reddit-white); border: 1px solid var(--reddit-border-soft); }
.discussion { margin-top: 14px; border-top: 1px solid var(--reddit-border-soft); }
.discussion header { height: 60px; display: flex; align-items: center; gap: 9px; padding: 0 16px; }
.discussion h2 { font-size: 16px; font-weight: 700; }
.discussion header span { color: var(--reddit-text-meta); font-size: 13px; }
.discussion-empty { min-height: 180px; display: grid; align-content: center; justify-items: center; gap: 10px; color: var(--reddit-text-secondary); font-size: 14px; }
.discussion-empty i { font-size: 30px; color: var(--reddit-text-muted); }
.post-rail { max-width: 296px; display: flex; flex-direction: column; gap: 12px; }
.post-rail section { padding: 17px 16px; border-radius: 16px; background: var(--reddit-surface-inset); }
.post-rail h2 { margin-bottom: 14px; font-size: 15px; }
.rail-action { display: block; height: 38px; padding: 9px; border-radius: 20px; background: var(--reddit-blue); color: white; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; }
.rail-note { color: var(--reddit-text-secondary); font-size: 13px; line-height: 1.6; }
.author-link { display: flex; align-items: center; gap: 10px; text-decoration: none; font-size: 14px; font-weight: 600; }
.author-link span { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: var(--reddit-blue); color: white; font-weight: 700; }
.state { min-height: 280px; display: grid; place-content: center; color: var(--reddit-text-secondary); }
.state--error { color: #b42318; }
@media (max-width: 850px) { .post-page { padding: 10px 8px 40px; } .post-rail { max-width: none; } }
</style>
