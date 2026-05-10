# Distributed Proof Generated Pnpm Fallback Slice

## Current Repo Truth

Root smoke, demo, and distributed-proof wrapper commands already used
`scripts/pnpm-runner.mjs` to fall back to
`npm exec --yes pnpm@10.18.3 --` when no global `pnpm` executable is present.
Generated distributed proof kits still wrote standalone `start.sh`,
`operator/commands.sh`, `operator/verify-topology.sh`, and
`operator/verify-artifacts.sh` scripts that directly invoked `pnpm`.

The gap was reproduced against a generated runner-Compose proof kit:
`operator/commands.sh` failed with `pnpm: command not found` before reaching
Host.

## Target Model

Generated proof kits should be copyable to operator and runner machines that
have Node/npm and an Entangle checkout. A global `pnpm` install is useful but
must not be required for the generated shell scripts.

The generated scripts now use local helper functions that prefer `pnpm` when
available and otherwise execute the pinned package through npm.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/pnpm-runner.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Export the pinned pnpm package from `scripts/pnpm-runner.mjs`.
- Emit `run_pnpm` in generated operator and verifier scripts.
- Emit `exec_pnpm` in generated non-container runner `start.sh` scripts.
- Keep container runner scripts on the built runner image's `node /app/dist`
  entrypoint.
- Document Node/npm as the generated kit prerequisite, with global `pnpm`
  optional.
- Extend the deterministic proof-tool smoke so dry-run output confirms the
  generated shell fallback path.

## Tests Required

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- A live generated runner-Compose rehearsal showing `operator/commands.sh`
  reaches real Host CLI commands instead of failing on missing `pnpm`.
- Broader verification before commit.

## Migration And Compatibility Notes

Existing kits already generated before this slice still contain direct `pnpm`
calls. Regenerate the proof kit to receive fallback-capable scripts.

Environments that already have global `pnpm` continue to use it. Environments
without global `pnpm` use npm to execute the pinned pnpm package.

## Risks And Mitigations

- Risk: a runner/operator machine has Node but not npm.
  Mitigation: Node/npm is now the explicit generated-script prerequisite.
- Risk: the pinned package drifts from the root fallback helper.
  Mitigation: the proof-kit generator imports the same pinned package constant
  used by `scripts/pnpm-runner.mjs`.

## Open Questions

- None for this slice.
