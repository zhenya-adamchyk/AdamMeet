import {defineStore} from "pinia";
import socket from "@/socket";
import {SocketActions} from "@/socket/actions.ts";
import freeice from 'freeice';
import {type Ref, ref} from "vue";

interface socketAddPeer {
  peerID: string;
  createOffer: boolean;
}

interface socketRemoteDescription {
  peerID: string;
  sessionDescription: RTCSessionDescriptionInit;
}

interface socketIceCandidate {
  peerID: string;
  iceCandidate: RTCLocalIceCandidateInit;
}

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export const useWebRTCStore = defineStore('webrtc', () => {
  const clients: Ref<string[]> = ref([]);
  const roomID: Ref<string, string> = ref('');
  const started: Ref<boolean> = ref(false);

  let peerConnections: { [key: string]: RTCPeerConnection } = {};
  let peerMediaElements: { [key: string]: HTMLMediaElement | null } = { [LOCAL_VIDEO]: null };
  let localMediaStream: MediaStream | null = null;
  let running = false;

  const addClient = (id: string) => {
    if (!clients.value.includes(id)) {
      clients.value.push(id);
    }
  };

  const attachStream = (id: string, stream:  MediaStream) => {
    const el = peerMediaElements[id];
    if (el) {
      el.srcObject = stream;
      return;
    }

    // In case element isn't mounted yet (many clients)
    const interval = setInterval(() => {
      if (!running) return clearInterval(interval);
      const node = peerMediaElements[id];
      if (node) {
        node.srcObject = stream;
        clearInterval(interval);
      }
    }, 500);
  };

  const attachLocalStreamIfPossible = () => {
    const el = peerMediaElements[LOCAL_VIDEO];
    if (!el || !localMediaStream) return;
    el.volume = 0;
    if (el.srcObject !== localMediaStream) el.srcObject = localMediaStream;
  };

  async function handleNewPeer({ peerID, createOffer }: socketAddPeer) {
    if (peerID in peerConnections) {
      console.warn(`Already connected to peer ${peerID}`);
      return;
    }

    peerConnections[peerID] = new RTCPeerConnection({
      iceServers: freeice(),
    });

    peerConnections[peerID].onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(SocketActions.RELAY_ICE, {
          peerID,
          iceCandidate: event.candidate,
        });
      }
    };

    let tracksNumber = 0;
    peerConnections[peerID].ontrack = ({ streams: [remoteStream] }) => {
      tracksNumber += 1;

      if (tracksNumber === 2) {
        // video & audio tracks received
        tracksNumber = 0;
        addClient(peerID);
        attachStream(peerID, remoteStream!);
      }
    };

    localMediaStream?.getTracks().forEach((track) => {
      peerConnections[peerID]!.addTrack(track, localMediaStream!);
    });

    if (createOffer) {
      const offer = await peerConnections[peerID].createOffer();
      await peerConnections[peerID].setLocalDescription(offer);

      socket.emit(SocketActions.RELAY_SDP, {
        peerID,
        sessionDescription: offer,
      });
    }
  }

  async function setRemoteMedia({ peerID, sessionDescription: remoteDescription }: socketRemoteDescription) {
    await peerConnections[peerID]?.setRemoteDescription(new RTCSessionDescription(remoteDescription));

    if (remoteDescription.type === 'offer') {
      const answer = await peerConnections[peerID]!.createAnswer();
      await peerConnections[peerID]!.setLocalDescription(answer);

      socket.emit(SocketActions.RELAY_SDP, {
        peerID,
        sessionDescription: answer,
      });
    }
  }

  function handleIceCandidate({ peerID, iceCandidate }: socketIceCandidate) {
    peerConnections[peerID]?.addIceCandidate(new RTCIceCandidate(iceCandidate));
  }

  function handleRemovePeer({ peerID }: { peerID: string }) {
    if (peerConnections[peerID]) {
      peerConnections[peerID].close();
    }

    delete peerConnections[peerID];
    delete peerMediaElements[peerID];

    clients.value = clients.value.filter((c) => c !== peerID);
  }

  const bindSocketHandlers = () => {
    socket.on(SocketActions.ADD_PEER, handleNewPeer);
    socket.on(SocketActions.SESSION_DESCRIPTION, setRemoteMedia);
    socket.on(SocketActions.ICE_CANDIDATE, handleIceCandidate);
    socket.on(SocketActions.REMOVE_PEER, handleRemovePeer);
  };

  const unbindSocketHandlers = () => {
    socket.off(SocketActions.ADD_PEER, handleNewPeer);
    socket.off(SocketActions.SESSION_DESCRIPTION, setRemoteMedia);
    socket.off(SocketActions.ICE_CANDIDATE, handleIceCandidate);
    socket.off(SocketActions.REMOVE_PEER, handleRemovePeer);
  };

  async function startCapture() {
    localMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 600, height: 600 },
    });

    addClient(LOCAL_VIDEO);
    attachLocalStreamIfPossible();
  }

  async function join(nextRoomID: string) {
    if (!nextRoomID) return;

    const next = String(nextRoomID);
    if (started.value && roomID.value === next) return;
    if (started.value) leave();

    roomID.value = next;
    started.value = true;
    running = true;

    bindSocketHandlers();

    try {
      await startCapture();
      socket.emit(SocketActions.JOIN, { room: roomID.value });
    } catch (e) {
      console.error('Error getting userMedia:', e);
    }
  }

  function leave() {
    if (!started.value) return;

    running = false;
    started.value = false;

    unbindSocketHandlers();

    try {
      localMediaStream?.getTracks().forEach((track) => track.stop());
    } catch {
      // ignore
    }

    socket.emit(SocketActions.LEAVE);

    clients.value = [];
    roomID.value = '';

    Object.values(peerConnections).forEach((pc) => {
      try {
        pc?.close();
      } catch {
        // ignore
      }
    });

    peerConnections = {};
    peerMediaElements = { [LOCAL_VIDEO]: null };
    localMediaStream = null;
  }

  function provideMediaRef(id: string, node: HTMLMediaElement) {
    if (!node) return;

    peerMediaElements[id] = node;

    if (id === LOCAL_VIDEO) {
      attachLocalStreamIfPossible();
    }
  }

  return {
    clients,
    roomID,
    started,
    join,
    leave,
    provideMediaRef,
  };
});