# Xiangqi Online — Socket.IO Event Specification

## 1. Overview

Communication between client and backend server utilizes Socket.IO with JSON payloads. Every client authenticates room actions using a unique `playerToken` provided upon joining or creating a room.

## 2. Client to Server Events

| Event Name | Payload | Authorization & Description |
|---|---|---|
| `room:create` | `{ playerName: string, timeControl: 'blitz' \| 'rapid' \| 'standard', allowUndo: boolean }` | Any client. Creates a new room and assigns player as host (Red). |
| `room:join` | `{ roomIdOrCode: string, playerName: string, playerToken?: string }` | Any client. Joins room as second player (Black) or reconnects using playerToken. |
| `room:leave` | `{ roomId: string, playerToken: string }` | Room member. Leaves room / concedes match if active. |
| `game:ready` | `{ roomId: string, playerToken: string }` | Room member. Signals ready to start. Match starts when both players are ready. |
| `game:move` | `{ roomId: string, playerToken: string, from: {x,y}, to: {x,y}, moveNumber: number }` | Active turn player. Submits a piece move. |
| `game:resign` | `{ roomId: string, playerToken: string }` | Active player. Resigns the game. |
| `game:draw-offer` | `{ roomId: string, playerToken: string }` | Active player. Sends a draw proposal to opponent. |
| `game:draw-response` | `{ roomId: string, playerToken: string, accept: boolean }` | Opponent. Accepts or rejects the draw offer. |
| `game:undo-request` | `{ roomId: string, playerToken: string }` | Active player. Requests to take back the last move (if room allows undo). |
| `game:undo-response` | `{ roomId: string, playerToken: string, accept: boolean }` | Opponent. Approves or denies undo request. |
| `game:reconnect` | `{ roomId: string, playerToken: string }` | Reconnecting client. Syncs latest room & game state. |

## 3. Server to Client Events

| Event Name | Payload | Broadcast Scope | Description |
|---|---|---|---|
| `room:created` | `{ roomId, roomCode, playerToken, color, roomState }` | Creator socket | Acknowledges room creation. |
| `room:joined` | `{ roomId, roomCode, playerToken, color, roomState }` | Joining socket | Acknowledges joining room. |
| `room:updated` | `{ roomState }` | Room sockets | Emitted when player joins, readies up, or disconnects. |
| `game:started` | `{ roomState, gameState }` | Room sockets | Match officially starts; timer begins ticking. |
| `game:move-accepted` | `{ move: {from, to}, capturedPiece, nextTurn, moveNumber, gameState, clock }` | Room sockets | Move was legal and applied to authoritative state. |
| `game:move-rejected` | `{ reason: string, code: string }` | Moving socket | Move was illegal or not in turn. |
| `game:check` | `{ checkedColor: 'RED' \| 'BLACK' }` | Room sockets | Emitted when a General is in check. |
| `game:finished` | `{ winner: 'RED' \| 'BLACK' \| null, reason: string, gameState }` | Room sockets | Emitted on checkmate, timeout, resign, stalemate, or draw. |
| `game:draw-offered` | `{ fromColor: 'RED' \| 'BLACK' }` | Opponent socket | Informs player of opponent's draw offer. |
| `game:draw-declined`| `{ fromColor: 'RED' \| 'BLACK' }` | Proposing socket| Draw offer was declined. |
| `game:undo-offered` | `{ fromColor: 'RED' \| 'BLACK' }` | Opponent socket | Informs player of opponent's undo request. |
| `game:undo-resolved`| `{ accepted: boolean, gameState, clock }` | Room sockets | Undo result and restored position. |
| `game:clock` | `{ redTimeMs: number, blackTimeMs: number, currentTurn: 'RED' \| 'BLACK' }` | Room sockets | Periodic synchronization of authoritative clocks. |
| `player:disconnected`| `{ color: 'RED' \| 'BLACK', gracePeriodMs: number }` | Room sockets | Notifies remaining player of temporary disconnection. |
| `player:reconnected` | `{ color: 'RED' \| 'BLACK' }` | Room sockets | Notifies remaining player that opponent re-established connection. |
| `error` | `{ message: string, code: string }` | Calling socket | Standard error response. |

