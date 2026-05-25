import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server } from 'socket.io'
import { closeDatabase, pool, verifyDatabaseConnection } from './db.js'
import {
  bearerToken,
  hashPassword,
  hashSessionToken,
  newSession,
  normalizeEmail,
  normalizeUsername,
  validateRegistration,
  verifyPassword,
} from './auth.js'

const app = express()
const server = http.createServer(app)
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  },
})

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
app.use(express.json())

const roomPresence = new Map()
const socketUsers = new Map()

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    joinDate: new Date(Number(user.created_at)).toISOString(),
  }
}

async function issueSession(userId) {
  const session = newSession()
  const createdAt = Date.now()
  await pool.execute(
    `INSERT INTO auth_sessions (user_id, token_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, session.tokenHash, createdAt, session.expiresAt]
  )
  return session.token
}

function cookieToken(header) {
  const sessionCookie = String(header || '')
    .split(';')
    .map(value => value.trim())
    .find(value => value.startsWith('reddit_session='))
  return sessionCookie?.slice('reddit_session='.length) || null
}

function requestSessionToken(req) {
  return cookieToken(req.headers.cookie) || bearerToken(req.headers.authorization)
}

function setSessionCookie(res, token) {
  const maxAgeSeconds = 60 * 60 * 24 * 30
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `reddit_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secureFlag}`
  )
}

function clearSessionCookie(res) {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `reddit_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`)
}

async function findAuthenticatedSession(req) {
  const token = requestSessionToken(req)
  if (!token) return null

  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.email, u.created_at
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?
     LIMIT 1`,
    [hashSessionToken(token), Date.now()]
  )
  return rows[0] || null
}

// Builds the emoji reaction object used by the Vue components.
async function buildReactionsMap(messageId) {
  console.log(`[chat] buildReactionsMap messageId=${messageId}`)
  const [rows] = await pool.execute(
    'SELECT emoji, username FROM chat_reactions WHERE message_id = ? ORDER BY created_at ASC',
    [messageId]
  )

  console.log(`[chat] buildReactionsMap found ${rows.length} reaction(s)`)
  return rows.reduce((map, row) => {
    if (!map[row.emoji]) map[row.emoji] = []
    map[row.emoji].push(row.username)
    return map
  }, {})
}

// Gets room messages with reactions attached.
async function getMessagesByRoom(roomId) {
  console.log(`[chat] getMessagesByRoom roomId=${roomId}`)
  const [rows] = await pool.execute(
    `SELECT id, room_id AS roomId, username, text, timestamp, status, temp_id AS tempId
     FROM chat_messages
     WHERE room_id = ?
     ORDER BY timestamp ASC, id ASC`,
    [roomId]
  )

  console.log(`[chat] getMessagesByRoom found ${rows.length} message(s)`)
  return Promise.all(rows.map(async message => ({
    ...message,
    reactions: await buildReactionsMap(message.id),
  })))
}

// Saves a new message into MySQL.
async function createMessage({ roomId, username, text, tempId }) {
  console.log(`[chat] createMessage roomId=${roomId} username=${username} tempId=${tempId ?? 'none'} textLength=${text.trim().length}`)
  const timestamp = Date.now()

  const [result] = await pool.execute(
    `INSERT INTO chat_messages (room_id, username, text, timestamp, status, temp_id)
     VALUES (?, ?, ?, ?, 'sent', ?)`,
    [roomId, username, text.trim(), timestamp, tempId || null]
  )

  console.log(`[chat] createMessage created messageId=${result.insertId}`)
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
  console.log(`[chat] updateMessageStatus messageId=${messageId} status=${status}`)
  await pool.execute(
    'UPDATE chat_messages SET status = ? WHERE id = ?',
    [status, messageId]
  )
}

// Toggles one emoji reaction for one user.
async function toggleReaction({ messageId, emoji, username, roomId }) {
  console.log(`[chat] toggleReaction messageId=${messageId} roomId=${roomId} username=${username} emoji=${emoji}`)
  const [existing] = await pool.execute(
    `SELECT id FROM chat_reactions
     WHERE message_id = ? AND emoji = ? AND username = ?
     LIMIT 1`,
    [messageId, emoji, username]
  )

  if (existing.length > 0) {
    console.log(`[chat] toggleReaction removing reaction messageId=${messageId}`)
    await pool.execute('DELETE FROM chat_reactions WHERE id = ?', [existing[0].id])
  } else {
    console.log(`[chat] toggleReaction adding reaction messageId=${messageId}`)
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
  console.log(`[chat] updateDeliveryStatus roomId=${roomId} joiningUsername=${joiningUsername}`)
  const [rows] = await pool.execute(
    `SELECT id, username FROM chat_messages
     WHERE room_id = ? AND username <> ? AND status = 'sent'`,
    [roomId, joiningUsername]
  )

  console.log(`[chat] updateDeliveryStatus updating ${rows.length} message(s)`)
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
  console.log('[http] GET /api/health')
  try {
    await pool.query('SELECT 1')
    res.json({ success: true, database: 'connected' })
  } catch (error) {
    console.error('[http] GET /api/health failed', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/auth/register', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const username = normalizeUsername(req.body?.username)
  const password = String(req.body?.password || '')
  const validationError = validateRegistration({ email, username, password })

  if (validationError) {
    return res.status(400).json({ success: false, error: validationError })
  }

  try {
    const passwordHash = await hashPassword(password)
    const createdAt = Date.now()
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, created_at)
       VALUES (?, ?, ?, ?)`,
      [username, email, passwordHash, createdAt]
    )
    const user = { id: result.insertId, username, email, created_at: createdAt }
    const sessionToken = await issueSession(user.id)
    setSessionCookie(res, sessionToken)
    res.status(201).json({ success: true, user: publicUser(user) })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'That username or email is already registered.' })
    }
    console.error('[http] POST /api/auth/register failed', error.message)
    res.status(500).json({ success: false, error: 'Unable to create your account right now.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim()
  const password = String(req.body?.password || '')
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: 'Enter your username or email and password.' })
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, username, email, password_hash, created_at
       FROM users
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [identifier, normalizeEmail(identifier)]
    )
    const user = rows[0]
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Invalid username, email, or password.' })
    }

    const sessionToken = await issueSession(user.id)
    setSessionCookie(res, sessionToken)
    res.json({ success: true, user: publicUser(user) })
  } catch (error) {
    console.error('[http] POST /api/auth/login failed', error.message)
    res.status(500).json({ success: false, error: 'Unable to log in right now.' })
  }
})

app.get('/api/auth/session', async (req, res) => {
  try {
    const user = await findAuthenticatedSession(req)
    if (!user) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid.' })
    }
    res.json({ success: true, user: publicUser(user) })
  } catch (error) {
    console.error('[http] GET /api/auth/session failed', error.message)
    res.status(500).json({ success: false, error: 'Unable to verify your session right now.' })
  }
})

app.delete('/api/auth/session', async (req, res) => {
  const token = requestSessionToken(req)
  if (token) {
    try {
      await pool.execute('DELETE FROM auth_sessions WHERE token_hash = ?', [hashSessionToken(token)])
    } catch (error) {
      console.error('[http] DELETE /api/auth/session failed', error.message)
      return res.status(500).json({ success: false, error: 'Unable to log out right now.' })
    }
  }
  clearSessionCookie(res)
  res.json({ success: true })
})

app.get('/api/messages/:roomId', async (req, res) => {
  console.log(`[http] GET /api/messages/${req.params.roomId}`)
  try {
    const messages = await getMessagesByRoom(req.params.roomId)
    res.json({ success: true, messages })
  } catch (error) {
    console.error('[http] GET /api/messages failed', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/messages', async (req, res) => {
  console.log(`[http] POST /api/messages roomId=${req.body?.roomId ?? 'missing'} username=${req.body?.username ?? 'missing'}`)
  try {
    const { roomId, username, text, tempId } = req.body
    if (!roomId || !username || !text?.trim()) {
      return res.status(400).json({ success: false, error: 'Missing message fields' })
    }

    const message = await createMessage({ roomId, username, text, tempId })
    res.json({ success: true, message })
  } catch (error) {
    console.error('[http] POST /api/messages failed', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/reactions/:messageId', async (req, res) => {
  console.log(`[http] GET /api/reactions/${req.params.messageId}`)
  try {
    const reactions = await buildReactionsMap(req.params.messageId)
    res.json({ success: true, reactions })
  } catch (error) {
    console.error('[http] GET /api/reactions failed', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/reactions', async (req, res) => {
  console.log(`[http] POST /api/reactions messageId=${req.body?.messageId ?? 'missing'} roomId=${req.body?.roomId ?? 'missing'}`)
  try {
    const { messageId, emoji, username, roomId } = req.body
    if (!messageId || !emoji || !username || !roomId) {
      return res.status(400).json({ success: false, error: 'Missing reaction fields' })
    }

    const reactions = await toggleReaction({ messageId, emoji, username, roomId })
    res.json({ success: true, reactions })
  } catch (error) {
    console.error('[http] POST /api/reactions failed', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/reactions', async (req, res) => {
  console.log(`[http] DELETE /api/reactions messageId=${req.body?.messageId ?? 'missing'}`)
  try {
    const { messageId, emoji, username } = req.body
    await pool.execute(
      'DELETE FROM chat_reactions WHERE message_id = ? AND emoji = ? AND username = ?',
      [messageId, emoji, username]
    )
    res.json({ success: true, reactions: await buildReactionsMap(messageId) })
  } catch (error) {
    console.error('[http] DELETE /api/reactions failed', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

io.on('connection', (socket) => {
  console.log(`[socket] connection socketId=${socket.id}`)
  socketUsers.set(socket.id, { username: null, rooms: new Set() })

  socket.on('join-room', async ({ roomId, username }) => {
    console.log(`[socket] join-room socketId=${socket.id} roomId=${roomId} username=${username}`)
    try {
      socket.join(roomId)

      const userData = socketUsers.get(socket.id)
      userData.username = username
      userData.rooms.add(roomId)

      if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Set())
      roomPresence.get(roomId).add(username)

      io.to(roomId).emit('room-presence', Array.from(roomPresence.get(roomId)))
      await updateDeliveryStatus(roomId, username)
    } catch (error) {
      console.error('[socket] join-room failed', error.message)
      socket.emit('chat-error', error.message)
    }
  })

  socket.on('leave-room', ({ roomId, username }) => {
    console.log(`[socket] leave-room socketId=${socket.id} roomId=${roomId} username=${username}`)
    socket.leave(roomId)

    const userData = socketUsers.get(socket.id)
    if (userData) userData.rooms.delete(roomId)

    if (roomPresence.has(roomId)) {
      roomPresence.get(roomId).delete(username)
      io.to(roomId).emit('room-presence', Array.from(roomPresence.get(roomId)))
    }
  })

  socket.on('typing', ({ roomId, username }) => {
    console.log(`[socket] typing roomId=${roomId} username=${username}`)
    socket.to(roomId).emit('user-typing', username)
  })

  socket.on('stop-typing', ({ roomId, username }) => {
    console.log(`[socket] stop-typing roomId=${roomId} username=${username}`)
    socket.to(roomId).emit('user-stop-typing', username)
  })

  socket.on('send-message', async ({ roomId, username, text, tempId }, acknowledge = () => {}) => {
    console.log(`[socket] send-message roomId=${roomId} username=${username} tempId=${tempId ?? 'none'}`)
    try {
      if (!roomId || !username || !text?.trim()) {
        acknowledge({ success: false, error: 'Missing message fields' })
        return
      }

      const message = await createMessage({ roomId, username, text, tempId })
      io.to(roomId).emit('new-message', message)
      acknowledge({ success: true, message })

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
      console.error('[socket] send-message failed', error.message)
      acknowledge({ success: false, error: error.message })
      socket.emit('chat-error', error.message)
    }
  })

  socket.on('mark-seen', async ({ roomId, username }) => {
    console.log(`[socket] mark-seen roomId=${roomId} username=${username}`)
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

      console.log(`[socket] mark-seen updated ${rows.length} message(s)`)
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
      console.error('[socket] mark-seen failed', error.message)
      socket.emit('chat-error', error.message)
    }
  })

  socket.on('add-reaction', async ({ messageId, emoji, username, roomId }) => {
    console.log(`[socket] add-reaction messageId=${messageId} roomId=${roomId} username=${username} emoji=${emoji}`)
    try {
      if (!messageId || !emoji || !username || !roomId) return
      const reactions = await toggleReaction({ messageId, emoji, username, roomId })
      io.to(roomId).emit('reaction-updated', { messageId, reactions })
    } catch (error) {
      console.error('[socket] add-reaction failed', error.message)
      socket.emit('chat-error', error.message)
    }
  })

  socket.on('disconnect', () => {
    console.log(`[socket] disconnect socketId=${socket.id}`)
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

async function startServer() {
  console.log(`[server] startServer port=${PORT}`)
  try {
    await verifyDatabaseConnection()
    console.log('Database connection pool ready')

    server.listen(PORT, () => {
      console.log(`[server] chat server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('[Database startup failed]', error.message)
    await closeDatabase()
    process.exitCode = 1
  }
}

let isShuttingDown = false

async function shutdown(signal) {
  console.log(`[server] shutdown requested signal=${signal}`)
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`[server] ${signal} received, closing server`)
  io.close()
  await closeDatabase()
  server.close(() => {
    console.log('[server] HTTP server closed')
    process.exit(0)
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

startServer()
