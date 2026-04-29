# User Node Runtime Demo Command Slice

## Current Repo Truth

The process-runner smoke is the fastest topology-faithful proof of Entangle:
it starts Host, one joined agent runner, and two joined User Node
`human_interface` runners against a reachable relay. It already supports
`--keep-running`, prints the Host URL, operator token, User Client URLs, and
manual CLI commands, and can serve the dedicated `apps/user-client` build when
`apps/user-client/dist/index.html` exists.

Before this slice, the operator had to remember to build the User Client app,
start the local development relay, and then run the smoke with
`--keep-running`.

## Target Model

The fastest manual product proof should be one root command that leaves the
running graph inspectable by an operator and by human graph participants:

- build the dedicated User Client app;
- start the local development relay when using the same-machine proof;
- run the federated process-runner smoke in `--keep-running` mode;
- print Host/User Client URLs and manual CLI commands through the existing
  smoke output;
- keep the same Host/runner/User Node filesystem isolation guarantees as the
  smoke.

## Impacted Modules And Files

- `package.json`
- `scripts/federated-user-node-runtime-demo.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `pnpm ops:demo-user-node-runtime`.
- Add a small wrapper script that builds `@entangle/user-client`, starts
  `strfry` through the federated-dev Compose file, and delegates to
  `pnpm ops:smoke-federated-process-runner -- --keep-running`.
- Support `--skip-build`, `--skip-relay`, `--relay-url`, `--timeout-ms`,
  `--user-client-static-dir`, `--dry-run`, and pass-through smoke arguments
  after `--`.
- Document this as the shortest no-credential interactive User Node runtime
  demo.

## Tests Required

Implemented and passed:

- `node --check scripts/federated-user-node-runtime-demo.mjs`
- `node scripts/federated-user-node-runtime-demo.mjs --help`
- `node scripts/federated-user-node-runtime-demo.mjs --dry-run --skip-build --skip-relay --relay-url ws://localhost:7777 --timeout-ms 1000 -- --keep-temp`
- `pnpm ops:demo-user-node-runtime --dry-run --skip-build --skip-relay --relay-url ws://localhost:7777 --timeout-ms 1000 -- --keep-temp`
- `pnpm --filter @entangle/user-client build`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist: no
  relevant hits

The existing end-to-end runtime behavior remains covered by:

- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`

## Migration And Compatibility Notes

This is an additive operator convenience command. It does not change Host,
runner, User Client, protocol, projection, or deployment contracts. Existing
smoke commands and the Federated Preview demo continue to work.

## Risks And Mitigations

- Risk: a convenience wrapper could hide the real protocol path.
  Mitigation: the wrapper delegates to the existing federated process-runner
  smoke instead of creating a separate demo runtime.
- Risk: local relay startup could imply local-only product behavior.
  Mitigation: `--skip-relay` and `--relay-url` keep the command usable with any
  reachable relay; the underlying Host and runners still communicate through
  Nostr and separate state roots.

## Open Questions

- Should the later three-machine proof have a sibling command that only prints
  machine-specific Host, runner, and User Node startup commands instead of
  starting local helper services?
