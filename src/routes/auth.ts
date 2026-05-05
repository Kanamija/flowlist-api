import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/sessions.ts';

const router = Router();

router.get('/me', requireSession, (req: Request, res: Response) => {
    return res.status(200).json({ user: res.locals.user });
});

export default router;