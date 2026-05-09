# External HTTP Agent Engine Health URL Slice

## Current Repo Truth

`external_http` agent engine profiles can point runners at a turn endpoint and
can optionally reference a runner-local bearer token environment variable. The
deterministic fake external HTTP engine exposes `/health`, but the catalog has
no typed place to store that endpoint and the runner does not probe it before
turn execution.

This leaves provider reachability failures indistinguishable from turn failures
and makes authenticated no-credential smokes weaker than the attached OpenCode
server path, which already performs a health probe before use.

## Target Model

`external_http` agent engine profiles may carry an optional `healthUrl`.
When present, the runner performs a bounded GET probe before posting the turn
request. The probe must return HTTP 2xx and, when JSON is returned, must not
explicitly report `healthy: false`.

The field is profile metadata, not a secret. If the profile also declares
`httpAuth: { mode: "bearer_env" }`, the runner sends the same bearer header to
the health probe and the turn request so protected engines can keep one auth
boundary.

## Impacted Modules And Files

- `packages/types/src/resources/catalog.ts`
- `packages/types/src/host-api/control-plane.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/external-http-engine.ts`
- `services/runner/src/external-http-engine.test.ts`
- `apps/cli/src/catalog-agent-engine-command.ts`
- `apps/cli/src/catalog-agent-engine-command.test.ts`
- `apps/studio/src/agent-engine-profile-editor.ts`
- `apps/studio/src/agent-engine-profile-editor.test.ts`
- `apps/studio/src/App.tsx`
- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `healthUrl` to `external_http` profiles.
- Reject `healthUrl` on non-`external_http` profiles until another adapter
  explicitly implements it.
- Add Host atomic upsert support with `healthUrl` and `clearHealthUrl`.
- Add CLI and Studio controls for setting and clearing the field.
- Add distributed proof-kit support for passing a health URL into generated
  operator commands and dry-run evidence.
- Seed default `external_http` profiles from
  `ENTANGLE_DEFAULT_AGENT_ENGINE_HTTP_HEALTH_URL`.
- Probe the health URL in the runner before a turn and classify failed probes
  as provider-unavailable engine failures.
- Preserve existing profiles without `healthUrl`.

## Tests Required

- Type contract tests for `healthUrl` parsing, restriction, and clear/set
  conflict validation.
- Host catalog upsert and default seeding tests.
- CLI request-builder and catalog-mutation tests.
- Studio editor draft and request tests.
- Runner adapter tests proving health is probed before the turn and failed
  probes prevent turn calls.
- Distributed proof tooling smoke covering `--external-http-engine-health-url`
  propagation into generated operator commands.
- Package typechecks, focused lint, product naming guard, whitespace check,
  changed-diff local-assumption marker audit, and diff review before commit.

## Migration And Compatibility Notes

The field is additive. Existing `external_http` profiles continue to work
without health probing. Operators can add `healthUrl` when the provider or
fixture exposes a stable health endpoint. Distributed proof kits generated
without `--external-http-engine-health-url` are unchanged.

## Risks And Mitigations

- Risk: some providers expose health endpoints that are not JSON. Mitigation:
  any HTTP 2xx non-empty non-JSON body is accepted; JSON bodies only fail when
  they explicitly set `healthy: false`.
- Risk: protected health endpoints need auth. Mitigation: the runner reuses
  the existing `httpAuth` bearer header reference without storing token values.
- Risk: operators expect automatic URL derivation. Mitigation: the field is
  explicit so existing turn endpoints are not broken by mandatory derived
  probes.
- Risk: physical proof kits accidentally point runners at loopback health URLs.
  Mitigation: `--require-external-agent-engine-urls` validates the health URL
  shape alongside the turn URL.

## Open Questions

Future engine profiles may need richer readiness metadata, version projection,
or health endpoint auth modes beyond bearer environment variables. This slice
only adds the smallest safe contract needed for `external_http` readiness
probing.

## Verification

The red phase should fail because `healthUrl` is not yet accepted by contracts,
not persisted by Host/CLI/Studio helpers, and not probed by the runner. The
green phase adds the typed field, user surfaces, default seeding, runner probe,
and proof-kit propagation.
