// import path from 'path';
import express from "express";
import {createServer} from 'http';
import {Server} from "socket.io";

import {validate, version} from "uuid";
import {SocketActions} from "./src/socket/actions.js";

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

function getRooms() {
    const { rooms } = io.sockets.adapter;
    return Array.from(rooms.keys()).filter(roomID => validate(roomID) && version(roomID) === 4);
}

function shareRooms() {
    io.emit(SocketActions.SHARE_ROOMS, { rooms: getRooms() });
}

io.on('connection', (socket) => {
    shareRooms();
    console.log('socket connected');

    socket.on(SocketActions.JOIN, config => {
        const roomId = config.room;
        const {rooms} = socket;

        if(Array.from(rooms).includes(roomId)) {
            return console.warn(`Room ${roomId} is already in room`);
        }

        const clientsIDs = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

        clientsIDs.forEach((clientID) => {
            io.to(clientID).emit(SocketActions.ADD_PEER, {
                peerID: socket.id,
                createOffer: false,
            })

            socket.emit(SocketActions.ADD_PEER, {
                peerID: clientID,
                createOffer: true,
            })
        })

        socket.join(roomId);
        shareRooms();

    })

    socket.on('disconnect', leaveRoom);
    socket.on(SocketActions.LEAVE, leaveRoom);

    function leaveRoom() {
        const {rooms} = socket;

        Array.from(rooms).forEach(roomId => {
            const clientsIDs = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

            clientsIDs.forEach((clientID) => {
                io.to(clientID).emit(SocketActions.REMOVE_PEER, {
                    peerID: socket.id,
                })

                socket.emit(SocketActions.REMOVE_PEER, {
                    peerID: clientID,
                })
            })

            socket.leave(roomId);
        })

        shareRooms();
    }

    socket.on(SocketActions.RELAY_SDP, ({peerID, sessionDescription}) => {
        io.to(peerID).emit(SocketActions.SESSION_DESCRIPTION, {
            peerID: socket.id,
            sessionDescription,
        });
    });

    socket.on(SocketActions.RELAY_ICE, ({peerID, iceCandidate}) => {
        io.to(peerID).emit(SocketActions.ICE_CANDIDATE, {
            peerID: socket.id,
            iceCandidate,
        });
    });
});

server.listen(PORT, () => {
    console.log(`server listening on ${PORT}`);
});
