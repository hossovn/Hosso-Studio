# Hosso Studio: image chạy được với Postgres. Build: docker compose build
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# Giá trị giả chỉ để build; cấu hình thật đến từ biến môi trường lúc chạy.
ENV HOSSO_SECRET=build-time-placeholder HOSSO_DATABASE_URL=file:/tmp/build.db
RUN pnpm --filter @hosso/studio build

FROM base AS run
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /app /app
RUN chmod +x /app/docker/entrypoint.sh && mkdir -p /app/media && chown -R node:node /app/media /app/apps/studio
USER node
EXPOSE 3000
VOLUME ["/app/media"]
ENV HOSSO_MEDIA_DIR=/app/media HOSSO_SEED_DIR=/app/seed
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/docker/entrypoint.sh"]
