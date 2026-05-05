import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../index.ts';

describe('auth routes', () => {
    it('returns 401 from /api/auth/me when there is no session cookie', async () => {
        const response = await request(app).get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'not authenticated' });
    });
});