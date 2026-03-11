import { io } from 'socket.io-client'

const options = {
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 2000,
  transports: ['websocket'],
}

// In dev, Vite proxies `/socket.io` to backend.
// In production, frontend is served by the same server.
const socket = io(undefined, options)

export default socket

