<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { v4 } from 'uuid';

import socket from '../socket';
import {SocketActions} from "@/socket/actions.js";

const router = useRouter();
const rooms = ref([]);
const newRoomName = ref('');

function joinRoom(room) {
  router.push({ path: `/room/${room.id}`, query: { name: room.name } });
}

function createRoom() {
  const id = v4();
  const name = newRoomName.value.trim();
  if (!name) return;
  router.push({ path: `/room/${id}`, query: { name } });
  newRoomName.value = '';
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
        <div class="create">
          <input
            v-model="newRoomName"
            class="input"
            type="text"
            placeholder="Room name"
            required
            maxlength="20"
            @keydown.enter.prevent="createRoom"
          />
          <button class="btn primary" type="button" :disabled="!newRoomName.trim()" @click="createRoom">
            Create New Room
          </button>
        </div>
      </header>

      <div v-if="rooms.length === 0" class="empty">
        <div class="emptyTitle">No rooms yet</div>
      </div>

      <ul v-else class="rooms" aria-label="Rooms list">
        <li v-for="room in rooms" :key="room.id" class="room">
          <div class="roomMeta">
            <span class="roomLabel">Room name</span>
            <span class="roomTitle">{{ room.name }}</span>
          </div>
          <button class="btn" type="button" @click="joinRoom(room)">Join</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.create {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.create .input {
  min-width: 240px;
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

.roomTitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.92);
  word-break: break-word;
}

@media (max-width: 560px) {
  .create {
    justify-content: stretch;
  }

  .create .input {
    width: 100%;
    min-width: 0;
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


