"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '4000', 10),
    corsOrigin: process.env.CORS_ORIGIN || '*',
    jwtSecret: process.env.JWT_SECRET || 'xiangqi-super-secret-jwt-key-2026',
    reconnectGracePeriodMs: parseInt(process.env.RECONNECT_GRACE_PERIOD_MS || '60000', 10), // 60s
    clockTickIntervalMs: 1000,
    timeControls: {
        blitz: 3 * 60 * 1000, // 3 mins
        rapid: 10 * 60 * 1000, // 10 mins
        standard: 30 * 60 * 1000, // 30 mins
    },
};
