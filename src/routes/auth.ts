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

async function findUserByEmail(email: string) {
    const result = await db.query(
      `SELECT id, email, role, password_hash, created_at
        FROM users WHERE email = $1`,
        [email],
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
      
      const existingUser = await findUserByEmail(validated.email);
      if (existingUser) {
        return res.status(401).json({ error: 'an account with that email already exists' });
      }

      const user = await createUser(validated.email, validated.password);
      const sessionId = await createSession(user.id);

      res.cookie('sid', sessionId, { httpOnly: true });
      return res.status(201).json({ user });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateRegistration(req.body);
      if ('error' in validated) {
        return res.status(400).json({ error: validated.error });
      }

      const user =  await findUserByEmail(validated.email);
      if (!user) {
        return res.status(401).json({ error: 'invalid credentials' });
      }

      const isMatch = await bcrypt.compare(validated.password, user.password_hash);
      if(!isMatch) {
        return res.status(401).json({ error: 'invalid credentials' })
      }  

      const sessionId = await createSession(user.id);
      res.cookie('sid', sessionId, { httpOnly: true });

      const { password_hash, ...userSafe } = user;
      return res.status(200).json({ user: userSafe });

    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req:Request, res: Response, next: NextFunction) => {
    try {
      const sid = req.cookies?.sid;
      if (!sid) {
        return res.status(200).json({ ok: true });
      }

      await db.query(`DELETE FROM sessions WHERE id = $1`, [sid]);
      res.clearCookie('sid', { path: '/'});
    
      return res.status(200).json({ ok: true });
    } catch (error) {
      return next(error);
    }
  })

router.get('/me', requireSession, (req: Request, res: Response) => {
    return res.status(200).json({ user: res.locals.user });
});

export default router;