<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';

import { useWebRTCStore, LOCAL_VIDEO } from '../stores/webrtc';

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
const webrtc = useWebRTCStore();
const { isAudioEnabled, isVideoEnabled, started } = storeToRefs(webrtc);

watch(
    roomID,
    (id) => {
      webrtc.join(id);
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
    <div class="roomGrid">
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
        v-if="showLocalPreview"
        class="video localPreview"
        autoplay
        playsinline
        muted
        :ref="(el) => provideMediaRef(LOCAL_VIDEO, el)"
    />

    <div class="controls" role="group" aria-label="Call controls">
      <button
          class="controlBtn"
          :class="{ off: !isAudioEnabled }"
          type="button"
          :disabled="!started"
          :aria-pressed="!isAudioEnabled"
          @click="webrtc.toggleAudio"
      >
        {{ isAudioEnabled ? 'Mute' : 'Unmute' }}
      </button>

      <button
          class="controlBtn"
          :class="{ off: !isVideoEnabled }"
          type="button"
          :disabled="!started"
          :aria-pressed="!isVideoEnabled"
          @click="webrtc.toggleVideo"
      >
        {{ isVideoEnabled ? 'Video off' : 'Video on' }}
      </button>

      <button class="controlBtn leave" type="button" @click="exitMeet">Leave</button>
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

.controlBtn {
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.controlBtn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.controlBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.controlBtn.off {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.35);
}

.controlBtn.leave {
  background: #e11d48;
  border-color: rgba(255, 255, 255, 0.2);
}

.controlBtn.leave:hover {
  filter: brightness(1.05);
}
</style>



