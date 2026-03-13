<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { v4 } from 'uuid';

import socket from '../socket';
import {SocketActions} from "@/socket/actions.js";

const router = useRouter();
const rooms = ref([]);

function joinRoom(roomID) {
  router.push(`/room/${roomID}`);
}

function createRoom() {
  router.push(`/room/${v4()}`);
}

function handleShareRooms({ rooms: nextRooms = [] } = {}) {
  rooms.value = nextRooms;
}

onMounted(() => {
  socket.on(SocketActions.SHARE_ROOMS, handleShareRooms);
});

onBeforeUnmount(() => {
  socket.off(SocketActions.SHARE_ROOMS, handleShareRooms);
});
</script>

<template>
  <div class="page">
    <div class="card">
      <header class="header">
        <div>
          <h1 class="title">Available Rooms</h1>
          <p class="subtitle">Join an existing room or create a new one.</p>
        </div>
        <button class="btn primary" type="button" @click="createRoom">Create New Room</button>
      </header>

      <div v-if="rooms.length === 0" class="empty">
        <div class="emptyTitle">No rooms yet</div>
      </div>

      <ul v-else class="rooms" aria-label="Rooms list">
        <li v-for="roomID in rooms" :key="roomID" class="room">
          <div class="roomMeta">
            <span class="roomLabel">Room ID</span>
            <span class="roomId">{{ roomID }}</span>
          </div>
          <button class="btn" type="button" @click="joinRoom(roomID)">Join</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 48px 16px;
  color: rgba(255, 255, 255, 0.92);
  background:
    radial-gradient(1200px 600px at 15% 10%, rgba(124, 58, 237, 0.35), transparent 55%),
    radial-gradient(900px 550px at 85% 25%, rgba(79, 70, 229, 0.28), transparent 60%),
    linear-gradient(180deg, #0b1220, #0f1b34);
  display: grid;
  place-items: center;
}

.card {
  width: min(920px, 100%);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(14px);
  padding: 22px;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 6px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.subtitle {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 14px;
  line-height: 1.35;
}

.rooms {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.room {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 12px 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  transition: transform 140ms ease, background-color 140ms ease, border-color 140ms ease;
}

.room:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.075);
  border-color: rgba(255, 255, 255, 0.14);
}

.roomMeta {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.roomLabel {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.roomId {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
  word-break: break-all;
}

.btn {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 120ms ease, background-color 120ms ease, border-color 120ms ease,
    box-shadow 120ms ease;
  user-select: none;
  white-space: nowrap;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn:active {
  transform: translateY(1px);
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.45);
}

.btn.primary {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  border-color: rgba(255, 255, 255, 0.18);
}

.btn.primary:hover {
  filter: brightness(1.05);
}

.empty {
  margin-top: 18px;
  padding: 28px 18px;
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.03);
  text-align: center;
}

.emptyTitle {
  font-weight: 700;
  letter-spacing: -0.01em;
}

@media (max-width: 560px) {
  .page {
    padding: 28px 12px;
  }

  .card {
    padding: 16px;
    border-radius: 16px;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .btn.primary {
    width: 100%;
  }

  .room {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
  }
}
</style>


