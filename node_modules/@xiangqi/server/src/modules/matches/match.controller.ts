import { Router, Request, Response } from 'express';
import { matchService } from './match.service';
import { authService } from '../auth/auth.service';

const router = Router();

// Get match detail with all moves for replay
router.get('/matches/:id', async (req: Request, res: Response) => {
  try {
    const match = await matchService.getMatchById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Không tìm thấy ván đấu' });
    }
    return res.status(200).json(match);
  } catch (err: any) {
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Get user profile
router.get('/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    return res.status(200).json(user);
  } catch (err: any) {
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Get user matches
router.get('/users/:userId/matches', async (req: Request, res: Response) => {
  try {
    const matches = await matchService.getUserMatches(req.params.userId, 20);
    return res.status(200).json(matches);
  } catch (err: any) {
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Get recent matches
router.get('/matches', async (req: Request, res: Response) => {
  try {
    const matches = await matchService.getRecentMatches(15);
    return res.status(200).json(matches);
  } catch (err: any) {
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Get Leaderboard
router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const leaderboard = await matchService.getLeaderboard(25);
    return res.status(200).json(leaderboard);
  } catch (err: any) {
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

export const matchRouter = router;

