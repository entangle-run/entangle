FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN apt-get update \
  && apt-get install -y --no-install-recommends docker.io \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages

RUN pnpm install --filter @entangle/host...
RUN pnpm --filter @entangle/host build

EXPOSE 7071

CMD ["pnpm", "--filter", "@entangle/host", "start"]
