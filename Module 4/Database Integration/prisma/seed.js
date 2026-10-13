require('dotenv').config();

const prisma = require('../src/db/prisma');
const seedPosts = require('../src/data/postSeed');

async function main() {
  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Community Member' },
  });

  for (const post of seedPosts) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {},
      create: {
        id: post.id,
        title: post.title,
        body: post.body,
        authorId: post.authorId,
      },
    });
  }

  // Explicit seed IDs must not leave PostgreSQL sequences behind the inserted rows.
  await prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM "User"), 1), true)`;
  await prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"Post"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM "Post"), 1), true)`;
}

main()
  .catch((error) => {
    console.error('Database seed failed. Check DATABASE_URL and migration status.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
