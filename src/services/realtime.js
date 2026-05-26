import { io } from 'socket.io-client'
import { API_ORIGIN } from './api.js'

let socket
const ACK_TIMEOUT_MS = 8000
export const CHAT_REACTIONS = [
  { id: 'like', icon: '👍', label: 'Like' },
  { id: 'love', icon: '❤️', label: 'Love' },
  { id: 'laugh', icon: '😂', label: 'Laugh' },
  { id: 'surprised', icon: '😮', label: 'Surprised' },
  { id: 'sad', icon: '😢', label: 'Sad' },
]

export function getChatSocket() {
  if (!socket) {
    socket = io(API_ORIGIN, {
      autoConnect: false,
      withCredentials: true,
    })
  }
  if (!socket.connected) {
    socket.connect()
  }
  return socket
}

export function closeChatSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function emitSocketEvent(socketClient, event, payload) {
  return new Promise((resolve, reject) => {
    socketClient.timeout(ACK_TIMEOUT_MS).emit(event, payload, (error, response) => {
      if (error) {
        reject(new Error('The live chat service did not respond.'))
        return
      }
      resolve(response)
    })
  })
}

export function reactionIcon(reaction) {
  return CHAT_REACTIONS.find((option) => option.id === reaction)?.icon || '•'
}
