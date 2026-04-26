# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ARG PNPM_VERSION=10.18.3
ENV PNPM_STORE_DIR="/pnpm/store"

RUN npm install --global "pnpm@${PNPM_VERSION}" \
    && pnpm config set store-dir "${PNPM_STORE_DIR}"

WORKDIR /app

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.solution.json ./
COPY apps ./apps
COPY packages ./packages

RUN --mount=type=cache,id=pnpm-store-studio,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @entangle/studio... build

FROM nginx:1.29-alpine AS runtime

COPY deploy/federated-dev/config/nginx.studio.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/studio/dist /usr/share/nginx/html

EXPOSE 3000
