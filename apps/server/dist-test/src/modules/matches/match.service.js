"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchService = exports.MatchService = void 0;
const prisma_1 = require("../../infrastructure/prisma");
class MatchService {
    async saveFinishedMatch(params) {
        const { roomCode, redPlayerId, blackPlayerId, redPlayerName, blackPlayerName, result, winnerColor, terminationReason, timeControl, startedAt, endedAt, moves, } = params;
        // Create match record
        const match = await prisma_1.prisma.match.create({
            data: {
                roomCode,
                redPlayerId: redPlayerId || null,
                blackPlayerId: blackPlayerId || null,
                redPlayerName,
                blackPlayerName,
                status: 'FINISHED',
                result,
                winnerColor: winnerColor || null,
                terminationReason,
                timeControl,
                totalMoves: moves.length,
                startedAt,
                endedAt,
            },
        });
        // Create match moves
        if (moves.length > 0) {
            await prisma_1.prisma.$transaction(moves.map((m, index) => prisma_1.prisma.matchMove.create({
                data: {
                    matchId: match.id,
                    moveNumber: index + 1,
                    playerColor: index % 2 === 0 ? 'RED' : 'BLACK',
                    fromX: m.from.x,
                    fromY: m.from.y,
                    toX: m.to.x,
                    toY: m.to.y,
                    capturedPiece: m.capturedPiece ? m.capturedPiece.type : null,
                },
            })));
        }
        // Update ELO and records for registered players
        await this.updatePlayerStatsAndElo(redPlayerId, blackPlayerId, result);
        const savedMoves = await prisma_1.prisma.matchMove.findMany({
            where: { matchId: match.id },
            orderBy: { moveNumber: 'asc' },
        });
        return {
            id: match.id,
            roomCode: match.roomCode,
            redPlayerId: match.redPlayerId,
            blackPlayerId: match.blackPlayerId,
            redPlayerName: match.redPlayerName,
            blackPlayerName: match.blackPlayerName,
            status: match.status,
            result: match.result,
            winnerColor: match.winnerColor,
            terminationReason: match.terminationReason,
            timeControl: match.timeControl,
            totalMoves: match.totalMoves,
            startedAt: match.startedAt.toISOString(),
            endedAt: match.endedAt.toISOString(),
            createdAt: match.createdAt.toISOString(),
            moves: savedMoves.map((m) => ({
                id: m.id,
                moveNumber: m.moveNumber,
                playerColor: m.playerColor,
                fromX: m.fromX,
                fromY: m.fromY,
                toX: m.toX,
                toY: m.toY,
                capturedPiece: m.capturedPiece,
                createdAt: m.createdAt.toISOString(),
            })),
        };
    }
    async updatePlayerStatsAndElo(redPlayerId, blackPlayerId, result) {
        if (!result)
            return;
        const redUser = redPlayerId ? await prisma_1.prisma.user.findUnique({ where: { id: redPlayerId } }) : null;
        const blackUser = blackPlayerId ? await prisma_1.prisma.user.findUnique({ where: { id: blackPlayerId } }) : null;
        if (!redUser && !blackUser)
            return;
        let redEloDelta = 0;
        let blackEloDelta = 0;
        if (redUser && blackUser) {
            const K = 32;
            const expectedRed = 1 / (1 + Math.pow(10, (blackUser.eloRating - redUser.eloRating) / 400));
            const expectedBlack = 1 - expectedRed;
            let actualRed = 0.5;
            let actualBlack = 0.5;
            if (result === 'RED_WIN') {
                actualRed = 1;
                actualBlack = 0;
            }
            else if (result === 'BLACK_WIN') {
                actualRed = 0;
                actualBlack = 1;
            }
            redEloDelta = Math.round(K * (actualRed - expectedRed));
            blackEloDelta = Math.round(K * (actualBlack - expectedBlack));
        }
        if (redUser) {
            await prisma_1.prisma.user.update({
                where: { id: redUser.id },
                data: {
                    wins: result === 'RED_WIN' ? { increment: 1 } : undefined,
                    losses: result === 'BLACK_WIN' ? { increment: 1 } : undefined,
                    draws: result === 'DRAW' ? { increment: 1 } : undefined,
                    eloRating: redEloDelta !== 0 ? Math.max(100, redUser.eloRating + redEloDelta) : undefined,
                },
            });
        }
        if (blackUser) {
            await prisma_1.prisma.user.update({
                where: { id: blackUser.id },
                data: {
                    wins: result === 'BLACK_WIN' ? { increment: 1 } : undefined,
                    losses: result === 'RED_WIN' ? { increment: 1 } : undefined,
                    draws: result === 'DRAW' ? { increment: 1 } : undefined,
                    eloRating: blackEloDelta !== 0 ? Math.max(100, blackUser.eloRating + blackEloDelta) : undefined,
                },
            });
        }
    }
    async getMatchById(matchId) {
        const match = await prisma_1.prisma.match.findUnique({
            where: { id: matchId },
            include: {
                moves: {
                    orderBy: { moveNumber: 'asc' },
                },
            },
        });
        if (!match)
            return null;
        return {
            id: match.id,
            roomCode: match.roomCode,
            redPlayerId: match.redPlayerId,
            blackPlayerId: match.blackPlayerId,
            redPlayerName: match.redPlayerName,
            blackPlayerName: match.blackPlayerName,
            status: match.status,
            result: match.result,
            winnerColor: match.winnerColor,
            terminationReason: match.terminationReason,
            timeControl: match.timeControl,
            totalMoves: match.totalMoves,
            startedAt: match.startedAt.toISOString(),
            endedAt: match.endedAt.toISOString(),
            createdAt: match.createdAt.toISOString(),
            moves: match.moves.map((m) => ({
                id: m.id,
                moveNumber: m.moveNumber,
                playerColor: m.playerColor,
                fromX: m.fromX,
                fromY: m.fromY,
                toX: m.toX,
                toY: m.toY,
                capturedPiece: m.capturedPiece,
                createdAt: m.createdAt.toISOString(),
            })),
        };
    }
    async getUserMatches(userId, limit = 20) {
        const matches = await prisma_1.prisma.match.findMany({
            where: {
                OR: [{ redPlayerId: userId }, { blackPlayerId: userId }],
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return matches.map((m) => ({
            id: m.id,
            roomCode: m.roomCode,
            redPlayerId: m.redPlayerId,
            blackPlayerId: m.blackPlayerId,
            redPlayerName: m.redPlayerName,
            blackPlayerName: m.blackPlayerName,
            status: m.status,
            result: m.result,
            winnerColor: m.winnerColor,
            terminationReason: m.terminationReason,
            timeControl: m.timeControl,
            totalMoves: m.totalMoves,
            startedAt: m.startedAt.toISOString(),
            endedAt: m.endedAt.toISOString(),
            createdAt: m.createdAt.toISOString(),
        }));
    }
    async getRecentMatches(limit = 10) {
        const matches = await prisma_1.prisma.match.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return matches.map((m) => ({
            id: m.id,
            roomCode: m.roomCode,
            redPlayerId: m.redPlayerId,
            blackPlayerId: m.blackPlayerId,
            redPlayerName: m.redPlayerName,
            blackPlayerName: m.blackPlayerName,
            status: m.status,
            result: m.result,
            winnerColor: m.winnerColor,
            terminationReason: m.terminationReason,
            timeControl: m.timeControl,
            totalMoves: m.totalMoves,
            startedAt: m.startedAt.toISOString(),
            endedAt: m.endedAt.toISOString(),
            createdAt: m.createdAt.toISOString(),
        }));
    }
    async getLeaderboard(limit = 20) {
        const users = await prisma_1.prisma.user.findMany({
            orderBy: { eloRating: 'desc' },
            take: limit,
        });
        return users.map((u, index) => {
            const matchesPlayed = u.wins + u.losses + u.draws;
            const winRate = matchesPlayed > 0 ? Math.round((u.wins / matchesPlayed) * 1000) / 10 : 0;
            return {
                rank: index + 1,
                id: u.id,
                displayName: u.displayName,
                avatarUrl: u.avatarUrl,
                eloRating: u.eloRating,
                wins: u.wins,
                losses: u.losses,
                draws: u.draws,
                matchesPlayed,
                winRate,
            };
        });
    }
}
exports.MatchService = MatchService;
exports.matchService = new MatchService();
