# Projected Session Inspection Slice

## Current Repo Truth

`GET /v1/sessions` can now surface session summaries from observed activity
projection when no Host-readable runner session file exists. However,
`GET /v1/sessions/:sessionId` still returned only records collected through the
local runtime filesystem inspection path.

That meant a federated runner could publish a signed `session.updated`
observation that appeared in the session list, while the corresponding session
detail route still returned `404` unless Host could read the runner's local
`runtimeRoot`.

## Target Model

Session detail must prefer rich local compatibility inspection when present,
but it must fall back to a bounded projection-backed inspection for sessions
that exist only through signed observations.

The projected detail surface should include:

- the observed full session record;
- per-node approval and conversation status counts from observed activity;
- a runtime summary reconstructed from Host runtime projection;
- no local `contextPath` or runner filesystem path.

## Impacted Modules/Files

- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes Required

- Add a projection-to-runtime-inspection helper that builds a public
  `RuntimeInspectionResponse` from `RuntimeProjectionRecord` without exposing
  local context paths.
- Add a projected session inspection collector over observed session,
  conversation, approval, and runtime projection records.
- Make `getSessionInspection()` fall back to projected session inspection when
  local filesystem-backed inspection has no matching session.
- Extend Host tests so a remote observed session can be listed and inspected
  after local runtime synchronization.

## Tests Required

- Host API test for projected remote session detail fallback.
- Host typecheck and lint.
- Host integration test suite.

## Migration/Compatibility Notes

Filesystem-backed session inspection remains preferred when local session files
exist, so existing same-workstation diagnostics keep their richer consistency
findings. Projected inspection is additive and only fills the federated gap
where Host has observation records but not runner-local state.

## Risks And Mitigations

- Risk: projected runtime detail is less complete than local runtime
  inspection.
  Mitigation: the fallback uses public runtime projection fields only and does
  not claim workspace, agent-runtime, or deep diagnostic details that are not in
  projection yet.
- Risk: stale projected sessions could appear after graph replacement.
  Mitigation: projected inspection is scoped to the active graph id and active
  node ids.

## Open Questions

- Should future projected session detail include bounded consistency findings
  derived from observed conversation and approval activity, or should those wait
  for a richer ProjectionStore schema?
