#!/bin/sh
set -e

echo "surfing-online-web: starting..."

# Ensure db directory exists
mkdir -p /app/db/uploads

# Push Prisma schema to create/migrate SQLite database
echo "surfing-online-web: pushing database schema..."
/opt/prisma/node_modules/.bin/prisma db push --schema=/app/prisma/schema.prisma --skip-generate --accept-data-loss

# Seed initial content if the database is empty
echo "surfing-online-web: seeding initial content (if needed)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 'default' } }).catch(() => null);
  if (!settings) {
    console.log('Database empty, triggering seed via API after startup...');
  } else {
    console.log('Database already has content, skipping seed.');
  }
  await prisma.\$disconnect();
})().catch(() => process.exit(0));
" 2>/dev/null || true

echo "surfing-online-web: starting Next.js server on port 3000..."
exec node server.js
