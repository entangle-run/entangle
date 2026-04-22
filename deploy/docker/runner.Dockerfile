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
RUN pnpm --filter @entangle/runner... build
RUN pnpm --filter @entangle/runner --prod --legacy deploy /prod/runner

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV="production"

WORKDIR /app

COPY --from=build /prod/runner ./

CMD ["node", "dist/index.js"]
