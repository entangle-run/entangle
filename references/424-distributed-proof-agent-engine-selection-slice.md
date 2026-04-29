# Distributed Proof Agent Engine Selection Slice

## Current Repo Truth

`pnpm ops:distributed-proof-verify` now checks that the proof agent runner
advertises the expected agent engine capability. The expected engine was
hard-coded to `opencode_server`, matching the current proof kit default.

The broader Entangle architecture is engine-adapter-oriented: OpenCode is the
default, but future proof profiles may target Codex, Claude Code, Aider, or
other engine adapters once those adapters are wired.

## Target Model

The verifier should keep OpenCode as the default proof engine while allowing
operators and future proof-kit profiles to specify another expected agent
engine kind explicitly.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/408-distributed-proof-verifier-slice.md`
- `references/411-distributed-proof-tool-ci-smoke-slice.md`
- `references/423-distributed-proof-agent-engine-capability-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `--agent-engine-kind <kind>` to the distributed proof verifier.
- Kept the default expected engine kind as `opencode_server`.
- Made the embedded self-test fixture use the selected expected engine kind.
- Updated the wrong-agent-engine self-test fixture so it chooses a different
  capability from the selected expected engine kind.
- Extended `pnpm ops:smoke-distributed-proof-tools` to prove an alternate
  expected engine kind can pass when the fixture advertises the same kind.

## Tests Required

Implemented for this slice:

- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:distributed-proof-verify --self-test --json --require-conversation --check-user-client-health`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

Existing proof-kit defaults continue to pass because the verifier default is
still `opencode_server`. Operators can now run:

```bash
pnpm ops:distributed-proof-verify --agent-engine-kind external_process
```

when validating a custom proof whose agent runner intentionally advertises that
engine kind.

## Risks And Mitigations

- Risk: the verifier accepts arbitrary strings for future engine kinds.
  Mitigation: real Host runner registrations still originate from typed runner
  capabilities; this flag only selects the expected value to compare against
  the observed registry projection.
- Risk: proof kit and verifier defaults drift.
  Mitigation: both defaults remain OpenCode-oriented, and the smoke covers the
  default plus an alternate self-test path.

## Open Questions

- The proof kit itself still has a fixed three-runner profile. A later slice
  can add `--agent-engine-kind` there too, so generated join configs and
  verifier commands stay parameterized together.
