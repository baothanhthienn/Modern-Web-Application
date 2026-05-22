// ============================================================
// src/composables/useSocket.js
// ============================================================
// This is the central Socket.io composable shared by both
// ChatView and InboxView.
//
// It handles ALL real-time features:
//   Feature 1 — Typing indicators + message read receipts
//   Feature 2 — Per-message emoji reactions with live updates
//
// WHY a composable?
//   Vue 3 composables are functions that encapsulate reactive
//   state and logic. Instead of duplicating socket code in
//   every component, we define it once here and import it
//   wherever needed. The socket connection is created ONCE
//   at module level (outside the function) so all components
//   share the same connection.
// ============================================================

import { ref, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

// ── Single shared socket connection ──
// Created once when the module loads, reused by all callers.
// Change the URL to your backend when deploying.
const socket = io('http://localhost:3000', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

// ── Connection status (shared across all components) ──
const isConnected = ref(false)
socket.on('connect',    () => { isConnected.value = true })
socket.on('disconnect', () => { isConnected.value = false })

export function useSocket() {

  // ============================================================
  // FEATURE 1A — TYPING INDICATORS
  // ============================================================
  // typingUsers: reactive array of usernames currently typing
  // in the active room. The template watches this to show/hide
  // the TypingIndicator component.
  const typingUsers = ref([])

  // Debounce timer — prevents flooding the server with events
  // on every keystroke. We wait 300ms of inactivity before
  // sending stop-typing.
  let typingTimer = null

  /**
   * Call this from MessageInput on every @input event.
   * @param {string} roomId   - the chat room identifier
   * @param {string} username - the current user's username
   */
  function emitTyping(roomId, username) {
    // Tell the server this user started/continued typing
    socket.emit('typing', { roomId, username })

    // Reset the debounce timer
    clearTimeout(typingTimer)

    // After 300ms of no keystrokes, send stop-typing
    typingTimer = setTimeout(() => {
      socket.emit('stop-typing', { roomId, username })
    }, 300)
  }

  /**
   * Call this when the user sends a message (typing stops).
   */
  function stopTyping(roomId, username) {
    clearTimeout(typingTimer)
    socket.emit('stop-typing', { roomId, username })
  }

  // Listen for other users' typing status
  // The server broadcasts these to everyone EXCEPT the sender
  socket.on('user-typing', (username) => {
    if (!typingUsers.value.includes(username)) {
      typingUsers.value.push(username)
    }
  })
  socket.on('user-stop-typing', (username) => {
    typingUsers.value = typingUsers.value.filter(u => u !== username)
  })

  // ============================================================
  // FEATURE 1B — MESSAGE READ RECEIPTS
  // ============================================================
  // Each message has a status: 'sent' | 'delivered' | 'seen'
  // The server advances the status and broadcasts back:
  //   sent      → message saved to DB, sender sees ✓
  //   delivered → recipient is online, sender sees ✓✓
  //   seen      → recipient opened the chat, sender sees ✓✓ (blue)

  /**
   * Mark all messages in a room as seen by the current user.
   * Called when the user opens/focuses a chat room.
   */
  function markRoomSeen(roomId, username) {
    socket.emit('mark-seen', { roomId, username })
  }

  // Listen for receipt status updates from the server
  // The server sends this back to the SENDER when the recipient
  // reads their message.
  // messages is the reactive array managed per-component,
  // so we expose a callback pattern here.
  const receiptHandlers = []
  function onReceiptUpdate(handler) {
    receiptHandlers.push(handler)
  }
  socket.on('receipt-update', (data) => {
    // data = { messageId, status: 'delivered'|'seen' }
    receiptHandlers.forEach(h => h(data))
  })

  // ============================================================
  // MESSAGES
  // ============================================================
  const messages = ref([])

  /**
   * Join a socket room. Call this in onMounted of ChatView.
   * The server adds this socket to a room so it only receives
   * events for that community/DM thread.
   */
  function joinRoom(roomId) {
    socket.emit('join-room', roomId)
  }

  function leaveRoom(roomId) {
    socket.emit('leave-room', roomId)
  }

  /**
   * Emit a new message to the server.
   * The server saves it, assigns an ID + timestamp + status:'sent',
   * then broadcasts it back to all room members.
   */
  function sendMessage(roomId, text, username) {
    const payload = {
      roomId,
      text,
      username,
      tempId: Date.now(), // client-side temp ID for optimistic UI
    }
    socket.emit('send-message', payload)
  }

  // Receive new messages from the server (including your own,
  // which comes back with the real DB id + timestamp).
  const messageHandlers = []
  function onNewMessage(handler) {
    messageHandlers.push(handler)
  }
  socket.on('new-message', (message) => {
    messageHandlers.forEach(h => h(message))
  })

  // ============================================================
  // FEATURE 2 — EMOJI REACTIONS
  // ============================================================
  // Each message stores reactions as:
  //   { '👍': ['alice', 'bob'], '❤️': ['charlie'] }
  //
  // Toggle logic: if the user's name is already in the array,
  // remove it (un-react). Otherwise add it.
  // A unique DB constraint on (messageId, emoji, userId) prevents
  // duplicate reactions.

  /**
   * Toggle an emoji reaction on a message.
   * @param {string|number} messageId
   * @param {string} emoji    - e.g. '👍'
   * @param {string} username - current user
   */
  function emitReaction(messageId, emoji, username) {
    socket.emit('add-reaction', { messageId, emoji, username })
  }

  // The server broadcasts the updated reactions object for a
  // message to all room members.
  const reactionHandlers = []
  function onReactionUpdate(handler) {
    reactionHandlers.push(handler)
  }
  socket.on('reaction-updated', (data) => {
    // data = { messageId, reactions: { '👍': ['alice'], ... } }
    reactionHandlers.forEach(h => h(data))
  })

  // ============================================================
  // ONLINE PRESENCE
  // ============================================================
  const onlineUsers = ref([])
  socket.on('room-presence', (users) => {
    onlineUsers.value = users
  })

  // ============================================================
  // CLEANUP
  // ============================================================
  // When the component using this composable is destroyed,
  // remove the event handlers it registered to prevent memory
  // leaks and duplicate handler calls.
  onUnmounted(() => {
    socket.off('user-typing')
    socket.off('user-stop-typing')
    socket.off('receipt-update')
    socket.off('new-message')
    socket.off('reaction-updated')
    socket.off('room-presence')
    clearTimeout(typingTimer)
  })

  // ── Expose everything the components need ──
  return {
    socket,
    isConnected,
    messages,
    typingUsers,
    onlineUsers,
    // Typing
    emitTyping,
    stopTyping,
    // Receipts
    markRoomSeen,
    onReceiptUpdate,
    // Messages
    joinRoom,
    leaveRoom,
    sendMessage,
    onNewMessage,
    // Reactions
    emitReaction,
    onReactionUpdate,
  }
}