import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'http'
import { Server, type Socket } from 'socket.io'
import { randomUUID } from 'node:crypto'
import { validate, version } from 'uuid'

import { ChatSocketActions, SocketActions } from './src/socket/actions/index.js'
import type { ChatMessage } from './src/interfaces/chat.js'
import { Room } from './src/interfaces/rooms.js'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
})

const PORT = process.env.PORT || 3001
const rootDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(rootDir, 'dist')

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDir))
  app.get(/.*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
} else {
  app.get('/', (_req, res) => {
    res.send('API is running..')
  })
}

const roomNameById = new Map<string, string>()
const userNameBySocketId = new Map<string, string>()

const CHAT_MAX_LEN = 2000

const chatHistoryByRoom = new Map<string, ChatMessage[]>()

function meetRoomIdsForSocket(socket: Socket): string[] {
  return Array.from(socket.rooms).filter((id) => id !== socket.id && validate(id) && version(id) === 4)
}

function getRooms(): string[] {
  const { rooms } = io.sockets.adapter
  return Array.from(rooms.keys()).filter((roomID) => validate(roomID) && version(roomID) === 4)
}

function shareRooms() {
  const roomIDs = getRooms()
  const nextRoomNameById = new Map<string, string>()

  const rooms: Room[] = roomIDs.map((id) => {
    const name = roomNameById.get(id) || ''
    nextRoomNameById.set(id, name)
    return { id, name }
  })

  roomNameById.clear()
  for (const [id, name] of nextRoomNameById.entries()) {
    roomNameById.set(id, name)
  }

  io.emit(SocketActions.SHARE_ROOMS, { rooms })
}

io.on('connection', (socket) => {
  shareRooms()
  console.log('socket connected')

  socket.on(SocketActions.JOIN, (config: { roomID: string; name: string; userName: string }) => {
    const { roomID, name, userName } = config
    const { rooms } = socket

    if (Array.from(rooms).includes(roomID)) {
      console.warn(`Room ${roomID} is already in room`)
      return
    }

    roomNameById.set(roomID, name)
    userNameBySocketId.set(socket.id, userName)

    const clientsIDs = Array.from(io.sockets.adapter.rooms.get(roomID) || [])

    clientsIDs.forEach((clientID) => {
      io.to(clientID).emit(SocketActions.ADD_PEER, {
        peerID: socket.id,
        createOffer: false,
        userName,
      })

      socket.emit(SocketActions.ADD_PEER, {
        peerID: clientID,
        createOffer: true,
        userName: userNameBySocketId.get(clientID)!,
      })
    })

    socket.join(roomID)
    const history = chatHistoryByRoom.get(roomID)
    socket.emit(ChatSocketActions.HISTORY, { messages: history ? [...history] : [] })
    shareRooms()
  })

  socket.on('disconnect', leaveRoom)
  socket.on(SocketActions.LEAVE, leaveRoom)

  function leaveRoom() {
    const { rooms } = socket

    Array.from(rooms)
      .filter((roomId) => roomId !== socket.id)
      .forEach((roomId) => {
        const clientsIDs = Array.from(io.sockets.adapter.rooms.get(roomId) || [])

        clientsIDs.forEach((clientID) => {
          io.to(clientID).emit(SocketActions.REMOVE_PEER, {
            peerID: socket.id,
          })

          socket.emit(SocketActions.REMOVE_PEER, {
            peerID: clientID,
          })
        })

        socket.leave(roomId)
        const stillThere = io.sockets.adapter.rooms.get(roomId)
        if (!stillThere || stillThere.size === 0) {
          chatHistoryByRoom.delete(roomId)
        }
      })

    userNameBySocketId.delete(socket.id)
    shareRooms()
  }

  socket.on(SocketActions.RELAY_SDP, ({ peerID, sessionDescription }) => {
    io.to(peerID).emit(SocketActions.SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription,
    })
  })

  socket.on(SocketActions.RELAY_ICE, ({ peerID, iceCandidate }) => {
    io.to(peerID).emit(SocketActions.ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    })
  })

  socket.on(ChatSocketActions.SEND, ({ text }: { text?: string }) => {
    const userName = userNameBySocketId.get(socket.id)
    if (!userName || typeof text !== 'string') {
      return
    }

    const trimmed = text.trim().slice(0, CHAT_MAX_LEN)
    if (!trimmed) {
      return
    }

    const roomIds = meetRoomIdsForSocket(socket)
    if (!roomIds.length) {
      return
    }

    const payload: ChatMessage = {
      id: randomUUID(),
      userName,
      text: trimmed,
      ts: Date.now(),
    }

    for (const roomId of roomIds) {
      const list = chatHistoryByRoom.get(roomId)
      if (list) {
        list.push(payload)
      } else {
        chatHistoryByRoom.set(roomId, [payload])
      }
      io.to(roomId).emit(ChatSocketActions.MESSAGE, payload)
    }
  })
})

server.listen(PORT, () => {
  console.log(`server listening on ${PORT}`)
})

