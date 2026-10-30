#!/bin/sh
set -eu
node scripts/migrate.mjs
node dist/prisma/seed.js
exec node dist/src/main.js
