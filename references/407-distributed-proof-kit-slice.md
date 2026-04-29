# Distributed Proof Kit Slice

## Current Repo Truth

The process-runner smoke is topology-faithful inside one workstation: Host,
the agent runner, and two User Node `human_interface` runners run in separate
OS processes with separate state roots and communicate over Nostr plus Host
API boundaries. The remaining distributed proof gap is operational: there was
no first-class kit for preparing runner join configs, runner-local secrets,
start commands, and operator trust/assignment commands for machines that do
not share a filesystem.

## Target Model

Operators should be able to start Host, relay, and git backends on reachable
infrastructure, then generate a portable three-runner proof kit:

- one OpenCode-capable agent runner;
- one primary User Node Human Interface Runtime runner;
- one reviewer User Node Human Interface Runtime runner;
- runner join configs derived from the live Host authority and relay settings;
- runner-local env/start scripts that can be copied to separate machines;
- operator commands for runner trust, assignment offers, User Client discovery,
  signed User Node task publication, and projection inspection.

The kit must not make Host and runners share filesystem state. It should
exercise the same generic `entangle-runner join` path used by process and
managed-runner proofs.

## Impacted Modules And Files

- `package.json`
- `scripts/federated-distributed-proof-kit.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `pnpm ops:distributed-proof-kit`.
- Generate three runner directories with Host-derived `runner-join.json`
  files, runner env files, and executable `start.sh` scripts.
- Generate an operator directory with Host env and executable commands for
  trust, assignment, user message publication, client discovery, and
  projection inspection.
- Support explicit reachable Host URL, relay URLs, runner ids, graph node ids,
  heartbeat interval, and controlled Host token writing.
- Add dry-run and help modes for safe operator review.
- Document that the proof succeeds only if runner directories can be copied to
  separate machines with Entangle checkouts and no Host filesystem access.

## Tests Required

Implemented and passed:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `pnpm ops:distributed-proof-kit --help`
- `pnpm ops:distributed-proof-kit --dry-run --output /tmp/entangle-proof --host-url http://host.example:7071 --relay-url ws://relay.example:7777 --host-token dev-token --agent-node builder --user-node user --reviewer-user-node reviewer`
- `pnpm ops:distributed-proof-kit --dry-run --no-host-token-env-var --output /tmp/entangle-proof --host-url http://host.example:7071 --relay-url ws://relay.example:7777`
- `pnpm --filter @entangle/cli dev runners --host-url http://host.example:7071 join-config --help`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is additive operator tooling. Existing process, managed-runner, CLI,
Studio, and runner behavior is unchanged. The kit writes new files only under
the requested output directory and uses existing Host and CLI boundaries to
generate join configs.

## Risks And Mitigations

- Risk: generated files leak Host tokens.
  Mitigation: Host tokens are not written unless `--write-host-token` is
  explicit; generated env files otherwise contain placeholders.
- Risk: the kit is mistaken for the distributed smoke itself.
  Mitigation: docs describe it as the operator kit for physical/VM proof; the
  actual proof still requires running Host, relay, git, and copied runner
  directories on reachable machines.
- Risk: generated join configs drift from Host authority state.
  Mitigation: configs are generated through the existing CLI `runners
  join-config` command against live Host status.

## Open Questions

Partially resolved by `408-distributed-proof-verifier-slice.md`: an operator
can now verify already-started distributed machines through Host HTTP APIs and
optional User Client health endpoints. A future infrastructure harness can
provision those machines automatically.
