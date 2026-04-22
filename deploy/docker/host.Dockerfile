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

RUN --mount=type=cache,id=pnpm-store-host,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @entangle/host... build
RUN pnpm --filter @entangle/host --prod --legacy deploy /prod/host

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV="production"

WORKDIR /app

COPY --from=build /prod/host ./

EXPOSE 7071

CMD ["node", "dist/index.js"]
