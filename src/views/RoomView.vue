<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'

import RoomChatPanel from '../components/RoomChatPanel.vue'
import { useChatStore } from '../stores/chat'
import { useWebRTCStore, LOCAL_VIDEO } from '../stores/webrtc'
import { useDeviceStore } from '../stores/device'

function layout(clientsNumber = 1): { width: string; height: string }[] {
  if (!clientsNumber) {
    return []
  }
  const gap = 12

  const cols = clientsNumber === 1 ? 1 : Math.ceil(Math.sqrt(clientsNumber))
  const rows = Math.ceil(clientsNumber / cols) || 1

  const height = `calc((100% - ${(rows - 1) * gap}px) / ${rows})`
  const width = `calc((100% - ${(cols - 1) * gap}px) / ${cols})`

  return Array.from({ length: clientsNumber }, () => ({ width, height }))
}

const route = useRoute()
const router = useRouter()

function singleString(value: unknown): string {
  const v = Array.isArray(value) ? value[0] : value
  return String(v)
}

const roomID = singleString(route.params.id)
const roomName = singleString(route.query.name)
const userName = singleString(route.query.userName)

const webrtc = useWebRTCStore()
const chat = useChatStore()
const device = useDeviceStore()

chat.start()

const { clients, isAudioEnabled, isVideoEnabled, started } = storeToRefs(webrtc)
const { isMobile } = storeToRefs(device)

const chatOpen = ref(false)

webrtc.join(roomID, roomName, userName)

function toggleChat() {
  chatOpen.value = !chatOpen.value
}

onBeforeUnmount(() => {
  chat.stop()
  webrtc.leave()
})

function exitMeet() {
  webrtc.leave()
  router.push('/')
}

const remoteClients = computed(() => clients.value.filter((c) => c.id !== LOCAL_VIDEO))
const showLocalPreview = computed(() => started.value && remoteClients.value.length > 0)
const gridClients = computed(() => (showLocalPreview.value ? remoteClients.value : clients.value))
const provideMediaRef = webrtc.provideMediaRef
const videoLayout = computed(() => layout(gridClients.value.length))
</script>

<template>
  <div class="roomPage">
    <div
        v-if="isMobile"
        class="mobileGrid"
        :class="{ single: (remoteClients.length ? remoteClients.length : clients.length) <= 1 }"
    >
      <div
          v-for="client in (remoteClients.length ? remoteClients : clients)"
          :key="client.id"
          class="mobileTile"
      >
        <div class="nameTag">{{ client.userName }}</div>
        <video
            class="video"
            autoplay
            playsinline
            :muted="client.id === LOCAL_VIDEO"
            :ref="(el) => provideMediaRef(client.id, el as HTMLVideoElement | null)"
        />
      </div>
    </div>

    <div v-else class="roomGrid">
      <div
          v-for="(client, index) in gridClients"
          :key="client.id"
          :id="client.id"
          class="tile"
          :style="videoLayout[index]"
      >
        <div class="nameTag">{{ client.userName }}</div>
        <video
            class="video"
            autoplay
            playsinline
            :muted="client.id === LOCAL_VIDEO"
            :ref="(el) => provideMediaRef(client.id, el as HTMLVideoElement | null)"
        />
      </div>
    </div>

    <video
        v-if="showLocalPreview && !isMobile"
        class="video localPreview"
        autoplay
        playsinline
        muted
        :ref="(el) => provideMediaRef(LOCAL_VIDEO, el as HTMLVideoElement | null)"
    />

    <div class="controls" role="group" aria-label="Call controls">
      <button
          class="btn pill"
          :class="{ off: !isAudioEnabled }"
          type="button"
          :disabled="!started"
          :aria-pressed="!isAudioEnabled"
          @click="webrtc.toggleAudio"
      >
        Sound
      </button>

      <button
          class="btn pill"
          :class="{ off: !isVideoEnabled }"
          type="button"
          :disabled="!started"
          :aria-pressed="!isVideoEnabled"
          @click="webrtc.toggleVideo"
      >
        Video
      </button>

      <button
          class="btn pill"
          type="button"
          :aria-pressed="chatOpen"
          @click="toggleChat"
      >
        Chat
      </button>

      <button class="btn pill danger" type="button" @click="exitMeet">Leave</button>
    </div>

    <RoomChatPanel v-model="chatOpen" />
  </div>
</template>

<style scoped>
.roomPage {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
}

.roomGrid {
  height: 84vh;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  justify-content: center;
  align-content: center;
}

.tile {
  display: grid;
  transition: width 220ms ease, height 220ms ease;
}

.mobileGrid {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 12px;
  padding: 12px;
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
  overflow-y: auto;
  align-items: stretch;
  scroll-snap-type: y mandatory;
}

.mobileGrid.single {
  justify-content: center;
}

.mobileTile {
  display: grid;
  border-radius: 18px;
  overflow: hidden;
  width: 100%;
  height: calc(100vh - 24px - 88px - env(safe-area-inset-bottom));
  scroll-snap-align: start;
}

.nameTag {
  grid-area: 1 / 1;
  place-self: end start;
  z-index: 2;
  padding: 10px 14px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #fff;
  max-width: calc(100% - 24px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobileTile .video {
  border-radius: 0;
}

.video {
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  border-radius: 30px;
  background: #000;
  object-fit: cover;
}

.localPreview {
  position: absolute;
  right: 50px;
  bottom: 50px;
  width: 10vw;
  height: 10vw;
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);
}

.controls {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  padding: 10px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
}
</style>



