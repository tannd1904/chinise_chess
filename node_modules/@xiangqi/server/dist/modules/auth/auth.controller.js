"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_service_1 = require("./auth.service");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        const result = await auth_service_1.authService.register(email, password, displayName);
        return res.status(201).json(result);
    }
    catch (err) {
        return res.status(400).json({ message: err.message || 'Đăng ký thất bại' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await auth_service_1.authService.login(email, password);
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(400).json({ message: err.message || 'Đăng nhập thất bại' });
    }
});
router.get('/me', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await auth_service_1.authService.getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        return res.status(200).json(user);
    }
    catch (err) {
        return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});
exports.authRouter = router;
