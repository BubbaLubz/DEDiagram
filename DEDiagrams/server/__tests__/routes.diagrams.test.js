/**
 * Integration tests for diagram CRUD routes.
 * db is fully mocked — no filesystem access occurs.
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

// ─── GET /api/diagrams ────────────────────────────────────────────────────────

describe('GET /api/diagrams', () => {
  it('returns the metadata list from db.listDiagrams', async () => {
    db.listDiagrams.mockReturnValue([
      { id: '1', name: 'Pipeline A', description: '', isTemplate: false, updatedAt: '2026-01-01', createdAt: '2026-01-01' },
    ]);

    const res = await request(app).get('/api/diagrams');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Pipeline A');
    expect(res.body[0].nodes).toBeUndefined();
  });

  it('returns an empty array when no diagrams exist', async () => {
    db.listDiagrams.mockReturnValue([]);
    const res = await request(app).get('/api/diagrams');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /api/diagrams/:id ────────────────────────────────────────────────────

describe('GET /api/diagrams/:id', () => {
  it('returns the full diagram for a known id', async () => {
    db.getDiagram.mockReturnValue({ id: '1', name: 'Test', nodes: [{ id: 'n1' }], edges: [] });

    const res = await request(app).get('/api/diagrams/1');

    expect(res.status).toBe(200);
    expect(res.body.nodes).toBeDefined();
    expect(res.body.id).toBe('1');
  });

  it('returns 404 for an unknown id', async () => {
    db.getDiagram.mockReturnValue(null);
    const res = await request(app).get('/api/diagrams/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

// ─── POST /api/diagrams ───────────────────────────────────────────────────────

describe('POST /api/diagrams', () => {
  it('creates a diagram and returns 201 with the new object', async () => {
    db.createDiagram.mockImplementation(d => d);

    const res = await request(app)
      .post('/api/diagrams')
      .send({ name: 'New Pipeline', nodes: [], edges: [] });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Pipeline');
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(db.createDiagram).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/diagrams').send({ nodes: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when nodes is missing', async () => {
    const res = await request(app).post('/api/diagrams').send({ name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('defaults edges to [] when omitted', async () => {
    db.createDiagram.mockImplementation(d => d);
    const res = await request(app).post('/api/diagrams').send({ name: 'T', nodes: [] });
    expect(res.body.edges).toEqual([]);
  });
});

// ─── PUT /api/diagrams/:id ────────────────────────────────────────────────────

describe('PUT /api/diagrams/:id', () => {
  it('updates and returns the diagram', async () => {
    db.updateDiagram.mockReturnValue({ id: '1', name: 'Updated Name' });

    const res = await request(app).put('/api/diagrams/1').send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(db.updateDiagram).toHaveBeenCalledWith('1', { name: 'Updated Name' });
  });

  it('returns 404 for an unknown id', async () => {
    db.updateDiagram.mockReturnValue(null);
    const res = await request(app).put('/api/diagrams/nope').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/diagrams/:id ─────────────────────────────────────────────────

describe('DELETE /api/diagrams/:id', () => {
  it('deletes a diagram and returns { success: true }', async () => {
    db.deleteDiagram.mockReturnValue(true);

    const res = await request(app).delete('/api/diagrams/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for an unknown id', async () => {
    db.deleteDiagram.mockReturnValue(false);
    const res = await request(app).delete('/api/diagrams/nope');
    expect(res.status).toBe(404);
  });
});
