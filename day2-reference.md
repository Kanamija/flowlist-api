# FlowList Day 2 — Code Reference

This is the code we'll walk through line by line tonight. Don't copy-paste —
the goal is to type each line yourself while I explain what it does.

Pre-work before walkthrough:
1. `npm install cookie-parser @types/cookie-parser` (in /Users/kanamianderson/dev/flowlist-api)
2. Confirm `src/routes/auth.ts` and `src/middleware/session.ts` do NOT exist (you deleted them)
3. Confirm `src/index.ts` is back to its original state — only has /api/health, no cookie-parser, no authRouter

What we're building today:
- POST /api/auth/register
- Session middleware (used by future protected routes)
- Cookie-parser wired into Express

Login + /me come AFTER this is verified working in Postman.

---

## File 1: src/routes/auth.ts (NEW FILE)

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/db.ts';

const router = Router();

// How long a session lives. Adjust as needed.
const SESSION_TTL_DAYS = 7;

// Cookie options used everywhere we set the sid cookie.
// httpOnly = JS in the browser can't read it (XSS protection)
// sameSite 'lax' = sent on top-level navigations, blocks most CSRF
// secure: true in production so cookie is only sent over HTTPS
const sidCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000, // ms
  path: '/',
};

// POST /api/auth/register
// Body: { email, password }
// Hashes password, inserts user, creates a session row, sets sid cookie.
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body ?? {};

    // Minimal validation. Tighten later if needed.
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Insert user. role defaults to 'student' in the DB.
    // Lowercase the email so 'Foo@bar.com' and 'foo@bar.com' don't both register.
    let userResult;
    try {
      userResult = await db.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, role, created_at`,
        [email.toLowerCase(), password_hash]
      );
    } catch (err: any) {
      // 23505 = unique_violation. Email already registered.
      if (err?.code === '23505') {
        return res.status(409).json({ error: 'email already registered' });
      }
      throw err;
    }

    const user = userResult.rows[0];

    // Create session row. id and created_at use DB defaults.
    const sessionResult = await db.query(
      `INSERT INTO sessions (user_id, expires_at)
       VALUES ($1, NOW() + ($2 || ' days')::interval)
       RETURNING id`,
      [user.id, SESSION_TTL_DAYS]
    );

    const sessionId = sessionResult.rows[0].id;

    res.cookie('sid', sessionId, sidCookieOptions);

    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
});

export default router;
```

Concepts to discuss tonight:
- Why Router() instead of putting routes directly on app
- Why bcrypt instead of plain hashing (cost factor, salt)
- Why we lowercase email before insert
- Why 23505 is the unique_violation code (Postgres error codes)
- Why httpOnly + sameSite + secure on the cookie
- Why interval math is done in SQL not JS
- Why `res.locals` will become important in the next file

---

## File 2: src/middleware/session.ts (NEW FILE)

```typescript
import { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';

// Session middleware.
// Reads the 'sid' cookie, looks up the session row, validates it hasn't expired,
// then attaches the user to res.locals.user. If anything fails -> 401.
//
// Use this on any route that requires login (e.g. router.get('/me', requireSession, handler)).
export async function requireSession(req: Request, res: Response, next: NextFunction) {
  try {
    const sid = req.cookies?.sid;

    if (!sid) {
      return res.status(401).json({ error: 'not authenticated' });
    }

    // Join sessions -> users so we get both in one round trip.
    // Reject if the session is expired.
    const result = await db.query(
      `SELECT
         s.id          AS session_id,
         s.expires_at  AS session_expires_at,
         u.id          AS user_id,
         u.email       AS user_email,
         u.role        AS user_role,
         u.created_at  AS user_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1
         AND s.expires_at > NOW()`,
      [sid]
    );

    if (result.rows.length === 0) {
      // Either no row or expired. Clear the bad cookie.
      res.clearCookie('sid', { path: '/' });
      return res.status(401).json({ error: 'invalid or expired session' });
    }

    const row = result.rows[0];
    res.locals.user = {
      id: row.user_id,
      email: row.user_email,
      role: row.user_role,
      created_at: row.user_created_at,
    };
    res.locals.sessionId = row.session_id;

    return next();
  } catch (err) {
    return next(err);
  }
}
```

Concepts to discuss tonight:
- Why this is middleware (not a route)
- Why we join in SQL instead of two queries
- Why expires_at > NOW() lives in WHERE, not in JS
- res.locals vs req — what's the convention and why
- Why we clearCookie when we find an invalid sid
- Why next(err) on the catch — what the global error handler does

---

## File 3: src/index.ts (EDITS — not a new file)

Four additions to your existing index.ts. The original file stays the same;
we just splice these in.

Add at the top with the other imports:
```typescript
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.ts';
```

Add right after `app.use(express.urlencoded({ extended: true}));`:
```typescript
app.use(cookieParser());
```

Add right BEFORE the catch-all 404 (the `app.use((req, res) => res.status(404)...)` line):
```typescript
// Auth routes: /api/auth/register, /api/auth/login, /api/auth/me, /api/auth/logout
app.use('/api/auth', authRouter);
```

Concepts to discuss tonight:
- Middleware order matters — why cookieParser must come before authRouter
- Why /api/auth is mounted as a prefix (router-level paths are relative)
- Why catch-all 404 stays at the BOTTOM
- The whole pipeline for a request: parse JSON -> parse cookies -> route match -> handler -> error

---

## After everything is typed: verification in Postman

1. Restart the server: `npm run dev`
2. Postman:
   - Method: POST
   - URL: http://localhost:3000/api/auth/register
   - Headers: Content-Type: application/json
   - Body (raw JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "yogapass123"
     }
     ```
3. Expect: 201 with `{ "user": { "id": "...", "email": "test@example.com", "role": "student", "created_at": "..." } }`
4. Expect: a `sid` cookie in the response Cookies tab
5. In Supabase: one new row in `users`, one new row in `sessions` with matching `user_id`

Then we move on to login + /me + logout.

---

## Notes on db.ts import path

You'll see `import db from '../config/db.ts';` (with the .ts extension).
That matches the style already in your existing index.ts (`import db from './config/db.ts'`).
This is NOT standard TS — usually you'd omit the extension — but tsx allows it
and your project is already using this style, so we stay consistent.
If TypeScript complains, the fix is dropping `.ts` from those imports.
