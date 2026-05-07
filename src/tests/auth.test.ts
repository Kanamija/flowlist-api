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

    it('returns 401 from /api/auth/login when password is wrong', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
      });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrong-password',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'invalid credentials' });
    });

    it('returns 401 from /api/auth/login when email does not exist', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'never-registered@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'invalid credentials' });
    });

    it('logs in an existing user and sets a session cookie', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
      });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: testEmail,
      role: 'student',
    });
    expect(response.headers['set-cookie']).toBeDefined();
});

  it('returns 200 from /api/auth/logout when there is no session cookie', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
});

  it('deletes the session so /me returns 401 after logout', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'password123' });

    await agent.post('/api/auth/logout');

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'not authenticated' });
});

  it('supports a full register → /me → logout → /me round-trip', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'password123' });

    const meBefore = await agent.get('/api/auth/me');
    expect(meBefore.status).toBe(200);

    await agent.post('/api/auth/logout');

    const meAfter = await agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);
});

});