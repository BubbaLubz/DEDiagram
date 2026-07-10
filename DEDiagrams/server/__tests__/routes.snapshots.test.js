/**
 * Integration tests for snapshot routes.
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

// ─── GET /api/diagrams/:id/snapshots ─────────────────────────────────────────

describe('GET /api/diagrams/:id/snapshots', () => {
  it('returns snapshot list for a diagram', async () => {
    const snaps = [
      { id: 's1', name: 'Before refactor', trigger: 'manual', author_id: 'test-user',
        created_at: '2026-01-01T00:00:00Z', users: { display_name: 'Alice', avatar_url: null } },
      { id: 's2', name: 'AI generated v1', trigger: 'ai_apply', author_id: 'test-user',
        created_at: '2026-01-02T00:00:00Z', users: { display_name: 'Alice', avatar_url: null } },
    ];
    db.getSnapshots = jest.fn().mockResolvedValue(snaps);

    const res = await request(app).get('/api/diagrams/diag-1/snapshots');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Before refactor');
    expect(db.getSnapshots).toHaveBeenCalledWith('diag-1');
  });

  it('returns empty array when getSnapshots is not available', async () => {
    db.getSnapshots = undefined;

    const res = await request(app).get('/api/diagrams/diag-1/snapshots');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── POST /api/diagrams/:id/snapshots ────────────────────────────────────────

describe('POST /api/diagrams/:id/snapshots', () => {
  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/diagrams/diag-1/snapshots')
      .send({ nodes: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when nodes is missing', async () => {
    const res = await request(app)
      .post('/api/diagrams/diag-1/snapshots')
      .send({ name: 'My snapshot' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nodes/i);
  });

  it('creates a snapshot and returns 201', async () => {
    const created = {
      id: 's1', diagram_id: 'diag-1', name: 'My snapshot', trigger: 'manual',
      author_id: 'test-user', nodes: [], edges: [], created_at: '2026-01-01T00:00:00Z',
    };
    db.createSnapshot = jest.fn().mockResolvedValue(created);

    const res = await request(app)
      .post('/api/diagrams/diag-1/snapshots')
      .send({ name: 'My snapshot', nodes: [], edges: [] });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My snapshot');
    expect(res.body.id).toBe('s1');
    expect(db.createSnapshot).toHaveBeenCalledWith({
      diagramId: 'diag-1',
      name: 'My snapshot',
      trigger: 'manual',
      authorId: 'test-user',
      nodes: [],
      edges: [],
    });
  });

  it('uses the provided trigger value', async () => {
    const created = { id: 's2', name: 'AI snap', trigger: 'ai_apply' };
    db.createSnapshot = jest.fn().mockResolvedValue(created);

    const res = await request(app)
      .post('/api/diagrams/diag-1/snapshots')
      .send({ name: 'AI snap', trigger: 'ai_apply', nodes: [{ id: 'n1' }] });

    expect(res.status).toBe(201);
    expect(db.createSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'ai_apply' })
    );
  });

  it('returns 501 when createSnapshot is not available', async () => {
    db.createSnapshot = undefined;

    const res = await request(app)
      .post('/api/diagrams/diag-1/snapshots')
      .send({ name: 'Test', nodes: [] });

    expect(res.status).toBe(501);
  });
});

// ─── GET /api/snapshots/:snapshotId ──────────────────────────────────────────

describe('GET /api/snapshots/:snapshotId', () => {
  it('returns snapshot data for a valid id', async () => {
    const snap = {
      id: 's1', diagram_id: 'diag-1', name: 'Before refactor', trigger: 'manual',
      author_id: 'test-user', nodes: [{ id: 'n1' }], edges: [],
      created_at: '2026-01-01T00:00:00Z',
    };
    db.getSnapshot = jest.fn().mockResolvedValue(snap);

    const res = await request(app).get('/api/snapshots/s1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('s1');
    expect(res.body.nodes).toHaveLength(1);
    expect(db.getSnapshot).toHaveBeenCalledWith('s1');
  });

  it('returns 404 for an unknown snapshot id', async () => {
    db.getSnapshot = jest.fn().mockResolvedValue(null);

    const res = await request(app).get('/api/snapshots/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('returns 501 when getSnapshot is not available', async () => {
    db.getSnapshot = undefined;

    const res = await request(app).get('/api/snapshots/s1');

    expect(res.status).toBe(501);
  });
});
