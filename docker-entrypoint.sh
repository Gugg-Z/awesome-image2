#!/bin/sh
set -eu

echo "Generating Prisma client..."
pnpm exec prisma generate

echo "Creating or updating database tables..."
pnpm exec prisma db push

echo "Creating or updating admin user..."
node scripts/seed-admin.mjs

exec "$@"
