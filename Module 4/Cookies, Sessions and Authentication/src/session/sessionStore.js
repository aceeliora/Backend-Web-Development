const { randomBytes } = require('node:crypto');
const { getSessionTtlMs } = require('../config/sessionCookie');

const sessions = new Map();

function create(userId, ttlMs = getSessionTtlMs()) {
  if (userId === undefined || userId === null) {
    throw new TypeError('A user ID is required to create a session');
  }
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new TypeError('Session lifetime must be a positive integer');
  }

  const id = randomBytes(32).toString('base64url');
  const session = { userId, expiresAt: Date.now() + ttlMs };
  sessions.set(id, session);
  return { id, ...session };
}

function get(id) {
  if (typeof id !== 'string' || id.length === 0) return null;

  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return { ...session };
}

function destroy(id) {
  if (typeof id === 'string') sessions.delete(id);
}

function clear() {
  sessions.clear();
}

module.exports = { create, get, destroy, clear };
