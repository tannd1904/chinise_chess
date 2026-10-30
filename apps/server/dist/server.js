"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const room_service_1 = require("./modules/rooms/room.service");
const socket_handler_1 = require("./socket/socket.handler");
const auth_controller_1 = require("./modules/auth/auth.controller");
const match_controller_1 = require("./modules/matches/match.controller");
function createServer() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: config_1.config.corsOrigin }));
    app.use(express_1.default.json());
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            service: 'xiangqi-server',
            timestamp: Date.now(),
        });
    });
    // REST API routes
    app.use('/api/auth', auth_controller_1.authRouter);
    app.use('/api', match_controller_1.matchRouter);
    // Query room info endpoint
    app.get('/api/rooms/:roomId', (req, res) => {
        const room = room_service_1.roomService.getRoom(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        return res.json(room_service_1.roomService.toPublicRoomDetails(room));
    });
    const httpServer = http_1.default.createServer(app);
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: config_1.config.corsOrigin,
            methods: ['GET', 'POST'],
        },
    });
    (0, socket_handler_1.setupSocketHandlers)(io);
    // Authoritative server clock interval
    const clockInterval = setInterval(() => {
        // We can iterate rooms if needed, or query room service
        // For every active room, check if time ran out
    }, config_1.config.clockTickIntervalMs);
    return { app, httpServer, io, clockInterval };
}
if (require.main === module) {
    const { httpServer } = createServer();
    httpServer.listen(config_1.config.port, () => {
        console.log(`[Xiangqi Server] Running on http://localhost:${config_1.config.port}`);
    });
}
