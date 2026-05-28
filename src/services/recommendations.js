const REC_STORAGE_KEY = 'reddit_recommendations'

function loadHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(REC_STORAGE_KEY))
    if (!stored || typeof stored !== 'object') return { viewedPosts: [], upvotedPosts: [], searchedKeywords: [] }
    return {
      viewedPosts: Array.isArray(stored.viewedPosts) ? stored.viewedPosts : [],
      upvotedPosts: Array.isArray(stored.upvotedPosts) ? stored.upvotedPosts : [],
      searchedKeywords: Array.isArray(stored.searchedKeywords) ? stored.searchedKeywords : [],
    }
  } catch {
    return { viewedPosts: [], upvotedPosts: [], searchedKeywords: [] }
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(REC_STORAGE_KEY, JSON.stringify(history))
  } catch {
    // storage quota exceeded or unavailable — silently skip
  }
}

export function trackViewedPost(post) {
  const history = loadHistory()
  const entry = { id: post.id, community: post.community, flair: post.flair, title: post.title, timestamp: Date.now() }
  history.viewedPosts = [entry, ...history.viewedPosts.filter((p) => p.id !== post.id)].slice(0, 50)
  saveHistory(history)
}

export function trackUpvotedPost(post) {
  const history = loadHistory()
  const entry = { id: post.id, community: post.community, flair: post.flair, title: post.title, timestamp: Date.now() }
  history.upvotedPosts = [entry, ...history.upvotedPosts.filter((p) => p.id !== post.id)].slice(0, 50)
  saveHistory(history)
}

export function trackSearchKeyword(keyword) {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return
  const history = loadHistory()
  history.searchedKeywords = [
    { keyword: normalized, timestamp: Date.now() },
    ...history.searchedKeywords.filter((k) => k.keyword !== normalized),
  ].slice(0, 20)
  saveHistory(history)
}

export function hasEnoughHistory() {
  const { viewedPosts, upvotedPosts, searchedKeywords } = loadHistory()
  return viewedPosts.length >= 3 || upvotedPosts.length >= 1 || searchedKeywords.length >= 1
}

export function scoreAndRankPosts(posts) {
  const { viewedPosts, upvotedPosts, searchedKeywords } = loadHistory()

  const communityWeights = {}
  const flairWeights = {}
  const viewedIds = new Set()
  const recentTitles = []

  viewedPosts.forEach((p, i) => {
    const recency = 1 - (i / viewedPosts.length) * 0.5
    communityWeights[p.community] = (communityWeights[p.community] || 0) + recency
    if (p.flair) flairWeights[p.flair] = (flairWeights[p.flair] || 0) + recency
    viewedIds.add(p.id)
    if (i < 3) recentTitles.push(p.title)
  })

  upvotedPosts.forEach((p) => {
    communityWeights[p.community] = (communityWeights[p.community] || 0) + 2
    if (p.flair) flairWeights[p.flair] = (flairWeights[p.flair] || 0) + 2
  })

  const scored = posts.map((post) => {
    let score = 0
    const reasons = []

    if (communityWeights[post.community]) {
      score += communityWeights[post.community] * 3
      reasons.push(`your interest in r/${post.community}`)
    }

    for (const { keyword } of searchedKeywords) {
      if (post.title.toLowerCase().includes(keyword)) {
        score += 5
        reasons.push(`your search for "${keyword}"`)
        break
      }
    }

    if (post.flair && flairWeights[post.flair]) {
      score += flairWeights[post.flair] * 2
    }

    if (
      viewedPosts.length > 0 &&
      recentTitles.length > 0 &&
      post.community === viewedPosts[0].community &&
      reasons.length > 0
    ) {
      const truncated = recentTitles[0].length > 40 ? recentTitles[0].slice(0, 40) + '…' : recentTitles[0]
      reasons[0] = `you viewed "${truncated}"`
    }

    if (viewedIds.has(post.id)) score -= 20

    score += Math.log1p((post.votes || 0) + (post.comments || 0) * 2) * 0.3

    return { ...post, _recScore: score, _recReasons: reasons }
  })

  return scored
    .filter((p) => p._recScore > 0)
    .sort((a, b) => b._recScore - a._recScore)
    .slice(0, 5)
}

export function getExplanation(post) {
  if (!post._recReasons?.length) return ''
  return `Because of ${post._recReasons[0]}`
}
