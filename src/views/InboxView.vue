<template>
  <AppShell>
    <div class="inbox-page d-flex">
      <aside class="contacts">
        <header>
          <h1><i class="fa-regular fa-envelope"></i> Messages</h1>
          <p>Direct conversations</p>
        </header>
        <form class="find-person" @submit.prevent="findPeople">
          <input v-model="search" minlength="2" placeholder="Find a username" />
          <button :disabled="search.trim().length < 2"><i class="fa-solid fa-magnifying-glass"></i></button>
        </form>
        <p v-if="searchError" class="side-error">{{ searchError }}</p>
        <div class="contact-list">
          <button v-for="user in users" :key="user.username" :class="{ active: activeUsername === user.username }" @click="openConversation(user.username)">
            <span>{{ avatarLetter(user.username) }}</span>
            <strong>u/{{ user.username }}</strong>
          </button>
          <div v-if="searched && !users.length" class="empty-contact">No users found.</div>
        </div>
      </aside>

      <section class="direct-panel d-flex flex-column">
        <div v-if="!activeUsername" class="direct-empty">
          <i class="fa-regular fa-paper-plane"></i>
          <h2>Direct messages</h2>
          <p>Search for a redditor to open an authorized conversation.</p>
        </div>
        <template v-else>
          <header class="direct-head d-flex align-items-center">
            <span class="person-mark">{{ avatarLetter(activeUsername) }}</span>
            <router-link :to="`/profile/${activeUsername}`">
              <h2>u/{{ activeUsername }}</h2>
              <p>View public profile</p>
            </router-link>
            <button v-if="profileViewer && !profileViewer.isFollowing" class="follow" @click="followUser">Follow</button>
          </header>
          <div v-if="connectionError" class="message-error">{{ connectionError }}</div>
          <div v-if="historyError" class="message-error">
            <p>{{ historyError }}</p>
            <small v-if="historyForbidden">Direct chat becomes available once both users follow each other.</small>
          </div>
          <div v-if="historyLoading" class="direct-empty">Loading messages...</div>
          <template v-else-if="!historyError">
            <MessageList :messages="messages" :current-user="currentUser" />
            <MessageInput
              :disabled="!canSend"
              :disabled-message="messageDisabledReason"
              :room-name="`u/${activeUsername}`"
              @send="sendMessage"
            />
          </template>
        </template>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import MessageInput from '../components/chat/MessageInput.vue'
import MessageList from '../components/chat/MessageList.vue'
import { followProfile, getDirectMessages, getProfile, searchContent } from '../services/api.js'
import { avatarLetter } from '../services/format.js'
import { emitSocketEvent, getChatSocket } from '../services/realtime.js'
import { useAuthUser } from '../services/auth.js'

const route = useRoute()
const router = useRouter()
const authUser = useAuthUser()
const currentUser = computed(() => authUser.value?.username || '')
const search = ref('')
const searched = ref(false)
const users = ref([])
const searchError = ref('')
const activeUsername = ref('')
const profileViewer = ref(null)
const messages = ref([])
const historyLoading = ref(false)
const historyError = ref('')
const historyForbidden = ref(false)
const connected = ref(false)
const directJoined = ref(false)
const joinedUsername = ref('')
const connectionError = ref('')
let socket
const canSend = computed(() => Boolean(activeUsername.value && connected.value && directJoined.value && !historyError.value))
const messageDisabledReason = computed(() => {
  if (!connected.value) return 'Connecting to direct messages...'
  if (!directJoined.value) return 'Opening this direct conversation...'
  return ''
})

async function findPeople() {
  searchError.value = ''
  searched.value = true
  try {
    const data = await searchContent(search.value.trim())
    users.value = data.users.filter((user) => user.username !== currentUser.value)
  } catch (error) {
    searchError.value = error.message
  }
}

async function openConversation(username) {
  if (activeUsername.value && activeUsername.value !== username) await leaveActiveDirect()
  activeUsername.value = username
  directJoined.value = false
  router.replace({ path: '/inbox', query: { with: username } })
  historyError.value = ''
  historyForbidden.value = false
  historyLoading.value = true
  try {
    const [history, profile] = await Promise.all([getDirectMessages(username), getProfile(username)])
    if (activeUsername.value !== username) return
    messages.value = history.messages
    profileViewer.value = profile.viewer
    await joinActiveDirect()
  } catch (error) {
    if (activeUsername.value !== username) return
    messages.value = []
    historyError.value = error.message
    historyForbidden.value = error.status === 403
    try {
      const profile = await getProfile(username)
      profileViewer.value = profile.viewer
    } catch {
      profileViewer.value = null
    }
  } finally {
    if (activeUsername.value === username) historyLoading.value = false
  }
}

async function followUser() {
  try {
    await followProfile(activeUsername.value)
    profileViewer.value.isFollowing = true
    await openConversation(activeUsername.value)
  } catch (error) {
    historyError.value = error.message
  }
}

async function joinActiveDirect() {
  directJoined.value = false
  if (!socket || !connected.value || !activeUsername.value || historyError.value) return
  const username = activeUsername.value
  if (joinedUsername.value && joinedUsername.value !== username) await leaveActiveDirect()
  try {
    const response = await emitSocketEvent(socket, 'direct:join', { username })
    if (!response?.success) throw new Error(response?.error || 'Direct message authorization failed.')
    if (activeUsername.value === username) {
      joinedUsername.value = response.with || username
      directJoined.value = true
    }
  } catch (error) {
    if (activeUsername.value === username) historyError.value = error.message
  }
}

async function leaveActiveDirect() {
  const username = joinedUsername.value
  joinedUsername.value = ''
  directJoined.value = false
  if (!username || !socket?.connected) return
  try {
    const response = await emitSocketEvent(socket, 'direct:leave', { username })
    if (!response?.success) throw new Error(response?.error || 'Could not leave direct conversation.')
  } catch (error) {
    historyError.value = error.message
  }
}

async function sendMessage(body) {
  if (!canSend.value) return
  historyError.value = ''
  try {
    const response = await emitSocketEvent(socket, 'direct:message:send', { username: activeUsername.value, body })
    if (!response?.success) throw new Error(response?.error || 'Message could not be sent.')
    appendMessage(response.message)
  } catch (error) {
    historyError.value = error.message
  }
}

function appendMessage(message) {
  if (message && !messages.value.some((entry) => String(entry.id) === String(message.id))) {
    messages.value.push(message)
  }
}

function receiveMessage(payload) {
  if (payload.with === activeUsername.value) appendMessage(payload.message)
}

function handleConnect() {
  connected.value = true
  connectionError.value = ''
  joinActiveDirect()
}

function handleDisconnect() {
  connected.value = false
  directJoined.value = false
  joinedUsername.value = ''
}

function handleConnectError(error) {
  connected.value = false
  directJoined.value = false
  connectionError.value = error.message === 'Authentication required.'
    ? 'Log in to use direct messages.'
    : 'Unable to connect to direct messages.'
}

function applyInitialContact() {
  const username = typeof route.query.with === 'string' ? route.query.with : ''
  if (username && username !== activeUsername.value) {
    users.value = [{ username }]
    search.value = username
    openConversation(username)
  }
}

onMounted(() => {
  socket = getChatSocket()
  socket.on('connect', handleConnect)
  socket.on('disconnect', handleDisconnect)
  socket.on('connect_error', handleConnectError)
  socket.on('direct:message', receiveMessage)
  connected.value = socket.connected
  applyInitialContact()
})
watch(() => route.query.with, applyInitialContact)
onBeforeUnmount(() => {
  leaveActiveDirect()
  socket?.off('direct:message', receiveMessage)
  socket?.off('connect', handleConnect)
  socket?.off('disconnect', handleDisconnect)
  socket?.off('connect_error', handleConnectError)
})
</script>

<style scoped>
.inbox-page { height: calc(100vh - 56px); overflow: hidden; }
.contacts { width: 310px; flex-shrink: 0; display: flex; flex-direction: column; border-right: 1px solid var(--reddit-border-soft); }
.contacts header { padding: 20px 18px 12px; }
.contacts h1 { font-size: 18px; font-weight: 700; }
.contacts h1 i { margin-right: 9px; }
.contacts header p { margin-top: 5px; color: var(--reddit-text-secondary); font-size: 13px; }
.find-person { display: flex; gap: 7px; margin: 0 12px 12px; }
.find-person input { flex: 1; min-width: 0; height: 42px; padding: 0 14px; border: 1px solid transparent; border-radius: 22px; background: var(--reddit-surface-inset); }
.find-person input:focus { border-color: var(--reddit-blue); outline: none; }
.find-person button { width: 42px; border-radius: 50%; background: var(--reddit-blue); color: white; }
.find-person button:disabled { opacity: .45; }
.side-error { padding: 0 16px 8px; color: #b42318; font-size: 12px; }
.contact-list { overflow-y: auto; padding: 4px 8px; }
.contact-list button { width: 100%; min-height: 60px; display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 14px; }
.contact-list button:hover, .contact-list .active { background: var(--reddit-surface-inset); }
.contact-list span, .person-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: var(--reddit-blue); color: #fff; font-weight: 700; }
.contact-list strong { font-size: 14px; }
.empty-contact { padding: 38px 16px; color: var(--reddit-text-secondary); text-align: center; font-size: 13px; }
.direct-panel { flex: 1; min-width: 0; }
.direct-empty { flex: 1; display: grid; align-content: center; justify-items: center; gap: 10px; color: var(--reddit-text-secondary); text-align: center; }
.direct-empty i { font-size: 36px; color: var(--reddit-text-muted); }
.direct-empty h2 { color: var(--reddit-text); font-size: 20px; }
.direct-empty p { font-size: 14px; }
.direct-head { min-height: 70px; gap: 13px; padding: 12px 20px; border-bottom: 1px solid var(--reddit-border-soft); }
.direct-head a { color: var(--reddit-text); text-decoration: none; }
.direct-head h2 { font-size: 16px; }
.direct-head p { margin-top: 3px; color: var(--reddit-text-secondary); font-size: 12px; }
.follow { margin-left: auto; height: 38px; padding: 0 20px; border-radius: 20px; background: var(--reddit-blue); color: white; font-weight: 700; }
.message-error { margin: 20px; padding: 14px; border-radius: 12px; background: #fff3f1; color: #b42318; font-size: 14px; }
.message-error small { display: block; margin-top: 6px; color: var(--reddit-text-secondary); }
@media (max-width: 760px) { .contacts { width: 100%; } .direct-panel { display: none !important; } }
</style>
