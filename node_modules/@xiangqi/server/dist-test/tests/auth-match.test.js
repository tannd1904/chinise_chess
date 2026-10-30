"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const http_1 = __importDefault(require("http"));
const server_1 = require("../src/server");
const prisma_1 = require("../src/infrastructure/prisma");
const match_service_1 = require("../src/modules/matches/match.service");
async function makeRequest(port, path, method, body, token) {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : '';
        const headers = {
            'Content-Type': 'application/json',
        };
        if (body) {
            headers['Content-Length'] = Buffer.byteLength(postData).toString();
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const req = http_1.default.request({
            hostname: 'localhost',
            port,
            path,
            method,
            headers,
        }, (res) => {
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
                let data;
                try {
                    data = JSON.parse(raw);
                }
                catch {
                    data = raw;
                }
                resolve({ status: res.statusCode || 500, data });
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}
async function runAuthAndMatchTests() {
    console.log('=== Starting Phase 2: Auth & Match Persistence Tests ===');
    const { httpServer, clockInterval } = (0, server_1.createServer)();
    const PORT = 4055;
    await new Promise((resolve) => httpServer.listen(PORT, resolve));
    console.log(`Test server running on port ${PORT}`);
    try {
        const rand = Math.floor(Math.random() * 100000);
        const redEmail = `red_player_${rand}@example.com`;
        const blackEmail = `black_player_${rand}@example.com`;
        // 1. Register Red Player
        console.log('[Step 1] Register Red Player...');
        const regRed = await makeRequest(PORT, '/api/auth/register', 'POST', {
            email: redEmail,
            password: 'password123',
            displayName: 'Kỳ Thủ Đỏ',
        });
        assert_1.default.strictEqual(regRed.status, 201, `Red register failed: ${JSON.stringify(regRed.data)}`);
        assert_1.default.ok(regRed.data.token, 'Must return JWT token');
        assert_1.default.strictEqual(regRed.data.user.email, redEmail);
        assert_1.default.strictEqual(regRed.data.user.eloRating, 1200);
        const redToken = regRed.data.token;
        const redUserId = regRed.data.user.id;
        console.log('✔ Red player registered successfully');
        // 2. Reject Duplicate Email
        console.log('[Step 2] Reject duplicate email...');
        const dupReg = await makeRequest(PORT, '/api/auth/register', 'POST', {
            email: redEmail,
            password: 'newpassword123',
            displayName: 'Kỳ Thủ Đỏ Khác',
        });
        assert_1.default.strictEqual(dupReg.status, 400);
        console.log('✔ Duplicate email correctly rejected');
        // 3. Register Black Player
        console.log('[Step 3] Register Black Player...');
        const regBlack = await makeRequest(PORT, '/api/auth/register', 'POST', {
            email: blackEmail,
            password: 'password456',
            displayName: 'Kỳ Thủ Đen',
        });
        assert_1.default.strictEqual(regBlack.status, 201);
        const blackUserId = regBlack.data.user.id;
        console.log('✔ Black player registered successfully');
        // 4. Login Check
        console.log('[Step 4] Login validation...');
        const badLogin = await makeRequest(PORT, '/api/auth/login', 'POST', {
            email: redEmail,
            password: 'wrongpassword',
        });
        assert_1.default.strictEqual(badLogin.status, 400);
        const goodLogin = await makeRequest(PORT, '/api/auth/login', 'POST', {
            email: redEmail,
            password: 'password123',
        });
        assert_1.default.strictEqual(goodLogin.status, 200);
        assert_1.default.ok(goodLogin.data.token);
        console.log('✔ Login credentials validated correctly');
        // 5. Auth Me Endpoint
        console.log('[Step 5] Verify /api/auth/me with Bearer token...');
        const meRes = await makeRequest(PORT, '/api/auth/me', 'GET', null, redToken);
        assert_1.default.strictEqual(meRes.status, 200);
        assert_1.default.strictEqual(meRes.data.id, redUserId);
        assert_1.default.strictEqual(meRes.data.displayName, 'Kỳ Thủ Đỏ');
        console.log('✔ Protected profile retrieved successfully');
        // 6. Match Persistence & ELO calculation
        console.log('[Step 6] Persist finished match & update ELO...');
        const savedMatch = await match_service_1.matchService.saveFinishedMatch({
            roomCode: 'TEST01',
            redPlayerId: redUserId,
            blackPlayerId: blackUserId,
            redPlayerName: 'Kỳ Thủ Đỏ',
            blackPlayerName: 'Kỳ Thủ Đen',
            result: 'RED_WIN',
            winnerColor: 'RED',
            terminationReason: 'Checkmate (RED wins!)',
            timeControl: 'rapid',
            startedAt: new Date(Date.now() - 300000),
            endedAt: new Date(),
            moves: [
                {
                    from: { x: 1, y: 7 },
                    to: { x: 4, y: 7 },
                },
                {
                    from: { x: 1, y: 0 },
                    to: { x: 2, y: 2 },
                },
            ],
        });
        assert_1.default.ok(savedMatch.id);
        assert_1.default.strictEqual(savedMatch.result, 'RED_WIN');
        assert_1.default.strictEqual(savedMatch.moves.length, 2);
        console.log('✔ Match & 2 moves persisted to database');
        // 7. Verify ELO & Stats updated for both players
        console.log('[Step 7] Verify user stats in DB...');
        const updatedRed = await prisma_1.prisma.user.findUnique({ where: { id: redUserId } });
        const updatedBlack = await prisma_1.prisma.user.findUnique({ where: { id: blackUserId } });
        assert_1.default.strictEqual(updatedRed?.wins, 1);
        assert_1.default.ok(updatedRed.eloRating > 1200, `Red ELO should increase from 1200, got ${updatedRed?.eloRating}`);
        assert_1.default.strictEqual(updatedBlack?.losses, 1);
        assert_1.default.ok(updatedBlack.eloRating < 1200, `Black ELO should decrease from 1200, got ${updatedBlack?.eloRating}`);
        console.log(`✔ Red ELO updated to ${updatedRed?.eloRating}, Black ELO updated to ${updatedBlack?.eloRating}`);
        // 8. Query match by ID (Replay endpoint)
        console.log('[Step 8] Test GET /api/matches/:id replay endpoint...');
        const matchDetailRes = await makeRequest(PORT, `/api/matches/${savedMatch.id}`, 'GET');
        assert_1.default.strictEqual(matchDetailRes.status, 200);
        assert_1.default.strictEqual(matchDetailRes.data.moves.length, 2);
        assert_1.default.strictEqual(matchDetailRes.data.moves[0].fromX, 1);
        assert_1.default.strictEqual(matchDetailRes.data.moves[0].toX, 4);
        console.log('✔ Replay endpoint returned complete move history');
        // 9. Query Leaderboard
        console.log('[Step 9] Test GET /api/leaderboard...');
        const leaderboardRes = await makeRequest(PORT, '/api/leaderboard', 'GET');
        assert_1.default.strictEqual(leaderboardRes.status, 200);
        assert_1.default.ok(Array.isArray(leaderboardRes.data));
        assert_1.default.ok(leaderboardRes.data.length >= 2);
        // Red player should be ranked higher than Black player
        const redRankIndex = leaderboardRes.data.findIndex((u) => u.id === redUserId);
        const blackRankIndex = leaderboardRes.data.findIndex((u) => u.id === blackUserId);
        assert_1.default.ok(redRankIndex < blackRankIndex, 'Red should be ranked above Black on leaderboard');
        console.log('✔ Leaderboard returned correctly ranked users');
        console.log('=== ALL PHASE 2 AUTH & MATCH TESTS PASSED! ===');
    }
    finally {
        clearInterval(clockInterval);
        httpServer.close();
        await prisma_1.prisma.$disconnect();
        process.exit(0);
    }
}
runAuthAndMatchTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
