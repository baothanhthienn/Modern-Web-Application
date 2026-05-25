<template>
  <AppShell>
    <div class="chat-page d-flex">
      <aside class="rooms">
        <header class="rooms-head">
          <h1><i class="fa-regular fa-comment-dots"></i> Community chats</h1>
          <span :class="{ connected: connected && roomJoined }">{{ connected && roomJoined ? 'Live' : 'Offline' }}</span>
        </header>
        <label class="room-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="search" placeholder="Search communities" />
        </label>
        <div v-if="roomsLoading" class="side-state">Loading communities...</div>
        <div v-else-if="roomsError" class="side-state error">{{ roomsError }}</div>
        <div v-else class="room-list">
          <button v-for="room in filteredRooms" :key="room.name" :class="{ active: activeRoom?.name === room.name }" @click="selectRoom(room)">
            <span class="room-mark" :style="{ background: room.color || 'var(--reddit-blue)' }">{{ avatarLetter(room.name) }}</span>
            <span class="room-label"><strong>r/{{ room.name }}</strong><small>{{ formatCount(room.memberCount) }} members</small></span>
            <span v-if="room.joined" class="membership">Joined</span>
          </button>
        </div>
      </aside>

      <section class="conversation d-flex flex-column">
        <div v-if="!activeRoom" class="chat-empty">
          <i class="fa-regular fa-comment-dots"></i>
          <h2>Community chat</h2>
          <p>Select a community to view its live conversation.</p>
        </div>
        <template v-else>
          <header class="conversation-head d-flex align-items-center">
            <span class="room-mark" :style="{ background: activeRoom.color || 'var(--reddit-blue)' }">{{ avatarLetter(activeRoom.name) }}</span>
            <div>
              <h2>r/{{ activeRoom.name }}</h2>
              <p>{{ formatCount(activeRoom.memberCount) }} members</p>
            </div>
            <button class="join" :class="{ joined: activeRoom.joined }" @click="toggleMembership">
              {{ activeRoom.joined ? 'Leave' : 'Join to chat' }}
            </button>
          </header>

          <div v-if="connectionError" class="chat-alert">{{ connectionError }}</div>
          <div v-if="messageError" class="chat-alert">{{ messageError }}</div>
          <div v-if="!activeRoom.joined" class="chat-empty">
            <i class="fa-solid fa-lock"></i>
            <h2>Members-only chat</h2>
            <p>Join r/{{ activeRoom.name }} to view and send messages.</p>
          </div>
          <div v-else-if="messagesLoading" class="chat-empty">Loading messages...</div>
          <template v-else>
            <MessageList :messages="messages" :current-user="currentUser" />
            <MessageInput
              :disabled="!canSend"
              :disabled-message="messageDisabledReason"
              :room-name="`r/${activeRoom.name}`"
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
import { getCommunities, getCommunityMessages, joinCommunity, leaveCommunity } from '../services/api.js'
import { avatarLetter, formatCount } from '../services/format.js'
import { emitSocketEvent, getChatSocket } from '../services/realtime.js'
import { useAuthUser } from '../services/auth.js'

const route = useRoute()
const router = useRouter()
const authUser = useAuthUser()
const currentUser = computed(() => authUser.value?.username || '')
const rooms = ref([])
const roomsLoading = ref(true)
const roomsError = ref('')
const activeRoom = ref(null)
const search = ref('')
const messages = ref([])
const messagesLoading = ref(false)
const messageError = ref('')
const connected = ref(false)
const roomJoined = ref(false)
const joinedCommunity = ref('')
const connectionError = ref('')
let socket
const filteredRooms = computed(() => rooms.value.filter((room) =>
  room.name.toLowerCase().includes(search.value.trim().toLowerCase())))
const canSend = computed(() => Boolean(activeRoom.value?.joined && connected.value && roomJoined.value))
const messageDisabledReason = computed(() => {
  if (!connected.value) return 'Connecting to live chat...'
  if (!roomJoined.value) return 'Joining this live chat...'
  return ''
})

async function loadRooms() {
  try {
    const data = await getCommunities()
    rooms.value = data.communities
    const requested = typeof route.params.roomId === 'string' ? route.params.roomId : ''
    if (requested) {
      const room = rooms.value.find((entry) => entry.name === requested)
      if (room) selectRoom(room)
    }
  } catch (error) {
    roomsError.value = error.message
  } finally {
    roomsLoading.value = false
  }
}

async function selectRoom(room) {
  if (activeRoom.value?.name !== room.name) await leaveJoinedRoom()
  activeRoom.value = room
  roomJoined.value = false
  messageError.value = ''
  router.replace(`/chat/${room.name}`)
  if (!room.joined) {
    messages.value = []
    return
  }
  await loadMessages()
}

async function loadMessages() {
  const roomName = activeRoom.value.name
  messagesLoading.value = true
  try {
    const data = await getCommunityMessages(roomName)
    if (activeRoom.value?.name !== roomName) return
    messages.value = data.messages
    await joinActiveRoom()
  } catch (error) {
    if (activeRoom.value?.name !== roomName) return
    messageError.value = error.message
    messages.value = []
  } finally {
    if (activeRoom.value?.name === roomName) messagesLoading.value = false
  }
}

async function toggleMembership() {
  messageError.value = ''
  try {
    await (activeRoom.value.joined ? leaveCommunity(activeRoom.value.name) : joinCommunity(activeRoom.value.name))
    activeRoom.value.joined = !activeRoom.value.joined
    if (activeRoom.value.joined) await loadMessages()
    else {
      await leaveJoinedRoom()
      messages.value = []
    }
  } catch (error) {
    messageError.value = error.message
  }
}

async function joinActiveRoom() {
  roomJoined.value = false
  if (!socket || !connected.value || !activeRoom.value?.joined) return
  const roomName = activeRoom.value.name
  if (joinedCommunity.value && joinedCommunity.value !== roomName) await leaveJoinedRoom()
  try {
    const response = await emitSocketEvent(socket, 'community:join', { community: roomName })
    if (!response?.success) throw new Error(response?.error || 'Chat authorization failed.')
    if (activeRoom.value?.name === roomName) {
      joinedCommunity.value = response.community || roomName
      roomJoined.value = true
    }
  } catch (error) {
    if (activeRoom.value?.name === roomName) messageError.value = error.message
  }
}

async function leaveJoinedRoom() {
  const roomName = joinedCommunity.value
  joinedCommunity.value = ''
  roomJoined.value = false
  if (!roomName || !socket?.connected) return
  try {
    const response = await emitSocketEvent(socket, 'community:leave', { community: roomName })
    if (!response?.success) throw new Error(response?.error || 'Could not leave live chat.')
  } catch (error) {
    messageError.value = error.message
  }
}

async function sendMessage(body) {
  if (!canSend.value) return
  messageError.value = ''
  try {
    const response = await emitSocketEvent(socket, 'community:message:send', { community: activeRoom.value.name, body })
    if (!response?.success) throw new Error(response?.error || 'Message could not be sent.')
    appendMessage(response.message)
  } catch (error) {
    messageError.value = error.message
  }
}

function appendMessage(message) {
  if (message && !messages.value.some((entry) => String(entry.id) === String(message.id))) {
    messages.value.push(message)
  }
}

function receiveMessage(payload) {
  if (payload.community === activeRoom.value?.name) appendMessage(payload.message)
}

function handleConnect() {
  connected.value = true
  connectionError.value = ''
  joinActiveRoom()
}

function handleDisconnect() {
  connected.value = false
  roomJoined.value = false
  joinedCommunity.value = ''
}

function handleConnectError(error) {
  connected.value = false
  roomJoined.value = false
  connectionError.value = error.message === 'Authentication required.'
    ? 'Log in to use live chat.'
    : 'Unable to connect to live chat.'
}

onMounted(() => {
  socket = getChatSocket()
  socket.on('connect', handleConnect)
  socket.on('disconnect', handleDisconnect)
  socket.on('connect_error', handleConnectError)
  socket.on('community:message', receiveMessage)
  connected.value = socket.connected
  loadRooms()
})

watch(() => route.params.roomId, (name) => {
  const room = rooms.value.find((entry) => entry.name === name)
  if (room && room !== activeRoom.value) selectRoom(room)
})

onBeforeUnmount(() => {
  leaveJoinedRoom()
  socket?.off('community:message', receiveMessage)
  socket?.off('connect', handleConnect)
  socket?.off('disconnect', handleDisconnect)
  socket?.off('connect_error', handleConnectError)
})
</script>

<style scoped>
.chat-page { height: calc(100vh - 56px); overflow: hidden; }
.rooms { width: 310px; flex-shrink: 0; border-right: 1px solid var(--reddit-border-soft); display: flex; flex-direction: column; }
.rooms-head { padding: 18px 16px 12px; display: flex; align-items: center; gap: 10px; }
.rooms-head h1 { flex: 1; font-size: 16px; font-weight: 700; }
.rooms-head h1 i { margin-right: 8px; }
.rooms-head span { padding: 3px 9px; border-radius: 13px; background: var(--reddit-surface-hover); color: var(--reddit-text-secondary); font-size: 11px; font-weight: 700; }
.rooms-head span.connected { background: rgba(70,167,88,.14); color: #26743a; }
.room-search { margin: 0 12px 10px; height: 40px; display: flex; align-items: center; gap: 9px; padding: 0 13px; border-radius: 21px; background: var(--reddit-surface-inset); color: var(--reddit-text-meta); }
.room-search input { width: 100%; border: 0; outline: 0; background: transparent; font-size: 13px; }
.room-list { overflow-y: auto; padding: 4px 8px; }
.room-list button { width: 100%; min-height: 62px; padding: 8px; display: flex; align-items: center; gap: 10px; border-radius: 14px; text-align: left; }
.room-list button:hover, .room-list .active { background: var(--reddit-surface-inset); }
.room-mark { width: 42px; height: 42px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; color: white; font-weight: 700; }
.room-label { flex: 1; min-width: 0; }
.room-label strong, .room-label small { display: block; }
.room-label strong { font-size: 13px; }
.room-label small { margin-top: 3px; color: var(--reddit-text-meta); font-size: 12px; }
.membership { color: #26743a; font-size: 11px; font-weight: 700; }
.side-state { padding: 30px 16px; color: var(--reddit-text-secondary); font-size: 13px; text-align: center; }
.side-state.error, .chat-alert { color: #b42318; }
.conversation { min-width: 0; flex: 1; }
.conversation-head { gap: 12px; min-height: 70px; padding: 12px 20px; border-bottom: 1px solid var(--reddit-border-soft); }
.conversation-head h2 { font-size: 16px; font-weight: 700; }
.conversation-head p { color: var(--reddit-text-meta); font-size: 12px; }
.join { margin-left: auto; height: 38px; padding: 0 17px; border-radius: 20px; background: var(--reddit-blue); color: white; font-weight: 700; }
.join.joined { border: 1px solid var(--reddit-border-emphasis); background: transparent; color: var(--reddit-text); }
.chat-empty { flex: 1; display: grid; align-content: center; justify-items: center; gap: 10px; color: var(--reddit-text-secondary); text-align: center; }
.chat-empty i { color: var(--reddit-text-muted); font-size: 37px; }
.chat-empty h2 { color: var(--reddit-text); font-size: 19px; }
.chat-empty p { font-size: 14px; }
.chat-alert { padding: 10px 20px; background: #fff3f1; font-size: 13px; }
@media (max-width: 760px) { .rooms { width: 100%; } .conversation { display: none !important; } }
</style>
