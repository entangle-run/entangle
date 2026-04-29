# Distributed Proof Relay Health Verifier Slice

## Current Repo Truth

`pnpm ops:distributed-proof-kit` writes relay URLs into
`operator/proof-profile.json`, and `pnpm ops:distributed-proof-verify` can load
that proof profile. Before this slice, the verifier did not use those relay
URLs and could not check whether the operator machine could reach the relay
over WebSocket.

## Target Model

Relay health should be an optional distributed proof check. The default
generated operator command should remain focused on immediate topology and User
Client verification, while operators can request relay reachability checks from
the verifier when validating a real multi-machine setup.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/408-distributed-proof-verifier-slice.md`
- `references/411-distributed-proof-tool-ci-smoke-slice.md`
- `references/427-distributed-proof-profile-manifest-slice.md`
- `references/428-distributed-proof-artifact-evidence-verifier-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `--check-relay-health` to the distributed proof verifier.
- Added repeated/comma-separated `--relay-url <url>` verifier overrides.
- The verifier falls back to `relayUrls` from the proof profile when explicit
  relay URLs are not supplied.
- Relay health opens each configured relay WebSocket and reports success or a
  bounded failure detail.
- Proof profiles can set `"checkRelayHealth": true`.
- The distributed proof tool smoke now proves:
  - relay health can pass in self-test mode with an explicit relay URL;
  - relay health can pass through a generated-style proof profile;
  - requiring relay health without relay URLs fails.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

Relay health is opt-in. Existing verifier invocations and generated operator
commands are unchanged unless operators add `--check-relay-health` or set
`"checkRelayHealth": true` in a proof profile.

## Risks And Mitigations

- Risk: a relay accepts WebSocket connections but still rejects later Nostr
  subscriptions or publishes.
  Mitigation: this slice is explicitly a reachability check. Protocol-level
  relay publish/subscribe proof remains covered by existing runner/control
  smokes and can be deepened later for distributed infrastructure.
- Risk: relay health fails behind restrictive networks even while Host state is
  already healthy.
  Mitigation: relay health is optional and separate from Host projection checks.

## Open Questions

- Should the verifier later publish and read back a signed ephemeral Nostr event
  for a stronger relay protocol proof?
- Follow-up: `430-distributed-proof-git-backend-health-verifier-slice.md` adds
  the matching optional Host catalog git backend health check for the same
  distributed proof workflow.
- Follow-up: `434-distributed-proof-kit-relay-health-profile-slice.md` lets
  the proof kit generate relay-health verifier commands and proof profiles
  directly when explicit relay URLs are supplied.
