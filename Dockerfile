FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    make \
    g++ \
    python3 \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
RUN pnpm config set store-dir /pnpm/store

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json biome.json cspell.json README.md AGENTS.md ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

CMD ["pnpm", "build"]
