export const enum SocketActions {
    JOIN = 'join',
    LEAVE = 'leave',
    SHARE_ROOMS = 'shareRooms',
    ADD_PEER = 'addPeer',
    REMOVE_PEER = 'removePeer',
    RELAY_SDP = 'relaySdp',
    RELAY_ICE = 'relayICE',
    ICE_CANDIDATE = 'iceCandidate',
    SESSION_DESCRIPTION = 'sessionDescription',
}
