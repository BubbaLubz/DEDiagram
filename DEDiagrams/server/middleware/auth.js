/**
 * auth.js — Express authentication middleware using Clerk.
 *
 * Two variants:
 *   requireAuth  — blocks unauthenticated requests with 401
 *   optionalAuth — attaches req.auth when a valid token is present,
 *                  passes through anonymously when none is provided
 *
 * Both attach req.auth = { userId: string } on success.
 * This shape is the stable contract; do not access Clerk-specific fields
 * in route handlers — use req.auth.userId only.
 */
const { createClerkClient, verifyToken } = require('@clerk/express');

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * @param {import('express').Request} req
 * @returns {string | null} Bearer token from the Authorization header, or null
 */
function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Verifies a Clerk JWT.
 * @param {string} token
 * @returns {Promise<{ userId: string }>}
 * @throws if the token is invalid or expired
 */
async function verifyClerkToken(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  return { userId: payload.sub };
}

/**
 * Blocks unauthenticated requests.
 * Attaches req.auth = { userId } on success.
 */
async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.auth = await verifyClerkToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Attaches auth context when available, does not block if missing.
 */
async function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    req.auth = null;
    return next();
  }
  try {
    req.auth = await verifyClerkToken(token);
  } catch {
    req.auth = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth, clerkClient };
