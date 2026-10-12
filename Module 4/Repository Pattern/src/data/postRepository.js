const posts = [
  { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 },
  { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 },
];

let nextId = Math.max(...posts.map((post) => post.id)) + 1;

// A Prisma adapter will replace this in-process array and ID counter with database queries and
// generated IDs. Repository operations keep their names and behavior; business rules and HTTP
// responses remain unchanged. Prisma's asynchronous I/O may require promise handling above this boundary.
function findAll() {
  return [...posts];
}

function findById(id) {
  return posts.find((post) => post.id === Number(id)) || null;
}

function create(fields) {
  const post = { ...fields, id: nextId++ };
  posts.push(post);
  return post;
}

function update(id, patch) {
  const post = findById(id);
  if (!post) return null;
  Object.assign(post, patch);
  return post;
}

function remove(id) {
  const index = posts.findIndex((post) => post.id === Number(id));
  if (index === -1) return false;
  posts.splice(index, 1);
  return true;
}

module.exports = { findAll, findById, create, update, remove };
