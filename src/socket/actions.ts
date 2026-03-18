export const SocketActions = {
  JOIN: 'join',
  LEAVE: 'leave',
  SHARE_ROOMS: 'shareRooms',
  ADD_PEER: 'addPeer',
  REMOVE_PEER: 'removePeer',
  RELAY_SDP: 'relaySdp',
  RELAY_ICE: 'relayICE',
  ICE_CANDIDATE: 'iceCandidate',
  SESSION_DESCRIPTION: 'sessionDescription',
} as const

export type SocketAction = (typeof SocketActions)[keyof typeof SocketActions]

export type RoomSummary = { id: string; name: string }
export type ShareRoomsPayload = { rooms: RoomSummary[] }

