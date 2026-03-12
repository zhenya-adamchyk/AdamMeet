<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';

import { useWebRTCStore, LOCAL_VIDEO } from '../stores/webrtc';

function layout(clientsNumber = 1) {
  if (!clientsNumber) return [];
  const gap = 12;

  const cols = clientsNumber === 1 ? 1 : 2;
  const rows = Math.ceil(clientsNumber / cols) || 1;

  const height = `calc(${100 / rows}% - ${gap}px)`;
  const fullWidth = `calc(100% - ${gap}px)`;
  const colWidth = `calc(${100 / cols}% - ${gap}px)`;

  return Array.from({ length: clientsNumber }, (_, i) => {
    const isLast = i === clientsNumber - 1;
    const lastAlone = cols === 2 && clientsNumber % 2 === 1 && isLast;
    return { width: lastAlone ? fullWidth : colWidth, height };
  });
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
const provideMediaRef = webrtc.provideMediaRef;
const videoLayout = computed(() => layout(webrtc.clients.length));
</script>

<template>
  <div class="roomPage">
    <div class="roomGrid">
      <div
          v-for="(clientID, index) in clients"
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
  align-items: center;
}

.roomGrid {
  height: 80vh;
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



