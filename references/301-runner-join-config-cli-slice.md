# Runner Join Config CLI Slice

## Current Repo Truth

The runner can already start in generic join mode from a JSON
`runner-join.json` config. The process-runner smoke launches `entangle-runner
join` processes, but ordinary operators did not yet have a Host-backed CLI
command for writing a validated join config from current Host status.

The runner package also did not advertise an `entangle-runner` bin entry even
though `services/runner/src/index.ts` already parses `join --config`.

## Target Model

An operator should be able to prepare a runner machine with:

1. a runner Nostr secret in an environment variable;
2. a Host-derived `runner-join.json`;
3. an `entangle-runner join --config runner-join.json` process.

The generated config should not contain secrets. It should contain Host
Authority pubkey, relay URLs, runner id, declared capabilities, runner secret
delivery reference, and optional Host API bootstrap settings.

## Impacted Modules/Files

- `apps/cli/src/index.ts`
- `apps/cli/src/runner-join-config-command.ts`
- `apps/cli/src/runner-join-config-command.test.ts`
- `services/runner/package.json`
- `services/runner/src/index.ts`
- `eslint.config.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/225-host-runner-federation-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `entangle runners join-config`.
- Derive Host Authority pubkey and default relay URLs from `/v1/host/status`.
- Allow explicit relay, runtime-kind, agent-engine-kind, label,
  max-assignment, Host API, Host token env var, and runner public-key options.
- Validate generated output with `runnerJoinConfigSchema`.
- Emit compact summaries for automation-friendly CLI use.
- Add the `entangle-runner` package bin and a Node shebang to runner entrypoint.
- Raise the ESLint typed-default-project file cap from 32 to 64 because the CLI
  test suite now has more than 32 source-level test files.

## Tests Required

- CLI helper tests for option normalization and generated join config shape.
- CLI typecheck, lint, and command test suite.
- Runner typecheck/build for the bin entrypoint.

## Migration/Compatibility Notes

This is additive. Existing smoke scripts and Docker launcher behavior are
unchanged.

The command intentionally writes only secret references, not secret values.
Operators still need to provision `ENTANGLE_RUNNER_NOSTR_SECRET_KEY` and, when
Host API auth is enabled, the selected Host token environment variable on the
runner machine.

## Risks And Mitigations

- Risk: generated configs accidentally hardcode local-only paths.
  Mitigation: the command derives protocol state from Host status and emits no
  workspace, context path, or Docker-specific field.
- Risk: a tokenless Host config is generated for a protected Host.
  Mitigation: the command supports explicit `--host-token-env-var`; it also
  detects `ENTANGLE_HOST_TOKEN` or `ENTANGLE_HOST_OPERATOR_TOKEN` when present.

## Open Questions

No open product question blocks this slice. A later convenience command can
generate or import runner key material into a local secret store.
