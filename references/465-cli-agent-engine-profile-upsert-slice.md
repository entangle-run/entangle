# CLI Agent Engine Profile Upsert Slice

## Current Repo Truth

Entangle already resolves agent engine profiles from the deployment resource
catalog, graph bindings, and node-level `agentRuntime` configuration. Studio
can display and select catalog engine profiles for a node, and CLI can assign a
node-level `engineProfileRef` through `host nodes agent-runtime`.

Before this slice, creating or editing an agent engine profile still required
editing a catalog document manually and applying the full catalog. That made
operator tests with an attached OpenCode server or the deterministic fake
OpenCode server unnecessarily slow and error-prone.

## Target Model

Operators should be able to add or update the active Host catalog's agent
engine profiles from CLI without hand-editing JSON:

- create an attached `opencode_server` profile by setting `--base-url`;
- create a process-backed `opencode_server` profile by setting
  `--executable`;
- configure `permissionMode`, `defaultAgent`, `stateScope`, and version notes;
- optionally make the profile the catalog default;
- inspect the proposed catalog mutation with `--dry-run`;
- print a compact profile/default summary for operator scripts.

This keeps OpenCode behind the engine-adapter boundary. Entangle still owns the
graph, identities, policy, User Node approval path, runner assignment, and Host
projection model.

## Impacted Modules And Files

- `apps/cli/src/catalog-agent-engine-command.ts`
- `apps/cli/src/catalog-agent-engine-command.test.ts`
- `apps/cli/src/index.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a typed CLI helper that builds a validated catalog with an upserted agent
  engine profile.
- Reject conflicting set/clear flags and invalid state scopes before sending a
  Host mutation.
- Add `entangle host catalog agent-engine upsert <profileId>` with options for
  kind, executable, base URL, default agent, permission mode, state scope,
  version, catalog default selection, dry-run, and compact summary output.
- Document the no-credential fake OpenCode workflow using the CLI command, then
  node-level `host nodes agent-runtime` assignment.

## Tests Required

- CLI helper tests for new profile creation, default selection, field clearing,
  invalid schema combinations, compact summaries, conflicting flags, and invalid
  state scopes.
- CLI lint and typecheck because the command is part of the public headless
  operator surface.
- Product naming guard because the updated README and references are active
  product surfaces.

## Migration And Compatibility

No persisted state migration is required. The command applies the same catalog
contract already accepted by Host `PUT /v1/catalog`. Existing JSON catalog
apply workflows remain valid.

## Risks And Mitigations

- Risk: a convenience command bypasses catalog validation.
  Mitigation: the helper parses the input and output with
  `deploymentResourceCatalogSchema` before mutation.
- Risk: OpenCode-specific convenience leaks into the graph model.
  Mitigation: the command upserts generic `AgentEngineProfile` records and
  supports every current engine kind; OpenCode remains only the default engine
  profile and attached-server benchmark.
- Risk: operators point a profile at the fake OpenCode server and mistake it
  for live model acceptance.
  Mitigation: README and reference docs keep the fake server framed as
  deterministic no-credential plumbing coverage.

## Open Questions

- Live OpenCode plus real model-provider validation remains a manual acceptance
  step once operator credentials are available.
