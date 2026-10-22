const sessionStore = require('../session/sessionStore');
const users = require('../repositories/userRepository');

function rejectAuthentication(res) {
  return res.status(401).json({
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  });
}

module.exports = async function requireSession(req, res, next) {
  const sessionId = req.signedCookies?.sid;
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return rejectAuthentication(res);
  }

  try {
    const session = sessionStore.get(sessionId);
    if (!session) return rejectAuthentication(res);

    const user = await users.findPublicById(session.userId);
    if (!user) {
      sessionStore.destroy(sessionId);
      return rejectAuthentication(res);
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
