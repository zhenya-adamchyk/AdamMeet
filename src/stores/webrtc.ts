import { defineStore } from 'pinia'
import { ref } from 'vue'
import freeice from 'freeice'

import socket from '@/socket'
import { SocketActions } from '@/socket/actions'

export const LOCAL_VIDEO = 'LOCAL_VIDEO'

type PeerConnections = Record<string, RTCPeerConnection>
type MediaElements = Record<string, HTMLVideoElement | null>

type AddPeerPayload = { peerID: string; createOffer: boolean }
type RemovePeerPayload = { peerID: string }
type RelaySdpPayload = { peerID: string; sessionDescription: RTCSessionDescriptionInit }
type RelayIcePayload = { peerID: string; iceCandidate: RTCIceCandidateInit }
type JoinConfig = { name?: string }

export const useWebRTCStore = defineStore('webrtc', () => {
  const clients = ref<string[]>([])
  const roomID = ref('')
  const started = ref(false)
  const isAudioEnabled = ref(true)
  const isVideoEnabled = ref(true)

  let peerConnections: PeerConnections = {}
  let peerMediaElements: MediaElements = { [LOCAL_VIDEO]: null }
  let localMediaStream: MediaStream | null = null
  let running = false

  const addClient = (id: string) => {
    if (!clients.value.includes(id)) {
      clients.value.push(id)
    }
  }

  const attachStream = (id: string, stream: MediaStream) => {
    const el = peerMediaElements[id]
    if (el) {
      el.srcObject = stream
      return
    }

    const interval = setInterval(() => {
      if (!running) return clearInterval(interval)
      const node = peerMediaElements[id]
      if (node) {
        node.srcObject = stream
        clearInterval(interval)
      }
    }, 500)
  }

  const attachLocalStreamIfPossible = () => {
    const el = peerMediaElements[LOCAL_VIDEO]
    if (!el || !localMediaStream) return
    el.volume = 0
    if (el.srcObject !== localMediaStream) el.srcObject = localMediaStream
  }

  const applyLocalTrackStates = () => {
    if (!localMediaStream) return
    localMediaStream.getAudioTracks().forEach((t) => (t.enabled = isAudioEnabled.value))
    localMediaStream.getVideoTracks().forEach((t) => (t.enabled = isVideoEnabled.value))
  }

  const toggleAudio = () => {
    isAudioEnabled.value = !isAudioEnabled.value
    applyLocalTrackStates()
  }

  const toggleVideo = () => {
    isVideoEnabled.value = !isVideoEnabled.value
    applyLocalTrackStates()
  }

  async function handleNewPeer({ peerID, createOffer }: AddPeerPayload) {
    if (peerID in peerConnections) {
      console.warn(`Already connected to peer ${peerID}`)
      return
    }

    const pc = new RTCPeerConnection({
      iceServers: freeice(),
    })
    peerConnections[peerID] = pc

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.emit(SocketActions.RELAY_ICE, {
          peerID,
          iceCandidate: event.candidate.toJSON(),
        } satisfies RelayIcePayload)
      }
    }

    let tracksNumber = 0
    pc.ontrack = (event: RTCTrackEvent) => {
      const [remoteStream] = event.streams
      tracksNumber += 1

      // Audio + video arrive as separate tracks.
      if (tracksNumber === 2) {
        tracksNumber = 0
        if (!remoteStream) return
        addClient(peerID)
        attachStream(peerID, remoteStream)
      }
    }

    localMediaStream?.getTracks().forEach((track) => {
      if (!localMediaStream) return
      pc.addTrack(track, localMediaStream)
    })

    if (createOffer) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socket.emit(SocketActions.RELAY_SDP, {
        peerID,
        sessionDescription: offer,
      } satisfies RelaySdpPayload)
    }
  }

  async function setRemoteMedia({
    peerID,
    sessionDescription: remoteDescription,
  }: RelaySdpPayload) {
    const pc = peerConnections[peerID]
    if (!pc) return

    await pc.setRemoteDescription(new RTCSessionDescription(remoteDescription))

    if (remoteDescription.type === 'offer') {
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socket.emit(SocketActions.RELAY_SDP, {
        peerID,
        sessionDescription: answer,
      } satisfies RelaySdpPayload)
    }
  }

  function handleIceCandidate({ peerID, iceCandidate }: RelayIcePayload) {
    peerConnections[peerID]?.addIceCandidate(new RTCIceCandidate(iceCandidate))
  }

  function handleRemovePeer({ peerID }: RemovePeerPayload) {
    peerConnections[peerID]?.close()

    delete peerConnections[peerID]
    delete peerMediaElements[peerID]

    clients.value = clients.value.filter((c) => c !== peerID)
  }

  const bindSocketHandlers = () => {
    socket.on(SocketActions.ADD_PEER, handleNewPeer)
    socket.on(SocketActions.SESSION_DESCRIPTION, setRemoteMedia)
    socket.on(SocketActions.ICE_CANDIDATE, handleIceCandidate)
    socket.on(SocketActions.REMOVE_PEER, handleRemovePeer)
  }

  const unbindSocketHandlers = () => {
    socket.off(SocketActions.ADD_PEER, handleNewPeer)
    socket.off(SocketActions.SESSION_DESCRIPTION, setRemoteMedia)
    socket.off(SocketActions.ICE_CANDIDATE, handleIceCandidate)
    socket.off(SocketActions.REMOVE_PEER, handleRemovePeer)
  }

  async function startCapture() {
    localMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 600, height: 600 },
    })

    applyLocalTrackStates()
    addClient(LOCAL_VIDEO)
    attachLocalStreamIfPossible()
  }

  async function join(nextRoomID: unknown, { name }: JoinConfig = {}) {
    if (!nextRoomID) return

    const next = String(nextRoomID)
    if (started.value && roomID.value === next) return
    if (started.value) leave()

    roomID.value = next
    started.value = true
    running = true

    bindSocketHandlers()

    try {
      await startCapture()
      socket.emit(SocketActions.JOIN, { room: roomID.value, name: name ?? '' })
    } catch (e) {
      console.error('Error getting userMedia:', e)
    }
  }

  function leave() {
    if (!started.value) return

    running = false
    started.value = false

    unbindSocketHandlers()

    try {
      localMediaStream?.getTracks().forEach((track) => track.stop())
    } catch {}

    socket.emit(SocketActions.LEAVE)

    clients.value = []
    roomID.value = ''

    Object.values(peerConnections).forEach((pc) => {
      try {
        pc?.close()
      } catch {}
    })

    peerConnections = {}
    peerMediaElements = { [LOCAL_VIDEO]: null }
    localMediaStream = null
  }

  function provideMediaRef(id: string, node: HTMLVideoElement | null) {
    if (!node) return

    peerMediaElements[id] = node

    if (id === LOCAL_VIDEO) {
      attachLocalStreamIfPossible()
    }
  }

  return {
    clients,
    roomID,
    started,
    isAudioEnabled,
    isVideoEnabled,
    join,
    leave,
    provideMediaRef,
    toggleAudio,
    toggleVideo,
  }
})

