# Live Relay Federated Smoke Slice

## Current Repo Truth

`pnpm ops:smoke-federated-control` covered Host control, runner hello,
assignment offer, and assignment receipt semantics through an in-memory bus. It
proved protocol payload shape and filesystem isolation, but it did not prove
the real Nostr relay transport.

The federated dev runtime smoke uses the development relay and git service, but
it still exercises the Docker launcher runtime path. A smaller smoke was needed
for the federated control/observe path itself.

## Target Model

Entangle must have a smoke that uses a real relay for Host-to-runner control and
runner-to-Host observation. The smoke must keep Host and runner state in
separate roots, route assignment and runtime observations through Nostr, publish
a git-backed artifact ref, and verify Host projection without reading runner
filesystem paths.

## Impacted Modules/Files

- `services/host/scripts/federated-live-relay-smoke.ts`
- `scripts/smoke-federated-live-relay.mjs`
- `package.json`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/253-live-relay-federated-smoke-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `pnpm ops:smoke-federated-live-relay`;
- added a live-relay smoke that uses `HostFederatedNostrTransport` and the
  runner's federated Nostr transport against a reachable relay;
- keeps Host state, Host secrets, runner state, and materialized assignments in
  separate temp roots;
- applies a two-node graph, registers a generic runner through the relay,
  trusts it, offers an assignment through signed Host control, and waits for
  runner-signed accepted/runtime status observations;
- publishes a git-backed artifact ref from the runner identity through the same
  relay after creating a real temporary git commit;
- verifies Host projection contains observation-sourced assignment state,
  runtime state, and git artifact refs;
- verifies Host and runner roots are not nested.

Deferred:

- fully remote process orchestration across three machines;
- Gitea-backed artifact publication inside this smaller relay smoke;
- replacing Docker-backed runtime lifecycle smoke with assignment-only runner
  execution.

Follow-up implemented after this slice:

- [254-process-runner-federated-smoke-slice.md](254-process-runner-federated-smoke-slice.md)
  adds a separate OS process runner that starts the assigned node runtime from
  Host API bootstrap materialization over the real relay path.

## Tests Required

- `node --check scripts/smoke-federated-live-relay.mjs`
- `pnpm --filter @entangle/host exec tsc --noEmit --ignoreConfig --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --skipLibCheck scripts/federated-live-relay-smoke.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:smoke-federated-live-relay -- --relay-url ws://localhost:7777`
- `pnpm typecheck`
- `pnpm lint`
- `git diff --check`
- active stale local-product naming search.

Verification record:

- wrapper syntax check passed;
- TypeScript one-file check for the smoke passed;
- Host package typecheck passed;
- live smoke passed against `strfry` from the federated dev Compose profile;
- root typecheck passed;
- root lint passed;
- `git diff --check` passed;
- active stale local-product naming search returned no matches.

## Migration/Compatibility Notes

The smoke is additive. It does not replace `ops:smoke-federated-control`, which
remains the fast in-memory protocol regression. It also does not replace the
full federated dev runtime smoke, which still covers provider execution and
Gitea-backed artifact publication through the existing Docker adapter.

The new smoke defaults to `ws://localhost:7777` and also honors
`ENTANGLE_RELAY_URL` or `ENTANGLE_STRFRY_URL`.

## Risks And Mitigations

- Risk: relay availability makes this smoke unsuitable as a default unit test.
  Mitigation: it is exposed as an ops smoke and not part of package tests.
- Risk: the runtime starter inside this smoke is still a controlled fake.
  Mitigation: this smoke is scoped to live relay control/observe and projection;
  the process runner smoke now covers actual joined runner process startup and
  assigned runtime service startup.
- Risk: temporary git commit does not prove Gitea API publication.
  Mitigation: the existing runtime smoke covers Gitea publication; this smoke
  proves git-backed artifact references travel through the federated relay path.

## Open Questions

No product question blocks this slice. The separate OS process smoke now exists;
the remaining implementation question is how much of the three-machine demo
should be automated in CI versus documented as an operator proof.
