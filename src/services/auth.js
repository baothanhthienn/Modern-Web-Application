const AUTH_API_URL = 'http://localhost:3000/api/auth'
const USER_STORAGE_KEY = 'reddit_user'

async function authRequest(path, options) {
  let response
  try {
    response = await fetch(`${AUTH_API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    })
  } catch {
    throw new Error('Cannot reach the server. Start the backend and try again.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Authentication request failed.')
  }
  return data
}

export async function login(credentials) {
  return authRequest('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function register(details) {
  return authRequest('/register', {
    method: 'POST',
    body: JSON.stringify(details),
  })
}

export function saveAuthSession({ user }) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, loggedIn: true }))
  localStorage.removeItem('reddit_session_token')
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
  localStorage.removeItem('reddit_session_token')
}

export async function restoreAuthSession() {
  const { user } = await authRequest('/session', { method: 'GET' })
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, loggedIn: true }))
  return user
}

export async function logout() {
  try {
    await authRequest('/session', { method: 'DELETE' })
  } finally {
    clearStoredAuth()
  }
}
