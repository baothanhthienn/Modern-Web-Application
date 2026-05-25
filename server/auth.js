import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(scryptCallback)
const PASSWORD_KEY_LENGTH = 64
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeUsername(value) {
  return String(value || '').trim()
}

export function validateRegistration({ email, username, password }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
    return 'Enter a valid email address.'
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return 'Username must be 3-20 characters using letters, numbers, or underscores.'
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/.test(password)) {
    return 'Password must be 8-128 characters with uppercase, lowercase, and a number.'
  }
  return null
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH)
  return `scrypt:${salt}:${Buffer.from(derivedKey).toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, storedKey] = String(storedHash || '').split(':')
  if (algorithm !== 'scrypt' || !salt || !storedKey) return false

  const expected = Buffer.from(storedKey, 'hex')
  if (expected.length !== PASSWORD_KEY_LENGTH) return false

  const actual = Buffer.from(await scrypt(password, salt, PASSWORD_KEY_LENGTH))
  return timingSafeEqual(actual, expected)
}

export function newSession() {
  const token = randomBytes(32).toString('hex')
  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: Date.now() + SESSION_TTL_MS,
  }
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function bearerToken(header) {
  const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(String(header || '').trim())
  return match?.[1] || null
}
