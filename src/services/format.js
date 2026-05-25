export function formatCount(value = 0) {
  const count = Number(value) || 0
  if (Math.abs(count) >= 1000000) return `${(count / 1000000).toFixed(1).replace('.0', '')}m`
  if (Math.abs(count) >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}k`
  return String(count)
}

export function formatRelativeTime(value) {
  if (!value) return ''
  const milliseconds = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(milliseconds)) return ''
  if (milliseconds < 60000) return 'just now'
  if (milliseconds < 3600000) return `${Math.floor(milliseconds / 60000)} min. ago`
  if (milliseconds < 86400000) return `${Math.floor(milliseconds / 3600000)} hr. ago`
  if (milliseconds < 604800000) return `${Math.floor(milliseconds / 86400000)} d. ago`
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not available'
}

export function avatarLetter(value = '?') {
  return String(value).charAt(0).toUpperCase() || '?'
}
