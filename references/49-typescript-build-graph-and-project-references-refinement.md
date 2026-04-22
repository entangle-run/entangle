# TypeScript Build Graph and Project References Refinement

This document records the refinement that replaced the earlier workspace-wide
`build`-then-`typecheck` discipline with an explicit TypeScript project graph.

The intent is to make Entangle's build and type-safety model stable enough for
long-lived multi-package development rather than acceptable only as a bootstrap
workaround.

## Why the earlier approach was not final-form

The previous repository baseline used:

- `pnpm build`
- followed by workspace-wide package `typecheck`

That was directionally safer than ignoring stale outputs, but it still had a
real weakness:

- the dependency graph relevant to type-safety was implicit in task ordering
  rather than encoded directly in the TypeScript project graph.

That means the repository relied on the task runner to keep contracts fresh,
instead of giving TypeScript the explicit structure it needs to reason about
cross-package boundaries.

## Final recommendation

Entangle should model its composite TypeScript packages and Node services as an
explicit project-reference graph and use solution build mode for repository-wide
type safety.

The current implementation now does that through:

- `tsconfig.solution.json` as the root solution file;
- per-package and per-service `references` declarations where composite
  boundaries exist;
- `tsc -b` for the composite build graph;
- a separate Studio typecheck path, since the Studio surface remains
  bundler-driven and is not part of the composite Node/service solution.

## What changed concretely

The repository now has:

- a root solution `tsconfig` that references the internal libraries, services,
  and CLI;
- composite build references between `types`, `validator`, `host-client`,
  `agent-engine`, `package-scaffold`, `host`, `runner`, and `cli`;
- package build scripts aligned on `tsc -b`;
- package typecheck scripts aligned on `tsc -b` for composite packages;
- a root `pnpm typecheck` that runs `tsc -b tsconfig.solution.json` and then
  typechecks Studio separately.

## Why Studio stays outside the composite solution

`apps/studio` is still a bundler-oriented browser application with:

- `moduleResolution: "Bundler"`
- `noEmit`
- Vite-driven build behavior

That makes it a poor candidate for the same composite build graph as the Node
services and shared library packages.

Keeping Studio outside the composite solution is cleaner than forcing it into a
pseudo-composite posture that would not reflect its real build model.

## Architectural result

After this refinement:

- the TypeScript build graph is explicit instead of incidental;
- workspace type safety is driven by TypeScript's own build mode rather than by
  a blunt pre-build shell sequence;
- composite packages can be built and checked more coherently in isolation;
- the repository is closer to the baseline expected by a serious team working in
  a long-lived monorepo.
