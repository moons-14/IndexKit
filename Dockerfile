# Stage 1: build
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

# Install dependencies (layer-cache friendly: manifests first)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/cbz-fixture/package.json    ./packages/cbz-fixture/
COPY packages/library-scanner/package.json ./packages/library-scanner/

RUN pnpm install --frozen-lockfile

# Copy source and build everything via Turbo
COPY . .
RUN pnpm build

# Stage 2: runtime
FROM node:22-alpine
RUN apk add --no-cache p7zip

WORKDIR /app

# Copy the full packages tree (compiled dist + node_modules)
COPY --from=builder /app/node_modules       ./node_modules
COPY --from=builder /app/packages           ./packages
COPY --from=builder /app/package.json       ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

ENV NODE_ENV=production
ENV LIBRARY_PATH=/library

# Default: run the library-scanner benchmark
# Override `command` in compose.yml to run other programs
CMD ["node", "packages/library-scanner/dist/bench/scan-bench.js"]
