# Repository Guide

## Source Of Truth

Use the repository layers this way:

- `README.md`: short public entry point for engineers.
- `docs/`: current operator and contributor documentation.
- `references/`: technical archive, design records, and implementation ledgers.
- `wiki/`: long-running memory, decision context, and project log.
- `resources/`: manifest for external research clones. Do not commit the clones.

Do not put long implementation ledgers in the root README. Do not turn
`references/` into onboarding material.

## Before Substantial Work

1. Check `git status --short --branch`.
2. Read `README.md`, `docs/README.md`, `references/README.md`,
   `wiki/overview.md`, `wiki/index.md`, and `wiki/log.md`.
3. Read the package/app/service files directly touched by the task.
4. Classify stale statements as current truth, historical archive, or drift.

## During Work

- Keep changes in coherent slices.
- Prefer existing package boundaries.
- Update tests with code changes.
- Update docs with behavior changes.
- Keep generated outputs out of Git.
- Do not reintroduce local-product naming.

## After Durable Changes

1. Run targeted checks for the touched scope.
2. Run wider gates when shared contracts, Host/runner behavior, deployment, or
   user surfaces changed.
3. Update `wiki/log.md` when the project baseline changed.
4. Review `git diff`.
5. Commit a coherent batch.

## Website Coordination

The public website lives in `../entangle-website`. It should be updated when:

- the product thesis changes;
- installation or run commands change;
- status claims change;
- security posture or trust-boundary wording changes;
- a public page starts implying capabilities that are only deterministic,
  manual, or future.

Website docs should be concise and externally readable. Runtime implementation
detail belongs here in `docs/` or in `references/`.
