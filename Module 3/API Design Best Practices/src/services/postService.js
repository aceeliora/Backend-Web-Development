const store = require('../data/postStore');

const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 5;

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function listPosts(query = {}) {
  const page = parsePositiveInteger(query.page, 1);
  const requestedLimit = parsePositiveInteger(query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const allPosts = store.getAllPosts();
  const total = allPosts.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = (currentPage - 1) * limit;

  return {
    data: allPosts.slice(start, start + limit),
    meta: {
      page: currentPage,
      limit,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    }
  };
}

function getPost(id) {
  return store.getPostById(id);
}

function createPost(body = {}) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const author = typeof body.author === 'string' ? body.author.trim() : '';

  if (!title || !author) {
    const error = new Error('title and author are required');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return store.createPost({ title, author });
}

function likePost(id) {
  return store.incrementLikes(id);
}

function explode() {
  const error = new Error('simulated internal failure');
  error.statusCode = 500;
  throw error;
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  likePost,
  explode,
  DEFAULT_LIMIT,
  MAX_LIMIT
};
