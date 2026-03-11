# Stage 1: base builder with all deps
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

# Install dependencies (layer-cache friendly: manifests first)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/cbz-fixture/package.json    ./packages/cbz-fixture/
COPY packages/library-scanner/package.json ./packages/library-scanner/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copy source and build everything via Turbo
COPY . .
RUN pnpm build

# Stage 2: api runtime
FROM node:22-alpine AS api
RUN apk add --no-cache p7zip

WORKDIR /app

COPY --from=builder /app/node_modules             ./node_modules
COPY --from=builder /app/packages                 ./packages
COPY --from=builder /app/apps/api/dist            ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle         ./apps/api/drizzle
COPY --from=builder /app/apps/api/node_modules    ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json    ./apps/api/package.json
COPY --from=builder /app/package.json             ./package.json
COPY --from=builder /app/pnpm-workspace.yaml      ./pnpm-workspace.yaml
COPY apps/api/entrypoint.sh                       /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV LIBRARY_PATH=/library
ENV THUMBNAIL_DIR=/data/thumbnails

EXPOSE 3001
CMD ["/entrypoint.sh"]

# Stage 3: web runtime
FROM node:22-alpine AS web
WORKDIR /app

COPY --from=builder /app/node_modules             ./node_modules
COPY --from=builder /app/apps/web/.next           ./apps/web/.next
COPY --from=builder /app/apps/web/node_modules    ./apps/web/node_modules
COPY --from=builder /app/apps/web/package.json    ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.ts  ./apps/web/next.config.ts
COPY --from=builder /app/package.json             ./package.json
COPY --from=builder /app/pnpm-workspace.yaml      ./pnpm-workspace.yaml

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "--port", "3000"]

# Stage 4: legacy scanner runtime (kept for bench profiles)
FROM node:22-alpine AS scanner
RUN apk add --no-cache p7zip

WORKDIR /app

COPY --from=builder /app/node_modules       ./node_modules
COPY --from=builder /app/packages           ./packages
COPY --from=builder /app/package.json       ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

ENV NODE_ENV=production
ENV LIBRARY_PATH=/library

CMD ["node", "packages/library-scanner/dist/bench/scan-bench.js"]
