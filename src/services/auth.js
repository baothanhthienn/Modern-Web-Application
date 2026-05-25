const USER_STORAGE_KEY = 'reddit_user'
const AUTH_API_URL = './api/auth'

async function authRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${AUTH_API_URL}/${path}.php`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...options,
    })
  } catch {
    throw new Error('Cannot reach the authentication service.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Authentication request failed.')
  }
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
}

export async function restoreAuthSession() {
  const { user } = await authRequest('session')
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, loggedIn: true }))
  return user
}

export async function logout() {
  try {
    await authRequest('logout', { method: 'POST' })
  } finally {
    clearStoredAuth()
  }
}
