# Xiangqi Online — Architecture Documentation

## 1. System Overview

Xiangqi Online is a real-time multiplayer platform for Chinese Chess (Xiangqi / Cờ Tướng) designed with a server-authoritative architecture. The core domain logic (game engine) is fully separated from transport protocols (HTTP / WebSocket) and rendering layers.

```
+-------------------------------------------------------------+
|                      Client (React + SVG)                   |
|  - UI / Board Render (SVG 90 intersections)                 |
|  - Local move preview & destination indicators              |
|  - Socket.IO client (state synchronization & timers)        |
+-------------------------------------------------------------+
                              | ^
           Socket.IO (WS)     | | State updates, Clock ticks,
           Move requests      | | Accepted/Rejected moves
                              v |
+-------------------------------------------------------------+
|                   Backend Server (Express + Socket.IO)      |
|  - Authoritative Room & Player Session Management           |
|  - Turn & Clock orchestration (server-computed time bank)   |
|  - Move validation transaction flow                         |
|  - Draw / Resign / Undo negotiation state machine           |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|               Xiangqi Engine (@xiangqi/engine)              |
|  - 9x10 Coordinate system (x: 0..8, y: 0..9)                |
|  - Pseudo-legal & Legal move generation                     |
|  - Obstacle checks (Horse leg, Elephant eye, Cannon screen) |
|  - Flying General & Check / Checkmate / Stalemate loss      |
+-------------------------------------------------------------+
```

## 2. Component Responsibilities

### 2.1. Packages

1. **`@xiangqi/engine`** (`packages/xiangqi-engine`):
   - Pure TypeScript game logic with zero external runtime dependencies.
   - Immutable state transitions: applying a move returns a new board position.
   - Full implementation of all 7 piece types, river boundary, palace bounds, pin/check rules, flying generals, and checkmate/stalemate.
   - Comprehensive unit test suite.

2. **`@xiangqi/shared-types`** (`packages/shared-types`):
   - Shared data contracts: Board coordinates, Piece models, Move representations, Game state snapshots, Socket event payloads, Room states.

### 2.2. Apps

1. **`@xiangqi/server`** (`apps/server`):
   - **Room Manager**: In-memory registry of active game rooms with room IDs and 6-character invite codes.
   - **Session & Identity**: Guest sessions identified by a cryptographically secure `playerToken` stored on client, preventing room impersonation.
   - **Authoritative Clock**: Server tracks remaining milliseconds, active turn, turn start timestamp, and resolves timeout conditions deterministically.
   - **Move Validator**: Validates sequential move numbers (`expectedMoveNumber`) to prevent race conditions or duplicate deliveries.
   - **Disconnection Handler**: Grace periods for reconnecting players; matches are not instantly dropped.

2. **`@xiangqi/web`** (`apps/web`):
   - **Vite + React + Tailwind CSS**: Clean, modern interface.
   - **SVG Board Component**: Mathematical 9-column x 10-row grid with diagonal palace lines, river crossing label, and distinct Chinese piece calligraphy tokens.
   - **Interactive states**: Source piece selection, legal target hints (green dot for move, red ring for capture), last-move highlight, king-in-check red pulse.
   - **Control Panel**: Resign, Offer Draw, Request Undo, Flip Board view, Sound toggle, and Move History notation.

## 3. Real-Time Protocol & Move Transaction Flow

1. **Client Action**: User selects a valid piece and destination. Client emits `game:move` with `{ roomId, from, to, moveNumber }`.
2. **Server Verification**:
   - Check room exists, match is `ACTIVE`.
   - Check caller's `playerToken` matches the player whose turn it is.
   - Check remaining clock has not expired.
   - Check `moveNumber` matches the server's current move count.
3. **Engine Evaluation**:
   - Verify move is in `getLegalMoves(currentPosition, from)`.
   - If invalid, emit `game:move-rejected` with error code.
4. **State Transition**:
   - Deduct elapsed turn time from current player's clock bank.
   - Apply move to position.
   - Check for check, checkmate, or stalemate.
   - Increment move count and switch active turn.
5. **Broadcast**:
   - Emit `game:move-accepted` with updated snapshot, move data, and clock states to both room participants.

## 4. Clock & Timer Architecture

- Preset options:
  - Blitz: 3 minutes per player
  - Rapid: 10 minutes per player
  - Standard: 30 minutes per player
- Clock synchronization mechanism:
  - The server holds the canonical remaining time (`redTimeMs`, `blackTimeMs`) and the timestamp when the current turn started (`turnStartedAt`).
  - At every move, the elapsed delta is calculated from `Date.now() - turnStartedAt` and deducted.
  - A server-side interval checks for expiration every 500ms. If time reaches zero, the server terminates the match with `timeout` loss.
  - Periodic clock synchronization snapshots are broadcasted every second to keep client interpolated clocks strictly aligned.

