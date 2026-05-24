import express from 'express'
import http from 'http'
import cors from 'cors'
import mysql from 'mysql2/promise'
import { Server } from 'socket.io'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'DELETE'],
  },
})

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 's105292789',
  password: process.env.DB_PASSWORD || '120806',
  database: process.env.DB_NAME || 's105292789_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

app.use(cors())
app.use(express.json())

const roomPresence = new Map()
const socketUsers = new Map()

// Builds the emoji reaction object used by the Vue components.
async function buildReactionsMap(messageId) {
  const [rows] = await pool.execute(
    'SELECT emoji, username FROM chat_reactions WHERE message_id = ? ORDER BY created_at ASC',
    [messageId]
  )

  return rows.reduce((map, row) => {
    if (!map[row.emoji]) map[row.emoji] = []
    map[row.emoji].push(row.username)
    return map
  }, {})
}

// Gets room messages with reactions attached.
async function getMessagesByRoom(roomId) {
  const [rows] = await pool.execute(
    `SELECT id, room_id AS roomId, username, text, timestamp, status, temp_id AS tempId
     FROM chat_messages
     WHERE room_id = ?
     ORDER BY timestamp ASC, id ASC`,
    [roomId]
  )

  return Promise.all(rows.map(async message => ({
    ...message,
    reactions: await buildReactionsMap(message.id),
  })))
}

// Saves a new message into MySQL.
async function createMessage({ roomId, username, text, tempId }) {
  const timestamp = Date.now()

  const [result] = await pool.execute(
    `INSERT INTO chat_messages (room_id, username, text, timestamp, status, temp_id)
     VALUES (?, ?, ?, ?, 'sent', ?)`,
    [roomId, username, text.trim(), timestamp, tempId || null]
  )

  return {
    id: result.insertId,
    roomId,
    username,
    text: text.trim(),
    timestamp,
    status: 'sent',
    tempId,
    reactions: {},
  }
}

// Updates one message status in MySQL.
async function updateMessageStatus(messageId, status) {
  await pool.execute(
    'UPDATE chat_messages SET status = ? WHERE id = ?',
    [status, messageId]
  )
}

// Toggles one emoji reaction for one user.
async function toggleReaction({ messageId, emoji, username, roomId }) {
  const [existing] = await pool.execute(
    `SELECT id FROM chat_reactions
     WHERE message_id = ? AND emoji = ? AND username = ?
     LIMIT 1`,
    [messageId, emoji, username]
  )

  if (existing.length > 0) {
    await pool.execute('DELETE FROM chat_reactions WHERE id = ?', [existing[0].id])
  } else {
    await pool.execute(
      `INSERT INTO chat_reactions (message_id, room_id, emoji, username, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, roomId, emoji, username, Date.now()]
    )
  }

  return buildReactionsMap(messageId)
}

// Sends delivery receipts for older messages when a user joins.
async function updateDeliveryStatus(roomId, joiningUsername) {
  const [rows] = await pool.execute(
    `SELECT id, username FROM chat_messages
     WHERE room_id = ? AND username <> ? AND status = 'sent'`,
    [roomId, joiningUsername]
  )

  for (const message of rows) {
    await updateMessageStatus(message.id, 'delivered')

    for (const [socketId, userData] of socketUsers.entries()) {
      if (userData.username === message.username) {
        io.to(socketId).emit('receipt-update', {
          messageId: message.id,
          status: 'delivered',
        })
      }
    }
  }
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ success: true, database: 'connected' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const messages = await getMessagesByRoom(req.params.roomId)
    res.json({ success: true, messages })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/messages', async (req, res) => {
  try {
    const { roomId, username, text, tempId } = req.body
    if (!roomId || !username || !text?.trim()) {
      return res.status(400).json({ success: false, error: 'Missing message fields' })
    }

    const message = await createMessage({ roomId, username, text, tempId })
    res.json({ success: true, message })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/reactions/:messageId', async (req, res) => {
  try {
    const reactions = await buildReactionsMap(req.params.messageId)
    res.json({ success: true, reactions })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/reactions', async (req, res) => {
  try {
    const { messageId, emoji, username, roomId } = req.body
    if (!messageId || !emoji || !username || !roomId) {
      return res.status(400).json({ success: false, error: 'Missing reaction fields' })
    }

    const reactions = await toggleReaction({ messageId, emoji, username, roomId })
    res.json({ success: true, reactions })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/reactions', async (req, res) => {
  try {
    const { messageId, emoji, username } = req.body
    await pool.execute(
      'DELETE FROM chat_reactions WHERE message_id = ? AND emoji = ? AND username = ?',
      [messageId, emoji, username]
    )
    res.json({ success: true, reactions: await buildReactionsMap(messageId) })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

io.on('connection', (socket) => {
  socketUsers.set(socket.id, { username: null, rooms: new Set() })

  socket.on('join-room', async ({ roomId, username }) => {
    socket.join(roomId)

    const userData = socketUsers.get(socket.id)
    userData.username = username
    userData.rooms.add(roomId)

    if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Set())
    roomPresence.get(roomId).add(username)

    io.to(roomId).emit('room-presence', Array.from(roomPresence.get(roomId)))
    await updateDeliveryStatus(roomId, username)
  })

  socket.on('leave-room', ({ roomId, username }) => {
    socket.leave(roomId)

    const userData = socketUsers.get(socket.id)
    if (userData) userData.rooms.delete(roomId)

    if (roomPresence.has(roomId)) {
      roomPresence.get(roomId).delete(username)
      io.to(roomId).emit('room-presence', Array.from(roomPresence.get(roomId)))
    }
  })

  socket.on('typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user-typing', username)
  })

  socket.on('stop-typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user-stop-typing', username)
  })

  socket.on('send-message', async ({ roomId, username, text, tempId }) => {
    try {
      if (!roomId || !username || !text?.trim()) return

      const message = await createMessage({ roomId, username, text, tempId })
      io.to(roomId).emit('new-message', message)

      const roomUsers = roomPresence.get(roomId)
      if (roomUsers && roomUsers.size > 1) {
        await updateMessageStatus(message.id, 'delivered')
        socket.emit('receipt-update', {
          messageId: message.id,
          tempId,
          status: 'delivered',
        })
      }
    } catch (error) {
      socket.emit('chat-error', error.message)
    }
  })

  socket.on('mark-seen', async ({ roomId, username }) => {
    try {
      const [rows] = await pool.execute(
        `SELECT id, username FROM chat_messages
         WHERE room_id = ? AND username <> ? AND status <> 'seen'`,
        [roomId, username]
      )

      await pool.execute(
        `UPDATE chat_messages
         SET status = 'seen'
         WHERE room_id = ? AND username <> ? AND status <> 'seen'`,
        [roomId, username]
      )

      for (const message of rows) {
        for (const [socketId, userData] of socketUsers.entries()) {
          if (userData.username === message.username) {
            io.to(socketId).emit('receipt-update', {
              messageId: message.id,
              status: 'seen',
            })
          }
        }
      }
    } catch (error) {
      socket.emit('chat-error', error.message)
    }
  })

  socket.on('add-reaction', async ({ messageId, emoji, username, roomId }) => {
    try {
      if (!messageId || !emoji || !username || !roomId) return
      const reactions = await toggleReaction({ messageId, emoji, username, roomId })
      io.to(roomId).emit('reaction-updated', { messageId, reactions })
    } catch (error) {
      socket.emit('chat-error', error.message)
    }
  })

  socket.on('disconnect', () => {
    const userData = socketUsers.get(socket.id)
    if (!userData) return

    for (const roomId of userData.rooms) {
      if (roomPresence.has(roomId)) {
        roomPresence.get(roomId).delete(userData.username)
        io.to(roomId).emit('room-presence', Array.from(roomPresence.get(roomId)))
        socket.to(roomId).emit('user-stop-typing', userData.username)
      }
    }

    socketUsers.delete(socket.id)
  })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`)
})
