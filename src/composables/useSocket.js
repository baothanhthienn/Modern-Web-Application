import { ref, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

const API_URL = '/api'
const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

const isConnected = ref(false)
const isDemoMode = ref(true)

const messageHandlers = []
const receiptHandlers = []
const reactionHandlers = []
const demoNames = ['alice_dev', 'charlie_99', 'bob_coder', 'dev_life']

socket.on('connect', () => {
  isConnected.value = true
  isDemoMode.value = false
})

socket.on('disconnect', () => {
  isConnected.value = false
  isDemoMode.value = true
})

socket.on('new-message', (message) => {
  messageHandlers.forEach(handler => handler(message))
})

socket.on('receipt-update', (data) => {
  receiptHandlers.forEach(handler => handler(data))
})

socket.on('reaction-updated', (data) => {
  reactionHandlers.forEach(handler => handler(data))
})

socket.on('chat-error', (message) => {
  console.error('[Chat backend]', message)
})

export function useSocket() {
  const typingUsers = ref([])
  const onlineUsers = ref(['alice_dev', 'charlie_99', 'bob_coder', 'dev_life', 'bao_dev'])
  let typingTimer = null
  const demoTimers = []

  socket.on('user-typing', (username) => {
    addTypingUser(username)
  })

  socket.on('user-stop-typing', (username) => {
    removeTypingUser(username)
  })

  socket.on('room-presence', (users) => {
    onlineUsers.value = users
  })

  function addTypingUser(username) {
    if (username && !typingUsers.value.includes(username)) {
      typingUsers.value.push(username)
    }
  }

  function removeTypingUser(username) {
    typingUsers.value = typingUsers.value.filter(user => user !== username)
  }

  function pickDemoUser(username) {
    return demoNames.find(name => name !== username) || 'alice_dev'
  }

  function setDemoTimer(callback, delay) {
    const timer = setTimeout(callback, delay)
    demoTimers.push(timer)
    return timer
  }

  // Shows demo typing when there is no real socket server.
  function emitTyping(roomId, username) {
    if (isConnected.value) {
      socket.emit('typing', { roomId, username })
    } else {
      const demoUser = pickDemoUser(username)
      addTypingUser(demoUser)
      setDemoTimer(() => removeTypingUser(demoUser), 1200)
    }

    clearTimeout(typingTimer)
    typingTimer = setTimeout(() => stopTyping(roomId, username), 450)
  }

  function stopTyping(roomId, username) {
    clearTimeout(typingTimer)
    if (isConnected.value) {
      socket.emit('stop-typing', { roomId, username })
    }
  }

  // Tells the backend this room has been opened.
  function markRoomSeen(roomId, username) {
    if (isConnected.value) {
      socket.emit('mark-seen', { roomId, username })
    }
  }

  // Joins the selected chat room.
  function joinRoom(roomId, username) {
    if (isConnected.value) {
      socket.emit('join-room', { roomId, username })
    }
  }

  // Leaves the previous chat room.
  function leaveRoom(roomId, username) {
    if (isConnected.value) {
      socket.emit('leave-room', { roomId, username })
    }
    typingUsers.value = []
  }

  // Sends a new message to the backend.
  function sendMessage(roomId, text, username, tempId = Date.now()) {
    const payload = { roomId, text, username, tempId }

    if (isConnected.value) {
      socket.emit('send-message', payload, (response) => {
        if (response?.success) {
          messageHandlers.forEach(handler => handler(response.message))
        } else {
          console.error('[Chat save failed]', response?.error || 'Unknown socket error')
        }
      })
      return
    }

    fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          messageHandlers.forEach(handler => handler(data.message))
        }
      })
      .catch(error => {
        console.error('[Chat save failed]', error)
      })

    setDemoTimer(() => {
      receiptHandlers.forEach(handler => handler({ messageId: tempId, status: 'delivered' }))
    }, 500)

    setDemoTimer(() => {
      receiptHandlers.forEach(handler => handler({ messageId: tempId, status: 'seen' }))
    }, 1200)

    setDemoTimer(() => {
      reactionHandlers.forEach(handler => handler({
        messageId: tempId,
        reactions: { '👍': [pickDemoUser(username)] },
      }))
    }, 1800)
  }

  // Registers a new message listener.
  function onNewMessage(handler) {
    messageHandlers.push(handler)
  }

  // Registers a read receipt listener.
  function onReceiptUpdate(handler) {
    receiptHandlers.push(handler)
  }

  // Sends a reaction update to the backend.
  function emitReaction(messageId, emoji, username, roomId) {
    if (isConnected.value) {
      socket.emit('add-reaction', { messageId, emoji, username, roomId })
      return
    }

    fetch(`${API_URL}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, emoji, username, roomId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          reactionHandlers.forEach(handler => handler({ messageId, reactions: data.reactions }))
        }
      })
      .catch(() => {})
  }

  function onReactionUpdate(handler) {
    reactionHandlers.push(handler)
  }

  onUnmounted(() => {
    clearTimeout(typingTimer)
    demoTimers.forEach(timer => clearTimeout(timer))
    socket.off('user-typing')
    socket.off('user-stop-typing')
    socket.off('room-presence')
  })

  return {
    socket,
    isConnected,
    isDemoMode,
    typingUsers,
    onlineUsers,
    emitTyping,
    stopTyping,
    markRoomSeen,
    joinRoom,
    leaveRoom,
    sendMessage,
    onNewMessage,
    onReceiptUpdate,
    emitReaction,
    onReactionUpdate,
  }
}
