# Contributing To Entangle

Entangle is a pre-release systems project. Contributions should preserve the
federated runtime model and keep code, tests, docs, and public messaging in
sync.

## Before You Start

1. Read `README.md`, `docs/README.md`, `docs/status.md`,
   `references/README.md`, `wiki/overview.md`, and `wiki/log.md`.
2. Check `git status --short --branch`.
3. Identify the packages, services, apps, scripts, docs, and tests touched by
   the change.
4. Avoid local-only shortcuts. Same-machine deployment is a development adapter
   for the federated model.

## Development Setup

```bash
pnpm install --frozen-lockfile
pnpm verify
```

If global `pnpm` is unavailable:

```bash
npm exec --yes pnpm@10.18.3 -- install --frozen-lockfile
npm exec --yes pnpm@10.18.3 -- verify
```

## Change Discipline

- Keep changes in coherent slices.
- Add or update tests for behavior changes.
- Update docs when behavior, commands, architecture, or status changes.
- Update `wiki/log.md` when the durable project baseline changes.
- Keep detailed implementation evidence in `references/`, not in the root
  README.
- Keep public claims honest: distinguish implemented, deterministic,
  manually-validated, and future capabilities.

## Verification

Run targeted checks first, then widen:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
```

Use [docs/testing.md](docs/testing.md) to choose package-level tests and smoke
paths.

For docs-only changes, at minimum run:

```bash
pnpm ops:check-product-naming
git diff --check
```

## Commit Style

Use short, factual commit messages:

```text
docs: reset repository entry points
feat: add runner assignment verifier
fix: reject runner identity conflicts
test: cover fake OpenCode permission rejection
```

Do not combine unrelated runtime, website, and cleanup work unless the change
is intentionally a documentation/product alignment slice.

## Public Website

The website repository is a sibling checkout:

```text
../entangle-website
```

When changing public product status, commands, security posture, or deployment
claims, update both repositories in coordinated commits.
