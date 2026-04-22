FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages

RUN pnpm install --filter @entangle/studio...
RUN pnpm --filter @entangle/studio build

EXPOSE 3000

CMD ["pnpm", "--filter", "@entangle/studio", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
