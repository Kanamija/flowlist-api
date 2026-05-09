
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
        return res.status(401).json({error: 'not authenticated'}); 
    }

    // Join sessions -> users so we get both in one round trip.
    // Reject if the session is expired.
    const result = await db.query(
        `SELECT
            sessions.id AS session_id,
            sessions.expires_at AS session_expires_at,
            users.id AS user_id,
            users.email AS user_email,
            users.role AS user_role,
            users.created_at AS user_created_at,
            users.full_name AS full_name
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.id = $1
            AND sessions.expires_at > NOW()`,
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
        full_name: row.full_name,
    };
    res.locals.sessionId = row.session_id;

    return next()
} catch (error) {
    return next(error);
}
}