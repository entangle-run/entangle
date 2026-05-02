# Studio Agent Engine Profile Visibility Slice

## Current Repo Truth

Studio loads the active deployment catalog and uses catalog agent engine
profiles in the managed-node editor so operators can bind a node to a specific
engine profile. The operator still had to infer the available profiles from the
select menu or inspect the raw catalog elsewhere.

## Target Model

Studio should make the active agent engine catalog visible in the graph admin
surface:

- list available agent engine profiles in the graph editor;
- identify the current default profile;
- show engine kind, state scope, permission mode, default agent, endpoint or
  executable, and version note;
- keep node assignment editing separate from catalog profile management.

## Impacted Modules And Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/styles.css`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a compact formatter for Studio agent engine profile detail lines.
- Render an Agent Engine Profiles subpanel above managed-node editing.
- Mark the catalog default profile in that panel.
- Reuse the existing catalog fetch and keep this slice read-only.

## Tests Required

- Studio lint and typecheck.
- Studio package tests because shared presentation helpers compile with the app.
- Product naming guard and diff checks because public docs changed.

## Migration And Compatibility

No API or state migration. Studio already fetched the catalog; this slice only
renders a compact read model from the existing response.

## Risks And Mitigations

- Risk: Studio becomes a second catalog editor before profile validation UX is
  ready.
  Mitigation: the panel is read-only; profile creation/update remains in CLI or
  full catalog apply for now.
- Risk: profile detail text overflows narrow panels.
  Mitigation: the card uses wrapping text and existing dense Studio panel
  styling.

## Open Questions

- A future Studio catalog editor should reuse Host catalog validation and
  mutation APIs rather than duplicating schema logic client-side.
