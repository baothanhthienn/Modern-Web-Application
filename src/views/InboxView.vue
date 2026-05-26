<template>
  <AppShell>
    <div class="inbox-page d-flex">
      <aside class="contacts">
        <header>
          <h1><i class="fa-regular fa-envelope"></i> Messages</h1>
          <p>Mutual follows can chat here</p>
        </header>
        <div class="contacts-label d-flex align-items-center">
          <strong>Conversations</strong>
          <button class="refresh" type="button" :disabled="conversationsLoading" @click="loadConversations">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': conversationsLoading }"></i>
          </button>
        </div>
        <div v-if="conversationsLoading" class="conversation-state">Loading messages...</div>
        <div v-else-if="conversationsError && !conversationApiPending" class="conversation-state error">{{ conversationsError }}</div>
        <div v-else-if="conversationApiPending && !conversations.length" class="conversation-state">
          <strong>Inbox sync is not available yet.</strong>
          <small>Search for someone below to open an existing mutual conversation.</small>
        </div>
        <div v-else-if="!conversations.length" class="conversation-state">
          <strong>No conversations yet</strong>
          <small>When you and another user follow each other, the chat appears here.</small>
        </div>
        <div v-else class="thread-list">
          <button
            v-for="conversation in conversations"
            :key="conversation.username"
            :class="{ active: activeUsername === conversation.username }"
            @click="openConversation(conversation.username)"
          >
            <span class="thread-avatar">
              <img v-if="conversation.avatarUrl" :src="conversation.avatarUrl" :alt="`u/${conversation.username}`" />
              <template v-else>{{ avatarLetter(conversation.username) }}</template>
            </span>
            <span class="thread-copy">
              <span class="thread-line">
                <strong>{{ conversation.displayName || `u/${conversation.username}` }}</strong>
                <time v-if="conversation.lastMessage">{{ formatThreadTime(conversation.lastMessage.createdAt) }}</time>
              </span>
              <small v-if="conversation.lastMessage" :class="{ unread: conversation.unreadCount }">
                <template v-if="conversation.lastMessage.sender === currentUser">You: </template>{{ conversation.lastMessage.body }}
              </small>
              <small v-else>Start the conversation</small>
            </span>
            <b v-if="conversation.unreadCount">{{ conversation.unreadCount }}</b>
          </button>
        </div>
        <div class="new-chat">
          <p>New message</p>
        <form class="find-person" @submit.prevent="findPeople">
          <input v-model="search" minlength="2" placeholder="Find a username" />
          <button :disabled="search.trim().length < 2" aria-label="Search users"><i class="fa-solid fa-magnifying-glass"></i></button>
        </form>
        <p v-if="searchError" class="side-error">{{ searchError }}</p>
        <div v-if="searched" class="contact-list">
          <button v-for="user in users" :key="user.username" :class="{ active: activeUsername === user.username }" @click="openConversation(user.username)">
            <span>{{ avatarLetter(user.username) }}</span>
            <strong>u/{{ user.username }}</strong>
          </button>
          <div v-if="searched && !users.length" class="empty-contact">No users found.</div>
        </div>
        </div>
      </aside>

      <section class="direct-panel d-flex flex-column">
        <div v-if="!activeUsername" class="direct-empty">
          <i class="fa-regular fa-paper-plane"></i>
          <h2>Your conversations</h2>
          <p>Choose a mutual follow from the left, or find someone to start chatting.</p>
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
            <MessageList
              :messages="messages"
              :current-user="currentUser"
              :typing-users="typingUsers"
              @reaction="handleReaction"
            />
            <MessageInput
              :disabled="!canSend"
              :disabled-message="messageDisabledReason"
              :room-name="`u/${activeUsername}`"
              @send="sendMessage"
              @typing-change="setTyping"
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
import { followProfile, getDirectConversations, getDirectMessages, getProfile, searchContent } from '../services/api.js'
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
const conversations = ref([])
const conversationsLoading = ref(true)
const conversationsError = ref('')
const conversationApiPending = ref(false)
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
const typingUsers = ref([])
let socket
const canSend = computed(() => Boolean(activeUsername.value && connected.value && directJoined.value && !historyError.value))
const messageDisabledReason = computed(() => {
  if (!connected.value) return 'Connecting to direct messages...'
  if (!directJoined.value) return 'Opening this direct conversation...'
  return ''
})

async function loadConversations() {
  conversationsLoading.value = true
  conversationsError.value = ''
  conversationApiPending.value = false
  try {
    const data = await getDirectConversations()
    conversations.value = data.conversations
  } catch (error) {
    conversations.value = []
    if (error.status === 404) {
      conversationApiPending.value = true
    } else {
      conversationsError.value = error.message
    }
  } finally {
    conversationsLoading.value = false
  }
}

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
    typingUsers.value = []
    profileViewer.value = profile.viewer
    upsertConversation(username, history.messages.at(-1))
    await joinActiveDirect()
    await markActiveConversationRead()
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
    await loadConversations()
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
  typingUsers.value = []
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
    upsertConversation(activeUsername.value, response.message)
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
  upsertConversation(payload.with, payload.message, payload.with !== activeUsername.value)
  if (payload.with === activeUsername.value) {
    appendMessage(payload.message)
    markActiveConversationRead()
  }
}

function receiveConversation(payload) {
  const conversation = payload?.conversation
  if (!conversation?.username) return
  const index = conversations.value.findIndex((entry) => entry.username === conversation.username)
  const existing = index >= 0 ? conversations.value[index] : {}
  if (index >= 0) conversations.value.splice(index, 1)
  conversations.value.unshift({ ...existing, ...conversation })
  conversationApiPending.value = false
}

async function markActiveConversationRead() {
  if (!socket || !connected.value || !activeUsername.value || !messages.value.length) return
  try {
    const response = await emitSocketEvent(socket, 'direct:read', { username: activeUsername.value })
    if (!response?.success) return
    applyDirectRead(response)
  } catch {
    // Read state is best effort.
  }
}

function applyDirectRead(payload) {
  if (payload.with !== activeUsername.value) return
  const ids = new Set((payload.messageIds || []).map(String))
  messages.value = messages.value.map((message) => (
    ids.has(String(message.id))
      ? { ...message, seen: true, seenAt: payload.readAt }
      : message
  ))
  const conversation = conversations.value.find((entry) => entry.username === payload.with)
  if (conversation) conversation.unreadCount = 0
}

function applyDirectReaction(payload) {
  if (payload.with !== activeUsername.value) return
  messages.value = messages.value.map((message) => (
    String(message.id) === String(payload.messageId)
      ? {
          ...message,
          reactions: payload.reactions,
          viewerReaction: payload.actor === currentUser.value ? payload.actorReaction : message.viewerReaction,
        }
      : message
  ))
}

function receiveTyping(payload) {
  if (payload.with !== activeUsername.value || payload.username === currentUser.value) return
  typingUsers.value = payload.isTyping ? [payload.username] : []
}

async function setTyping(isTyping) {
  if (!canSend.value) return
  try {
    await emitSocketEvent(socket, 'direct:typing', { username: activeUsername.value, isTyping })
  } catch {
    // Typing is transient.
  }
}

async function handleReaction({ messageId, reaction }) {
  if (!canSend.value) return
  try {
    const response = reaction
      ? await emitSocketEvent(socket, 'direct:reaction:set', { username: activeUsername.value, messageId, reaction })
      : await emitSocketEvent(socket, 'direct:reaction:remove', { username: activeUsername.value, messageId })
    if (!response?.success) throw new Error(response?.error || 'Could not update reaction.')
    applyDirectReaction({
      with: response.with,
      messageId: response.messageId,
      reactions: response.reactions,
      actor: currentUser.value,
      actorReaction: response.viewerReaction ?? null,
    })
  } catch (error) {
    historyError.value = error.message
  }
}

function upsertConversation(username, lastMessage, incrementUnread = false) {
  const index = conversations.value.findIndex((conversation) => conversation.username === username)
  const existing = index >= 0 ? conversations.value[index] : { username, unreadCount: 0 }
  const updated = {
    ...existing,
    lastMessage: lastMessage || existing.lastMessage || null,
    unreadCount: incrementUnread ? (existing.unreadCount || 0) + 1 : 0,
  }
  if (index >= 0) conversations.value.splice(index, 1)
  conversations.value.unshift(updated)
}

function formatThreadTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
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
  typingUsers.value = []
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
  socket.on('direct:conversation', receiveConversation)
  socket.on('direct:typing', receiveTyping)
  socket.on('direct:read', applyDirectRead)
  socket.on('direct:reaction', applyDirectReaction)
  connected.value = socket.connected
  loadConversations()
  applyInitialContact()
})
watch(() => route.query.with, applyInitialContact)
onBeforeUnmount(() => {
  leaveActiveDirect()
  socket?.off('direct:message', receiveMessage)
  socket?.off('direct:conversation', receiveConversation)
  socket?.off('direct:typing', receiveTyping)
  socket?.off('direct:read', applyDirectRead)
  socket?.off('direct:reaction', applyDirectReaction)
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
.contacts-label { height: 40px; margin: 3px 12px 4px 16px; justify-content: space-between; color: var(--reddit-text-secondary); font-size: 11px; letter-spacing: .05em; text-transform: uppercase; }
.refresh { width: 32px; height: 32px; border-radius: 50%; color: var(--reddit-text-meta); }
.refresh:hover { background: var(--reddit-surface-inset); color: var(--reddit-text); }
.conversation-state { margin: 0 12px 12px; padding: 16px 12px; border-radius: 12px; background: var(--reddit-surface-inset); color: var(--reddit-text-secondary); font-size: 13px; line-height: 1.45; }
.conversation-state strong, .conversation-state small { display: block; }
.conversation-state strong { color: var(--reddit-text); margin-bottom: 4px; }
.conversation-state.error { color: #b42318; }
.thread-list { overflow-y: auto; padding: 0 8px 10px; border-bottom: 1px solid var(--reddit-border-soft); }
.thread-list button { width: 100%; min-height: 70px; padding: 9px 8px; display: flex; align-items: center; gap: 10px; border-radius: 14px; text-align: left; }
.thread-list button:hover, .thread-list button.active { background: var(--reddit-surface-inset); }
.thread-avatar { width: 44px; height: 44px; display: grid; place-items: center; flex-shrink: 0; overflow: hidden; border-radius: 50%; background: var(--reddit-blue); color: white; font-weight: 700; }
.thread-avatar img { width: 100%; height: 100%; object-fit: cover; }
.thread-copy { flex: 1; min-width: 0; }
.thread-line { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.thread-line strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.thread-line time { color: var(--reddit-text-muted); font-size: 11px; }
.thread-copy small { display: block; margin-top: 4px; overflow: hidden; color: var(--reddit-text-meta); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.thread-copy small.unread { color: var(--reddit-text); font-weight: 600; }
.thread-list b { min-width: 19px; height: 19px; padding: 2px 5px; border-radius: 12px; background: var(--reddit-orange); color: white; font-size: 11px; text-align: center; }
.new-chat { flex-shrink: 0; padding-top: 12px; }
.new-chat > p { margin: 0 16px 9px; color: var(--reddit-text-secondary); font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
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
