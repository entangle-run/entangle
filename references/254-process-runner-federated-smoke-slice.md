# Process Runner Federated Smoke Slice

## Current Repo Truth

The live relay smoke proved real Nostr control/observe transport, but the runner
service was still created inside the smoke process with an injected materializer
and fake runtime starter. Joined runners could fetch Host runtime context, but
that fetched context still carried Host workspace paths and did not provide the
node runtime identity secret needed by the default runtime starter.

Follow-up slice
[256-portable-runtime-bootstrap-bundle-slice.md](256-portable-runtime-bootstrap-bundle-slice.md)
replaces the raw context fetch in default joined runners with a portable
bootstrap bundle.

This slice now also covers the first no-LLM functional A2A intake proof: after
the real joined runner process starts an assigned node runtime, Host publishes a
message signed by the stable User Node identity through the configured relay,
and the runner persists the received session and conversation under
runner-owned runtime state.

Host JSON state writes also used direct file replacement. The process smoke
exposed a real race where close `runtime.status` observations could make a
projection read observe a partially rewritten JSON record.

## Target Model

The federated regression path should prove a real runner OS process can:

- start from `runner-join.json`;
- register through a real relay;
- fetch an assignment runtime bootstrap bundle through the Host API;
- materialize runner-owned workspace paths;
- receive Host-managed node identity material only through an authenticated
  Host API path, not through Nostr;
- start the assigned node runtime with the normal runner starter;
- emit signed assignment and runtime observations through the relay;
- receive signed User Node messages through the same Nostr A2A transport used
  by normal graph communication;
- persist received coordination state in runner-owned session and conversation
  records without requiring a live model-provider call;
- let Host projection observe the runtime without reading runner-owned paths.

This is still a same-workstation smoke. It is a stronger process-boundary proof
before the three-machine demo.

## Impacted Modules/Files

- `packages/types/src/federation/runner-join.ts`
- `packages/types/src/host-api/runtime.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/assignment-materializer.ts`
- `services/runner/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `scripts/smoke-federated-process-runner.mjs`
- `package.json`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added optional `hostApi.runtimeIdentitySecret.mode: "host_api"` to runner join
  config;
- added an authenticated `GET /v1/runtimes/:nodeId/identity-secret` Host API
  route for Host-managed development node identity material;
- made the route refuse operation unless `ENTANGLE_HOST_OPERATOR_TOKEN` is
  configured, so the secret cannot be exported from an unauthenticated Host;
- updated the default runner assignment materializer to localize fetched Host
  runtime context into runner-owned assignment workspace paths;
- copied package and memory seed state into the runner-owned materialization
  root with symlink dereferencing;
- fetched runtime identity secret material when explicitly configured and
  installed it into the runtime identity env var before starting the assigned
  node service;
- switched Host JSON state writes to atomic temp-file-and-rename persistence to
  avoid partial projection reads during rapid observation updates;
- added `pnpm ops:smoke-federated-process-runner`;
- added a smoke that starts an actual runner process, uses a real relay, trusts
  the runner, assigns a node through Host API, and verifies accepted assignment,
  running runtime projection, runner-owned materialized context, local git
  backend setup, and Host/runner filesystem isolation;
- made the smoke use per-run graph, runner, assignment, session, conversation,
  and turn identifiers so persistent relays do not mix current evidence with
  stale smoke events;
- extended the smoke to publish a signed `question` message from the graph's
  User Node to the assigned builder node, then verify the runner persisted the
  corresponding session and conversation in its runtime state;
- extended the smoke again after
  [257-federated-session-conversation-observations-slice.md](257-federated-session-conversation-observations-slice.md)
  so Host projection must contain the User Node conversation produced from
  runner-signed observations;
- added `--keep-running` as a manual test harness mode that leaves the Host
  server and joined runner process alive, keeps the temporary state root, and
  prints CLI commands for publishing a signed `task.request` to the assigned
  builder node for API-backed OpenCode testing;
- normalized blank relay publish acknowledgements from `nostr-tools` to the
  configured relay URL so a successful live publish cannot fail DTO validation
  because the underlying pool returned an empty string.

Deferred:

- replacing Host-managed node identity delivery with runner-owned or external
  signer custody for production remote deployments;
- packaging runtime context as Host-signed graph/resource/package snapshots
  instead of copying from a Host-local package materialization;
- proving the same flow across separate machines and networks;
- routing normal turn-produced artifact/source/wiki observations from the
  runner service into projection during real task execution.
- replacing inline bootstrap snapshots with git/object refs for large packages.
- automated live OpenCode/model-provider assertions. The current smoke stops at
  signed message intake so it stays usable without provider keys.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `node --check scripts/smoke-federated-process-runner.mjs`
- one-file TypeScript check for
  `services/host/scripts/federated-process-runner-smoke.ts`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
- package lint/typecheck gates before commit.

Verification record:

- focused typechecks passed for types, runner, and Host;
- focused types and runner tests passed;
- focused Host tests passed after authenticated helper requests were updated;
- wrapper syntax check passed;
- one-file TypeScript check for the process smoke passed;
- process runner smoke passed against the federated dev `strfry` relay on
  `ws://localhost:7777`, including signed User Node publish and runner
  session/conversation intake;
- root `pnpm typecheck` passed;
- root `pnpm lint` passed;
- `git diff --check` passed;
- active stale product marker search returned no implementation or user-facing
  hits;
- the smoke stopped the relay after verification.

## End-Of-Slice Audit

The slice intentionally adds one Host API that returns secret material. The
route is explicit, token-gated, and only used by runner join configs that opt
into `host_api` runtime identity secret bootstrap. It does not put private keys
on Nostr and does not write the secret into materialized runtime context files.

The follow-up bootstrap bundle slice removes package/memory copying from
Host-local path values. The materialized runtime context can still include some
non-workspace bindings that reference Host-side development resources,
especially model and git secret delivery metadata. That is a remaining
production custody gap, not a new canonical remote assumption.

## Migration/Compatibility Notes

The new Host API route is additive. Existing joined runners keep fetching only
runtime context unless their join config explicitly requests
`runtimeIdentitySecret.mode: "host_api"`.

The JSON atomic-write helper changes persistence mechanics without changing file
formats.

## Risks And Mitigations

- Risk: Host-managed runtime identity export becomes a production pattern.
  Mitigation: the slice names it as development/bootstrap behavior and requires
  authenticated Host API access.
- Risk: copied package materialization is mistaken for remote package delivery.
  Mitigation: the deferred work calls for signed graph/resource/package
  snapshots or artifact refs.
- Risk: atomic JSON writes leave temporary files after crashes.
  Mitigation: temp names are hidden, unique, and removed on write failure; stale
  temp cleanup can be added to state repair if needed.

## Open Questions

No product question blocks this slice. The next architectural decision is which
production key custody model should replace Host-exported node identity secrets
for remote runners: runner-generated node keys, external signer refs, or
Host-issued encrypted assignment bundles.
