# Fake External HTTP Bearer Smoke Slice

## Current Repo Truth

`external_http` agent engine profiles can now store
`httpAuth: { mode: "bearer_env", tokenEnvVar }`, and the runner sends the
resolved token as an HTTP bearer header. The deterministic fake external HTTP
engine still accepted unauthenticated `/turn` requests, so the no-real-model
fixture did not prove the authenticated path end to end.

Host default catalog seeding could configure `external_http` kind and base URL
from environment variables, but it did not yet seed the new auth reference for
same-process smokes or local deployments that build their catalog from env.

## Target Model

The fake external HTTP engine should be able to require bearer auth without
storing tokens in command lines. Operators and smokes pass only an environment
variable name to the fake engine, and the server reads the expected token from
its own process environment.

Host default catalog seeding should be able to create an authenticated
`external_http` default profile by storing only the runner-local token env var
name. The actual token remains provisioned on the runner process.

## Impacted Modules And Files

- `scripts/fake-agent-engine-http.mjs`
- `scripts/smoke-fake-agent-engine-http.mjs`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--bearer-token-env-var <envVar>` to the fake external HTTP engine.
- Require `/turn` requests to include `Authorization: Bearer <token>` when
  that option is configured.
- Keep `/health` and `/debug/state` available without auth for harness
  startup and diagnostics.
- Extend the fake-engine smoke to set the token in the server environment,
  verify unauthenticated `/turn` returns `401`, and verify authenticated
  `/turn` still produces the deterministic turn result and workspace write.
- Seed `httpAuth` from
  `ENTANGLE_DEFAULT_AGENT_ENGINE_HTTP_BEARER_TOKEN_ENV_VAR` when Host creates
  an `external_http` default profile.
- Configure the fake external HTTP process-runner smoke to pass the same env
  reference to Host and provide the token to the runner process.

## Tests Required

- Red `node scripts/smoke-fake-agent-engine-http.mjs` proving the fake engine
  did not yet accept the auth option.
- Green `node scripts/smoke-fake-agent-engine-http.mjs` proving 401 without
  bearer auth and success with the configured bearer token.
- Host test proving default catalog seeding stores the auth env reference for
  `external_http` profiles.
- Host typecheck after process-smoke script changes.
- Script syntax checks, focused ESLint, product naming guard, whitespace check,
  changed-diff marker audit, and `git diff` review before commit.

## Migration And Compatibility Notes

Existing unauthenticated fake external HTTP usage still works because
`--bearer-token-env-var` is optional. Existing unauthenticated
`external_http` profiles also remain valid because `httpAuth` is optional.

The new Host environment variable stores only a variable name in catalog state.
It does not deliver or persist the token itself.

## Risks And Mitigations

- Risk: an operator supplies `--bearer-token-env-var` without setting the
  variable. Mitigation: the fake engine fails at startup with a direct error.
- Risk: `/debug/state` leaks request metadata. Mitigation: it remains a local
  fixture diagnostics route and does not expose bearer token values.
- Risk: same-process smokes accidentally rely on shared process env. Mitigation:
  the catalog stores only the env var name, matching the real runner-side
  resolution model.

## Open Questions

Future infrastructure-backed proof runs should verify the same authenticated
fake engine across separate Host and runner machines, with the token present
only on the agent runner machine.

## Verification

The red phase failed because the fake engine rejected
`--bearer-token-env-var` as an unknown option. The green phase adds the option,
401 handling, Host default-catalog env seeding, and process-smoke env wiring.

Final verification for this slice includes the fake-engine smoke, focused Host
test, host typecheck, script syntax, focused lint, product naming guard,
whitespace check, changed-diff local-assumption marker audit, and full diff
review before the atomic commit.
