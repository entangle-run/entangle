# Demo Studio Launch Slice

## Current Repo Truth

`pnpm ops:demo-user-node-runtime` is the fastest interactive no-credential
runtime proof. It builds the User Client, starts the development relay, runs
the process-runner smoke in `--keep-running` mode, and prints the Host URL,
operator token, both User Client URLs, and a manual Studio command.

Before this slice, operators had to copy the printed Studio command into a
second terminal to inspect the admin surface while the running User Node
clients stayed alive.

## Target Model

The demo should keep Studio as the graph admin/operator surface and keep User
Client URLs as the per-human-node participant surfaces, but it should offer one
controlled command that starts the admin Studio process automatically once the
smoke has produced the ephemeral Host URL and operator token.

## Impacted Modules And Files

- `scripts/federated-user-node-runtime-demo.mjs`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `package.json`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--with-studio` to the interactive User Node runtime demo wrapper.
- Start Studio only after the smoke prints the keep-running Host URL and
  operator token.
- Pass `VITE_ENTANGLE_HOST_URL` and `VITE_ENTANGLE_HOST_TOKEN` to Studio so it
  connects to the same Host projection.
- Allow `--studio-host` and `--studio-port` for the dev server.
- Extend the smoke's Host CORS allow-list with demo-provided Studio origins.
- Add a root convenience script for the Studio-enabled demo.

## Tests Required

- Script syntax checks.
- Demo help output.
- Studio-enabled dry run.
- Host smoke script typecheck.
- Focused script lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The default demo behavior is unchanged. Studio launch is opt-in through
`--with-studio` or `pnpm ops:demo-user-node-runtime:studio`. The existing
manual Studio command remains printed by the underlying smoke.

## Risks And Mitigations

- Risk: operators confuse Studio with the User Node participant client.
  Mitigation: the option is named and documented as the Studio admin surface,
  while the smoke continues to print separate User Client URLs.
- Risk: custom Studio ports fail CORS. Mitigation: the wrapper passes matching
  origins to the smoke, and the smoke adds them to the Host allow-list.
- Risk: Studio exits early while the keep-running runtime continues. Mitigation:
  the wrapper stops the runtime demo if the auto-launched Studio process fails
  before the smoke exits.

## Open Questions

Future demo work can add a richer launcher that opens browser tabs and selects
free ports automatically. This slice keeps the behavior explicit and
terminal-controlled.

## Verification

Completed in this slice:

- `node --check scripts/federated-user-node-runtime-demo.mjs`
- `node --check services/host/scripts/federated-process-runner-smoke.ts`
- `node scripts/federated-user-node-runtime-demo.mjs --help`
- `node scripts/federated-user-node-runtime-demo.mjs --dry-run --skip-build --skip-relay --with-studio --studio-host 127.0.0.1 --studio-port 3001 --relay-url ws://localhost:7777 --timeout-ms 1000 -- --keep-temp`
- `./node_modules/.bin/tsc -b services/host/tsconfig.json --pretty false`
- `./node_modules/.bin/eslint scripts/federated-user-node-runtime-demo.mjs services/host/scripts/federated-process-runner-smoke.ts --max-warnings 0`

The `pnpm` binary was not available in the shell PATH during this slice, so the
checks used local tool binaries and direct Node commands.
