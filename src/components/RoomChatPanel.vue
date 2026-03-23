<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useChatStore } from '@/stores/chat'

const open = defineModel<boolean>({ default: false })

const chat = useChatStore()
const { messages } = storeToRefs(chat)

const message = ref('')
const listEl = ref<HTMLElement | null>(null)

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    const el = listEl.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  },
)

function close() {
  open.value = false
}

function submit() {
  chat.send(message.value)
  message.value = ''
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function linkifyChatText(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  if (!/https?:\/\//i.test(escaped)) {
    return escaped
  }
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/gi,
    '<a class="chatLink" href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  )
}
</script>

<template>
  <div v-if="open" class="chatBackdrop" aria-hidden="true" @click="close" />

  <aside
      v-show="open"
      class="chatPanel"
      role="dialog"
      aria-label="Room chat"
  >
    <div class="chatHeader">
      <span class="chatTitle">Chat</span>
      <button class="chatClose" type="button" aria-label="Close chat" @click="close">×</button>
    </div>
    <div ref="listEl" class="chatMessages">
      <p v-if="!messages.length" class="chatEmpty">No messages yet</p>
      <div v-for="m in messages" :key="m.id" class="chatRow">
        <div class="chatMeta">
          <span class="chatAuthor">{{ m.userName }}</span>
          <span class="chatTime">{{ formatTime(m.ts) }}</span>
        </div>
        <p class="chatText" v-html="linkifyChatText(m.text)" />
      </div>
    </div>
    <form class="chatForm" @submit.prevent="submit">
      <input
          v-model="message"
          class="chatInput"
          type="text"
          maxlength="2000"
          placeholder="Message…"
          autocomplete="off"
          aria-label="Message"
      />
      <button class="btn pill chatSend" type="submit">Send</button>
    </form>
  </aside>
</template>

<style scoped>
.chatBackdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.45);
}

.chatPanel {
  position: fixed;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: rgba(17, 24, 39, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

@media (min-width: 768px) {
  .chatPanel {
    right: 20px;
    bottom: 100px;
    top: 20px;
    width: min(380px, 92vw);
    border-radius: 18px;
  }
}

@media (max-width: 767.98px) {
  .chatPanel {
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 55vh;
    border-radius: 18px 18px 0 0;
  }
}

.chatHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chatTitle {
  font-weight: 700;
  font-size: 16px;
  color: #fff;
}

.chatClose {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.chatClose:hover {
  background: rgba(255, 255, 255, 0.14);
}

.chatMessages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chatEmpty {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
}

.chatRow {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chatMeta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}

.chatAuthor {
  font-weight: 600;
  color: #e5e7eb;
}

.chatTime {
  color: rgba(255, 255, 255, 0.4);
}

.chatText {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: #f9fafb;
  white-space: pre-wrap;
  word-break: break-word;
}

.chatText :deep(.chatLink) {
  color: #93c5fd;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.chatText :deep(.chatLink:hover) {
  color: #bfdbfe;
}

.chatForm {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  align-items: center;
}

.chatInput {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 14px;
}

.chatInput::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.chatSend {
  flex-shrink: 0;
}
</style>
