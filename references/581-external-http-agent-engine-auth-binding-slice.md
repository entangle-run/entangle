# External HTTP Agent Engine Auth Binding Slice

## Current Repo Truth

The distributed proof tooling now rejects credentials embedded in attached
OpenCode and `external_http` engine URLs. That hardening removed the last
unsafe shortcut for authenticated `external_http` proof runs, but the catalog
contract did not yet have a typed way to bind runner-local bearer credentials
to URL-backed engine profiles.

`external_http` runner execution previously sent only JSON headers and
Entangle metadata. Operators could point a profile at a deterministic fake
engine or an unauthenticated provider, but authenticated providers required an
out-of-band workaround.

## Target Model

Agent engine profiles may reference secrets without storing them. For
`external_http`, the catalog stores only an environment variable name:

```json
{
  "httpAuth": {
    "mode": "bearer_env",
    "tokenEnvVar": "ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN"
  }
}
```

The runner reads the token from its own environment immediately before calling
the external engine and sends it as an `Authorization: Bearer ...` header.
Host, CLI, Studio, proof profiles, and dry-run output never store or print the
secret value.

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
- `apps/cli/src/index.ts`
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

- Add a typed `agentEngineHttpAuthSchema` with `mode: "bearer_env"` and a
  validated environment variable name.
- Keep that auth reference limited to `external_http` profiles until another
  adapter explicitly implements the same contract.
- Extend atomic Host catalog upsert requests with `httpAuth` and
  `clearHttpAuth`, including the same set/clear conflict guard used by other
  profile fields.
- Persist the auth reference in Host catalog state while allowing explicit
  clearing.
- Add CLI flags for setting and clearing the bearer-token environment variable
  reference.
- Add Studio form state and request projection for the same auth reference.
- Teach the `external_http` runner adapter to resolve the token from
  `process.env`, fail fast when the variable is missing, and include a bearer
  header when present.
- Extend distributed proof kit generation so authenticated `external_http`
  runs can include a runner env placeholder and operator command flag without
  embedding credentials in URLs.
- Extend proof-tool smoke coverage for dry-run command assembly and runner env
  placeholder output.

## Tests Required

- Type contract tests for `httpAuth` parsing and atomic upsert conflict
  validation, including rejection on non-`external_http` profiles.
- Host route/state tests proving catalog upsert persists the auth reference.
- CLI request-builder tests for setting, clearing, and rejecting conflicting
  auth flags.
- Studio editor tests for draft hydration and upsert projection.
- Runner adapter tests proving the bearer header is sent and missing env vars
  raise configuration errors before provider calls.
- Distributed proof-tool smoke coverage for the external HTTP auth env flag.
- Package typechecks for touched TypeScript packages.
- Script syntax checks, focused ESLint, product naming guard, whitespace check,
  changed-diff marker audit, and `git diff` review before commit.

## Migration And Compatibility Notes

Existing unauthenticated `external_http` profiles remain valid because
`httpAuth` is optional. Existing generated proof kits keep working without the
new flag.

This slice intentionally stores only the environment variable name. Operators
must provision the actual token on the runner machine, container, or service
manager. This keeps the Host catalog portable and avoids leaking provider
credentials through Studio, CLI summaries, proof profiles, or generated
operator scripts.

## Risks And Mitigations

- Risk: a profile references an environment variable that is not present on a
  remote runner. Mitigation: the runner raises an
  `AgentEngineConfigurationError` before making the HTTP request.
- Risk: operators expect the Host to deliver the token. Mitigation: the field
  name and docs describe it as runner-local env resolution; Host stores a
  reference only.
- Risk: an env var name contains shell-sensitive characters. Mitigation: the
  shared schema and proof-kit validation require a conventional environment
  variable identifier.
- Risk: Studio or CLI summaries reveal a secret. Mitigation: only the env var
  name is surfaced; the token value is never accepted by these surfaces.

## Open Questions

Future engine adapters may need richer auth modes such as mTLS, signed request
headers, OAuth token brokers, or Host-managed secret delivery. This slice keeps
the smallest safe contract needed for authenticated `external_http` engines
without designing a full secret manager.

## Verification

The TDD red phase showed the contract, CLI, Studio, runner, and proof-kit smoke
paths ignoring or rejecting the new desired auth reference. The green phase
adds the typed schema, Host persistence, user surfaces, runner header
resolution, and proof-kit generation support.

Final verification for this slice includes focused tests for touched packages,
package typechecks, proof-tool smoke, script syntax, focused lint, product
naming guard, whitespace check, changed-diff local-assumption marker audit, and
full `git diff` review before the atomic commit.
