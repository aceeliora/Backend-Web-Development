const express = require('express');
const postRoutes = require('./routes/postRoutes');
const { resetData } = require('./data/postStore');
const controller = require('./controllers/postController');
const { sendError } = require('./utils/http');

function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/', postRoutes);
  app.get('/explode', controller.explode);

  app.use((req, res) => {
    sendError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found');
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    const status = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 500
      ? err.statusCode
      : 500;
    const code = status === 500 ? 'INTERNAL_ERROR' : (err.code || 'REQUEST_ERROR');
    const message = status === 500 ? 'Internal server error' : err.message;

    console.error(err);
    return sendError(res, status, code, message);
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = 3000;
  app.listen(port, () => {
    console.log(`Posts API listening on port ${port}`);
  });
}

module.exports = {
  createApp,
  resetData
};
