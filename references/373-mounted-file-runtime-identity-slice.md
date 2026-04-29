# Mounted-File Runtime Identity Slice

## Current Repo Truth

The shared secret-delivery contract already supports `env_var` and
`mounted_file`. Generic runner join identity loading supports both modes through
`readRunnerSecretKey`, but the older runtime-context runner startup path still
only read node identity secrets from environment variables. The Human Interface
Runtime also silently skipped identity-backed Nostr transport unless the User
Node secret was available in an environment variable.

That left an avoidable portability gap for local adapters, Docker mounts, and
operator-supplied node configs that deliver node identity as a mounted file.

## Target Model

Every node runtime should consume the same secret-delivery modes for its Nostr
identity, whether the node starts from a generic assignment or an injected
runtime context. A User Node with mounted-file identity material should be able
to create its own transport the same way an agent runtime can.

## Impacted Modules/Files

- `services/runner/src/index.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Reuse the existing `readRunnerSecretKey` helper for runtime-context runner
  identity loading.
- Make runtime-context identity resolution asynchronous so mounted-file secrets
  can be read before deriving the Nostr pubkey.
- Let the Human Interface Runtime resolve mounted-file User Node identity
  secrets when it creates its own Nostr transport.
- Add a runner test proving a runtime-context node can execute with a
  mounted-file identity secret and no identity environment variable.

## Tests Required

- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- broader root lint/typecheck before commit

## Migration/Compatibility Notes

This is additive. Environment-variable identity delivery still works, and
generic join configs already supported mounted-file delivery. Existing
runtime-context deployments gain parity with the contract instead of changing
schema shape.

## Risks And Mitigations

- Risk: Human Interface Runtime startup fails when identity files are absent.
  Mitigation: preserve the previous best-effort behavior: missing or invalid
  identity material means no self-created inbound transport, while explicit
  transport injection still works.
- Risk: runtime-context startup starts doing filesystem I/O during identity
  resolution.
  Mitigation: startup is already async and reads the runtime context, package
  files, and tool catalog before service creation.

## Open Questions

- Should future secret delivery support OS keychains or external secret manager
  references so long-running remote nodes do not need plaintext mounted files?
