# Docker Image Build Topology Slice

This document records the batch that hardened the local Docker image topology
for Entangle's stable services.

The goal of this slice was not to add new runtime features. It was to remove
the remaining sloppiness from the local image build path before more execution
logic is layered on top.

## What changed

This slice added or tightened:

- an explicit `.dockerignore` for the main repository build context;
- multi-stage host and runner images that install a pinned `pnpm` version
  explicitly;
- a pinned pnpm store directory that actually matches the Docker cache mount
  target;
- a static Nginx runtime image for Studio;
- explicit workspace package `files` allowlists for deployable packages;
- TypeScript build outputs that exclude compiled test files from runtime `dist/`
  folders;
- explicit Studio workspace resolution so image builds do not depend on
  accidental local workspace state.

## 1. Build-context hardening

The repository now carries an explicit `.dockerignore` that excludes:

- `.entangle/`
- `.entangle-secrets/`
- `resources/`
- `references/`
- `wiki/`
- build artifacts and node_modules directories

This matters because the local image profile should not silently ingest live
runtime state, Entangle secrets, or the research corpus into service images.

## 2. Explicit pnpm installation and cache semantics

The first draft of the Dockerfiles relied on `corepack enable` plus an
unbound `/pnpm/store` cache mount.

That was not rigorous enough because:

- the exact acquisition path of `pnpm` remained implicit;
- the mounted cache path was not actually the configured pnpm store.

The local service Dockerfiles now:

- install pinned `pnpm@10.18.3` explicitly with `npm install --global`;
- configure `pnpm config set store-dir /pnpm/store`;
- mount the same `/pnpm/store` path as the Docker build cache target.

This makes the toolchain more explicit and makes the cache mount semantically
real instead of only decorative.

## 3. Static Studio runtime image

`apps/studio` is no longer treated as a dev-server style runtime.

The federated dev profile now builds Studio with Vite in a Node build stage and serves
the produced static bundle from `nginx:1.29-alpine` using an explicit SPA
fallback config.

This is the correct local runtime stance because:

- the product-facing Studio surface is a static client artifact;
- `vite preview` is a developer convenience, not a production-like runtime
  contract;
- the image boundary becomes smaller and clearer.

## 4. Studio workspace-resolution hardening

The Studio image build surfaced a real weakness:

- the frontend build was relying too much on the local workspace state for
  resolving `@entangle/types` and `@entangle/host-client`.

That was corrected by making the Studio resolution path explicit in both:

- `apps/studio/tsconfig.json`
- `apps/studio/vite.config.ts`

This matters because container builds must be reproducible from repository
state alone, not from local editor or package-manager incidental behavior.

## 5. Runtime payload discipline

The first packaging attempt still allowed compiled test files to leak into
deploy payloads because:

- runtime packages emitted `*.test.ts` into `dist/`;
- `pnpm deploy` was faithfully packaging those emitted files.

This slice corrected that in two steps:

1. add explicit `files` allowlists to deployable packages and services;
2. exclude test sources from emitted runtime build outputs while keeping tests
   under typed lint coverage through explicit narrow project-service
   configuration.

The resulting portable deploy payloads for host and runner now contain:

- runtime `dist/` files only;
- `package.json`;
- the minimal `node_modules` metadata required by the deploy layout.

They no longer contain compiled test artifacts.

## 6. Verification performed

This slice was verified in four layers:

1. repository-wide `pnpm clean`;
2. repository-wide `pnpm verify`;
3. `build -> deploy` portable payload verification for both host and runner;
4. image builds for:
   - `entangle-runner:federated-dev`
   - `compose-host`
   - `compose-studio`

The deploy verification was intentionally run on the same `build -> deploy`
sequence used by the service Dockerfiles, so the result reflects the actual
runtime image path rather than an artificial shortcut.

## 7. Why this slice matters

Before this slice:

- local images worked, but still carried hidden quality debt in build
  acquisition, cache semantics, and runtime payload cleanliness;
- Studio container builds exposed overly implicit workspace assumptions;
- runtime package outputs were still too permissive.

After this slice:

- the local service image topology is smaller, clearer, and more reproducible;
- the build cache semantics are real;
- the runtime payloads are materially cleaner;
- the Docker profile better reflects the quality bar expected from the main
  product architecture.

## 8. What remains next

This slice does not change the next product priority.

The next meaningful runtime work remains:

- richer git artifact work and handoff logic in the runner;
- deeper runtime trace and reconciliation exposure into host and Studio;
- stronger long-lived runner restart and recovery behavior.
