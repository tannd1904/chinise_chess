"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const socket_io_client_1 = require("socket.io-client");
const server_1 = require("../src/server");
console.log('--- RUNNING SERVER INTEGRATION TESTS ---');
const PORT = 4099;
const { httpServer, clockInterval } = (0, server_1.createServer)();
httpServer.listen(PORT, async () => {
    try {
        const url = `http://localhost:${PORT}`;
        const clientRed = (0, socket_io_client_1.io)(url);
        const clientBlack = (0, socket_io_client_1.io)(url);
        let roomId = '';
        let roomCode = '';
        let redToken = '';
        let blackToken = '';
        // Step 1: Client Red creates room
        await new Promise((resolve, reject) => {
            clientRed.on('connect', () => {
                clientRed.emit('room:create', {
                    playerName: 'Grandmaster Red',
                    timeControl: 'rapid',
                    allowUndo: true,
                });
            });
            clientRed.on('room:created', (data) => {
                roomId = data.roomId;
                roomCode = data.roomCode;
                redToken = data.playerToken;
                assert_1.default.strictEqual(data.color, 'RED');
                assert_1.default.ok(data.roomCode.length >= 6);
                console.log('✓ Step 1: Room created with code:', data.roomCode);
                resolve();
            });
            clientRed.on('error', (err) => reject(new Error(err.message)));
        });
        // Step 2: Black joins room (not ready yet)
        await new Promise((resolve, reject) => {
            let blackJoined = false;
            let redNotified = false;
            clientBlack.emit('room:join', {
                roomIdOrCode: roomCode,
                playerName: 'Master Black',
            });
            clientBlack.once('room:joined', (data) => {
                blackToken = data.playerToken;
                assert_1.default.strictEqual(data.color, 'BLACK');
                assert_1.default.strictEqual(data.roomId, roomId);
                assert_1.default.strictEqual(data.roomState.players.BLACK?.isReady, false);
                blackJoined = true;
                if (blackJoined && redNotified) {
                    console.log('✓ Step 2: Black joined room (isReady = false)');
                    resolve();
                }
            });
            clientRed.once('room:updated', () => {
                redNotified = true;
                if (blackJoined && redNotified) {
                    console.log('✓ Step 2: Black joined room (isReady = false)');
                    resolve();
                }
            });
            clientBlack.on('error', (err) => reject(new Error(err.message)));
        });
        // Step 3a: Black clicks Ready (room:ready-toggle)
        await new Promise((resolve) => {
            clientRed.once('room:updated', (data) => {
                assert_1.default.strictEqual(data.roomState.players.BLACK?.isReady, true);
                console.log('✓ Step 3a: Black ready state synchronized to Red');
                resolve();
            });
            clientBlack.emit('room:ready-toggle', { roomId, playerToken: blackToken });
        });
        // Step 3b: Red (Host) starts match (room:start-game)
        await new Promise((resolve) => {
            let startedCount = 0;
            const onStarted = (data) => {
                assert_1.default.strictEqual(data.gameState.currentTurn, 'RED');
                assert_1.default.strictEqual(data.gameState.pieces.length, 32);
                startedCount++;
                if (startedCount === 2) {
                    console.log('✓ Step 3b: Host started game, both clients received game:started');
                    resolve();
                }
            };
            clientRed.on('game:started', onStarted);
            clientBlack.on('game:started', onStarted);
            clientRed.emit('room:start-game', { roomId, playerToken: redToken });
        });
        // Step 3c: In-Game Chat test
        await new Promise((resolve) => {
            clientBlack.once('chat:message', (msg) => {
                assert_1.default.strictEqual(msg.senderColor, 'RED');
                assert_1.default.strictEqual(msg.text, 'Xin chào, chúc bạn thi đấu tốt!');
                console.log('✓ Step 3c: In-game chat message sent and verified across sockets');
                resolve();
            });
            clientRed.emit('chat:send', {
                roomId,
                playerToken: redToken,
                message: 'Xin chào, chúc bạn thi đấu tốt!',
            });
        });
        // Step 4: Red attempts illegal move out of turn (e.g. moving a piece that doesn't exist or illegal destination)
        await new Promise((resolve) => {
            clientRed.emit('game:move', {
                roomId,
                playerToken: redToken,
                from: { x: 0, y: 9 }, // Chariot
                to: { x: 0, y: 5 }, // Blocked by Soldier at (0,6)!
                moveNumber: 1,
            });
            clientRed.once('game:move-rejected', (err) => {
                assert_1.default.ok(err.reason.length > 0);
                console.log('✓ Step 4: Server properly rejected illegal move:', err.reason);
                resolve();
            });
        });
        // Step 5: Red plays Central Cannon: (1,7) to (4,7)
        await new Promise((resolve) => {
            let acceptedCount = 0;
            const onAccepted = (data) => {
                assert_1.default.deepStrictEqual(data.move.from, { x: 1, y: 7 });
                assert_1.default.deepStrictEqual(data.move.to, { x: 4, y: 7 });
                assert_1.default.strictEqual(data.nextTurn, 'BLACK');
                assert_1.default.strictEqual(data.moveNumber, 2);
                acceptedCount++;
                if (acceptedCount === 2) {
                    console.log('✓ Step 5: Central Cannon move verified and broadcast to both clients');
                    resolve();
                }
            };
            clientRed.once('game:move-accepted', onAccepted);
            clientBlack.once('game:move-accepted', onAccepted);
            clientRed.emit('game:move', {
                roomId,
                playerToken: redToken,
                from: { x: 1, y: 7 },
                to: { x: 4, y: 7 },
                moveNumber: 1,
            });
        });
        // Step 6: Black plays Horse (1,0) to (2,2)
        await new Promise((resolve) => {
            let acceptedCount = 0;
            const onAccepted = (data) => {
                assert_1.default.deepStrictEqual(data.move.from, { x: 1, y: 0 });
                assert_1.default.deepStrictEqual(data.move.to, { x: 2, y: 2 });
                assert_1.default.strictEqual(data.nextTurn, 'RED');
                assert_1.default.strictEqual(data.moveNumber, 3);
                acceptedCount++;
                if (acceptedCount === 2) {
                    console.log('✓ Step 6: Black horse move accepted and synced');
                    resolve();
                }
            };
            clientRed.once('game:move-accepted', onAccepted);
            clientBlack.once('game:move-accepted', onAccepted);
            clientBlack.emit('game:move', {
                roomId,
                playerToken: blackToken,
                from: { x: 1, y: 0 },
                to: { x: 2, y: 2 },
                moveNumber: 2,
            });
        });
        // Step 7: Resignation handling
        await new Promise((resolve) => {
            let finishedCount = 0;
            const onFinished = (data) => {
                assert_1.default.strictEqual(data.winner, 'RED');
                assert_1.default.ok(data.reason.includes('resigned'));
                finishedCount++;
                if (finishedCount === 2) {
                    console.log('✓ Step 7: Resignation handled and both clients notified');
                    resolve();
                }
            };
            clientRed.on('game:finished', onFinished);
            clientBlack.on('game:finished', onFinished);
            clientBlack.emit('game:resign', { roomId, playerToken: blackToken });
        });
        console.log('--- ALL SERVER INTEGRATION TESTS PASSED! ---');
        clientRed.disconnect();
        clientBlack.disconnect();
        clearInterval(clockInterval);
        httpServer.close(() => {
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Integration test failed:', error);
        clearInterval(clockInterval);
        httpServer.close(() => {
            process.exit(1);
        });
    }
});
