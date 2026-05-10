# Distributed Proof Graph Preflight Slice

## Current Repo Truth

`pnpm ops:distributed-proof-kit` generates copyable runner directories plus
operator commands for a topology-faithful proof. The generated operator command
sequence already uses `operator/proof-profile.json` for verifier expectations,
but it previously discovered graph mismatches only after starting Host
mutations such as agent-engine binding, runner trust, assignment offers, or
User Node message publication.

A same-machine runner-Compose rehearsal reproduced the failure mode: the
operator script reached real Host CLI calls, then failed because the active
graph did not contain the default proof node id `builder`.

## Target Model

Generated proof kits must fail before operator mutations when the active Host
graph does not match the generated proof profile. The preflight is an operator
machine check over Host HTTP APIs, not a Host filesystem shortcut.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Generate `operator/preflight.mjs` in distributed proof kits.
- Run that preflight at the start of generated `operator/commands.sh` after
  sourcing `operator.env` and before catalog, trust, assignment, message, or
  verifier commands.
- Fetch `GET /v1/graph` from `ENTANGLE_HOST_URL` with optional bearer token.
- Read `operator/proof-profile.json`.
- Fail clearly when:
  - the Host URL is missing, invalid, unreachable, or returns an HTTP error;
  - no active graph exists;
  - the generated agent, primary User Node, or reviewer User Node id is absent;
  - the agent node points to a User Node;
  - either User Node id points to a non-user node;
  - the primary User Node lacks an enabled outbound edge to the agent node.
- Print a compact JSON success record with graph id, active revision, required
  node ids, and the selected User Node task edge.

## Tests Required

- Syntax checks for the proof-kit generator and proof-tool smoke.
- Deterministic proof-tool smoke covering the dry-run preflight signal.
- Runtime preflight check against a real Host API where no active graph exists.
- Product naming check and broad verification before commit.

## Migration And Compatibility Notes

Existing generated kits do not gain `operator/preflight.mjs`; regenerate the
kit to get the preflight. The check uses the existing Host graph API and proof
profile manifest, so it does not require new Host contracts.

The preflight is intentionally stricter than the old script order: it blocks
the proof before runner trust or assignments if the proof node ids are wrong.
That is a compatibility improvement for proof execution, not a runtime
protocol change.

## Risks And Mitigations

- Risk: operators with intentionally unusual graph roles are blocked.
  Mitigation: the distributed proof kit is specifically a three-runner
  agent-plus-two-User-Node proof, so requiring one non-user agent node and two
  User Nodes matches the generated commands and verifier profile.
- Risk: the preflight reports graph mismatch but not how to create the graph.
  Mitigation: the error tells operators whether to update the graph or
  regenerate with matching node ids; a future slice can add a graph bootstrap
  helper if needed.

## Open Questions

- Should a future proof-kit mode generate or import the matching graph spec
  itself, rather than only verifying an existing active graph?
