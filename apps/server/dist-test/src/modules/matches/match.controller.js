"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRouter = void 0;
const express_1 = require("express");
const match_service_1 = require("./match.service");
const auth_service_1 = require("../auth/auth.service");
const router = (0, express_1.Router)();
// Get match detail with all moves for replay
router.get('/matches/:id', async (req, res) => {
    try {
        const match = await match_service_1.matchService.getMatchById(req.params.id);
        if (!match) {
            return res.status(404).json({ message: 'Không tìm thấy ván đấu' });
        }
        return res.status(200).json(match);
    }
    catch (err) {
        return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});
// Get user profile
router.get('/users/:userId/profile', async (req, res) => {
    try {
        const user = await auth_service_1.authService.getUserById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        return res.status(200).json(user);
    }
    catch (err) {
        return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});
// Get user matches
router.get('/users/:userId/matches', async (req, res) => {
    try {
        const matches = await match_service_1.matchService.getUserMatches(req.params.userId, 20);
        return res.status(200).json(matches);
    }
    catch (err) {
        return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});
// Get recent matches
router.get('/matches', async (req, res) => {
    try {
        const matches = await match_service_1.matchService.getRecentMatches(15);
        return res.status(200).json(matches);
    }
    catch (err) {
        return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});
// Get Leaderboard
router.get('/leaderboard', async (_req, res) => {
    try {
        const leaderboard = await match_service_1.matchService.getLeaderboard(25);
        return res.status(200).json(leaderboard);
    }
    catch (err) {
        return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});
exports.matchRouter = router;
