#!/bin/sh
# Run the database migrations, then start Studio. / Chạy migration database rồi khởi động Studio.
set -e
cd /app
pnpm --filter @hosso/studio migrate
exec pnpm --filter @hosso/studio start
