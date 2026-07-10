jest.mock('@clerk/express', () => ({
  createClerkClient: jest.fn(() => ({})),
  verifyToken: jest.fn(),
}));

const { verifyToken } = require('@clerk/express');
const { requireAuth, optionalAuth } = require('../auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ─── requireAuth ──────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization scheme is not Bearer', async () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    verifyToken.mockRejectedValue(new Error('Token expired'));
    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.auth and calls next when token is valid', async () => {
    verifyToken.mockResolvedValue({ sub: 'user_abc123' });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(req.auth).toEqual({ userId: 'user_abc123' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── optionalAuth ─────────────────────────────────────────────────────────────

describe('optionalAuth', () => {
  it('sets req.auth to null and calls next when no header is present', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.auth).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('attaches req.auth when a valid token is present', async () => {
    verifyToken.mockResolvedValue({ sub: 'user_xyz' });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.auth).toEqual({ userId: 'user_xyz' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets req.auth to null and calls next when token is invalid', async () => {
    verifyToken.mockRejectedValue(new Error('Invalid'));
    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = mockRes();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.auth).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
