import {io} from 'socket.io-client';

const options = {
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 2000,
    transports: ['websocket'],
}

const socket = io('http://localhost:3001', options);

export default socket;