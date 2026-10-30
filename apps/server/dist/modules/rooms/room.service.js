"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomService = exports.RoomService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const engine_1 = require("@xiangqi/engine");
const config_1 = require("../../config");
const match_service_1 = require("../matches/match.service");
class RoomService {
    constructor() {
        this.rooms = new Map();
        this.codeToRoomId = new Map();
        this.disconnectTimers = new Map();
    }
    /**
     * Generates a 6-character uppercase alphanumeric code.
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    /**
     * Generates a random secure session token for a player.
     */
    generateToken() {
        return crypto_1.default.randomBytes(16).toString('hex');
    }
    /**
     * Create a new room with a host player (assigned to RED).
     */
    createRoom(playerName, socketId, timeControl = 'rapid', allowUndo = true, userId) {
        const roomId = crypto_1.default.randomUUID();
        let roomCode = this.generateRoomCode();
        while (this.codeToRoomId.has(roomCode)) {
            roomCode = this.generateRoomCode();
        }
        const playerToken = this.generateToken();
        const durationMs = config_1.config.timeControls[timeControl] || config_1.config.timeControls.rapid;
        const hostPlayer = {
            id: crypto_1.default.randomUUID(),
            userId: userId || undefined,
            token: playerToken,
            name: playerName.trim() || 'Player 1',
            color: 'RED',
            isReady: true,
            isConnected: true,
            socketId,
        };
        const initialClock = {
            redTimeMs: durationMs,
            blackTimeMs: durationMs,
            currentTurn: 'RED',
            turnStartedAt: 0,
            isPaused: true,
        };
        const room = {
            id: roomId,
            code: roomCode,
            status: 'WAITING',
            timeControl,
            allowUndo,
            players: {
                RED: hostPlayer,
            },
            spectatorSocketIds: new Set(),
            gameState: engine_1.XiangqiEngine.createInitialGameSnapshot(),
            clock: initialClock,
            historyStack: [],
            pendingDrawOfferFrom: null,
            pendingUndoOfferFrom: null,
            winner: null,
            finishReason: null,
            createdAt: Date.now(),
        };
        this.rooms.set(roomId, room);
        this.codeToRoomId.set(roomCode, roomId);
        return { room, playerToken };
    }
    /**
     * Join an existing room or reconnect using playerToken.
     */
    joinRoom(roomIdOrCode, playerName, socketId, existingToken, userId) {
        const cleanId = roomIdOrCode.trim().toUpperCase();
        const roomId = this.codeToRoomId.get(cleanId) || roomIdOrCode.trim();
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        // 1. Check for Reconnection via playerToken
        if (existingToken) {
            if (room.players.RED && room.players.RED.token === existingToken) {
                room.players.RED.socketId = socketId;
                room.players.RED.isConnected = true;
                if (userId)
                    room.players.RED.userId = userId;
                this.clearDisconnectTimer(room.id, 'RED');
                return { room, playerToken: existingToken, color: 'RED', isReconnect: true };
            }
            if (room.players.BLACK && room.players.BLACK.token === existingToken) {
                room.players.BLACK.socketId = socketId;
                room.players.BLACK.isConnected = true;
                if (userId)
                    room.players.BLACK.userId = userId;
                this.clearDisconnectTimer(room.id, 'BLACK');
                return { room, playerToken: existingToken, color: 'BLACK', isReconnect: true };
            }
        }
        // 2. Joining as second player (BLACK)
        if (!room.players.BLACK) {
            const playerToken = this.generateToken();
            const guestPlayer = {
                id: crypto_1.default.randomUUID(),
                userId: userId || undefined,
                token: playerToken,
                name: playerName.trim() || 'Player 2',
                color: 'BLACK',
                isReady: false, // Player 2 must explicitly click "Sẵn sàng" (Ready)!
                isConnected: true,
                socketId,
            };
            room.players.BLACK = guestPlayer;
            room.status = 'READY';
            return { room, playerToken, color: 'BLACK', isReconnect: false };
        }
        throw new Error('Room is already full');
    }
    resolveRoomId(roomIdOrCode) {
        if (!roomIdOrCode)
            return '';
        const clean = roomIdOrCode.trim();
        return this.codeToRoomId.get(clean.toUpperCase()) || clean;
    }
    getRoom(roomIdOrCode) {
        const id = this.resolveRoomId(roomIdOrCode);
        return this.rooms.get(id);
    }
    getRoomByCode(code) {
        const roomId = this.codeToRoomId.get(code.trim().toUpperCase());
        return roomId ? this.rooms.get(roomId) : undefined;
    }
    /**
     * Toggles the ready state for a player in the lobby.
     */
    toggleReady(roomIdOrCode, playerToken) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (room.players.BLACK && room.players.BLACK.token === playerToken) {
            room.players.BLACK.isReady = !room.players.BLACK.isReady;
            return room;
        }
        if (room.players.RED && room.players.RED.token === playerToken) {
            room.players.RED.isReady = true;
            return room;
        }
        throw new Error('Unauthorized');
    }
    /**
     * Room Host (RED) starts the match when guest (BLACK) has pressed Ready.
     */
    startGameByHost(roomIdOrCode, playerToken) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (room.players.RED?.token !== playerToken) {
            throw new Error('Chỉ có chủ phòng mới có quyền bắt đầu trận đấu!');
        }
        if (!room.players.BLACK) {
            throw new Error('Chưa thể bắt đầu: Đang chờ đối thủ vào phòng');
        }
        if (!room.players.BLACK.isReady) {
            throw new Error('Đối thủ chưa bấm Sẵn sàng!');
        }
        room.status = 'ACTIVE';
        room.clock.isPaused = false;
        room.clock.turnStartedAt = Date.now();
        room.gameStartedAt = Date.now();
        return room;
    }
    /**
     * Process in-game chat message.
     */
    addChatMessage(roomIdOrCode, playerToken, rawMessage) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        let senderColor = null;
        let senderName = '';
        if (room.players.RED?.token === playerToken) {
            senderColor = 'RED';
            senderName = room.players.RED.name;
        }
        else if (room.players.BLACK?.token === playerToken) {
            senderColor = 'BLACK';
            senderName = room.players.BLACK.name;
        }
        if (!senderColor)
            throw new Error('Unauthorized');
        const text = rawMessage.trim().slice(0, 200);
        if (!text)
            throw new Error('Tin nhắn không được để trống');
        const chatMessage = {
            id: crypto_1.default.randomUUID(),
            senderColor,
            senderName,
            text,
            timestamp: Date.now(),
        };
        return { room, chatMessage };
    }
    /**
     * Transitions room to ACTIVE when both players are ready.
     */
    startGame(roomIdOrCode) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (!room.players.RED || !room.players.BLACK) {
            throw new Error('Both players must be in room to start');
        }
        room.status = 'ACTIVE';
        room.clock.isPaused = false;
        room.clock.turnStartedAt = Date.now();
        room.gameStartedAt = Date.now();
        return room;
    }
    /**
     * Process a player's move. Validates turn, clock, and Xiangqi rules.
     */
    makeMove(roomIdOrCode, playerToken, from, to, moveNumber) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (room.status !== 'ACTIVE')
            throw new Error('Game is not currently active');
        // 1. Authorize player
        const currentTurn = room.clock.currentTurn;
        const player = room.players[currentTurn];
        if (!player || player.token !== playerToken) {
            throw new Error('Not your turn or unauthorized action');
        }
        // 2. Validate move order to prevent race conditions
        if (moveNumber !== room.gameState.moveNumber) {
            throw new Error('Move sequence mismatch. Please refresh state.');
        }
        // 3. Compute elapsed time and deduct from player's clock bank
        const now = Date.now();
        const elapsedMs = Math.max(0, now - room.clock.turnStartedAt);
        if (currentTurn === 'RED') {
            room.clock.redTimeMs -= elapsedMs;
            if (room.clock.redTimeMs <= 0) {
                room.clock.redTimeMs = 0;
                this.finishGame(room, 'BLACK', 'Timeout (Red ran out of time)');
                throw new Error('Time expired');
            }
        }
        else {
            room.clock.blackTimeMs -= elapsedMs;
            if (room.clock.blackTimeMs <= 0) {
                room.clock.blackTimeMs = 0;
                this.finishGame(room, 'RED', 'Timeout (Black ran out of time)');
                throw new Error('Time expired');
            }
        }
        // 4. Save snapshot in history stack for Undo feature
        room.historyStack.push({
            gameState: JSON.parse(JSON.stringify(room.gameState)),
            clock: { ...room.clock },
        });
        // 5. Engine Move Evaluation
        const engineResult = engine_1.XiangqiEngine.applyMove(room.gameState.pieces, currentTurn, from, to);
        const executedMove = {
            from,
            to,
            capturedPiece: engineResult.capturedPiece,
        };
        // 6. Update Game State
        room.gameState.pieces = engineResult.newPieces;
        room.gameState.lastMove = executedMove;
        room.gameState.history.push(executedMove);
        room.gameState.moveNumber += 1;
        room.gameState.currentTurn = engineResult.nextTurn;
        room.gameState.status = engineResult.status;
        room.gameState.winner = engineResult.winner;
        room.gameState.isInCheck = engineResult.inCheck;
        room.gameState.checkedColor = engineResult.checkedColor;
        // 7. Update Clock for next turn
        room.clock.currentTurn = engineResult.nextTurn;
        room.clock.turnStartedAt = now;
        // 8. Handle match completion
        if (engineResult.status === 'CHECKMATE') {
            this.finishGame(room, engineResult.winner, `Checkmate (${engineResult.winner} wins!)`);
        }
        else if (engineResult.status === 'STALEMATE') {
            this.finishGame(room, engineResult.winner, `Stalemate (${engineResult.winner} wins by no legal moves)`);
        }
        return { room, move: executedMove };
    }
    /**
     * Resignation by a player.
     */
    resign(roomIdOrCode, playerToken) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (room.status !== 'ACTIVE')
            throw new Error('Game is not active');
        let resigningColor = null;
        if (room.players.RED?.token === playerToken)
            resigningColor = 'RED';
        if (room.players.BLACK?.token === playerToken)
            resigningColor = 'BLACK';
        if (!resigningColor)
            throw new Error('Unauthorized');
        const winner = resigningColor === 'RED' ? 'BLACK' : 'RED';
        this.finishGame(room, winner, `Resignation (${resigningColor} resigned)`);
        return room;
    }
    /**
     * Offer a draw to opponent.
     */
    offerDraw(roomIdOrCode, playerToken) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (room.status !== 'ACTIVE')
            throw new Error('Game is not active');
        let callerColor = null;
        if (room.players.RED?.token === playerToken)
            callerColor = 'RED';
        if (room.players.BLACK?.token === playerToken)
            callerColor = 'BLACK';
        if (!callerColor)
            throw new Error('Unauthorized');
        room.pendingDrawOfferFrom = callerColor;
        return callerColor;
    }
    /**
     * Respond to opponent's draw offer.
     */
    respondDraw(roomIdOrCode, playerToken, accept) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (room.status !== 'ACTIVE')
            throw new Error('Game is not active');
        let callerColor = null;
        if (room.players.RED?.token === playerToken)
            callerColor = 'RED';
        if (room.players.BLACK?.token === playerToken)
            callerColor = 'BLACK';
        if (!callerColor || !room.pendingDrawOfferFrom) {
            throw new Error('No pending draw offer to respond to');
        }
        if (callerColor === room.pendingDrawOfferFrom) {
            throw new Error('Cannot accept your own draw offer');
        }
        if (accept) {
            this.finishGame(room, null, 'Draw by mutual agreement');
        }
        room.pendingDrawOfferFrom = null;
        return room;
    }
    /**
     * Request undo (take back last move).
     */
    requestUndo(roomIdOrCode, playerToken) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (room.status !== 'ACTIVE')
            throw new Error('Game is not active');
        if (!room.allowUndo)
            throw new Error('Undo is disabled in this room');
        if (room.historyStack.length === 0)
            throw new Error('No moves to undo');
        let callerColor = null;
        if (room.players.RED?.token === playerToken)
            callerColor = 'RED';
        if (room.players.BLACK?.token === playerToken)
            callerColor = 'BLACK';
        if (!callerColor)
            throw new Error('Unauthorized');
        room.pendingUndoOfferFrom = callerColor;
        return callerColor;
    }
    /**
     * Respond to undo request. Restores prior board position if accepted.
     */
    respondUndo(roomIdOrCode, playerToken, accept) {
        const id = this.resolveRoomId(roomIdOrCode);
        const room = this.rooms.get(id);
        if (!room)
            throw new Error('Room not found');
        if (room.status !== 'ACTIVE')
            throw new Error('Game is not active');
        let callerColor = null;
        if (room.players.RED?.token === playerToken)
            callerColor = 'RED';
        if (room.players.BLACK?.token === playerToken)
            callerColor = 'BLACK';
        if (!callerColor || !room.pendingUndoOfferFrom) {
            throw new Error('No pending undo request');
        }
        if (callerColor === room.pendingUndoOfferFrom) {
            throw new Error('Cannot respond to your own undo request');
        }
        if (accept && room.historyStack.length > 0) {
            const previous = room.historyStack.pop();
            if (previous) {
                room.gameState = previous.gameState;
                room.clock = {
                    ...previous.clock,
                    turnStartedAt: Date.now(),
                };
            }
        }
        room.pendingUndoOfferFrom = null;
        return room;
    }
    /**
     * Handle player disconnect with grace period.
     */
    handleDisconnect(socketId, onTimeout) {
        for (const [roomId, room] of this.rooms.entries()) {
            let disconnectedColor = null;
            if (room.players.RED?.socketId === socketId) {
                room.players.RED.isConnected = false;
                disconnectedColor = 'RED';
            }
            else if (room.players.BLACK?.socketId === socketId) {
                room.players.BLACK.isConnected = false;
                disconnectedColor = 'BLACK';
            }
            if (disconnectedColor) {
                if (room.status === 'ACTIVE') {
                    const timerKey = `${roomId}-${disconnectedColor}`;
                    this.clearDisconnectTimer(roomId, disconnectedColor);
                    const timeoutHandle = setTimeout(() => {
                        const currentRoom = this.rooms.get(roomId);
                        if (currentRoom && currentRoom.status === 'ACTIVE') {
                            const p = currentRoom.players[disconnectedColor];
                            if (p && !p.isConnected) {
                                const winner = disconnectedColor === 'RED' ? 'BLACK' : 'RED';
                                this.finishGame(currentRoom, winner, `Forfeit (${disconnectedColor} disconnected and exceeded grace period)`);
                                onTimeout(roomId, disconnectedColor);
                            }
                        }
                    }, config_1.config.reconnectGracePeriodMs);
                    this.disconnectTimers.set(timerKey, timeoutHandle);
                }
                return { roomId, color: disconnectedColor };
            }
        }
        return null;
    }
    clearDisconnectTimer(roomId, color) {
        const timerKey = `${roomId}-${color}`;
        const timer = this.disconnectTimers.get(timerKey);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(timerKey);
        }
    }
    finishGame(room, winner, reason) {
        room.status = 'FINISHED';
        room.winner = winner;
        room.finishReason = reason;
        room.clock.isPaused = true;
        room.gameState.status = winner ? 'CHECKMATE' : 'DRAW';
        room.gameState.winner = winner;
        // Asynchronously persist match to database without blocking
        const result = !winner ? 'DRAW' : winner === 'RED' ? 'RED_WIN' : 'BLACK_WIN';
        match_service_1.matchService
            .saveFinishedMatch({
            roomCode: room.code,
            redPlayerId: room.players.RED?.userId || null,
            blackPlayerId: room.players.BLACK?.userId || null,
            redPlayerName: room.players.RED?.name || 'Player 1',
            blackPlayerName: room.players.BLACK?.name || 'Player 2',
            result,
            winnerColor: winner,
            terminationReason: reason,
            timeControl: room.timeControl,
            startedAt: new Date(room.gameStartedAt || room.createdAt),
            endedAt: new Date(),
            moves: room.gameState.history,
        })
            .then((saved) => {
            console.log(`[MatchService] Match ${saved.id} persisted successfully (${result})`);
        })
            .catch((err) => {
            console.error('[MatchService] Failed to persist match:', err);
        });
    }
    /**
     * Clean public RoomDetails view.
     */
    toPublicRoomDetails(room) {
        return {
            id: room.id,
            code: room.code,
            status: room.status,
            timeControl: room.timeControl,
            allowUndo: room.allowUndo,
            players: {
                RED: room.players.RED
                    ? {
                        id: room.players.RED.id,
                        userId: room.players.RED.userId,
                        token: '', // Don't leak token
                        name: room.players.RED.name,
                        color: 'RED',
                        isReady: room.players.RED.isReady,
                        isConnected: room.players.RED.isConnected,
                    }
                    : undefined,
                BLACK: room.players.BLACK
                    ? {
                        id: room.players.BLACK.id,
                        userId: room.players.BLACK.userId,
                        token: '', // Don't leak token
                        name: room.players.BLACK.name,
                        color: 'BLACK',
                        isReady: room.players.BLACK.isReady,
                        isConnected: room.players.BLACK.isConnected,
                    }
                    : undefined,
            },
            spectators: room.spectatorSocketIds.size,
            createdAt: room.createdAt,
            winner: room.winner,
            finishReason: room.finishReason || undefined,
        };
    }
}
exports.RoomService = RoomService;
exports.roomService = new RoomService();
