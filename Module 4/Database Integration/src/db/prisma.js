require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// One Prisma client owns database connections for this application process.
const prisma = new PrismaClient();

module.exports = prisma;
