// ============================================================
// server/server.js
// Reddit Clone — Backend Server
// ============================================================
// Stack: Node.js + Express + Socket.io
// Data:  JSON files (messages.json + reactions.json)
//        Replace with a real DB (SQLite/PostgreSQL) for production
//
// REST API endpoints:
//   GET  /api/messages/:roomId     — fetch all messages for a room
//   POST /api/messages             — save a new message
//   GET  /api/reactions/:messageId — fetch reactions for a message
//   POST /api/reactions            — add/toggle a reaction
//   DEL  /api/reactions            — remove a reaction
//
// Socket.io events (server listens):
//   join-room        — add socket to a room broadcast group
//   leave-room       — remove socket from a room
//   typing           — user started typing          → Feature 1A
//   stop-typing      — user stopped typing          → Feature 1A
//   send-message     — user sent a message
//   mark-seen        — user opened/read a room       → Feature 1B
//   add-reaction     — user reacted to a message     → Feature 2
//
// Socket.io events (server emits):
//   user-typing      — broadcast to room (excluding sender)
//   user-stop-typing — broadcast to room (excluding sender)
//   new-message      — broadcast new message to room
//   receipt-update   — send read receipt to original sender  → Feature 1B
//   reaction-updated — broadcast updated reactions to room   → Feature 2
//   room-presence    — send online user list to room
// ============================================================

const express  = require('express')
const http     = require('http')
const { Server } = require('socket.io')
const cors     = require('cors')
const fs       = require('fs')
const path     = require('path')

// ── App setup ──
const app    = express()
const server = http.createServer(app)

// ── Socket.io setup ──
// cors: '*' allows the Vite dev server (localhost:5173) to connect.
// In production, replace '*' with your actual Mercury domain.
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  }
})

// ── Middleware ──
app.use(cors())
app.use(express.json())

// ============================================================
// DATA LAYER
// Simple JSON file persistence.
// In production: replace with Sequelize/Prisma + PostgreSQL
// ============================================================

const DATA_DIR       = path.join(__dirname, 'data')
const MESSAGES_FILE  = path.join(DATA_DIR, 'messages.json')
const REACTIONS_FILE = path.join(DATA_DIR, 'reactions.json')

// Read JSON file safely
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return {}
  }
}

// Write JSON file
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ── In-memory online users tracker ──
// Map: roomId → Set of usernames currently in that room
const roomPresence = new Map()

// ── In-memory socket → user mapping ──
// Map: socketId → { username, rooms: Set }
const socketUsers = new Map()

// ============================================================
// HELPER: build reactions object from flat reactions array
// Returns: { '👍': ['alice', 'bob'], '❤️': ['charlie'] }
// ============================================================
function buildReactionsMap(messageId) {
  const data = readJSON(REACTIONS_FILE)
  const flat = (data.reactions || []).filter(r => r.messageId === messageId)
  const map = {}
  for (const r of flat) {
    if (!map[r.emoji]) map[r.emoji] = []
    map[r.emoji].push(r.username)
  }
  return map
}

// ============================================================
// REST API ROUTES
// ============================================================

// ── GET /api/messages/:roomId ──
// Returns all messages for a room, with reactions attached.
// Called by ChatView and InboxView on mount / room selection.
app.get('/api/messages/:roomId', (req, res) => {
  const { roomId } = req.params
  const data = readJSON(MESSAGES_FILE)

  // Check both community rooms and DM threads
  let messages = []
  if (data.rooms && data.rooms[roomId]) {
    messages = data.rooms[roomId]
  } else if (data.dms && data.dms[roomId]) {
    messages = data.dms[roomId]
  }

  // Attach current reactions to each message
  const withReactions = messages.map(msg => ({
    ...msg,
    reactions: buildReactionsMap(msg.id)
  }))

  res.json({ success: true, messages: withReactions })
})

// ── POST /api/messages ──
// Save a new message to the data store.
// Body: { roomId, username, text, tempId }
// Returns the saved message with a real ID + timestamp.
app.post('/api/messages', (req, res) => {
  const { roomId, username, text, tempId } = req.body

  if (!roomId || !username || !text) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  const data = readJSON(MESSAGES_FILE)
  const isDM = roomId.startsWith('dm:')

  // Build the new message object
  const newMessage = {
    id:        `msg-${Date.now()}`,
    roomId,
    username,
    text:      text.trim(),
    timestamp: Date.now(),
    status:    'sent',
    reactions: {},
    tempId,    // so the client can match optimistic UI to real message
  }

  // Save to the correct section
  if (isDM) {
    if (!data.dms) data.dms = {}
    if (!data.dms[roomId]) data.dms[roomId] = []
    data.dms[roomId].push(newMessage)
  } else {
    if (!data.rooms) data.rooms = {}
    if (!data.rooms[roomId]) data.rooms[roomId] = []
    data.rooms[roomId].push(newMessage)
  }

  writeJSON(MESSAGES_FILE, data)

  res.json({ success: true, message: newMessage })
})

// ── GET /api/reactions/:messageId ──
// Returns all reactions for a specific message.
app.get('/api/reactions/:messageId', (req, res) => {
  const { messageId } = req.params
  const reactions = buildReactionsMap(messageId)
  res.json({ success: true, reactions })
})

// ── POST /api/reactions ──
// Toggle an emoji reaction on a message.
// Body: { messageId, emoji, username, roomId }
// If the user already reacted with this emoji → remove it (toggle off)
// If not → add it (toggle on)
app.post('/api/reactions', (req, res) => {
  const { messageId, emoji, username, roomId } = req.body

  if (!messageId || !emoji || !username) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  const data = readJSON(REACTIONS_FILE)
  if (!data.reactions) data.reactions = []

  // Check if this user already reacted with this emoji on this message
  const existingIndex = data.reactions.findIndex(
    r => r.messageId === messageId && r.emoji === emoji && r.username === username
  )

  let action
  if (existingIndex >= 0) {
    // Toggle OFF — remove the reaction
    data.reactions.splice(existingIndex, 1)
    action = 'removed'
  } else {
    // Toggle ON — add the reaction
    data.reactions.push({
      id:        `r-${Date.now()}`,
      messageId,
      emoji,
      username,
      roomId,
      timestamp: Date.now(),
    })
    action = 'added'
  }

  writeJSON(REACTIONS_FILE, data)

  // Build the updated reactions map to send back
  const updatedReactions = buildReactionsMap(messageId)

  res.json({ success: true, action, reactions: updatedReactions })
})

// ── DELETE /api/reactions ──
// Explicitly remove a specific reaction (alternative to toggle).
// Body: { messageId, emoji, username }
app.delete('/api/reactions', (req, res) => {
  const { messageId, emoji, username } = req.body
  const data = readJSON(REACTIONS_FILE)
  if (!data.reactions) data.reactions = []

  data.reactions = data.reactions.filter(
    r => !(r.messageId === messageId && r.emoji === emoji && r.username === username)
  )
  writeJSON(REACTIONS_FILE, data)

  res.json({ success: true, reactions: buildReactionsMap(messageId) })
})

// ── GET /api/rooms ──
// Returns the list of available chat rooms with online counts.
app.get('/api/rooms', (req, res) => {
  const rooms = []
  for (const [roomId, users] of roomPresence.entries()) {
    if (!roomId.startsWith('dm:')) {
      rooms.push({ id: roomId, online: users.size })
    }
  }
  res.json({ success: true, rooms })
})

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============================================================
// SOCKET.IO — REAL-TIME EVENTS
// ============================================================

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`)

  // Register this socket's user
  socketUsers.set(socket.id, { username: null, rooms: new Set() })

  // ──────────────────────────────────────────────
  // JOIN-ROOM
  // Client emits this when entering a chat room or DM.
  // We add the socket to the Socket.io room so it receives
  // all broadcast events for that room.
  // ──────────────────────────────────────────────
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId)
    console.log(`[Room] ${username || socket.id} joined: ${roomId}`)

    // Track user presence
    const userData = socketUsers.get(socket.id)
    if (userData) {
      userData.username = username
      userData.rooms.add(roomId)
    }

    // Add to room presence map
    if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Set())
    if (username) roomPresence.get(roomId).add(username)

    // Broadcast updated presence list to the room
    const onlineList = Array.from(roomPresence.get(roomId))
    io.to(roomId).emit('room-presence', onlineList)

    // Tell this socket that their delivery status is now 'delivered'
    // Find undelivered messages in this room and update them
    updateDeliveryStatus(roomId, username)
  })

  // ──────────────────────────────────────────────
  // LEAVE-ROOM
  // ──────────────────────────────────────────────
  socket.on('leave-room', ({ roomId, username }) => {
    socket.leave(roomId)
    console.log(`[Room] ${username || socket.id} left: ${roomId}`)

    const userData = socketUsers.get(socket.id)
    if (userData) userData.rooms.delete(roomId)

    if (roomPresence.has(roomId) && username) {
      roomPresence.get(roomId).delete(username)
      const onlineList = Array.from(roomPresence.get(roomId))
      io.to(roomId).emit('room-presence', onlineList)
    }
  })

  // ──────────────────────────────────────────────
  // FEATURE 1A — TYPING INDICATOR
  // Client emits 'typing' on every keystroke (with 300ms debounce
  // on the client side so we don't flood the server).
  // We broadcast to everyone EXCEPT the sender using socket.to().
  // ──────────────────────────────────────────────
  socket.on('typing', ({ roomId, username }) => {
    // socket.to() sends to all sockets in the room EXCEPT this one
    socket.to(roomId).emit('user-typing', username)
  })

  socket.on('stop-typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user-stop-typing', username)
  })

  // ──────────────────────────────────────────────
  // SEND-MESSAGE
  // Client emits this when the user sends a message.
  // We:
  //   1. Save the message to messages.json
  //   2. Broadcast to all room members (including sender)
  //      The sender uses tempId to replace their optimistic UI message
  //   3. Set initial status to 'sent'
  //   4. Check if anyone else is in the room → upgrade to 'delivered'
  // ──────────────────────────────────────────────
  socket.on('send-message', ({ roomId, username, text, tempId }) => {
    if (!roomId || !username || !text) return

    const data = readJSON(MESSAGES_FILE)
    const isDM = roomId.startsWith('dm:')

    const newMessage = {
      id:        `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      roomId,
      username,
      text:      text.trim(),
      timestamp: Date.now(),
      status:    'sent',
      reactions: {},
      tempId,
    }

    // Persist to JSON file
    if (isDM) {
      if (!data.dms) data.dms = {}
      if (!data.dms[roomId]) data.dms[roomId] = []
      data.dms[roomId].push(newMessage)
    } else {
      if (!data.rooms) data.rooms = {}
      if (!data.rooms[roomId]) data.rooms[roomId] = []
      data.rooms[roomId].push(newMessage)
    }
    writeJSON(MESSAGES_FILE, data)

    // Broadcast the new message to ALL members of the room
    // (including the sender, so they get the real DB id back)
    io.to(roomId).emit('new-message', newMessage)

    // Check if anyone else is online in this room → delivered immediately
    const roomUsers = roomPresence.get(roomId)
    if (roomUsers && roomUsers.size > 1) {
      // Other people are in the room → upgrade status to 'delivered'
      newMessage.status = 'delivered'
      updateMessageStatus(newMessage.id, 'delivered', data, isDM, roomId)
      // Tell the sender their message was delivered
      socket.emit('receipt-update', { messageId: newMessage.id, tempId, status: 'delivered' })
    }
  })

  // ──────────────────────────────────────────────
  // FEATURE 1B — MARK-SEEN
  // Client emits this when the user opens/focuses a chat room.
  // We update ALL unseen messages in the room to 'seen' and
  // broadcast receipt-update to the original senders.
  // ──────────────────────────────────────────────
  socket.on('mark-seen', ({ roomId, username }) => {
    const data = readJSON(MESSAGES_FILE)
    const isDM = roomId.startsWith('dm:')
    const messages = isDM
      ? (data.dms?.[roomId] || [])
      : (data.rooms?.[roomId] || [])

    let changed = false

    for (const msg of messages) {
      // Only upgrade messages from OTHER users that haven't been seen yet
      if (msg.username !== username && msg.status !== 'seen') {
        msg.status = 'seen'
        changed = true

        // Notify the original sender that their message was seen
        // Find the sender's socket by looking up socketUsers
        for (const [sockId, userData] of socketUsers.entries()) {
          if (userData.username === msg.username) {
            io.to(sockId).emit('receipt-update', {
              messageId: msg.id,
              status:    'seen'
            })
          }
        }
      }
    }

    if (changed) writeJSON(MESSAGES_FILE, data)
  })


  socket.on('add-reaction', ({ messageId, emoji, username, roomId }) => {
    if (!messageId || !emoji || !username) return

    const data = readJSON(REACTIONS_FILE)
    if (!data.reactions) data.reactions = []

    // Toggle logic — unique constraint on (messageId, emoji, username)
    const existingIndex = data.reactions.findIndex(
      r => r.messageId === messageId && r.emoji === emoji && r.username === username
    )

    if (existingIndex >= 0) {
      data.reactions.splice(existingIndex, 1) // Remove (toggle off)
    } else {
      data.reactions.push({                   // Add (toggle on)
        id:        `r-${Date.now()}`,
        messageId,
        emoji,
        username,
        roomId,
        timestamp: Date.now(),
      })
    }

    writeJSON(REACTIONS_FILE, data)

    // Build updated reactions map for this message
    const updatedReactions = buildReactionsMap(messageId)

    // Broadcast to ALL room members so everyone sees the update instantly
    // This is the "no page refresh required" requirement from the advanced feature doc
    io.to(roomId).emit('reaction-updated', {
      messageId,
      reactions: updatedReactions
    })

    console.log(`[Reaction] ${username} toggled ${emoji} on message ${messageId}`)
  })

  // ──────────────────────────────────────────────
  // DISCONNECT
  // Clean up presence and notify room members.
  // ──────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`)

    const userData = socketUsers.get(socket.id)
    if (userData) {
      // Remove user from all rooms they were in
      for (const roomId of userData.rooms) {
        if (roomPresence.has(roomId) && userData.username) {
          roomPresence.get(roomId).delete(userData.username)
          const onlineList = Array.from(roomPresence.get(roomId))
          io.to(roomId).emit('room-presence', onlineList)
          // Notify room that user stopped typing (in case they disconnected mid-type)
          socket.to(roomId).emit('user-stop-typing', userData.username)
        }
      }
      socketUsers.delete(socket.id)
    }
  })
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Update message status to 'delivered' for all messages in a room
 * that were sent to users who are now online.
 * Called when a new user joins a room.
 */
function updateDeliveryStatus(roomId, joiningUsername) {
  const data = readJSON(MESSAGES_FILE)
  const isDM = roomId.startsWith('dm:')
  const messages = isDM
    ? (data.dms?.[roomId] || [])
    : (data.rooms?.[roomId] || [])

  let changed = false

  for (const msg of messages) {
    if (msg.username !== joiningUsername && msg.status === 'sent') {
      msg.status = 'delivered'
      changed = true

      // Notify the sender
      for (const [sockId, userData] of socketUsers.entries()) {
        if (userData.username === msg.username) {
          io.to(sockId).emit('receipt-update', {
            messageId: msg.id,
            status:    'delivered'
          })
        }
      }
    }
  }

  if (changed) writeJSON(MESSAGES_FILE, data)
}

/**
 * Update a single message's status field in the data store.
 */
function updateMessageStatus(messageId, status, data, isDM, roomId) {
  const messages = isDM
    ? (data.dms?.[roomId] || [])
    : (data.rooms?.[roomId] || [])
  const msg = messages.find(m => m.id === messageId)
  if (msg) {
    msg.status = status
    writeJSON(MESSAGES_FILE, data)
  }
}

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   Reddit Clone Backend Server        ║
  ║   Running on http://localhost:${PORT}   ║
  ╠══════════════════════════════════════╣
  ║   REST API:  /api/*                  ║
  ║   Socket.io: ws://localhost:${PORT}    ║
  ╚══════════════════════════════════════╝
  `)
})

module.exports = { app, server, io }