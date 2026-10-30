import { Router, Request, Response } from 'express';
import { authService } from './auth.service';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    const result = await authService.register(email, password, displayName);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Đăng ký thất bại' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Đăng nhập thất bại' });
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await authService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    return res.status(200).json(user);
  } catch (err: any) {
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

export const authRouter = router;

