/**
 * Integration tests for comment routes.
 * db is fully mocked — no filesystem or Supabase access occurs.
 * Auth middleware is mocked to bypass token verification.
 */
process.env.NODE_ENV = 'test';

jest.mock('../db');
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => { req.auth = { userId: 'test-user' }; next(); },
  optionalAuth: (req, _res, next) => { req.auth = { userId: 'test-user' }; next(); },
  clerkClient: {},
}));

const request = require('supertest');
const db = require('../db');
const { app } = require('../index');

// ─── GET /api/diagrams/:id/comments ──────────────────────────────────────────

describe('GET /api/diagrams/:id/comments', () => {
  it('returns comment list for a diagram', async () => {
    const comments = [
      { id: 'c1', diagram_id: 'diag-1', node_id: 'n1', author_id: 'test-user',
        parent_id: null, body: 'First comment', resolved: false,
        created_at: '2026-01-01T00:00:00Z', users: { display_name: 'Alice', avatar_url: null } },
    ];
    db.getComments = jest.fn().mockResolvedValue(comments);

    const res = await request(app).get('/api/diagrams/diag-1/comments');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].body).toBe('First comment');
    expect(db.getComments).toHaveBeenCalledWith('diag-1', undefined);
  });

  it('passes nodeId query param to db.getComments', async () => {
    db.getComments = jest.fn().mockResolvedValue([]);

    await request(app).get('/api/diagrams/diag-1/comments?nodeId=n1');

    expect(db.getComments).toHaveBeenCalledWith('diag-1', 'n1');
  });

  it('returns empty array when getComments is not available', async () => {
    db.getComments = undefined;

    const res = await request(app).get('/api/diagrams/diag-1/comments');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── POST /api/diagrams/:id/comments ─────────────────────────────────────────

describe('POST /api/diagrams/:id/comments', () => {
  it('returns 400 when nodeId is missing', async () => {
    const res = await request(app)
      .post('/api/diagrams/diag-1/comments')
      .send({ body: 'A comment' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nodeId/i);
  });

  it('returns 400 when body is missing', async () => {
    const res = await request(app)
      .post('/api/diagrams/diag-1/comments')
      .send({ nodeId: 'n1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/body/i);
  });

  it('creates a comment and returns 201', async () => {
    const created = {
      id: 'c1', diagram_id: 'diag-1', node_id: 'n1', author_id: 'test-user',
      parent_id: null, body: 'Hello', resolved: false,
      created_at: '2026-01-01T00:00:00Z', users: { display_name: 'Alice', avatar_url: null },
    };
    db.createComment = jest.fn().mockResolvedValue(created);

    const res = await request(app)
      .post('/api/diagrams/diag-1/comments')
      .send({ nodeId: 'n1', body: 'Hello' });

    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Hello');
    expect(res.body.id).toBe('c1');
    expect(db.createComment).toHaveBeenCalledWith({
      diagramId: 'diag-1',
      nodeId: 'n1',
      authorId: 'test-user',
      parentId: undefined,
      body: 'Hello',
    });
  });

  it('passes parentId when creating a reply', async () => {
    const created = { id: 'c2', body: 'Reply', parent_id: 'c1' };
    db.createComment = jest.fn().mockResolvedValue(created);

    const res = await request(app)
      .post('/api/diagrams/diag-1/comments')
      .send({ nodeId: 'n1', body: 'Reply', parentId: 'c1' });

    expect(res.status).toBe(201);
    expect(db.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'c1' })
    );
  });

  it('returns 501 when createComment is not available', async () => {
    db.createComment = undefined;

    const res = await request(app)
      .post('/api/diagrams/diag-1/comments')
      .send({ nodeId: 'n1', body: 'Hi' });

    expect(res.status).toBe(501);
  });
});

// ─── PATCH /api/comments/:commentId ──────────────────────────────────────────

describe('PATCH /api/comments/:commentId', () => {
  it('returns 400 when resolved is missing', async () => {
    const res = await request(app)
      .patch('/api/comments/c1')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/resolved/i);
  });

  it('resolves a comment and returns updated record', async () => {
    const updated = { id: 'c1', resolved: true, body: 'Hello' };
    db.resolveComment = jest.fn().mockResolvedValue(updated);

    const res = await request(app)
      .patch('/api/comments/c1')
      .send({ resolved: true });

    expect(res.status).toBe(200);
    expect(res.body.resolved).toBe(true);
    expect(db.resolveComment).toHaveBeenCalledWith('c1', 'test-user', true);
  });

  it('un-resolves a comment', async () => {
    const updated = { id: 'c1', resolved: false };
    db.resolveComment = jest.fn().mockResolvedValue(updated);

    const res = await request(app)
      .patch('/api/comments/c1')
      .send({ resolved: false });

    expect(res.status).toBe(200);
    expect(res.body.resolved).toBe(false);
  });

  it('returns 404 when comment is not found or user is not author', async () => {
    db.resolveComment = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/comments/c1')
      .send({ resolved: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 501 when resolveComment is not available', async () => {
    db.resolveComment = undefined;

    const res = await request(app)
      .patch('/api/comments/c1')
      .send({ resolved: true });

    expect(res.status).toBe(501);
  });
});
