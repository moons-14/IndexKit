#!/bin/sh
set -e
node /app/apps/api/dist/migrate.js
exec node /app/apps/api/dist/index.js
