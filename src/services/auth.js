import { ref } from 'vue'

const USER_STORAGE_KEY = 'reddit_user'
const DEFAULT_API_BASE_URL = 'https://modern-web-application-backend-production.up.railway.app/api'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')

async function authRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/auth/${path}`, {
      credentials: 'include',
      ...options,
    })
  } catch {
    throw new Error('Cannot reach the authentication service.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Authentication service returned an invalid response.')
  }

  if (!data || typeof data.success !== 'boolean') {
    throw new Error('Authentication service returned an unexpected response.')
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Authentication request failed.')
  }

  return data
}

export async function login(credentials) {
  return authRequest('login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
}

export async function register(details) {
  return authRequest('register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })
}

function normalizeAuthUser(user) {
  const username = typeof user?.username === 'string' ? user.username.trim() : ''
  if (!username) {
    return null
  }
  return { ...user, username, loggedIn: true }
}

export function saveAuthSession({ user }) {
  const sessionUser = normalizeAuthUser(user)
  if (!sessionUser) {
    throw new Error('Authentication response does not include a username.')
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser))
  authenticatedUser.value = sessionUser
  return sessionUser
}

export function getStoredUser() {
  try {
    const user = normalizeAuthUser(JSON.parse(localStorage.getItem(USER_STORAGE_KEY)))
    if (!user) {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
    return user
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(USER_STORAGE_KEY)
  authenticatedUser.value = null
}

const authenticatedUser = ref(getStoredUser())

export function useAuthUser() {
  return authenticatedUser
}

export async function restoreAuthSession() {
  const { user } = await authRequest('session', { method: 'GET' })
  return saveAuthSession({ user })
}

export async function logout() {
  try {
    await authRequest('logout', { method: 'POST' })
  } finally {
    clearStoredAuth()
  }
}
