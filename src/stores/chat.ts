import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { ChatMessage } from '@/interfaces/chat'
import socket from '@/socket'
import { ChatSocketActions } from '@/socket/actions'

const MAX_LEN = 2000

export type { ChatMessage }

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])

  function onIncoming(msg: ChatMessage) {
    messages.value.push(msg)
  }

  function onHistory(payload: { messages?: ChatMessage[] }) {
    messages.value = Array.isArray(payload.messages) ? [...payload.messages] : []
  }

  function bind() {
    socket.on(ChatSocketActions.MESSAGE, onIncoming)
    socket.on(ChatSocketActions.HISTORY, onHistory)
  }

  function unbind() {
    socket.off(ChatSocketActions.MESSAGE, onIncoming)
    socket.off(ChatSocketActions.HISTORY, onHistory)
  }

  function clear() {
    messages.value = []
  }

  function start() {
    bind()
  }

  function stop() {
    unbind()
    clear()
  }

  function send(raw: string) {
    const text = raw.trim()
    if (!text) {
      return
    }
    socket.emit(ChatSocketActions.SEND, { text: text.slice(0, MAX_LEN) })
  }

  return { messages, send, start, stop }
})
