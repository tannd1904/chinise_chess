import assert from 'assert';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from '../src/server';
import { ClientToServerEvents, ServerToClientEvents } from '@xiangqi/shared-types';
import { matchmakingService } from '../src/modules/matchmaking/matchmaking.service';
import { roomService } from '../src/modules/rooms/room.service';

type TestSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function createClient(port: number): TestSocket {
  return Client(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
}

async function runMatchmakingTests() {
  console.log('=== Starting Phase 3: Matchmaking Queue & Pairing Tests ===');
  const { httpServer, clockInterval } = createServer();
  const PORT = 4056;

  await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));
  console.log(`Matchmaking test server running on port ${PORT}`);

  let client1: TestSocket | null = null;
  let client2: TestSocket | null = null;

  try {
    client1 = createClient(PORT);
    client2 = createClient(PORT);

    await Promise.all([
      new Promise<void>((resolve) => client1!.on('connect', resolve)),
      new Promise<void>((resolve) => client2!.on('connect', resolve)),
    ]);
    console.log('✔ Both clients connected to Socket.IO server');

    // Test 1: Client 1 enters queue
    console.log('[Step 1] Client 1 enters matchmaking queue...');
    const queuePromise1 = new Promise<any>((resolve) => {
      client1!.once('matchmaking:queued', resolve);
    });
    client1.emit('matchmaking:queue', {
      playerName: 'Kỳ Thủ Quick 1',
      timeControl: 'rapid',
    });
    const queuedData1 = await queuePromise1;
    assert.strictEqual(queuedData1.timeControl, 'rapid');
    assert.strictEqual(queuedData1.currentElo, 1200);
    assert.strictEqual(queuedData1.searchRange, 100);
    assert.strictEqual(matchmakingService.getQueueSize(), 1);
    console.log('✔ Client 1 queued successfully');

    // Test 2: Client 1 cancels matchmaking
    console.log('[Step 2] Client 1 cancels matchmaking...');
    const cancelPromise = new Promise<void>((resolve) => {
      client1!.once('matchmaking:cancelled', resolve);
    });
    client1.emit('matchmaking:cancel');
    await cancelPromise;
    assert.strictEqual(matchmakingService.getQueueSize(), 0);
    console.log('✔ Client 1 cancelled matchmaking successfully');

    // Test 3: Client 1 joins queue again
    console.log('[Step 3] Client 1 re-enters matchmaking queue...');
    const reQueuePromise = new Promise<any>((resolve) => {
      client1!.once('matchmaking:queued', resolve);
    });
    client1.emit('matchmaking:queue', {
      playerName: 'Kỳ Thủ Quick 1',
      timeControl: 'rapid',
    });
    await reQueuePromise;
    assert.strictEqual(matchmakingService.getQueueSize(), 1);

    // Test 4: Client 2 joins matchmaking queue and pairing occurs
    console.log('[Step 4] Client 2 enters queue -> triggers match pairing...');
    const matchedPromise1 = new Promise<any>((resolve) => {
      client1!.once('matchmaking:matched', resolve);
    });
    const matchedPromise2 = new Promise<any>((resolve) => {
      client2!.once('matchmaking:matched', resolve);
    });
    const gameStartedPromise1 = new Promise<any>((resolve) => {
      client1!.once('game:started', resolve);
    });
    const gameStartedPromise2 = new Promise<any>((resolve) => {
      client2!.once('game:started', resolve);
    });

    client2.emit('matchmaking:queue', {
      playerName: 'Kỳ Thủ Quick 2',
      timeControl: 'rapid',
    });

    // Wait for matchmaker tick to pair both players
    const [match1, match2, game1, game2] = await Promise.all([
      matchedPromise1,
      matchedPromise2,
      gameStartedPromise1,
      gameStartedPromise2,
    ]);

    assert.ok(match1.roomId);
    assert.strictEqual(match1.roomId, match2.roomId);
    assert.strictEqual(match1.roomCode, match2.roomCode);

    // Check that one player is RED and one is BLACK
    const colors = [match1.color, match2.color].sort();
    assert.deepStrictEqual(colors, ['BLACK', 'RED'], 'Players must have opposite colors');

    console.log(`✔ Matched in Room ${match1.roomCode}! Client 1: ${match1.color}, Client 2: ${match2.color}`);

    // Test 5: Verify room state is immediately ACTIVE and game is ongoing
    console.log('[Step 5] Verify game status in room...');
    assert.strictEqual(game1.roomState.status, 'ACTIVE');
    assert.strictEqual(game2.roomState.status, 'ACTIVE');
    assert.strictEqual(game1.gameState.currentTurn, 'RED');
    assert.strictEqual(matchmakingService.getQueueSize(), 0);
    console.log('✔ Room is in ACTIVE status, turn is RED, ready to play immediately');

    console.log('=== ALL PHASE 3 MATCHMAKING TESTS PASSED! ===');
  } finally {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
    matchmakingService.stop();
    clearInterval(clockInterval);
    httpServer.close();
    process.exit(0);
  }
}

runMatchmakingTests().catch((err) => {
  console.error('Matchmaking test failed:', err);
  process.exit(1);
});

