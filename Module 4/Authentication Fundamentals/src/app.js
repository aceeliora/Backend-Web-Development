require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const { AuthError } = require('./services/authService');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Malformed JSON request' },
    });
  }

  if (error instanceof AuthError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
  }

  // Do not log raw errors: database and credential details must not escape to logs.
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`API listening on ${port}`));
}

module.exports = app;
