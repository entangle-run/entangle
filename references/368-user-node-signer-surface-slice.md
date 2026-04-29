# User Node Signer Surface Slice

## Current Repo Truth

User Node inbound/outbound message records now preserve `signerPubkey` when
available, and Host rejects inbound User Node message records whose signer does
not match the A2A payload `fromPubkey`. Before this slice, the signer metadata
was mostly visible only in raw JSON responses.

## Target Model

Human graph participants and operators should be able to see signer audit
state from the normal User Node surfaces without inspecting raw records.
Compact CLI summaries should include signer metadata when available, and the
User Client timeline should show a short signer status in each message header.

## Impacted Modules/Files

- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `apps/cli/src/index.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add compact CLI projection for recorded User Node messages with signer
  pubkey and signer/fromPubkey match status.
- Include compact message summaries in `entangle inbox show --summary`.
- Include signer audit metadata in compact User Node publish summaries.
- Add a User Client signer label helper and render it in message headers when
  signer metadata is available.

## Tests Required

- `pnpm --filter @entangle/cli test -- src/user-node-output.test.ts`
- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/user-client typecheck`

## Migration/Compatibility Notes

The surface is additive. Older message records without `signerPubkey` continue
to render without signer labels and without signer fields in compact CLI
summaries.

## Risks And Mitigations

- Risk: full signer pubkeys are visually long.
  Mitigation: the browser User Client uses a short label, while CLI JSON keeps
  the full key for audit and scripting.

## Open Questions

- Studio could later expose the same per-message signer status if operator
  workflows need inbox-level audit without opening the dedicated User Client.
