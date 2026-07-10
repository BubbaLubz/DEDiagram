/**
 * Integration tests for permission and sharing routes.
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

// ─── GET /api/diagrams/:id/members ───────────────────────────────────────────

describe('GET /api/diagrams/:id/members', () => {
  it('returns member list when getDiagramMembers is available', async () => {
    const members = [
      { role: 'owner', user_id: 'user-1', users: { display_name: 'Alice', avatar_url: null, email: 'alice@test.com' } },
      { role: 'editor', user_id: 'user-2', users: { display_name: 'Bob', avatar_url: null, email: 'bob@test.com' } },
    ];
    db.getDiagramMembers = jest.fn().mockResolvedValue(members);

    const res = await request(app).get('/api/diagrams/diag-1/members');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].role).toBe('owner');
    expect(db.getDiagramMembers).toHaveBeenCalledWith('diag-1');
  });

  it('returns empty array when getDiagramMembers is not available', async () => {
    db.getDiagramMembers = undefined;

    const res = await request(app).get('/api/diagrams/diag-1/members');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── POST /api/diagrams/:id/invite ───────────────────────────────────────────

describe('POST /api/diagrams/:id/invite', () => {
  it('returns 400 when userId is missing', async () => {
    const res = await request(app)
      .post('/api/diagrams/diag-1/invite')
      .send({ role: 'editor' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/userId/i);
  });

  it('returns 400 when role is missing', async () => {
    const res = await request(app)
      .post('/api/diagrams/diag-1/invite')
      .send({ userId: 'user-2' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
  });

  it('returns 400 when role is invalid', async () => {
    const res = await request(app)
      .post('/api/diagrams/diag-1/invite')
      .send({ userId: 'user-2', role: 'owner' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/editor or viewer/i);
  });

  it('returns 501 when setPermission is not available (JSON mode)', async () => {
    db.setPermission = undefined;

    const res = await request(app)
      .post('/api/diagrams/diag-1/invite')
      .send({ userId: 'user-2', role: 'editor' });

    expect(res.status).toBe(501);
  });

  it('grants editor access and returns the permission record', async () => {
    const permRecord = { diagram_id: 'diag-1', user_id: 'user-2', role: 'editor' };
    db.setPermission = jest.fn().mockResolvedValue(permRecord);

    const res = await request(app)
      .post('/api/diagrams/diag-1/invite')
      .send({ userId: 'user-2', role: 'editor' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('editor');
    expect(db.setPermission).toHaveBeenCalledWith({
      diagramId: 'diag-1',
      userId: 'user-2',
      role: 'editor',
      invitedBy: 'test-user',
    });
  });
});

// ─── DELETE /api/diagrams/:id/members/:userId ─────────────────────────────────

describe('DELETE /api/diagrams/:id/members/:userId', () => {
  it('removes the member and returns success', async () => {
    db.removePermission = jest.fn().mockResolvedValue(true);

    const res = await request(app).delete('/api/diagrams/diag-1/members/user-2');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.removePermission).toHaveBeenCalledWith('diag-1', 'user-2');
  });

  it('returns 501 when removePermission is not available', async () => {
    db.removePermission = undefined;

    const res = await request(app).delete('/api/diagrams/diag-1/members/user-2');

    expect(res.status).toBe(501);
  });
});

// ─── POST /api/diagrams/:id/share-link ───────────────────────────────────────

describe('POST /api/diagrams/:id/share-link', () => {
  it('creates a share link and returns token + role', async () => {
    const linkResult = { share_link_token: 'abc123', share_link_role: 'viewer' };
    db.setShareLink = jest.fn().mockResolvedValue(linkResult);

    const res = await request(app)
      .post('/api/diagrams/diag-1/share-link')
      .send({ role: 'viewer' });

    expect(res.status).toBe(200);
    expect(res.body.share_link_token).toBe('abc123');
    expect(res.body.share_link_role).toBe('viewer');
    expect(db.setShareLink).toHaveBeenCalledWith('diag-1', 'test-user', 'viewer');
  });

  it('returns 403 when user is not the owner', async () => {
    db.setShareLink = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .post('/api/diagrams/diag-1/share-link')
      .send({ role: 'viewer' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/owner/i);
  });

  it('returns 501 when setShareLink is not available', async () => {
    db.setShareLink = undefined;

    const res = await request(app)
      .post('/api/diagrams/diag-1/share-link')
      .send({ role: 'viewer' });

    expect(res.status).toBe(501);
  });
});

// ─── GET /api/join/:token ─────────────────────────────────────────────────────

describe('GET /api/join/:token', () => {
  it('resolves a valid token to diagramId and role', async () => {
    db.getDiagramByShareToken = jest.fn().mockResolvedValue({ id: 'diag-1', share_link_role: 'viewer' });

    const res = await request(app).get('/api/join/abc123');

    expect(res.status).toBe(200);
    expect(res.body.diagramId).toBe('diag-1');
    expect(res.body.role).toBe('viewer');
    expect(db.getDiagramByShareToken).toHaveBeenCalledWith('abc123');
  });

  it('returns 404 for an invalid token', async () => {
    db.getDiagramByShareToken = jest.fn().mockResolvedValue(null);

    const res = await request(app).get('/api/join/bad-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 404 when getDiagramByShareToken is not available', async () => {
    db.getDiagramByShareToken = undefined;

    const res = await request(app).get('/api/join/any-token');

    expect(res.status).toBe(404);
  });
});
