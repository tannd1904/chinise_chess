"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
exports.formatUserProfile = formatUserProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../infrastructure/prisma");
const config_1 = require("../../config");
function formatUserProfile(user) {
    const matchesPlayed = user.wins + user.losses + user.draws;
    const winRate = matchesPlayed > 0 ? Math.round((user.wins / matchesPlayed) * 1000) / 10 : 0;
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        eloRating: user.eloRating,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        matchesPlayed,
        winRate,
        createdAt: user.createdAt.toISOString(),
    };
}
class AuthService {
    async register(email, password, displayName) {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = displayName.trim();
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            throw new Error('Email không hợp lệ');
        }
        if (!password || password.length < 6) {
            throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
        }
        if (!trimmedName || trimmedName.length < 2) {
            throw new Error('Tên hiển thị phải có ít nhất 2 ký tự');
        }
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email: trimmedEmail },
        });
        if (existingUser) {
            throw new Error('Email này đã được sử dụng');
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const user = await prisma_1.prisma.user.create({
            data: {
                email: trimmedEmail,
                passwordHash,
                displayName: trimmedName,
                eloRating: 1200,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, config_1.config.jwtSecret, { expiresIn: '7d' });
        return {
            token,
            user: formatUserProfile(user),
        };
    }
    async login(email, password) {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !password) {
            throw new Error('Vui lòng nhập email và mật khẩu');
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: trimmedEmail },
        });
        if (!user) {
            throw new Error('Email hoặc mật khẩu không chính xác');
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new Error('Email hoặc mật khẩu không chính xác');
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, config_1.config.jwtSecret, { expiresIn: '7d' });
        return {
            token,
            user: formatUserProfile(user),
        };
    }
    async getUserById(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user)
            return null;
        return formatUserProfile(user);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
