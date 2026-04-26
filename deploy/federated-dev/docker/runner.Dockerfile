# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ARG PNPM_VERSION=10.18.3
ENV PNPM_STORE_DIR="/pnpm/store"

RUN npm install --global "pnpm@${PNPM_VERSION}" \
    && pnpm config set store-dir "${PNPM_STORE_DIR}"

WORKDIR /app

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.solution.json ./
COPY services ./services
COPY packages ./packages

RUN --mount=type=cache,id=pnpm-store-runner,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @entangle/runner... clean \
    && pnpm --filter @entangle/runner... build
RUN pnpm --filter @entangle/runner --prod --legacy deploy /prod/runner
RUN rm -rf /prod/runner/dist \
    && test -f /prod/runner/node_modules/@entangle/agent-engine/dist/index.js \
    && test -f /prod/runner/node_modules/@entangle/types/dist/index.js \
    && test -f /prod/runner/node_modules/@entangle/validator/dist/index.js \
    && mkdir -p /prod/runner/dist \
    && cp -R services/runner/dist/. /prod/runner/dist/ \
    && test -f /prod/runner/dist/index.js

FROM node:22-bookworm-slim AS runtime

ARG OPENCODE_PACKAGE_VERSION=1.14.20

ENV NODE_ENV="production"

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git openssh-client \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --global "opencode-ai@${OPENCODE_PACKAGE_VERSION}" \
    && opencode --version

COPY --from=build /prod/runner ./

CMD ["node", "dist/index.js"]
