# Process Runner Smoke Relay Preflight Slice

## Current Repo Truth

`pnpm ops:smoke-federated-process-runner` depends on a reachable Nostr relay,
usually the federated dev `strfry` relay at `ws://localhost:7777`. When that
relay is not running, the smoke can fail inside the Nostr pool with a generic
`connection failed` error before printing any Entangle-specific diagnostic.

The smoke is still intentionally no-LLM: it verifies Host, joined runner
processes, Human Interface Runtimes, User Client endpoints, signed User Node
messages, approval responses, and projection paths without calling a real model
provider.

## Target Model

Live-relay smokes should fail before starting Host or runner processes when a
required relay is unavailable. The failure must tell the operator which relay
was checked and how to start or override it. This preserves the federated smoke
as a real relay-path test while making local/manual verification predictable.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/282-process-runner-smoke-relay-preflight-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a WebSocket/Nostr `REQ` preflight to the process runner smoke before it
  creates temporary Host/runner state.
- Print `PASS relay-preflight` when the configured relay responds.
- Fail with an actionable message when the relay is unreachable, times out,
  closes early, or returns invalid frames.
- Align the smoke's synthetic artifact ref with the current artifact contract
  by marking the published ref as preferred.

## Tests Required

- Run the smoke with the local relay stopped and verify it reports the relay
  prerequisite clearly instead of the raw pool error.
- Run wrapper syntax checks for `scripts/smoke-federated-process-runner.mjs`.
- Run a one-file TypeScript check for
  `services/host/scripts/federated-process-runner-smoke.ts`.
- Re-run the full process runner smoke when a reachable relay is available.

## Migration/Compatibility Notes

No protocol, API, or persisted state format changes. Operators still pass
`--relay-url`, `ENTANGLE_RELAY_URL`, or `ENTANGLE_STRFRY_URL` to point the
smoke at another reachable relay.

## Risks And Mitigations

- Risk: the preflight rejects a relay that would later work with custom auth.
  Mitigation: the current process smoke does not support authenticated relay
  operation, so failing early is consistent with the tested path.
- Risk: this hides deeper runner failures when the local relay is down.
  Mitigation: the failure is explicitly classified as a prerequisite failure;
  full process validation still runs once a reachable relay exists.

## Open Questions

Whether future CI should provide a lightweight in-process relay for the no-LLM
process smoke while keeping a separate `strfry` smoke for real relay coverage.
