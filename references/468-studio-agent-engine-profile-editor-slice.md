# Studio Agent Engine Profile Editor Slice

## Current Repo Truth

Studio now displays active catalog agent engine profiles and can bind managed
nodes to those profiles. CLI can create, update, list, and inspect profiles, but
Studio still required operators to leave the admin UI when they wanted to add an
attached OpenCode profile or make it the catalog default.

## Target Model

Studio should support a focused profile editor in the graph admin surface:

- create or update typed `AgentEngineProfile` records;
- set kind, executable, base URL, permission mode, state scope, default agent,
  and version note;
- optionally set the profile as the catalog default;
- submit the whole updated catalog through Host so Host remains authoritative;
- keep profile editing separate from node-level assignment editing.

## Impacted Modules And Files

- `apps/studio/src/agent-engine-profile-editor.ts`
- `apps/studio/src/agent-engine-profile-editor.test.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/styles.css`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add Studio helper functions that turn editor drafts into schema-validated
  deployment catalog mutations.
- Add tests for attached OpenCode profile creation, draft hydration, invalid
  profile rejection, and disabled-save state.
- Add edit/new/save controls to the Agent Engine Profiles subpanel.
- Apply profile updates through `client.applyCatalog` and render Host
  validation feedback.

## Tests Required

- Studio helper test for catalog mutation behavior.
- Studio lint, typecheck, package tests, and production build.
- Product naming guard, diff check, and the full root test wrapper.

## Migration And Compatibility

No persisted state migration. The editor uses the existing Host catalog apply
endpoint and the existing `DeploymentResourceCatalog` contract.

## Risks And Mitigations

- Risk: Studio and CLI catalog mutation behavior drift.
  Mitigation: both paths validate final catalogs with
  `deploymentResourceCatalogSchema`; future cleanup can move shared profile
  mutation helpers to a common package.
- Risk: operators save an incomplete HTTP profile.
  Mitigation: Host/types validation rejects invalid profile combinations and
  Studio surfaces the validation report instead of mutating silently.

## Open Questions

- A later slice should extract shared CLI/Studio profile mutation helpers into a
  package-level module if profile editing grows beyond the current fields.
