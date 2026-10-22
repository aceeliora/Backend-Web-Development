const express = require('express');
const bcrypt = require('bcryptjs');
const sessionStore = require('../session/sessionStore');
const users = require('../repositories/userRepository');
const { getCookieOptions } = require('../config/sessionCookie');
const requireSession = require('../middleware/requireSession');

const router = express.Router();
const COOKIE_NAME = 'sid';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function invalidCredentials(res) {
  return res.status(401).json({
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  });
}

function invalidInput(res) {
  return res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: 'A valid email and password are required' },
  });
}

router.post('/login', async (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalidInput(res);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;
  if (!EMAIL_PATTERN.test(email) || typeof password !== 'string' || password.length === 0) {
    return invalidInput(res);
  }

  try {
    const user = await users.findForAuthentication(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return invalidCredentials(res);
    }

    // Every successful login gets a fresh, cryptographically random session ID.
    const session = sessionStore.create(user.id);
    res.cookie(COOKIE_NAME, session.id, getCookieOptions());
    return res.status(200).json({ data: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireSession, (req, res) => {
  return res.status(200).json({ data: publicUser(req.user) });
});

router.post('/logout', (req, res, next) => {
  try {
    const sessionId = req.signedCookies?.sid;
    if (typeof sessionId === 'string') sessionStore.destroy(sessionId);
    res.clearCookie(COOKIE_NAME, getCookieOptions({ clear: true }));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
