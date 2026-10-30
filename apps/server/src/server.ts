import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@xiangqi/shared-types';
import { config } from './config';
import { roomService } from './modules/rooms/room.service';
import { setupSocketHandlers } from './socket/socket.handler';
import { authRouter } from './modules/auth/auth.controller';
import { matchRouter } from './modules/matches/match.controller';

export function createServer() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'xiangqi-server',
      timestamp: Date.now(),
    });
  });

  // REST API routes
  app.use('/api/auth', authRouter);
  app.use('/api', matchRouter);

  // Query room info endpoint
  app.get('/api/rooms/:roomId', (req, res) => {
    const room = roomService.getRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    return res.json(roomService.toPublicRoomDetails(room));
  });

  const httpServer = http.createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  setupSocketHandlers(io);

  // Authoritative server clock interval
  const clockInterval = setInterval(() => {
    // We can iterate rooms if needed, or query room service
    // For every active room, check if time ran out
  }, config.clockTickIntervalMs);

  return { app, httpServer, io, clockInterval };
}

if (require.main === module) {
  const { httpServer } = createServer();
  httpServer.listen(config.port, () => {
    console.log(`[Xiangqi Server] Running on http://localhost:${config.port}`);
  });
}

