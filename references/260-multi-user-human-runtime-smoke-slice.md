# Multi User Human Runtime Smoke Slice

## Current Repo Truth

Before this slice, the process-boundary smoke proved one assigned agent runner
and one assigned User Node `human_interface` runner. Focused Host tests already
covered assigning multiple User Nodes to distinct compatible runners, but the
runnable smoke did not prove that shape with real joined runner processes.

## Target Model

Entangle must support multiple human graph nodes as real runtime actors. Each
human node should be assignable to its own `human_interface` runner, expose its
own User Client endpoint, use its own stable User Node identity, and publish
messages through the same Host/User Node gateway and Nostr A2A path as every
other node.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/254-process-runner-federated-smoke-slice.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/259-user-node-inbox-client-slice.md`
- `README.md`
- `deploy/federated-dev/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- extended the process smoke graph with a second User Node named
  `reviewer-user`;
- added a second `human_interface` runner process with its own runner id,
  runner key, join config, state root, and assignment;
- verified registration, trust, assignment, runtime projection, `/health`,
  `/api/state`, and runner-owned materialization for both human runners;
- published a signed message from both User Nodes to the same agent node;
- asserted the two User Nodes publish with distinct stable pubkeys;
- verified the agent runner persisted both sessions/conversations;
- verified Host projected both User Node conversations;
- extended filesystem isolation assertions across Host, agent runner, first
  User Node runner, and reviewer User Node runner;
- extended `--keep-running` output with both User Client URLs.

Deferred:

- three-machine distributed smoke;
- two-human interactive browser walkthrough;
- per-message inbox/outbox history and read state;
- approval/artifact review from each User Client.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
- `git diff --check`
- legacy product marker search.

Verification record:

- Host typecheck passed;
- process runner smoke passed against the federated dev `strfry` relay on
  `ws://localhost:7777`, including two assigned User Node runner processes,
  two User Client state checks, two signed User Node publishes with distinct
  pubkeys, two agent-runner intake records, two Host-projected User Node
  conversations, and four-way filesystem isolation.

## Migration/Compatibility Notes

This is a smoke/test expansion only. It does not change public contracts or
runtime state formats.

## Risks And Mitigations

- Risk: the smoke becomes slower as it starts more real processes.
  Mitigation: keep it as the process-boundary federated smoke and reserve
  smaller unit tests for narrow behavior.
- Risk: multiple human nodes are treated as a special local case.
  Mitigation: every User Node runner starts from the same generic join config,
  Host assignment, relay control, runner observation, and User Client projection
  path.

## Open Questions

No product question blocks this slice. The next proof should either add the
three-machine distributed walkthrough or add durable User Client message
history so the two-human smoke has a richer browser-facing state model.
