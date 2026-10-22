const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000;

function getCookieSecret() {
  const secret = process.env.COOKIE_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('COOKIE_SECRET must contain at least 32 characters');
  }
  return secret;
}

function getSessionTtlMs() {
  const rawTtl = process.env.SESSION_TTL_MS;
  const ttlMs = rawTtl === undefined ? DEFAULT_SESSION_TTL_MS : Number(rawTtl);
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new Error('SESSION_TTL_MS must be a positive integer');
  }
  return ttlMs;
}

function getCookieOptions({ clear = false } = {}) {
  const rawSecure = process.env.COOKIE_SECURE ?? 'false';
  if (rawSecure !== 'true' && rawSecure !== 'false') {
    throw new Error('COOKIE_SECURE must be either true or false');
  }

  const options = {
    httpOnly: true,
    secure: rawSecure === 'true',
    sameSite: 'lax',
    path: '/',
    signed: true,
  };

  if (!clear) options.maxAge = getSessionTtlMs();
  return options;
}

module.exports = { getCookieSecret, getSessionTtlMs, getCookieOptions };
