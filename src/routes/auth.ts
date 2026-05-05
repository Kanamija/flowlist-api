import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/db.ts';
import { requireSession } from '../middleware/sessions.ts';

const router = Router();

const SESSION_TTL_DAYS = 7;

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'invalid email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedEmail = email.toLowerCase();

    const userResult = await db.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, role, created_at`,
      [normalizedEmail, passwordHash],
    );

    const user = userResult.rows[0];

    const sessionResult = await db.query(
      `INSERT INTO sessions (user_id, expires_at)
       VALUES ($1, NOW() + ($2 || ' days')::interval)
       RETURNING id`,
      [user.id, SESSION_TTL_DAYS],
    );

    const sessionId = sessionResult.rows[0].id;

    res.cookie('sid', sessionId, { httpOnly: true });

    return res.status(201).json({ user });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireSession, (req: Request, res: Response) => {
    return res.status(200).json({ user: res.locals.user });
});

export default router;