const prisma = require('../db/prisma');

function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

function create(userData) {
  return prisma.user.create({ data: userData });
}

module.exports = { findByEmail, create };
