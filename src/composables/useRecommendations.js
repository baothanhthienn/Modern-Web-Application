import { computed, ref, unref } from 'vue'

const STORAGE_KEY = 'sphere_recommendation_interests'
const MAX_STORED_INTERESTS = 50

function loadInterests() {
  if (typeof window === 'undefined') return {}

  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    return stored && typeof stored === 'object' ? stored : {}
  } catch {
    return {}
  }
}

const interests = ref(loadInterests())

function saveInterests() {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(interests.value))
  } catch {
    // Browsers can deny storage access; recommendations should still work in memory.
  }
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#/.-]+/g, ' ')
    .split(/\s+/)
    .map(term => term.replace(/^#/, ''))
    .filter(term => term.length > 1)
}

function postTerms(post) {
  return [...new Set([
    ...tokenize(post.community),
    ...(post.tags || []).flatMap(tokenize),
    ...tokenize(post.title),
  ])]
}

function updateInterests(terms, weight) {
  const updated = { ...interests.value }

  for (const term of [...new Set(terms)]) {
    updated[term] = (updated[term] || 0) + weight
    if (updated[term] === 0) delete updated[term]
  }

  interests.value = Object.fromEntries(
    Object.entries(updated)
      .sort(([, left], [, right]) => Math.abs(right) - Math.abs(left))
      .slice(0, MAX_STORED_INTERESTS)
  )
  saveInterests()
}

export function useRecommendations(posts) {
  function scorePost(post) {
    const popularity = Math.log10(Math.max(0, post.score ?? post.votes ?? 0) + 1) * 10
    const discussion = Math.log10(Math.max(0, post.comments || 0) + 1) * 2
    const personalized = postTerms(post)
      .reduce((score, term) => score + (interests.value[term] || 0), 0)

    return popularity + discussion + personalized
  }

  function trackPostView(post) {
    updateInterests(postTerms(post), 1)
  }

  function trackPostLike(post, direction = 1) {
    updateInterests(postTerms(post), direction > 0 ? 3 : -2)
  }

  function trackSearch(query) {
    updateInterests(tokenize(query), 2)
  }

  const topInterests = computed(() => Object.entries(interests.value)
    .filter(([, weight]) => weight > 0)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 6)
    .map(([term, weight]) => ({ term, weight })))

  const recommendations = computed(() => [...(unref(posts) || [])]
    .sort((left, right) => scorePost(right) - scorePost(left))
    .slice(0, 3)
    .map(post => {
      const matchedTerm = postTerms(post)
        .filter(term => (interests.value[term] || 0) > 0)
        .sort((left, right) => interests.value[right] - interests.value[left])[0]

      return {
        ...post,
        recommendationScore: Math.round(scorePost(post)),
        recommendationReason: matchedTerm
          ? `Because you showed interest in ${matchedTerm}`
          : `Popular in r/${post.community}`,
      }
    }))

  return {
    recommendations,
    topInterests,
    scorePost,
    trackPostView,
    trackPostLike,
    trackSearch,
  }
}
