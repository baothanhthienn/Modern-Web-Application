const DEFAULT_API_BASE_URL = '/api'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
export const API_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
    })
  } catch {
    throw new ApiError('Cannot reach the application service.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new ApiError('The application service returned an invalid response.', response.status)
  }

  if (!data || typeof data.success !== 'boolean') {
    throw new ApiError('The application service returned an unexpected response.', response.status)
  }
  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'The request failed.', response.status)
  }
  return data
}

function queryString(values) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

function jsonRequest(path, method, body) {
  return apiRequest(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function getPosts({ sort = 'best', limit = 20, cursor } = {}) {
  return apiRequest(`/posts${queryString({ sort, limit, cursor })}`)
}

export function createPost(post) {
  return jsonRequest('/posts', 'POST', post)
}

export function getPost(postId) {
  return apiRequest(`/posts/${encodeURIComponent(postId)}`)
}

export function updatePost(postId, fields) {
  return jsonRequest(`/posts/${encodeURIComponent(postId)}`, 'PATCH', fields)
}

export function deletePost(postId) {
  return apiRequest(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' })
}

export function votePost(postId, vote) {
  return jsonRequest(`/posts/${encodeURIComponent(postId)}/vote`, 'PUT', { vote })
}

export function savePost(postId) {
  return apiRequest(`/posts/${encodeURIComponent(postId)}/saved`, { method: 'PUT' })
}

export function unsavePost(postId) {
  return apiRequest(`/posts/${encodeURIComponent(postId)}/saved`, { method: 'DELETE' })
}

export function searchContent(query, limit = 20) {
  return apiRequest(`/search${queryString({ q: query, limit })}`)
}

export function getCommunities() {
  return apiRequest('/communities')
}

export function joinCommunity(name) {
  return apiRequest(`/communities/${encodeURIComponent(name)}/join`, { method: 'POST' })
}

export function leaveCommunity(name) {
  return apiRequest(`/communities/${encodeURIComponent(name)}/join`, { method: 'DELETE' })
}

export function getProfile(username) {
  return apiRequest(`/profiles/${encodeURIComponent(username)}`)
}

export function getProfileActivity(username, { type = 'overview', limit = 20, cursor } = {}) {
  return apiRequest(`/profiles/${encodeURIComponent(username)}/activity${queryString({ type, limit, cursor })}`)
}

export function getSavedItems({ limit = 20, cursor } = {}) {
  return apiRequest(`/me/saved${queryString({ limit, cursor })}`)
}

export function followProfile(username) {
  return apiRequest(`/profiles/${encodeURIComponent(username)}/follow`, { method: 'POST' })
}

export function unfollowProfile(username) {
  return apiRequest(`/profiles/${encodeURIComponent(username)}/follow`, { method: 'DELETE' })
}

export function getNotifications({ limit = 20, cursor } = {}) {
  return apiRequest(`/notifications${queryString({ limit, cursor })}`)
}

export function getCommunityMessages(name, { limit = 20, cursor } = {}) {
  return apiRequest(`/chats/communities/${encodeURIComponent(name)}/messages${queryString({ limit, cursor })}`)
}

export function getDirectMessages(username, { limit = 20, cursor } = {}) {
  return apiRequest(`/chats/users/${encodeURIComponent(username)}/messages${queryString({ limit, cursor })}`)
}

export function getDirectConversations({ limit = 30, cursor } = {}) {
  return apiRequest(`/chats/conversations${queryString({ limit, cursor })}`)
}

export function updateUsername(username) {
  return jsonRequest('/me/username', 'PATCH', { username })
}
