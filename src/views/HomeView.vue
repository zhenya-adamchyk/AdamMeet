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
    <h1>Available Rooms</h1>

    <ul class="rooms">
      <li v-for="roomID in rooms" :key="roomID" class="room">
        <span class="roomId">{{ roomID }}</span>
        <button class="btn" type="button" @click="joinRoom(roomID)">JOIN ROOM</button>
      </li>
    </ul>

    <button class="btn primary" type="button" @click="createRoom">Create New Room</button>
  </div>
</template>



