import { ref } from 'vue'

const STORAGE_KEY = 'reddit_local_messages'

function initialMessages() {
  const now = Date.now()

  return {
    technology: [
      { id: 'technology-1', username: 'alice_dev', text: 'Has anyone tried the new M4 MacBook Pro?', timestamp: now - 600000, status: 'seen', reactions: { '🔥': ['alice_dev', 'charlie'], '👍': ['bao_dev'] } },
      { id: 'technology-2', username: 'bao_dev', text: 'Yes! The performance leap is impressive. Builds finish much faster.', timestamp: now - 540000, status: 'seen', reactions: { '❤️': ['alice_dev'] } },
      { id: 'technology-3', username: 'charlie_99', text: 'Still on Intel, saving up for an upgrade.', timestamp: now - 480000, status: 'seen', reactions: {} },
      { id: 'technology-4', username: 'alice_dev', text: 'The battery life alone has made a difference for me.', timestamp: now - 420000, status: 'seen', reactions: { '👍': ['charlie_99', 'bao_dev'] } },
    ],
    programming: [
      { id: 'programming-1', username: 'dev_life', text: 'Python or TypeScript for a new backend?', timestamp: now - 300000, status: 'seen', reactions: { '🤔': ['bob_coder', 'bao_dev'] } },
      { id: 'programming-2', username: 'bao_dev', text: 'TypeScript for applications; types prevent a lot of avoidable debugging.', timestamp: now - 240000, status: 'seen', reactions: { '👍': ['dev_life'] } },
      { id: 'programming-3', username: 'bob_coder', text: 'Python remains useful for data and ML pipelines.', timestamp: now - 180000, status: 'seen', reactions: { '💯': ['bao_dev'] } },
    ],
    'dm:bao_dev:alice_dev': [
      { id: 'alice-1', username: 'alice_dev', text: 'Hey! Did you see the new quantum computing article?', timestamp: now - 600000, status: 'seen', reactions: {} },
      { id: 'alice-2', username: 'bao_dev', text: 'Yes, the speed improvements are impressive.', timestamp: now - 540000, status: 'seen', reactions: { '🔥': ['alice_dev'] } },
      { id: 'alice-3', username: 'alice_dev', text: 'It makes you wonder what applications come next.', timestamp: now - 480000, status: 'seen', reactions: {} },
    ],
    'dm:bao_dev:bob_coder': [
      { id: 'bob-1', username: 'bao_dev', text: 'Do you know how to fix the pagination bug?', timestamp: now - 7200000, status: 'seen', reactions: {} },
      { id: 'bob-2', username: 'bob_coder', text: 'Reset the page when the search query changes.', timestamp: now - 7000000, status: 'seen', reactions: { '👍': ['bao_dev'] } },
      { id: 'bob-3', username: 'bao_dev', text: 'Perfect, that worked. Thanks.', timestamp: now - 6900000, status: 'seen', reactions: {} },
    ],
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return saved && typeof saved === 'object' ? saved : initialMessages()
  } catch {
    return initialMessages()
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function useLocalMessages() {
  const onlineUsers = ref(['alice_dev', 'charlie_99', 'bob_coder', 'dev_life', 'bao_dev'])

  function loadMessages(roomId) {
    const store = loadStore()
    if (!store[roomId]) {
      store[roomId] = []
      saveStore(store)
    }
    return clone(store[roomId])
  }

  function saveMessages(roomId, messages) {
    const store = loadStore()
    store[roomId] = clone(messages)
    saveStore(store)
  }

  function addMessage(roomId, text, username) {
    const message = {
      id: `${roomId}-${Date.now()}`,
      username,
      text,
      timestamp: Date.now(),
      status: 'sent',
      reactions: {},
      roomId,
    }
    const messages = loadMessages(roomId)
    messages.push(message)
    saveMessages(roomId, messages)
    return message
  }

  return {
    onlineUsers,
    loadMessages,
    saveMessages,
    addMessage,
  }
}
