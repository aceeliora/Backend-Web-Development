require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const { getCookieSecret } = require('./config/sessionCookie');

const app = express();
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser(getCookieSecret()));
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' },
    });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' },
    });
  }

  // Keep database, bcrypt, signing, and store details out of HTTP responses and logs.
  console.error('Unhandled request error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`API listening on ${port}`));
}

module.exports = app;
