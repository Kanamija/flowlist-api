import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../index.ts';
import db from '../config/db.ts';


describe('auth routes', () => {
    const testEmail = 'auth-register-test@example.com';

    afterEach(async () => {
        await db.query(
           `DELETE FROM sessions
            WHERE user_id IN (SELECT id FROM users WHERE email = $1)`,
            [testEmail], 
        );

        await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
    });

    it('returns 401 from /api/auth/me when there is no session cookie', async () => {
        const response = await request(app).get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'not authenticated' });
    });

    it('returns 400 from /api/auth/register when email or password is missing', async () => {
        const response = await request(app)
        .post('/api/auth/register')
        .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'email and password are required' });
    });

    it('returns 400 from /api/auth/register when email is invalid', async () => {
        const response = await request(app)
        .post('/api/auth/register')
        .send({
        email: 'not-an-email',
        password: 'password123',
    });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'invalid email' });
    });

    it('registers a new user and sets a session cookie', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
      });

        expect(response.status).toBe(201);
        expect(response.body.user).toMatchObject({
        email: testEmail,
        role: 'student',
        });
        expect(response.headers['set-cookie']).toBeDefined();
  });


});