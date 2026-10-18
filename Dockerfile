# Hosso Studio: an image that runs with Postgres. Build: docker compose build / image chạy được với Postgres.
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 COREPACK_HOME=/opt/corepack
# Download pnpm at build time so the container does not download it at run time. / Tải sẵn pnpm lúc build.
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate && chmod -R a+rX /opt/corepack
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# Placeholder values only for the build; the real configuration comes from environment variables at run time. / Giá trị giả chỉ để build.
ARG NEXT_PUBLIC_HOSSO_PLUGINS=
ENV NEXT_PUBLIC_HOSSO_PLUGINS=$NEXT_PUBLIC_HOSSO_PLUGINS
ENV HOSSO_SECRET=build-time-placeholder HOSSO_DATABASE_URL=file:/tmp/build.db
RUN pnpm --filter @hosso/studio build

FROM base AS run
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /app /app
RUN chmod +x /app/docker/entrypoint.sh && mkdir -p /app/media /app/backups && chown -R node:node /app/media /app/backups /app/apps/studio
USER node
EXPOSE 3000
VOLUME ["/app/media"]
ENV HOSSO_MEDIA_DIR=/app/media HOSSO_SEED_DIR=/app/seed
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/docker/entrypoint.sh"]
