<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useWebRTCStore, LOCAL_VIDEO } from '../stores/webrtc';

// function layout(clientsNumber = 1) {
//   const pairs = Array.from({ length: clientsNumber }).reduce((acc, _, index, arr) => {
//     if (index % 2 === 0) acc.push(arr.slice(index, index + 2));
//     return acc;
//   }, []);
//
//   const rowsNumber = pairs.length || 1;
//   const height = `${100 / rowsNumber}%`;
//   console.log(pairs)
//
//   return pairs
//       .map((row, index, arr) => {
//         if (index === arr.length - 1 && row.length === 1) {
//           return [{ width: '100%', height }];
//         }
//         return row.map(() => ({ width: '50%', height }));
//       })
//       .flat();
// }

const route = useRoute();
const roomID = computed(() => route.params.id);
const webrtc = useWebRTCStore();

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

const clients = computed(() => webrtc.clients);
const provideMediaRef = webrtc.provideMediaRef;
// const videoLayout = computed(() => layout(webrtc.clients.length));
</script>

<template>
  <div class="roomGrid">
    <div
        v-for="(clientID, index) in clients"
        :key="clientID"
        class="tile"
        :id="clientID"
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
</template>



