# User Client Runtime Status Projection Slice

## Current Repo Truth

The running User Client already exposes the User Node id, graph id, Nostr
identity, relay settings, conversations, artifacts, source-history refs, wiki
refs, and participant-scoped command receipts.

Before this slice, it did not expose the Host projection for its own
`human_interface` runtime. A human participant could use Studio or operator CLI
to inspect assignment, runner, observed state, and last-seen status, but the
client running at the User Node did not show that same operational context.

## Target Model

A User Node client should be self-describing. When a human participant opens
the client where the User Node is running, they can see whether that node is
assigned, which runner owns it, whether Host currently observes it as running,
and what User Client URL Host projects.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/App.tsx`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend User Client state with optional projected runtime fields for its own
  User Node runtime: assignment id, backend kind, client URL, desired state,
  observed state, last seen, projection update time, restart generation, runner
  id, and status message.
- Derive those fields from Host projection in Human Interface Runtime while
  keeping the existing local identity, relay, and Host API context intact.
- Include runtime projection fields in the live-state fingerprint so server-sent
  events notify the browser when Host observes a new User Node runtime state.
- Render those fields in both the static HTML fallback and the React User
  Client runtime panel.

## Tests Required

- Runner Human Interface Runtime integration test proving `/api/state` includes
  the projected runtime fields.
- Runner typecheck and lint.
- User Client typecheck, lint, and runtime API tests.

## Migration And Compatibility Notes

This is additive JSON state. Existing User Client consumers that ignore unknown
runtime fields remain compatible.

If Host projection is unavailable or the runtime has not been projected yet,
the fields are omitted and the UI renders conservative fallback labels.

## Risks And Mitigations

- Risk: exposing Host runtime projection through the participant client could
  accidentally become a runner-control surface.
  Mitigation: the fields are read-only status data; lifecycle and assignment
  control remain Host/Studio/CLI operator behavior.
- Risk: stale Host projection could look like local truth.
  Mitigation: the UI labels the data as observed/desired projection and also
  carries `lastSeenAt`/projection timestamps.

## Open Questions

Richer participant-side runtime reassignment controls remain out of scope. User
Node clients should not directly assign runners; reassignment remains an
operator action through Host authority.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
