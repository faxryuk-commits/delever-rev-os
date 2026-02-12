#!/bin/bash
set -e

echo "=== START SCRIPT ==="
echo "PORT=$PORT"
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
echo "Node version: $(node --version)"
echo "Working dir: $(pwd)"

echo "=== Step 1: Prisma db push ==="
npx prisma db push --skip-generate 2>&1 || echo "WARNING: prisma db push failed, continuing..."

echo "=== Step 2: Seed ==="
npx tsx prisma/seed.ts 2>&1 || echo "WARNING: seed failed, continuing..."

echo "=== Step 3: Starting server ==="
exec node dist/index.js
