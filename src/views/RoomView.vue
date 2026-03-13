<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';

import { useWebRTCStore, LOCAL_VIDEO } from '../stores/webrtc';
import { useDeviceStore } from '../stores/device'

function layout(clientsNumber = 1) {
  if (!clientsNumber) return [];
  const gap = 12;

  const cols = clientsNumber === 1 ? 1 : Math.ceil(Math.sqrt(clientsNumber));
  const rows = Math.ceil(clientsNumber / cols) || 1;

  const height = `calc((100% - ${(rows - 1) * gap}px) / ${rows})`;
  const width = `calc((100% - ${(cols - 1) * gap}px) / ${cols})`;

  return Array.from({ length: clientsNumber }, () => ({ width, height }));
}

const route = useRoute();
const router = useRouter();
const roomID = computed(() => route.params.id);
const roomName = computed(() => route.query?.name);
const webrtc = useWebRTCStore();
const device = useDeviceStore()
const { isAudioEnabled, isVideoEnabled, started } = storeToRefs(webrtc);
const { isMobile } = storeToRefs(device)

watch(
    [roomID, roomName],
    ([id, name]) => {
      webrtc.join(id, { name });
    },
    { immediate: true }
);

onBeforeUnmount(() => {
  webrtc.leave();
});

function exitMeet() {
  webrtc.leave();
  router.push('/');
}

const clients = computed(() => webrtc.clients);
const remoteClients = computed(() => webrtc.clients.filter((id) => id !== LOCAL_VIDEO));
const showLocalPreview = computed(() => started.value && remoteClients.value.length > 0);
const gridClients = computed(() => (showLocalPreview.value ? remoteClients.value : clients.value));
const provideMediaRef = webrtc.provideMediaRef;
const videoLayout = computed(() => layout(gridClients.value.length));
</script>

<template>
  <div class="roomPage">
    <div
        v-if="isMobile"
        class="mobileGrid"
        :class="{ single: (remoteClients.length ? remoteClients.length : clients.length) <= 1 }"
    >
      <div
          v-for="clientID in (remoteClients.length ? remoteClients : clients)"
          :key="clientID"
          class="mobileTile"
      >
        <video
            class="video"
            autoplay
            playsinline
            :muted="clientID === LOCAL_VIDEO"
            :ref="(el) => provideMediaRef(clientID, el)"
        />
      </div>
    </div>

    <div v-else class="roomGrid">
      <div
          v-for="(clientID, index) in gridClients"
          :key="clientID"
          :id="clientID"
          :style="videoLayout[index]"
      >
        <video
            class="video"
            autoplay
            playsinline
            :muted="clientID === LOCAL_VIDEO"
            :ref="(el) => provideMediaRef(clientID, el)"
        />
      </div>
    </div>

    <video
        v-if="showLocalPreview && !isMobile"
        class="video localPreview"
        autoplay
        playsinline
        muted
        :ref="(el) => provideMediaRef(LOCAL_VIDEO, el)"
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
        {{ isAudioEnabled ? 'Mute' : 'Unmute' }}
      </button>

      <button
          class="btn pill"
          :class="{ off: !isVideoEnabled }"
          type="button"
          :disabled="!started"
          :aria-pressed="!isVideoEnabled"
          @click="webrtc.toggleVideo"
      >
        {{ isVideoEnabled ? 'Video off' : 'Video on' }}
      </button>

      <button class="btn pill danger" type="button" @click="exitMeet">Leave</button>
    </div>
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
  border-radius: 18px;
  overflow: hidden;
  width: 100%;
  height: calc(100vh - 24px - 88px - env(safe-area-inset-bottom));
  scroll-snap-align: start;
}

.mobileTile .video {
  border-radius: 0;
}

.video {
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
  gap: 12px;
  padding: 10px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
}
</style>



