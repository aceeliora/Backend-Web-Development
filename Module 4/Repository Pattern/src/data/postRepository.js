const seedPosts = [
  { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 },
  { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 },
];

const posts = new Map(seedPosts.map((post) => [post.id, post]));
let nextId = Math.max(...posts.keys()) + 1;

// A Prisma adapter will replace this in-process Map and ID counter with database queries and
// generated IDs. Repository operations keep their names and behavior; business rules and HTTP
// responses remain unchanged. Prisma's asynchronous I/O may require promise handling above this boundary.
function findAll() {
  return Array.from(posts.values());
}

function findById(id) {
  return posts.get(Number(id)) || null;
}

function create(fields) {
  const post = { ...fields, id: nextId++ };
  posts.set(post.id, post);
  return post;
}

function update(id, patch) {
  const post = findById(id);
  if (!post) return null;
  Object.assign(post, patch);
  return post;
}

function remove(id) {
  return posts.delete(Number(id));
}

module.exports = { findAll, findById, create, update, remove };
