import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';

// Values defined in vitest.config.js
const API_KEY = 'test-api-key';
const JWT_SECRET = 'test-jwt-secret';

// Helper to sign a token the same way the API does
const tokenFor = (user, options = { expiresIn: '10m' }) =>
  jwt.sign(user, JWT_SECRET, options);

let app;

beforeAll(async () => {
  // Build the Express app once; no port is opened
  app = await createApp();
});

describe('API key gate', () => {

  it('rejects a request without the apikey header', async () => {
    const res = await request(app).get('api/v1/users/list-all');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid API key');
  });

  it('reject a wrong apikey', async () => {
    const res = await request(app)
      .get('api/v1/users/list-all')
      .set('apikey', 'wrong');
    expect(res.status).toBe(401);
  });
});

describe('JWT gate', () => {

  it('requires a token on protected routes', async () => {
    const res = await request(app)
      .get('api/v1/users/list-all')
      .set('apikey', API_KEY);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects a malformed token', async () => {
    const res = await request(app)
      .get('api/v1/users/list-all')
      .set('apikey', API_KEY)
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('reject an expired token', async () => {
    const expired = tokenFor(
      { id: 1, role: 'Administrator' },
      { expiresIn: -10 }
    );
    const res = await request(app)
      .get('api/v1/users/list-all')
      .set('apikey', API_KEY)
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');
  });
});

describe('Role gate', () => {

  it('forbids a Guest on an Administrator-only route', async () => {
    const token = tokenFor({ id: 5, role: 'Guest' });
    const res = await request(app)
      .get('api/v1/users/list-all')
      .set('apikey', API_KEY)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('forbids Staff from opening a conversation (Guest only)', async () => {
    const token = tokenFor({ id: 2, role: 'Staff' });
    const res = await request(app)
      .get('api/v1/conversations/open')
      .set('apikey', API_KEY)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('validation gate', () => {

  it('login reject and empty body with 400', async () => {
    const res = await request(app)
      .get('api/v1/auth/login')
      .set('apikey', API_KEY)
      .send({});
    expect(res.status).toBe(400);
  });

  it('create message rejects an empty body with 400', async () => {
    const token = tokenFor({ id: 5, role: 'Guest' });
    const res = await request(app)
      .get('api/v1/message/create')
      .set('apikey', API_KEY)
      .set('Authorization', `Bearer ${token}`)
      .send({ conversationId: '1', body: '' });
      expect(res.status).toBe(400);
  });
});

describe('token rotation', () => {

  it('returns a fresh X-Access-Token header on authenticated requests', async () => {
    const token = tokenFor({ id: 1, role: 'Administrator' });
    const res = await request(app)
      .get('api/v1/users/list-all')
      .set('apikey', API_KEY)
      .set('Authorization', `Bearer ${token}`);
    expect(res.headers['X-Access-Token']).toBeTruthy();
  });
});

describe('GraphQL', () => {

  it('returns INVALID_TOKEN for `me` without a token', async () => {
    const res = await request(app)
      .post('api/v1/graphql')
      .send({ query: '{ me { id } }'});
    expect(res.body.errors[0].extensions.code).toBe('INVALID_TOKEN');
  });
});
