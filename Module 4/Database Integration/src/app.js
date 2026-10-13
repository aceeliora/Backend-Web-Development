const express = require('express');
const postController = require('./controllers/postController');
const prisma = require('./db/prisma');

const app = express();
app.use(express.json());

app.get('/posts', postController.list);
app.get('/posts/:id', postController.get);
app.post('/posts', postController.create);
app.patch('/posts/:id', postController.update);
app.delete('/posts/:id', postController.remove);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const statusCode = error.expose && Number.isInteger(error.statusCode)
    ? error.statusCode
    : 500;
  const message = error.expose ? error.message : 'Internal server error';
  return res.status(statusCode).json({ error: message });
});

if (require.main === module) {
  const server = app.listen(process.env.PORT || 3000, () => console.log('API listening'));
  const shutdown = () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = app;
