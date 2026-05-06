import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/db.ts';
import { requireSession } from '../middleware/sessions.ts';

const router = Router();

const SESSION_TTL_DAYS = 7;

function validateRegistration(body: any) {
    const { email, password } = body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'email and password are required' };
    }
    if (!email.includes('@')) {
      return { error: 'invalid email' };
    }
    return { email: email.toLowerCase(), password};
  }

async function createUser(email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email, role, created_at`,
        [email, passwordHash],
    );
    return result.rows[0];
  }

async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  const result = await db.query(
    `INSERT INTO sessions (user_id, expires_at)
    VALUES ($1, $2)
    RETURNING id`,
    [userId, expiresAt],
  )
  return result.rows[0].id;
}  

  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateRegistration(req.body);
      if ('error' in validated) {
        return res.status(400).json({ error: validated.error });
      }

      const user = await createUser(validated.email, validated.password);
      const sessionId = await createSession(user.id);

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