# Human Interface JSON API Smoke Slice

## Current Repo Truth

`290-human-interface-json-api-slice.md` added local Human Interface Runtime JSON
routes for selected conversation detail and message publishing. Before this
slice, the process runner smoke still used the Host User Node API directly for
the first User Node message and used the HTML form route for the approval
response.

That left the no-LLM product proof short of the path a bundled User Client app
will actually use.

## Target Model

The topology-agnostic process smoke should prove that a running User Node
client can use its local runtime JSON API to publish messages and inspect
conversation state, while Host and the agent runner observe the same signed
User Node behavior through projection and runtime intake.

## Impacted Modules And Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/290-human-interface-json-api-slice.md`

## Concrete Changes

- Changed the initial User Node smoke publish to call the running User Client
  `POST /api/messages` route instead of Host `POST /v1/user-nodes/:id/messages`
  directly.
- Added a smoke assertion for
  `GET /api/conversations/:conversationId` on the running User Client.
- Changed the approval response smoke path to call User Client
  `POST /api/messages` with an `approval.response` JSON body.
- Kept Host projection, agent-runner intake, and User Node inbox assertions in
  place, proving the runtime-local JSON path still flows through signed User
  Node behavior.

## Tests Required

- Host typecheck.
- Runner typecheck and lint, because the smoke exercises runner-served runtime
  APIs.
- `node --check scripts/smoke-federated-process-runner.mjs`.
- Relay-backed `pnpm ops:smoke-federated-process-runner` when the federated dev
  relay is running.

## Migration And Compatibility Notes

No product contract changed. The smoke now exercises the preferred User Client
runtime path while the direct Host API remains available for CLI/headless
gateway flows.

## Risks And Mitigations

- Risk: the smoke stops covering direct Host User Node publish.
  Mitigation: CLI and Host API tests still cover direct Host gateway publishing;
  this smoke is intentionally product-path biased.
- Risk: JSON approval publish drifts from the HTML form route.
  Mitigation: the runner unit test still covers the form route, while this
  smoke covers the JSON route intended for a bundled app.

## Open Questions

- Should the smoke eventually start the bundled `apps/user-client` build rather
  than using the runner-served local JSON API directly?
- Should the smoke cover JSON artifact/source/wiki review routes once those are
  promoted under `/api/*`?
