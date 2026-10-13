const prisma = require('../db/prisma');
const { toSafeDatabaseError } = require('../errors/databaseError');

// Keep timestamps and relations out of the legacy /posts response payload.
const postFields = {
  id: true,
  title: true,
  body: true,
  authorId: true,
};

async function findAll() {
  try {
    return await prisma.post.findMany({ orderBy: { id: 'asc' }, select: postFields });
  } catch (error) {
    throw toSafeDatabaseError(error);
  }
}

async function findById(id) {
  try {
    return await prisma.post.findUnique({ where: { id: Number(id) }, select: postFields });
  } catch (error) {
    throw toSafeDatabaseError(error);
  }
}

async function create(fields) {
  try {
    return await prisma.post.create({
      data: { title: fields.title, body: fields.body || '', authorId: fields.authorId },
      select: postFields,
    });
  } catch (error) {
    throw toSafeDatabaseError(error);
  }
}

async function update(id, patch) {
  const data = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.body !== undefined) data.body = patch.body;

  try {
    return await prisma.post.update({ where: { id: Number(id) }, data, select: postFields });
  } catch (error) {
    if (error && error.code === 'P2025') return null;
    throw toSafeDatabaseError(error);
  }
}

async function remove(id) {
  try {
    const result = await prisma.post.deleteMany({ where: { id: Number(id) } });
    return result.count > 0;
  } catch (error) {
    throw toSafeDatabaseError(error);
  }
}

module.exports = { findAll, findById, create, update, remove };
