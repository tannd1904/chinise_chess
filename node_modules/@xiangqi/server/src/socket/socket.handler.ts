import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  PlayerColor,
  ServerToClientEvents,
} from '@xiangqi/shared-types';
import { roomService } from '../modules/rooms/room.service';
import { matchmakingService } from '../modules/matchmaking/matchmaking.service';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  // Start matchmaking background tick loop
  matchmakingService.start(io);

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 1. Create Room
    socket.on('room:create', ({ playerName, timeControl, allowUndo, userId }) => {
      try {
        const { room, playerToken } = roomService.createRoom(
          playerName,
          socket.id,
          timeControl,
          allowUndo,
          userId
        );
        socket.join(room.id);
        socket.join(room.code);

        socket.emit('room:created', {
          roomId: room.id,
          roomCode: room.code,
          playerToken,
          color: 'RED',
          roomState: roomService.toPublicRoomDetails(room),
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'ROOM_CREATE_FAILED' });
      }
    });

    // 2. Join Room
    socket.on('room:join', ({ roomIdOrCode, playerName, playerToken, userId }) => {
      try {
        const { room, playerToken: token, color, isReconnect } = roomService.joinRoom(
          roomIdOrCode,
          playerName,
          socket.id,
          playerToken,
          userId
        );

        socket.join(room.id);
        socket.join(room.code);

        socket.emit('room:joined', {
          roomId: room.id,
          roomCode: room.code,
          playerToken: token,
          color,
          roomState: roomService.toPublicRoomDetails(room),
          gameState: room.gameState,
          clock: room.clock,
        });

        // Notify room of updated participant list
        io.to(room.id).emit('room:updated', {
          roomState: roomService.toPublicRoomDetails(room),
        });

        if (isReconnect) {
          io.to(room.id).emit('player:reconnected', { color });
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'ROOM_JOIN_FAILED' });
      }
    });

    // 3. Ready Toggle (Guest toggles ready state)
    socket.on('room:ready-toggle', ({ roomId, playerToken }) => {
      try {
        const room = roomService.toggleReady(roomId, playerToken);
        io.to(room.id).emit('room:updated', {
          roomState: roomService.toPublicRoomDetails(room),
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'READY_TOGGLE_FAILED' });
      }
    });

    // 4. Start Game (Host starts match when opponent is ready)
    socket.on('room:start-game', ({ roomId, playerToken }) => {
      try {
        const room = roomService.startGameByHost(roomId, playerToken);
        io.to(room.id).emit('game:started', {
          roomState: roomService.toPublicRoomDetails(room),
          gameState: room.gameState,
          clock: room.clock,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'START_GAME_FAILED' });
      }
    });

    // Legacy fallback for game:ready
    socket.on('game:ready', ({ roomId, playerToken }) => {
      try {
        const room = roomService.getRoom(roomId);
        if (!room) return;

        if (room.players.RED && room.players.BLACK && room.status !== 'ACTIVE') {
          // If called by host or both ready
          if (room.players.BLACK.isReady || room.players.RED.token === playerToken) {
            room.players.BLACK.isReady = true;
            const startedRoom = roomService.startGame(room.id);
            io.to(room.id).emit('game:started', {
              roomState: roomService.toPublicRoomDetails(startedRoom),
              gameState: startedRoom.gameState,
              clock: startedRoom.clock,
            });
          }
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'GAME_READY_FAILED' });
      }
    });

    // 5. In-Game Chat Message
    socket.on('chat:send', ({ roomId, playerToken, message }) => {
      try {
        const { room, chatMessage } = roomService.addChatMessage(
          roomId,
          playerToken,
          message
        );
        io.to(room.id).emit('chat:message', chatMessage);
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'CHAT_FAILED' });
      }
    });

    // 4. Move Submission
    socket.on('game:move', ({ roomId, playerToken, from, to, moveNumber }) => {
      try {
        const { room, move } = roomService.makeMove(
          roomId,
          playerToken,
          from,
          to,
          moveNumber
        );

        io.to(room.id).emit('game:move-accepted', {
          move,
          nextTurn: room.gameState.currentTurn,
          moveNumber: room.gameState.moveNumber,
          gameState: room.gameState,
          clock: room.clock,
        });

        if (room.gameState.isInCheck && room.gameState.checkedColor) {
          io.to(room.id).emit('game:check', {
            checkedColor: room.gameState.checkedColor,
          });
        }

        if (room.status === 'FINISHED') {
          io.to(room.id).emit('game:finished', {
            winner: room.winner,
            reason: room.finishReason || 'Game finished',
            gameState: room.gameState,
          });
        }
      } catch (err: any) {
        socket.emit('game:move-rejected', {
          reason: err.message,
          code: 'MOVE_REJECTED',
        });
      }
    });

    // 5. Resignation
    socket.on('game:resign', ({ roomId, playerToken }) => {
      try {
        const room = roomService.resign(roomId, playerToken);
        io.to(room.id).emit('game:finished', {
          winner: room.winner,
          reason: room.finishReason || 'Player resigned',
          gameState: room.gameState,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'RESIGN_FAILED' });
      }
    });

    // 6. Draw Offer
    socket.on('game:draw-offer', ({ roomId, playerToken }) => {
      try {
        const room = roomService.getRoom(roomId);
        if (!room) throw new Error('Room not found');
        const fromColor = roomService.offerDraw(room.id, playerToken);
        socket.to(room.id).emit('game:draw-offered', { fromColor });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'DRAW_OFFER_FAILED' });
      }
    });

    // 7. Draw Response
    socket.on('game:draw-response', ({ roomId, playerToken, accept }) => {
      try {
        const room = roomService.respondDraw(roomId, playerToken, accept);
        if (accept) {
          io.to(room.id).emit('game:finished', {
            winner: null,
            reason: room.finishReason || 'Draw agreed',
            gameState: room.gameState,
          });
        } else {
          socket.to(room.id).emit('game:draw-declined', {
            fromColor: room.players.RED?.token === playerToken ? 'RED' : 'BLACK',
          });
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'DRAW_RESPONSE_FAILED' });
      }
    });

    // 8. Undo Request
    socket.on('game:undo-request', ({ roomId, playerToken }) => {
      try {
        const room = roomService.getRoom(roomId);
        if (!room) throw new Error('Room not found');
        const fromColor = roomService.requestUndo(room.id, playerToken);
        socket.to(room.id).emit('game:undo-offered', { fromColor });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'UNDO_REQUEST_FAILED' });
      }
    });

    // 9. Undo Response
    socket.on('game:undo-response', ({ roomId, playerToken, accept }) => {
      try {
        const room = roomService.respondUndo(roomId, playerToken, accept);
        io.to(room.id).emit('game:undo-resolved', {
          accepted: accept,
          gameState: room.gameState,
          clock: room.clock,
          reason: accept ? 'Undo accepted by opponent' : 'Undo rejected by opponent',
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'UNDO_RESPONSE_FAILED' });
      }
    });

    // 10. Reconnect Request
    socket.on('game:reconnect', ({ roomId, playerToken }) => {
      try {
        const room = roomService.getRoom(roomId);
        if (!room) throw new Error('Room not found');

        let color: PlayerColor | null = null;
        if (room.players.RED?.token === playerToken) {
          color = 'RED';
          room.players.RED.socketId = socket.id;
          room.players.RED.isConnected = true;
        } else if (room.players.BLACK?.token === playerToken) {
          color = 'BLACK';
          room.players.BLACK.socketId = socket.id;
          room.players.BLACK.isConnected = true;
        }

        if (!color) throw new Error('Unauthorized');

        socket.join(roomId);

        socket.emit('room:joined', {
          roomId: room.id,
          roomCode: room.code,
          playerToken,
          color,
          roomState: roomService.toPublicRoomDetails(room),
          gameState: room.gameState,
          clock: room.clock,
        });

        io.to(roomId).emit('player:reconnected', { color });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'RECONNECT_FAILED' });
      }
    });

    // 11. Matchmaking: Queue & Cancel
    socket.on('matchmaking:queue', async ({ playerName, timeControl, userId }) => {
      try {
        const { eloRating, initialRange } = await matchmakingService.addToQueue(
          socket.id,
          playerName,
          timeControl,
          userId
        );
        socket.emit('matchmaking:queued', {
          timeControl,
          currentElo: eloRating,
          searchRange: initialRange,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message, code: 'MATCHMAKING_QUEUE_FAILED' });
      }
    });

    socket.on('matchmaking:cancel', () => {
      matchmakingService.removeFromQueue(socket.id);
      socket.emit('matchmaking:cancelled');
    });

    // 12. Disconnect
    socket.on('disconnect', () => {
      // Clean up from matchmaking queue if present
      matchmakingService.removeFromQueue(socket.id);

      const result = roomService.handleDisconnect(
        socket.id,
        (roomId, forfeitColor) => {
          const room = roomService.getRoom(roomId);
          if (room) {
            io.to(roomId).emit('game:finished', {
              winner: room.winner,
              reason: room.finishReason || 'Forfeit on disconnect',
              gameState: room.gameState,
            });
          }
        }
      );

      if (result) {
        io.to(result.roomId).emit('player:disconnected', {
          color: result.color,
          gracePeriodMs: 60000,
        });
        const room = roomService.getRoom(result.roomId);
        if (room) {
          io.to(result.roomId).emit('room:updated', {
            roomState: roomService.toPublicRoomDetails(room),
          });
        }
      }
    });
  });
}

