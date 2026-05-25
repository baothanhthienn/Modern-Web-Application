import { ref } from 'vue'

const USER_STORAGE_KEY = 'reddit_user'
const AUTH_API_URL = './api/auth'

async function authRequest(path, options = {}) {
  let response
  try {
    console.info(`[auth] Requesting ${path}.php`)
    response = await fetch(`${AUTH_API_URL}/${path}.php`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...options,
    })
  } catch {
    console.error(`[auth] Cannot reach ${path}.php`)
    throw new Error('Cannot reach the authentication service.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error(`[auth] ${path}.php failed (${response.status})`, data.details || data.error || 'No response detail')
    throw new Error(data.details || data.error || 'Authentication request failed.')
  }
  console.info(`[auth] ${path}.php succeeded`)
  return data
}

export async function login(credentials) {
  return authRequest('login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function register(details) {
  return authRequest('register', {
    method: 'POST',
    body: JSON.stringify(details),
  })
}

export function saveAuthSession({ user }) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, loggedIn: true }))
  authenticatedUser.value = { ...user, loggedIn: true }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY)) || null
  } catch {
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
  const { user } = await authRequest('session')
  saveAuthSession({ user })
  return authenticatedUser.value
}

export async function logout() {
  try {
    await authRequest('logout', { method: 'POST' })
  } finally {
    clearStoredAuth()
  }
}
