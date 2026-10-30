"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchmakingService = exports.MatchmakingService = void 0;
const prisma_1 = require("../../infrastructure/prisma");
const room_service_1 = require("../rooms/room.service");
class MatchmakingService {
    constructor() {
        this.queue = new Map();
        this.intervalHandle = null;
    }
    async addToQueue(socketId, playerName, timeControl, userId) {
        // If socket is already in queue, remove first
        this.queue.delete(socketId);
        let eloRating = 1200;
        if (userId) {
            try {
                const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
                if (user) {
                    eloRating = user.eloRating;
                }
            }
            catch (err) {
                console.error('[Matchmaking] Failed to query user ELO:', err);
            }
        }
        const entry = {
            socketId,
            playerName: playerName.trim() || 'Kỳ thủ',
            userId,
            eloRating,
            timeControl,
            joinedAt: Date.now(),
        };
        this.queue.set(socketId, entry);
        console.log(`[Matchmaking] ${entry.playerName} (ELO: ${eloRating}, Time: ${timeControl}) joined queue. Total in queue: ${this.queue.size}`);
        return { eloRating, initialRange: 100 };
    }
    removeFromQueue(socketId) {
        const existed = this.queue.delete(socketId);
        if (existed) {
            console.log(`[Matchmaking] Socket ${socketId} left queue. Remaining: ${this.queue.size}`);
        }
        return existed;
    }
    isInQueue(socketId) {
        return this.queue.has(socketId);
    }
    getQueueSize() {
        return this.queue.size;
    }
    /**
     * Start background tick loop to process candidate matches.
     */
    start(io) {
        if (this.intervalHandle)
            return;
        this.intervalHandle = setInterval(() => {
            this.tick(io);
        }, 1000);
    }
    stop() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
    }
    /**
     * Evaluates matchmaking queue every tick.
     */
    tick(io) {
        if (this.queue.size === 0)
            return;
        const now = Date.now();
        // Group queue entries by time control preset
        const byPreset = new Map();
        for (const entry of this.queue.values()) {
            const list = byPreset.get(entry.timeControl) || [];
            list.push(entry);
            byPreset.set(entry.timeControl, list);
            // Periodically update client with current elapsed time and search window
            const elapsedSec = Math.floor((now - entry.joinedAt) / 1000);
            const searchRange = 100 + Math.floor(elapsedSec / 5) * 50;
            io.to(entry.socketId).emit('matchmaking:status', { elapsedSec, searchRange });
        }
        // Process pairing for each time control group
        for (const [preset, candidates] of byPreset.entries()) {
            if (candidates.length < 2)
                continue;
            // Sort by waiting time (longest waiting first)
            candidates.sort((a, b) => a.joinedAt - b.joinedAt);
            const matchedIndices = new Set();
            for (let i = 0; i < candidates.length; i++) {
                if (matchedIndices.has(i))
                    continue;
                const p1 = candidates[i];
                const elapsedSec1 = Math.floor((now - p1.joinedAt) / 1000);
                const range1 = 100 + Math.floor(elapsedSec1 / 5) * 50;
                let bestMatchIndex = -1;
                let smallestEloDiff = Infinity;
                for (let j = i + 1; j < candidates.length; j++) {
                    if (matchedIndices.has(j))
                        continue;
                    const p2 = candidates[j];
                    const elapsedSec2 = Math.floor((now - p2.joinedAt) / 1000);
                    const range2 = 100 + Math.floor(elapsedSec2 / 5) * 50;
                    const maxAllowedRange = Math.max(range1, range2);
                    const eloDiff = Math.abs(p1.eloRating - p2.eloRating);
                    if (eloDiff <= maxAllowedRange && eloDiff < smallestEloDiff) {
                        smallestEloDiff = eloDiff;
                        bestMatchIndex = j;
                    }
                }
                if (bestMatchIndex !== -1) {
                    matchedIndices.add(i);
                    matchedIndices.add(bestMatchIndex);
                    const p2 = candidates[bestMatchIndex];
                    this.createMatchForPlayers(io, p1, p2, preset);
                }
            }
        }
    }
    /**
     * Instantiates an active Xiangqi match between two paired players.
     */
    createMatchForPlayers(io, player1, player2, timeControl) {
        // Remove both players from queue
        this.queue.delete(player1.socketId);
        this.queue.delete(player2.socketId);
        // Randomize sides (50% Red, 50% Black)
        const isP1Red = Math.random() < 0.5;
        const redEntry = isP1Red ? player1 : player2;
        const blackEntry = isP1Red ? player2 : player1;
        console.log(`[Matchmaking] Pairing matched! RED: ${redEntry.playerName} (ELO: ${redEntry.eloRating}) vs BLACK: ${blackEntry.playerName} (ELO: ${blackEntry.eloRating})`);
        try {
            // 1. Host creates room as RED
            const { room, playerToken: redToken } = room_service_1.roomService.createRoom(redEntry.playerName, redEntry.socketId, timeControl, false, // Quick match standard has undo disabled
            redEntry.userId);
            // 2. Guest joins room as BLACK
            const { playerToken: blackToken } = room_service_1.roomService.joinRoom(room.id, blackEntry.playerName, blackEntry.socketId, undefined, blackEntry.userId);
            // 3. Mark both players ready and activate match immediately
            if (room.players.BLACK) {
                room.players.BLACK.isReady = true;
            }
            room.status = 'ACTIVE';
            room.clock.isPaused = false;
            room.clock.turnStartedAt = Date.now();
            room.gameStartedAt = Date.now();
            // 4. Join sockets to room channels
            const redSocket = io.sockets.sockets.get(redEntry.socketId);
            const blackSocket = io.sockets.sockets.get(blackEntry.socketId);
            if (redSocket) {
                redSocket.join(room.id);
                redSocket.join(room.code);
            }
            if (blackSocket) {
                blackSocket.join(room.id);
                blackSocket.join(room.code);
            }
            // 5. Notify both players with matchmaking:matched
            io.to(redEntry.socketId).emit('matchmaking:matched', {
                roomId: room.id,
                roomCode: room.code,
                playerToken: redToken,
                color: 'RED',
                opponentName: blackEntry.playerName,
                opponentElo: blackEntry.eloRating,
            });
            io.to(blackEntry.socketId).emit('matchmaking:matched', {
                roomId: room.id,
                roomCode: room.code,
                playerToken: blackToken,
                color: 'BLACK',
                opponentName: redEntry.playerName,
                opponentElo: redEntry.eloRating,
            });
            // 6. Broadcast game:started to the room so board state is initialized
            io.to(room.id).emit('game:started', {
                roomState: room_service_1.roomService.toPublicRoomDetails(room),
                gameState: room.gameState,
                clock: room.clock,
            });
        }
        catch (err) {
            console.error('[Matchmaking] Failed to initialize room for matched players:', err);
        }
    }
}
exports.MatchmakingService = MatchmakingService;
exports.matchmakingService = new MatchmakingService();
